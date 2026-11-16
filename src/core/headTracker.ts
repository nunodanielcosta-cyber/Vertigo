/**
 * Tracking da orientação da cabeça pela câmara frontal (MediaPipe Face Landmarker com matriz de
 * transformação facial). Usado para confirmar que a cabeça se move (VOR x1/x2) e medir a sua velocidade
 * (acuidade visual dinâmica). Valores aproximados.
 */
import { WASM_URLS, MODEL_URLS, firstReachable } from '../tracking/processors';
import { onLeave } from './router';

export interface HeadPose { t: number; yaw: number; pitch: number; ok: boolean }

export class HeadTracker {
  private lm: any;
  private stream?: MediaStream;
  private running = false;
  private lastTs = -1;
  video: HTMLVideoElement;
  /** histórico recente (≈ 3 s) */
  hist: HeadPose[] = [];

  constructor(video?: HTMLVideoElement) {
    this.video = video ?? document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    onLeave(() => this.stop());
  }

  async start(onPose?: (p: HeadPose) => void) {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const wasm = await firstReachable(WASM_URLS, (u) => `${u}/vision_wasm_internal.js`);
    const model = await firstReachable(MODEL_URLS, (u) => u);
    const fileset = await FilesetResolver.forVisionTasks(wasm);
    const opts = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: model, delegate },
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      outputFacialTransformationMatrixes: true,
    });
    try { this.lm = await FaceLandmarker.createFromOptions(fileset, opts('GPU')); }
    catch { this.lm = await FaceLandmarker.createFromOptions(fileset, opts('CPU')); }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
    this.video.srcObject = this.stream;
    await this.video.play();
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      if (this.video.videoWidth) {
        let ts = Math.round(performance.now());
        if (ts <= this.lastTs) ts = this.lastTs + 1;
        this.lastTs = ts;
        const res = this.lm.detectForVideo(this.video, ts);
        const m = res?.facialTransformationMatrixes?.[0]?.data as number[] | undefined;
        const t = ts / 1000;
        let p: HeadPose;
        if (m) {
          // matriz 4×4 em coluna; R02 = m[8], R22 = m[10], R12 = m[9]
          const yaw = (Math.atan2(m[8], m[10]) * 180) / Math.PI;
          const pitch = (Math.asin(Math.max(-1, Math.min(1, -m[9]))) * 180) / Math.PI;
          p = { t, yaw, pitch, ok: true };
        } else p = { t, yaw: NaN, pitch: NaN, ok: false };
        this.hist.push(p);
        while (this.hist.length && t - this.hist[0].t > 3) this.hist.shift();
        onPose?.(p);
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  /** Velocidade angular de yaw (°/s), média dos últimos ~100 ms. */
  yawVelocity(): number {
    const h = this.hist.filter((p) => p.ok);
    if (h.length < 3) return 0;
    const last = h[h.length - 1];
    const prev = [...h].reverse().find((p) => last.t - p.t >= 0.08);
    if (!prev) return 0;
    return (last.yaw - prev.yaw) / (last.t - prev.t);
  }

  /** Amplitude pico-a-pico e frequência (Hz) do yaw nos últimos `win` segundos. */
  oscillation(win = 2.5, axis: 'yaw' | 'pitch' = 'yaw'): { amp: number; freq: number; valid: number } {
    const now = this.hist.length ? this.hist[this.hist.length - 1].t : 0;
    const h = this.hist.filter((p) => p.ok && now - p.t <= win);
    if (h.length < 8) return { amp: 0, freq: 0, valid: h.length / Math.max(1, win * 30) };
    const x = h.map((p) => p[axis]);
    const mean = x.reduce((a, b) => a + b, 0) / x.length;
    const amp = Math.max(...x) - Math.min(...x);
    let crossings = 0;
    for (let i = 1; i < x.length; i++) if ((x[i - 1] - mean) * (x[i] - mean) < 0 && Math.abs(x[i] - mean) > amp * 0.05) crossings++;
    const dur = h[h.length - 1].t - h[0].t;
    return { amp, freq: dur > 0 ? crossings / 2 / dur : 0, valid: 1 };
  }

  stop() {
    this.running = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    try { this.lm?.close(); } catch { /* ignorar */ }
    this.lm = undefined;
  }
}
