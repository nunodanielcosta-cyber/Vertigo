/**
 * Posições (keyframes) das manobras e provas posicionais, em 3D.
 * Referencial do mundo: x = direita do doente sentado, y = à frente, z = cima.
 * Referencial da cabeça: x = orelha direita, y = nariz, z = vértex.
 * Usado pela animação e pelo Epley guiado por sensores (gravidade esperada no referencial da cabeça).
 */
import type { Side } from '../types';
import type { Vec3, Mat3 } from '../core/sensors';

export type BodyPose = 'sit' | 'supine' | 'prone' | 'side-left' | 'side-right';

export interface Keyframe {
  body: BodyPose;
  /** rotação da cabeça sobre o pescoço, + = para a direita (°) */
  yaw: number;
  /** + = extensão (queixo para cima / cabeça pendente), − = flexão (°) */
  pitch: number;
  /** tempo de permanência sugerido (s); 0 = transição */
  hold: number;
  /** texto curto mostrado durante o passo */
  label: string;
  /** passo cuja direção exata não está estabelecida */
  uncertain?: boolean;
  /** passo em que a posição da cabeça em relação à gravidade não define a rotação (sentado) — o sensor usa o giroscópio */
  yawOnly?: boolean;
  /** passagem rápida (sem permanência) */
  transition?: boolean;
  /** rotação do corpo sobre o eixo longo (°), quando é preciso indicar o sentido da rotação (360° do Lempert) */
  roll?: number;
}

/** Deitado = tronco ao longo da marquesa (cabeça para −y); as posições laterais e o ventral obtêm-se
 * rodando sobre o eixo longo do corpo (roll), como na realidade. */
const BODY: Record<BodyPose, { pitch: number; roll: number }> = {
  sit: { pitch: 0, roll: 0 },
  supine: { pitch: 90, roll: 0 },
  prone: { pitch: 90, roll: 180 },
  'side-left': { pitch: 90, roll: -90 },
  'side-right': { pitch: 90, roll: 90 },
};

