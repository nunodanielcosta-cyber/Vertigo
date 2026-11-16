/** Imagem em tons de cinzento (1 canal), com origem opcional para recortes. */
export interface GrayImage {
  data: Uint8Array | Uint8ClampedArray | Float32Array;
  width: number;
  height: number;
  /** posição do recorte na imagem original */
  ox?: number;
  oy?: number;
}

export function rgbaToGray(rgba: Uint8ClampedArray, width: number, height: number, ox = 0, oy = 0): GrayImage {
  const out = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) {
    // luminância (BT.601); em vídeo IV os 3 canais são praticamente iguais
    out[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  }
  return { data: out, width, height, ox, oy };
}

/** Amostragem bilinear em coordenadas da imagem ORIGINAL (tem em conta ox/oy). NaN fora dos limites. */
export function sampleBilinear(img: GrayImage, x: number, y: number): number {
  const lx = x - (img.ox ?? 0);
  const ly = y - (img.oy ?? 0);
  if (lx < 0 || ly < 0 || lx > img.width - 1.001 || ly > img.height - 1.001) return NaN;
  const x0 = Math.floor(lx), y0 = Math.floor(ly);
  const fx = lx - x0, fy = ly - y0;
  const w = img.width;
  const i = y0 * w + x0;
  const d = img.data;
  return (d[i] * (1 - fx) + d[i + 1] * fx) * (1 - fy) + (d[i + w] * (1 - fx) + d[i + w + 1] * fx) * fy;
}
