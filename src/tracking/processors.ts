import type { EyeSample } from '../types';
import { normToDeg } from '../analysis/signal';
import { rgbaToGray } from './image';
import { findPupil } from './pupil';
import { irisProfile, TorsionTracker } from './torsion';

export interface Overlay {
  circles: { x: number; y: number; r: number; color: string }[];
  points: { x: number; y: number }[];
  lines: { x1: number; y1: number; x2: number; y2: number; color: string }[];
  /** dimensões de referência das coordenadas acima */
  width: number;
  height: number;
  message?: string;
}

export interface FrameProcessor {
  readonly name: string;
  readonly torsionCapable: boolean;
  init(): Promise<void>;
  reset(): void;
  process(src: CanvasImageSource, srcW: number, srcH: number, t: number): { sample: EyeSample; overlay: Overlay };
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  return { c, ctx };
}

const emptyOverlay = (w: number, h: number, message?: string): Overlay => ({ circles: [], points: [], lines: [], width: w, height: h, message });

/* ------------------------------------------------------------------ */
/* Grande plano do olho (óculos de vídeo / IV)                         */
/* ------------------------------------------------------------------ */
export interface CloseupOptions {
  mirrored: boolean;
  /** raio do globo ocular em fração da largura da imagem (calibração aproximada) */
  eyeRadiusFrac: number;
  maxWidth: number;
}

export class CloseupProcessor implements FrameProcessor {
  readonly name = 'Grande plano do olho';
  readonly torsionCapable = true;
  private canvas?: ReturnType<typeof makeCanvas>;
  private prev?: { x: number; y: number; r: number };
  private tor = new TorsionTracker();
  constructor(private o: CloseupOptions = { mirrored: false, eyeRadiusFrac: 0.32, maxWidth: 480 }) {}
  async init() {}
  reset() { this.prev = undefined; this.tor.reset(); }

  process(src: CanvasImageSource, srcW: number, srcH: number, t: number) {
    const scale = Math.min(1, this.o.maxWidth / srcW);
    const w = Math.round(srcW * scale), h = Math.round(srcH * scale);
    if (!this.canvas || this.canvas.c.width !== w || this.canvas.c.height !== h) this.canvas = makeCanvas(w, h);
    const { ctx } = this.canvas;
    ctx.drawImage(src, 0, 0, w, h);
    const gray = rgbaToGray(ctx.getImageData(0, 0, w, h).data, w, h);
    const p = findPupil(gray, this.prev);
    if (!p.ok) {
      this.prev = undefined;
      return { sample: { t, h: NaN, v: NaN, tor: NaN, valid: false }, overlay: emptyOverlay(w, h, 'Pupila não encontrada') };
    }
    this.prev = p;
    const eyeR = this.o.eyeRadiusFrac * w;
    const sgn = this.o.mirrored ? 1 : -1; // câmara de frente: esquerda da imagem = direita do doente
    const hDeg = normToDeg((sgn * (p.x - w / 2)) / eyeR);
    const vDeg = normToDeg(-(p.y - h / 2) / eyeR);
    const irisR = Math.max(p.r * 1.6, eyeR * 0.5);
    const r1 = p.r + (irisR - p.r) * 0.2, r2 = p.r + (irisR - p.r) * 0.8;
    const prof = irisProfile(gray, p.x, p.y, r1, r2, { mirrored: this.o.mirrored });
    const tor = this.tor.update(prof);
    return {
      sample: { t, h: hDeg, v: vDeg, tor, valid: true },
      overlay: {
        ...emptyOverlay(w, h),
        circles: [
          { x: p.x, y: p.y, r: p.r, color: '#3987e5' },
          { x: p.x, y: p.y, r: r1, color: 'rgba(27,175,122,.6)' },
          { x: p.x, y: p.y, r: r2, color: 'rgba(27,175,122,.6)' },
        ],
        points: [{ x: p.x, y: p.y }],
      },
    };
  }
}

