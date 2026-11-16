import type { NystagmusFeatures } from '../types';

/** Formulário editável das características do nistagmo (o clínico pode confirmar/corrigir a análise automática). */
export function featuresFormHtml(f: NystagmusFeatures): string {
  const sel = (name: string, val: string, opts: [string, string][]) =>
    `<select name="${name}">${opts.map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  const num = (name: string, val: number | null, step = '0.1') =>
    `<input type="number" inputmode="decimal" name="${name}" step="${step}" min="0" value="${val ?? ''}">`;
  const chk = (name: string, val: boolean) => `<input type="checkbox" name="${name}"${val ? ' checked' : ''}>`;
  return `
  <form class="features" autocomplete="off">
    <label class="chk wide">${chk('present', f.present)} Nistagmo presente</label>
    <label>Horizontal (fase rápida)${sel('horizontal', f.horizontal, [['none', '—'], ['right', 'para a direita'], ['left', 'para a esquerda']])}</label>
    <label>Vertical (fase rápida)${sel('vertical', f.vertical, [['none', '—'], ['up', 'para cima (upbeat)'], ['down', 'para baixo (downbeat)']])}</label>
    <label>Torsional (polo superior)${sel('torsional', f.torsional, [['none', '—'], ['right', 'p/ orelha direita (anti-horário*)'], ['left', 'p/ orelha esquerda (horário*)'], ['unknown', 'não avaliado']])}</label>
    <label>SPV pico H (°/s)${num('peakSpvH', f.peakSpvH)}</label>
    <label>SPV pico V (°/s)${num('peakSpvV', f.peakSpvV)}</label>
    <label>SPV pico T (°/s)${num('peakSpvT', f.peakSpvT)}</label>
    <label>Latência (s)${num('latency', f.latency)}</label>
    <label>Duração (s)${num('duration', f.duration)}</label>
    <label class="chk">${chk('persistent', f.persistent)} Persistente (&gt; fim do registo)</label>
    <label class="chk">${chk('crescendoDecrescendo', f.crescendoDecrescendo)} Crescendo-decrescendo</label>
    <label class="chk">${chk('directionChangesInPosition', f.directionChangesInPosition)} Muda de direção na mesma posição</label>
    <p class="hint wide">* sentido visto pelo examinador, de frente para o doente.</p>
  </form>`;
}

export function readFeaturesForm(form: HTMLFormElement, base: NystagmusFeatures): NystagmusFeatures {
  const fd = new FormData(form);
  const n = (k: string) => {
    const v = fd.get(k);
    return v === null || v === '' ? null : Number(v);
  };
  return {
    ...base,
    present: fd.get('present') === 'on',
    horizontal: fd.get('horizontal') as NystagmusFeatures['horizontal'],
    vertical: fd.get('vertical') as NystagmusFeatures['vertical'],
    torsional: fd.get('torsional') as NystagmusFeatures['torsional'],
    peakSpvH: n('peakSpvH') ?? 0,
    peakSpvV: n('peakSpvV') ?? 0,
    peakSpvT: n('peakSpvT') ?? 0,
    latency: n('latency'),
    duration: n('duration'),
    persistent: fd.get('persistent') === 'on',
    crescendoDecrescendo: fd.get('crescendoDecrescendo') === 'on',
    directionChangesInPosition: fd.get('directionChangesInPosition') === 'on',
    edited: true,
  };
}
