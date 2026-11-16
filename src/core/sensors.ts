/**
 * Sensores de movimento do telemóvel (DeviceOrientation / DeviceMotion).
 * Convenções W3C: referencial do dispositivo x → direita do ecrã, y → topo do ecrã, z → para fora do ecrã.
 */
import { onLeave } from './router';

export type Vec3 = [number, number, number];
export type Mat3 = [Vec3, Vec3, Vec3]; // linhas

export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: Vec3): Vec3 => { const n = norm(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const angleDeg = (a: Vec3, b: Vec3) => (Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;

/** Vetor "para cima" (oposto à gravidade) expresso no referencial do dispositivo, a partir de beta/gamma. */
export function upFromOrientation(beta: number, gamma: number): Vec3 {
  const b = rad(beta), g = rad(gamma);
  return [-Math.cos(b) * Math.sin(g), Math.sin(b), Math.cos(b) * Math.cos(g)];
}

/** Matriz de rotação dispositivo → terra (R = Rz(α)·Rx(β)·Ry(γ)). */
export function rotationMatrix(alpha: number, beta: number, gamma: number): Mat3 {
  const a = rad(alpha), b = rad(beta), g = rad(gamma);
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
  return [
    [ca * cg - sa * sb * sg, -cb * sa, ca * sg + cg * sa * sb],
    [cg * sa + ca * sb * sg, ca * cb, sa * sg - ca * cg * sb],
    [-cb * sg, sb, cb * cg],
  ];
}
export const mulMV = (m: Mat3, v: Vec3): Vec3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];

/** Pede autorização (iOS ≥ 13 exige um gesto do utilizador). */
export async function requestMotionPermission(): Promise<boolean> {
  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  const DME = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  try {
    if (DOE?.requestPermission) { if ((await DOE.requestPermission()) !== 'granted') return false; }
    if (DME?.requestPermission) { if ((await DME.requestPermission()) !== 'granted') return false; }
    return 'DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window;
  } catch {
    return false;
  }
}

export interface OrientationSample { t: number; alpha: number; beta: number; gamma: number }
export interface MotionSample { t: number; ax: number; ay: number; az: number; gx: number; gy: number; gz: number; ra: number; rb: number; rg: number }

/** Escuta a orientação; para automaticamente ao sair da vista. */
export function listenOrientation(cb: (s: OrientationSample) => void) {
  const h = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    cb({ t: performance.now() / 1000, alpha: e.alpha ?? 0, beta: e.beta, gamma: e.gamma });
  };
  window.addEventListener('deviceorientation', h);
  const stop = () => window.removeEventListener('deviceorientation', h);
  onLeave(stop);
  return stop;
}

/** Escuta aceleração (sem gravidade, m/s²), aceleração com gravidade e velocidade angular (°/s). */
export function listenMotion(cb: (s: MotionSample) => void) {
  const h = (e: DeviceMotionEvent) => {
    const a = e.acceleration, g = e.accelerationIncludingGravity, r = e.rotationRate;
    cb({
      t: performance.now() / 1000,
      ax: a?.x ?? NaN, ay: a?.y ?? NaN, az: a?.z ?? NaN,
      gx: g?.x ?? NaN, gy: g?.y ?? NaN, gz: g?.z ?? NaN,
      ra: r?.alpha ?? NaN, rb: r?.beta ?? NaN, rg: r?.gamma ?? NaN,
    });
  };
  window.addEventListener('devicemotion', h);
  const stop = () => window.removeEventListener('devicemotion', h);
  onLeave(stop);
  return stop;
}

/** Mantém o ecrã ligado durante provas/exercícios (quando suportado). */
export async function keepAwake(): Promise<() => void> {
  try {
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    const lock = await nav.wakeLock?.request('screen');
    const rel = () => { void lock?.release().catch(() => undefined); };
    onLeave(rel);
    return rel;
  } catch {
    return () => undefined;
  }
}

export const hasMotionSensors = () => 'DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window;
