// Copia o runtime WASM do MediaPipe e descarrega o modelo Face Landmarker para public/,
// para que a app funcione offline (sem depender de CDN). Corre automaticamente após `npm install`.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const wasmSrc = 'node_modules/@mediapipe/tasks-vision/wasm';
if (existsSync(wasmSrc)) {
  mkdirSync('public/mediapipe', { recursive: true });
  cpSync(wasmSrc, 'public/mediapipe/wasm', { recursive: true });
  console.log('✓ WASM do MediaPipe copiado para public/mediapipe/wasm');
}
const model = 'public/models/face_landmarker.task';
if (!existsSync(model)) {
  mkdirSync('public/models', { recursive: true });
  try {
    execFileSync('curl', ['-fsSL', '-o', model, MODEL_URL], { stdio: 'inherit' });
    console.log('✓ Modelo descarregado para', model);
  } catch {
    try {
      const r = await fetch(MODEL_URL);
      if (!r.ok) throw new Error(String(r.status));
      writeFileSync(model, Buffer.from(await r.arrayBuffer()));
      console.log('✓ Modelo descarregado para', model);
    } catch (e) {
      console.warn('⚠ Não foi possível descarregar o modelo; a app usará o CDN em tempo de execução.', e?.message ?? e);
    }
  }
}
