// Teste de fumo ponta-a-ponta com Playwright (Chromium).
// Requer: `npm run build && npx vite preview --port 4173` e os vídeos sintéticos:
//   node scripts/make-synthetic-y4m.mjs test-videos/pc-right.y4m
//   ffmpeg -i test-videos/pc-right.y4m -c:v libvpx-vp9 -lossless 1 test-videos/pc-right.webm
// Uso: node scripts/e2e-smoke.mjs [dir-videos] [dir-screenshots]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { resolve } from 'node:path';

const vids = resolve(process.argv[2] ?? 'test-videos');
const shots = resolve(process.argv[3] ?? 'test-videos');
const URL = 'http://localhost:4173/';
const fail = (m) => { console.error('FALHOU:', m); process.exitCode = 1; };

const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${vids}/pc-right.y4m`],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on('pageerror', (e) => fail('erro na página: ' + e.message));

// 1. demo
await page.goto(URL);
await page.getByText('VPPB canal posterior direito (canalolitíase)').click();
const top = await page.locator('.hyp h3').first().textContent();
console.log('Demo → hipótese principal:', top);
if (!/canal posterior direito/.test(top)) fail('demo: hipótese inesperada');
await page.screenshot({ path: `${shots}/exam.png`, fullPage: true });
await page.getByText('Dix-Hallpike direito').first().click();
await page.waitForSelector('#plot canvas');
await page.screenshot({ path: `${shots}/test-demo.png`, fullPage: true });

// 2. ficheiro de vídeo (grande plano)
await page.goto(URL);
await page.getByRole('button', { name: 'Começar' }).click();
await page.locator('[data-test="dh-right"]').click();
await page.getByRole('button', { name: 'Ficheiro de vídeo' }).click();
await page.selectOption('#mode', 'closeup');
await page.setInputFiles('#file', `${vids}/pc-right.webm`);
await page.fill('#t0', '2');
await page.waitForFunction(() => !document.querySelector('#analyzeFile').disabled);
await page.click('#analyzeFile');
await page.waitForSelector('.summary', { timeout: 120000 });
const sumFile = await page.locator('.summary').textContent();
console.log('Ficheiro →', sumFile);
if (!/upbeat/.test(sumFile) || !/orelha direita/.test(sumFile)) fail('ficheiro: nistagmo não reconhecido');
await page.screenshot({ path: `${shots}/test-file.png`, fullPage: true });
await page.getByRole('button', { name: 'Guardar e voltar ao exame' }).click();
const topFile = await page.locator('.hyp h3').first().textContent();
console.log('Ficheiro → hipótese:', topFile);

// 3. câmara (câmara falsa com o mesmo vídeo sintético)
await page.locator('[data-test="dh-left"]').click();
await page.selectOption('#mode', 'closeup');
await page.click('#camOn');
await page.waitForFunction(() => !document.querySelector('#recStart').disabled, null, { timeout: 30000 });
await page.click('#recStart');
await page.waitForTimeout(2000);
await page.click('#markT0');
await page.waitForTimeout(24000);
await page.click('#recStop');
await page.waitForSelector('.summary', { timeout: 30000 });
const sumCam = await page.locator('.summary').textContent();
console.log('Câmara →', sumCam);
if (!/upbeat/.test(sumCam)) fail('câmara: nistagmo não reconhecido');
await page.screenshot({ path: `${shots}/test-camera.png`, fullPage: true });

await browser.close();
console.log(process.exitCode ? 'Com falhas.' : 'OK');