/* ------------------------------------------------------------------ */
/* Rosto inteiro (câmara do telemóvel) — MediaPipe Face Landmarker      */
/* ------------------------------------------------------------------ */
const MP_VERSION = '1.2.3';
// primeiro os ficheiros locais (copiados por scripts/setup-assets.mjs — funcionam offline); depois o CDN
const WASM_URLS = ['./mediapipe/wasm', `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`];
const MODEL_URLS = ['./models/face_landmarker.task', 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'];

async function firstReachable(urls: string[], probe: (u: string) => string): Promise<string> {
  for (const u of urls) {
    try {
      const r = await fetch(probe(u), { method: 'HEAD' });
      if (r.ok) return u;
    } catch { /* tenta o seguinte */ }
  }
  return urls[urls.length - 1];
}

// índices de landmarks (malha de 478 pontos). "R" = olho direito DO DOENTE (lado esquerdo da imagem)
const EYE = {
  R: { outer: 33, inner: 133, upper: 159, lower: 145, iris: [468, 469, 470, 471, 472] },
  L: { outer: 263, inner: 362, upper: 386, lower: 374, iris: [473, 474, 475, 476, 477] },
};

type LM = { x: number; y: number; z: number };

export class FaceProcessor implements FrameProcessor {
  readonly name = 'Rosto (telemóvel)';
  readonly torsionCapable = true;
  private landmarker: any;
  private canvas?: ReturnType<typeof makeCanvas>;
  private torR = new TorsionTracker();
  private torL = new TorsionTracker();
  private lastTs = -1;
  private roll0: number | null = null;

  async init() {
    if (this.landmarker) return;
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const wasm = await firstReachable(WASM_URLS, (u) => `${u}/vision_wasm_internal.js`);
    const model = await firstReachable(MODEL_URLS, (u) => u);
    const fileset = await FilesetResolver.forVisionTasks(wasm);
    const opts = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: model, delegate },
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      minFaceDetectionConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
    try {
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, opts('GPU'));
    } catch {
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, opts('CPU'));
    }
  }

  reset() { this.torR.reset(); this.torL.reset(); this.roll0 = null; this.lastTs = -1; }

  process(src: CanvasImageSource, W: number, H: number, t: number) {
    let ts = Math.round(t * 1000);
    if (ts <= this.lastTs) ts = this.lastTs + 1;
    this.lastTs = ts;
    const res = this.landmarker.detectForVideo(src, ts);
    const lm: LM[] | undefined = res?.faceLandmarks?.[0];
    if (!lm) return { sample: { t, h: NaN, v: NaN, tor: NaN, valid: false }, overlay: emptyOverlay(W, H, 'Rosto não detetado') };
    const P = (i: number) => ({ x: lm[i].x * W, y: lm[i].y * H });

    // eixo da cabeça: do canto externo do olho direito (esq. da imagem) ao do olho esquerdo
    const a = P(EYE.R.outer), b = P(EYE.L.outer);
    const ex = { x: b.x - a.x, y: b.y - a.y };
    const exn = Math.hypot(ex.x, ex.y);
    ex.x /= exn; ex.y /= exn;
    const up = { x: ex.y, y: -ex.x }; // perpendicular "para cima" em coordenadas da imagem
    const roll = Math.atan2(-ex.y, ex.x); // anti-horário visto pelo examinador
    if (this.roll0 === null) this.roll0 = roll;

    const overlay: Overlay = emptyOverlay(W, H);
    const perEye: { h: number; v: number; tor: number; w: number }[] = [];
    let frameDrawn = false;

    for (const key of ['R', 'L'] as const) {
      const e = EYE[key];
      const o = P(e.outer), i = P(e.inner), u = P(e.upper), d = P(e.lower);
      const c = P(e.iris[0]);
      const width = Math.hypot(o.x - i.x, o.y - i.y);
      if (width < 8) continue;
      const aperture = Math.hypot(u.x - d.x, u.y - d.y) / width;
      // raio da íris: pontos verticais (não sofrem encurtamento pela rotação da cabeça)
      const irisPts = e.iris.slice(1).map(P);
      const rH = (Math.hypot(irisPts[0].x - irisPts[2].x, irisPts[0].y - irisPts[2].y)) / 2;
      const rV = (Math.hypot(irisPts[1].x - irisPts[3].x, irisPts[1].y - irisPts[3].y)) / 2;
      const irisR = Math.max(rH, rV);
      overlay.lines.push({ x1: o.x, y1: o.y, x2: i.x, y2: i.y, color: 'rgba(255,255,255,.5)' });
      if (aperture < 0.13) { overlay.message = 'Pestanejo'; continue; }
      overlay.circles.push({ x: c.x, y: c.y, r: irisR, color: '#3987e5' });
      const mid = { x: (o.x + i.x) / 2, y: (o.y + i.y) / 2 };
      const dx = c.x - mid.x, dy = c.y - mid.y;
      const dh = dx * ex.x + dy * ex.y; // + = direita da imagem = esquerda do doente
      const dv = dx * up.x + dy * up.y;
      const Rh = width * 0.4; // globo ~24 mm, fenda palpebral ~30 mm
      const Rv = Math.max(rV, 1) * 2.05; // íris ~5.85 mm de raio vs globo 12 mm
      const hDeg = normToDeg(-dh / Rh);
      const vDeg = normToDeg(dv / Rv);

      let tor = NaN;
      if (irisR >= 10) {
        if (!frameDrawn) {
          if (!this.canvas || this.canvas.c.width !== W || this.canvas.c.height !== H) this.canvas = makeCanvas(W, H);
          this.canvas.ctx.drawImage(src, 0, 0, W, H);
          frameDrawn = true;
        }
        const x0 = Math.max(0, Math.floor(c.x - irisR * 1.3)), y0 = Math.max(0, Math.floor(c.y - irisR * 1.3));
        const bw = Math.min(W - x0, Math.ceil(irisR * 2.6)), bh = Math.min(H - y0, Math.ceil(irisR * 2.6));
        const crop = rgbaToGray(this.canvas!.ctx.getImageData(x0, y0, bw, bh).data, bw, bh, x0, y0);
        const prof = irisProfile(crop, c.x, c.y, irisR * 0.55, irisR * 0.92, { headRoll: roll - this.roll0 });
        tor = (key === 'R' ? this.torR : this.torL).update(prof);
      }
      perEye.push({ h: hDeg, v: vDeg, tor, w: width });
    }

    if (perEye.length === 0) return { sample: { t, h: NaN, v: NaN, tor: NaN, valid: false }, overlay };
    // média ponderada pela largura aparente do olho (o olho mais próximo/visível pesa mais)
    const sw = perEye.reduce((s, e) => s + e.w, 0);
    const hAvg = perEye.reduce((s, e) => s + e.h * e.w, 0) / sw;
    const vAvg = perEye.reduce((s, e) => s + e.v * e.w, 0) / sw;
    const torE = perEye.filter((e) => Number.isFinite(e.tor));
    const torAvg = torE.length ? torE.reduce((s, e) => s + e.tor, 0) / torE.length : NaN;
    return { sample: { t, h: hAvg, v: vAvg, tor: torAvg, valid: true }, overlay };
  }
}
