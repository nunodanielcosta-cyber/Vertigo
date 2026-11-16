/** Sons: bips de início/fim, metrónomo e tons puros para o teste de audição. */
let ctx: AudioContext | null = null;
export function audio(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function beep(freq = 880, dur = 0.12, gain = 0.25, when = 0) {
  try {
    const a = audio();
    const t = a.currentTime + when;
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch { /* sem áudio */ }
}

export const beepStart = () => { beep(660, 0.15); beep(990, 0.2, 0.25, 0.18); };
export const beepEnd = () => { beep(990, 0.15); beep(660, 0.25, 0.25, 0.18); };

export function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-PT';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* ignorar */ }
}

/** Metrónomo com agendamento preciso pelo relógio do AudioContext. */
export class Metronome {
  private timer = 0;
  private next = 0;
  private beat = 0;
  running = false;
  constructor(public bpm: number, private onBeat?: (n: number) => void) {}
  start() {
    if (this.running) return;
    const a = audio();
    this.running = true;
    this.beat = 0;
    this.next = a.currentTime + 0.1;
    const tick = () => {
      if (!this.running) return;
      while (this.next < a.currentTime + 0.12) {
        const n = this.beat++;
        beep(n % 2 === 0 ? 1200 : 900, 0.05, 0.3, this.next - a.currentTime);
        const delay = (this.next - a.currentTime) * 1000;
        setTimeout(() => this.running && this.onBeat?.(n), Math.max(0, delay));
        this.next += 60 / this.bpm;
      }
      this.timer = window.setTimeout(tick, 25);
    };
    tick();
  }
  stop() { this.running = false; clearTimeout(this.timer); }
}

/**
 * Tom puro num ouvido (canal estéreo) com nível em dB relativo ao máximo (0 dB = ganho 1).
 * Não calibrado: serve para seguir a variação ao longo do tempo no mesmo equipamento.
 */
export function tone(freq: number, dBrel: number, ear: 'right' | 'left', dur = 1.2): Promise<void> {
  const a = audio();
  const o = a.createOscillator();
  const g = a.createGain();
  const p = a.createStereoPanner();
  o.frequency.value = freq;
  p.pan.value = ear === 'right' ? 1 : -1;
  const peak = Math.pow(10, dBrel / 20);
  const t = a.currentTime + 0.05;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.05);
  g.gain.setValueAtTime(peak, t + dur - 0.05);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(p).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
  return new Promise((r) => (o.onended = () => r()));
}
