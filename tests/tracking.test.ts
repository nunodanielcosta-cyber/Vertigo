import { describe, it, expect } from 'vitest';
import { renderEye } from '../src/demo/eyeRender';
import { findPupil } from '../src/tracking/pupil';
import { irisProfile, TorsionTracker, angularShift } from '../src/tracking/torsion';

const W = 320, H = 240;
const img = (cx: number, cy: number, tor: number, pupilR = 22) => ({ data: renderEye({ width: W, height: H, cx, cy, pupilR, irisR: 60, torsionDeg: tor }), width: W, height: H });

describe('pupila', () => {
  it('encontra o centro da pupila com erro < 1 px', () => {
    for (const [cx, cy] of [[160, 120], [140.3, 115.7], [185, 128]]) {
      const p = findPupil(img(cx, cy, 0));
      expect(p.ok).toBe(true);
      expect(Math.abs(p.x - cx)).toBeLessThan(1);
      expect(Math.abs(p.y - cy)).toBeLessThan(1);
      expect(Math.abs(p.r - 22)).toBeLessThan(2.5);
    }
  });
  it('falha com olho fechado (sem contraste)', () => {
    const data = new Uint8Array(W * H).fill(140);
    expect(findPupil({ data, width: W, height: H }).ok).toBe(false);
  });
});

describe('torção', () => {
  it('mede rotação anti-horária como positiva', () => {
    const ref = irisProfile(img(160, 120, 0), 160, 120, 28, 56);
    for (const tor of [3, -5, 8.5]) {
      const cur = irisProfile(img(160, 120, tor), 160, 120, 28, 56);
      const { shift, corr } = angularShift(ref, cur);
      expect(corr).toBeGreaterThan(0.8);
      expect(Math.abs(shift - tor)).toBeLessThan(0.8);
    }
  });
  it('acumula com re-referenciação para rotações grandes', () => {
    const tr = new TorsionTracker();
    let last = 0;
    for (let k = 0; k <= 30; k++) {
      const tor = k * 1;
      last = tr.update(irisProfile(img(160, 120, tor), 160, 120, 28, 56));
    }
    expect(Math.abs(last - 30)).toBeLessThan(2.5);
  });
  it('compensa a rotação da cabeça', () => {
    const ref = irisProfile(img(160, 120, 0), 160, 120, 28, 56, { headRoll: 0 });
    // a imagem rodou 6° mas a cabeça também rodou 6° → torção olho-na-cabeça ≈ 0
    const cur = irisProfile(img(160, 120, 6), 160, 120, 28, 56, { headRoll: (6 * Math.PI) / 180 });
    expect(Math.abs(angularShift(ref, cur).shift)).toBeLessThan(0.8);
  });
});
