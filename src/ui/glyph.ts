import type { NystagmusFeatures } from '../types';

let uid = 0;

/**
 * Esquema do nistagmo como os clínicos o desenham: olho visto pelo EXAMINADOR
 * (a direita do doente fica à esquerda do desenho — marcado com D/E), com setas
 * na direção da fase rápida e arco para o componente torsional.
 */
export function nystagmusGlyph(f: NystagmusFeatures | undefined, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const id = `g${++uid}`;
  const state = !f ? 'empty' : f.present ? 'pos' : 'neg';
  const arrows: string[] = [];
  if (f?.present) {
    // cada seta é desenhada duas vezes: contorno com a cor da superfície + traço colorido
    const draw = (shape: string) => arrows.push(shape.replace('CLS', 'g-halo'), shape.replace('CLS', 'g-arrow'));
    const line = (x2: number, y2: number) => `<line x1="60" y1="36" x2="${x2}" y2="${y2}" class="CLS" marker-end="url(#${id}m)"/>`;
    if (f.vertical === 'up') draw(line(60, f.torsional === 'right' || f.torsional === 'left' ? 16 : 8));
    if (f.vertical === 'down') draw(line(60, 64));
    // direita do doente = esquerda do desenho
    if (f.horizontal === 'right') draw(line(27, 36));
    if (f.horizontal === 'left') draw(line(93, 36));
    if (f.torsional === 'right') draw(`<path d="M86 21 A30 30 0 0 0 34 21" class="CLS" marker-end="url(#${id}m)"/>`);
    if (f.torsional === 'left') draw(`<path d="M34 21 A30 30 0 0 1 86 21" class="CLS" marker-end="url(#${id}m)"/>`);
    if (!arrows.length) arrows.push(`<text x="60" y="40" class="g-q">?</text>`);
  }
  const label = !f ? 'Prova não realizada' : !f.present ? 'Sem nistagmo' : 'Esquema do nistagmo (vista do examinador)';
  return `<svg class="glyph glyph-${size} glyph-${state}" viewBox="0 0 120 72" role="img" aria-label="${label}">
    <defs><marker id="${id}m" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.6" markerHeight="3.6" markerUnits="strokeWidth" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="g-head"/></marker></defs>
    <path d="M10 36 Q60 -6 110 36 Q60 78 10 36 Z" class="g-eye"/>
    <circle cx="60" cy="36" r="17" class="g-iris"/>
    <circle cx="60" cy="36" r="7" class="g-pupil"/>
    ${arrows.join('')}
    <text x="3" y="40" class="g-side">D</text><text x="117" y="40" class="g-side" text-anchor="end">E</text>
  </svg>`;
}
