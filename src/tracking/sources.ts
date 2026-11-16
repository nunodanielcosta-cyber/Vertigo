/** Fontes de vídeo: câmara em direto (com gravação) e ficheiro de vídeo (processado frame a frame). */

export type FrameCallback = (video: HTMLVideoElement, t: number) => void;

export class CameraSource {
  stream?: MediaStream;
  private recorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private running = false;
  private t0 = 0;
  private handle = 0;

  constructor(public video: HTMLVideoElement) {}

  async start(facing: 'user' | 'environment') {
    this.stop();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
    });
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play();
  }

  /** Inicia o ciclo de processamento + gravação do vídeo. */
  record(onFrame: FrameCallback) {
    if (!this.stream) throw new Error('Câmara não iniciada');
    this.chunks = [];
    try {
      const mime = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
      this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
      this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
      this.recorder.start(1000);
    } catch {
      this.recorder = undefined; // gravação de vídeo indisponível — continua só com a análise
    }
    this.running = true;
    this.t0 = performance.now();
    const v = this.video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number };
    const loop = () => {
      if (!this.running) return;
      onFrame(this.video, (performance.now() - this.t0) / 1000);
      schedule();
    };
    const schedule = () => {
      if (v.requestVideoFrameCallback) this.handle = v.requestVideoFrameCallback(loop);
      else this.handle = requestAnimationFrame(loop);
    };
    schedule();
  }

  elapsed() { return (performance.now() - this.t0) / 1000; }

  /** Para o processamento e devolve o vídeo gravado (se disponível). */
  async finish(): Promise<Blob | null> {
    this.running = false;
    cancelAnimationFrame(this.handle);
    const rec = this.recorder;
    if (!rec || rec.state === 'inactive') return null;
    await new Promise<void>((res) => { rec.onstop = () => res(); rec.stop(); });
    return new Blob(this.chunks, { type: rec.mimeType || 'video/webm' });
  }

  stop() {
    this.running = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
  }
}

/**
 * Processa um ficheiro de vídeo frame a frame por "seek" determinístico,
 * independentemente da velocidade de processamento do dispositivo.
 */
export async function processVideoFile(
  video: HTMLVideoElement,
  fps: number,
  onFrame: FrameCallback,
  onProgress: (p: number) => void,
  shouldStop: () => boolean,
) {
  video.pause();
  video.muted = true;
  if (video.readyState < 1) await new Promise((r) => video.addEventListener('loadedmetadata', r, { once: true }));
  const dur = video.duration;
  if (!Number.isFinite(dur) || dur <= 0) throw new Error('Não foi possível ler a duração do vídeo.');
  const n = Math.floor(dur * fps);
  for (let i = 0; i < n; i++) {
    if (shouldStop()) break;
    const t = i / fps;
    await seek(video, t);
    onFrame(video, t);
    if (i % 5 === 0) onProgress(i / n);
  }
  onProgress(1);
}

function seek(video: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    const done = () => { video.removeEventListener('seeked', done); resolve(); };
    video.addEventListener('seeked', done);
    video.currentTime = Math.min(t, Math.max(0, video.duration - 0.001));
  });
}
