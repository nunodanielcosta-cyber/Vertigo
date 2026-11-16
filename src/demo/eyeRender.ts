/**
 * Renderizador de um olho sintético em tons de cinzento (tipo câmara IV de grande plano),
 * com textura da íris para testar a medição de torção. Usado nos testes e no gerador de vídeo.
 */
export interface EyeRenderSpec {
  width: number;
  height: number;
  cx: number;
  cy: number;
  pupilR: number;
  irisR: number;
  /** torção (graus, anti-horário visto pela câmara) */
  torsionDeg: number;
  seed?: number;
  noise?: number;
}

function textureFn(seed: number) {
  let s = seed || 7;
  const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const comps = Array.from({ length: 14 }, (_, k) => ({ f: 2 + k * 2 + Math.floor(r() * 3), a: 0.4 + r(), p: r() * Math.PI * 2 }));
  return (phi: number, rr: number) => {
    let v = 0;
    for (const c of comps) v += c.a * Math.sin(c.f * phi + c.p + rr * 2);
    return v / 4;
  };
}

export function renderEye(spec: EyeRenderSpec): Uint8Array {
  const { width: W, height: H, cx, cy, pupilR, irisR } = spec;
  const tex = textureFn(spec.seed ?? 7);
  const rot = (spec.torsionDeg * Math.PI) / 180;
  const out = new Uint8Array(W * H);
  let ns = (spec.seed ?? 7) * 7919;
  const noise = spec.noise ?? 3;
  const rnd = () => ((ns = (ns * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5) * 2 * noise;
  // abertura palpebral elíptica
  const ax = W * 0.46, ay = H * 0.36;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ex = (x - W / 2) / ax, ey = (y - H / 2) / ay;
      let v: number;
      if (ex * ex + ey * ey > 1) v = 140; // pele
      else {
        const dx = x - cx, dy = cy - y;
        const r = Math.hypot(dx, dy);
        if (r < pupilR) v = 18;
        else if (r < irisR) {
          const phi = Math.atan2(dy, dx) - rot; // textura roda com o olho
          v = 105 + 40 * tex(phi, (r - pupilR) / (irisR - pupilR));
        } else v = 210;
      }
      // reflexo corneano fixo (não roda)
      if (Math.hypot(x - cx - pupilR * 0.4, y - cy + pupilR * 0.4) < Math.max(1.5, pupilR * 0.18)) v = 250;
      out[y * W + x] = Math.max(0, Math.min(255, v + rnd()));
    }
  }
  return out;
}