const r = (d: number) => (d * Math.PI) / 180;
const Rx = (a: number): Mat3 => { const c = Math.cos(r(a)), s = Math.sin(r(a)); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
const Ry = (a: number): Mat3 => { const c = Math.cos(r(a)), s = Math.sin(r(a)); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const Rz = (a: number): Mat3 => { const c = Math.cos(r(a)), s = Math.sin(r(a)); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
export function mul(a: Mat3, b: Mat3): Mat3 {
  const o = [[0, 0, 0], [0, 0, 0], [0, 0, 0]] as unknown as Mat3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
  return o;
}
export const apply = (m: Mat3, v: Vec3): Vec3 => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
export const transpose = (m: Mat3): Mat3 => [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];

/** Parâmetros contínuos (para interpolar na animação). */
export interface PoseParams { bodyPitch: number; bodyRoll: number; yaw: number; pitch: number; lying: number }
export function params(k: Keyframe): PoseParams {
  const b = BODY[k.body];
  return { bodyPitch: b.pitch, bodyRoll: k.roll ?? b.roll, yaw: k.yaw, pitch: k.pitch, lying: k.body === 'sit' ? 0 : 1 };
}
export function lerpParams(a: PoseParams, b: PoseParams, t: number): PoseParams {
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out
  const L = (x: number, y: number) => x + (y - x) * e;
  return { bodyPitch: L(a.bodyPitch, b.bodyPitch), bodyRoll: L(a.bodyRoll, b.bodyRoll), yaw: L(a.yaw, b.yaw), pitch: L(a.pitch, b.pitch), lying: L(a.lying, b.lying) };
}

export const bodyMatrix = (p: PoseParams) => mul(Ry(p.bodyRoll), Rx(p.bodyPitch));
/** cabeça → mundo: corpo · extensão (eixo x do corpo) · rotação (eixo z) */
export const headMatrix = (p: PoseParams) => mul(bodyMatrix(p), mul(Rx(p.pitch), Rz(-p.yaw)));

/** Direção da gravidade (para baixo) no referencial da cabeça. */
export function gravityInHead(k: Keyframe): Vec3 {
  return apply(transpose(headMatrix(params(k))), [0, 0, -1]);
}

/* ---------------- manobras ---------------- */
const opp = (s: Side): Side => (s === 'right' ? 'left' : 'right');
const sgn = (s: Side) => (s === 'right' ? 1 : -1);
const side = (s: Side): BodyPose => (s === 'right' ? 'side-right' : 'side-left');
const ld = (s: Side) => (s === 'right' ? 'direita' : 'esquerda');

export function keyframesFor(id: string): Keyframe[] | null {
  const m = /^(epley|semont|lempert|gufoni-geo|gufoni-apo|vannucchi|dix-hallpike|roll)-(right|left)$/.exec(id);
  if (id === 'yacovino') {
    return [
      { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Sentado, cabeça em posição neutra' },
      { body: 'supine', yaw: 0, pitch: 30, hold: 30, label: 'Deitar com a cabeça pendente ≥ 30°, na linha média' },
      { body: 'supine', yaw: 0, pitch: -40, hold: 30, label: 'Queixo ao peito, ainda deitado' },
      { body: 'sit', yaw: 0, pitch: -30, hold: 30, label: 'Sentar mantendo a cabeça fletida' },
      { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Endireitar a cabeça' },
    ];
  }
  if (!m) return null;
  const s = m[2] as Side, o = opp(s), k = sgn(s);
  switch (m[1]) {
    case 'dix-hallpike':
      return [
        { body: 'sit', yaw: 45 * k, pitch: 0, hold: 0, label: `Sentado, cabeça rodada 45° para a ${ld(s)}`, yawOnly: true },
        { body: 'supine', yaw: 45 * k, pitch: 20, hold: 45, label: 'Deitar rapidamente com a cabeça pendente 20–30°. Observar os olhos' },
        { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Voltar a sentar e observar nistagmo de reversão' },
      ];
    case 'roll':
      return [
        { body: 'supine', yaw: 0, pitch: -30, hold: 10, label: 'Deitado, cabeça fletida 30° (almofada)' },
        { body: 'supine', yaw: 90 * k, pitch: -30, hold: 45, label: `Rodar rapidamente a cabeça 90° para a ${ld(s)}. Observar` },
        { body: 'supine', yaw: 0, pitch: -30, hold: 15, label: 'Voltar ao centro' },
      ];
    case 'epley':
      return [
        { body: 'sit', yaw: 45 * k, pitch: 0, hold: 0, label: `Sentado, cabeça rodada 45° para a ${ld(s)}`, yawOnly: true },
        { body: 'supine', yaw: 45 * k, pitch: 20, hold: 45, label: `Deitar com a cabeça pendente 20–30°, ainda rodada para a ${ld(s)}` },
        { body: 'supine', yaw: -45 * k, pitch: 20, hold: 45, label: `Rodar a cabeça 90° para a ${ld(o)}, mantendo a extensão` },
        { body: side(o), yaw: -45 * k, pitch: 0, hold: 45, label: `Rodar o corpo para o lado ${ld(o)}, nariz a apontar para o chão` },
        { body: 'sit', yaw: -45 * k, pitch: -20, hold: 10, label: 'Sentar com a cabeça rodada e ligeiramente fletida' },
        { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Endireitar a cabeça' },
      ];
    case 'semont':
      return [
        { body: 'sit', yaw: -45 * k, pitch: 0, hold: 0, label: `Sentado na borda, cabeça rodada 45° para a ${ld(o)} (lado são)`, yawOnly: true },
        { body: side(s), yaw: -45 * k, pitch: 0, hold: 90, label: `Deitar rapidamente sobre o lado ${ld(s)} — face para cima` },
        { body: 'sit', yaw: -45 * k, pitch: 0, hold: 0, label: 'Num movimento rápido e contínuo, passar pela posição sentada…', transition: true },
        { body: side(o), yaw: -45 * k, pitch: 0, hold: 90, label: `Passar rapidamente para o lado ${ld(o)} sem rodar a cabeça — nariz para o chão` },
        { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Sentar lentamente' },
      ];
    case 'lempert':
      return [
        { body: 'supine', yaw: 90 * k, pitch: 0, hold: 30, label: `Deitado, cabeça rodada 90° para a ${ld(s)} (lado afetado)` },
        { body: 'supine', yaw: 0, pitch: 0, hold: 30, label: 'Rodar para a posição neutra (face para cima)' },
        { body: 'supine', yaw: -90 * k, pitch: 0, hold: 30, label: `Rodar 90° para a ${ld(o)}` },
        { body: 'prone', yaw: 0, pitch: 0, hold: 30, label: 'Rodar o corpo para decúbito ventral (nariz para baixo)', roll: -180 * k },
        { body: side(s), yaw: 0, pitch: 0, hold: 30, roll: -270 * k, label: `Continuar até à orelha ${s === 'right' ? 'direita' : 'esquerda'} para baixo (360°)` },
        { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Sentar pelo lado' },
      ];
    case 'gufoni-geo':
      return [
        { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Sentado na borda, cabeça neutra' },
        { body: side(o), yaw: 0, pitch: 0, hold: 60, label: `Deitar rapidamente sobre o lado ${ld(o)} (lado são)` },
        { body: side(o), yaw: -45 * k, pitch: 0, hold: 120, label: 'Rodar rapidamente a cabeça 45° — nariz para o chão' },
        { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Sentar lentamente' },
      ];
    case 'gufoni-apo':
      return [
        { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Sentado na borda, cabeça neutra' },
        { body: side(s), yaw: 0, pitch: 0, hold: 60, label: `Deitar rapidamente sobre o lado ${ld(s)} (lado afetado)` },
        { body: side(s), yaw: 0, pitch: 0, hold: 120, label: 'Rodar a cabeça 45° — sentido a confirmar no protocolo local', uncertain: true },
        { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Sentar lentamente' },
      ];
    case 'vannucchi':
      return [
        { body: 'sit', yaw: 0, pitch: 0, hold: 0, label: 'Sentado' },
        { body: side(o), yaw: 0, pitch: 0, hold: 0, label: `Deitar sobre o lado ${ld(o)} (são) e permanecer ~8–12 h` },
      ];
  }
  return null;
}
