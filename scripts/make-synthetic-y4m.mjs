// Gera um vídeo Y4M de um olho sintético (grande plano, tipo IV) com nistagmo de VPPB do
// canal posterior direito (upbeat + torsional para a orelha direita). Útil para testar a app
// sem doente: em Chromium, --use-fake-device-for-media-stream --use-file-for-fake-video-capture=<ficheiro>.
// Uso: node scripts/make-synthetic-y4m.mjs [saida.y4m]
import { writeFileSync, openSync, writeSync, closeSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { renderEye } from '../src/demo/eyeRender.ts';
import { generateSynthetic } from '../src/demo/synthetic.ts';

const out = process.argv[2] ?? 'test-videos/pc-right.y4m';
mkdirSync(dirname(out), { recursive: true });
const W = 320, H = 240, FPS = 30;
const eyeR = 0.32 * W;
const rec = generateSynthetic({ duration: 26, t0: 2, spvH: 0, spvV: -8, spvT: -12, latency: 3, nystDuration: 16, noise: 0, torNoise: 0, fs: FPS, seed: 3 });
const fd = openSync(out, 'w');
writeSync(fd, `YUV4MPEG2 W${W} H${H} F${FPS}:1 Ip A1:1 C420jpeg\n`);
const chroma = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
const deg = (d) => (d * Math.PI) / 180;
for (const s of rec.samples) {
  const cx = W / 2 - Math.sin(deg(s.h)) * eyeR; // + = direita do doente = esquerda da imagem
  const cy = H / 2 - Math.sin(deg(s.v)) * eyeR;
  const y = renderEye({ width: W, height: H, cx, cy, pupilR: 20, irisR: 0.5 * eyeR, torsionDeg: s.tor, seed: 7 });
  writeSync(fd, 'FRAME\n');
  writeSync(fd, Buffer.from(y.buffer, y.byteOffset, y.byteLength));
  writeSync(fd, chroma);
}
closeSync(fd);
console.log(`Escrito ${out} (${rec.samples.length} frames)`);
