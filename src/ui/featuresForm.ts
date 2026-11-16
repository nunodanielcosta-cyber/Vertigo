import type { NystagmusFeatures } from '../types';

/** Formulário editável das características do nistagmo (o clínico confirma/corrige a análise automática). */
export function featuresFormHtml(f: NystagmusFeatures): string {
  const pills = (name: string, val: string, opts: [string, string][]) =>
    `<div class="pills" role="radiogroup">${opts
      .map(([v, l]) => `<label class="pill"><input type="radio" name="${name}" value="${v}"${v === val ? ' checked' : ''}><span>${l}</span></label>`)
      .join('')}</div>`;
  const num = (name: string, label: string, val: number | null, unit: string) =>
    `<label class="field"><span>${label}</span><span class="input-unit"><input type="number" inputmode="decimal" name="${name}" step="0.1" min="0" value="${val ?? ''}"><em>${unit}</em></span></label>`;
  const chk = (name: string, label: string, val: boolean) =>
    `<label class="switch"><input type="checkbox" name="${name}"${val ? ' checked' : ''}><span class="track"></span>${label}</label>`;
  return `
  <form class="features" autocomplete="off">
    <div class="present-row">${chk('present', '<b>Nistagmo presente</b>', f.present)}</div>
    <fieldset>
      <legend>Direção da fase rápida</legend>
      <div class="dir-row"><span class="dir-label">Horizontal</span>${pills('horizontal', f.horizontal, [['none', 'Nenhum'], ['right', '→ Direita'], ['left', '← Esquerda']])}</div>
      <div class="dir-row"><span class="dir-label">Vertical</span>${pills('vertical', f.vertical, [['none', 'Nenhum'], ['up', '↑ Upbeat'], ['down', '↓ Downbeat']])}</div>
      <div class="dir-row"><span class="dir-label">Torsional<small>polo superior para a…</small></span>${pills('torsional', f.torsional, [['none', 'Nenhum'], ['right', 'Orelha dir.'], ['left', 'Orelha esq.'], ['unknown', 'Não avaliado']])}</div>
      <p class="hint">Direções no referencial do doente. Orelha direita = anti-horário visto pelo examinador.</p>
    </fieldset>
    <fieldset>
      <legend>Intensidade e evolução</legend>
      <div class="field-grid">
        ${num('peakSpvH', 'SPV pico horizontal', f.peakSpvH, '°/s')}
        ${num('peakSpvV', 'SPV pico vertical', f.peakSpvV, '°/s')}
        ${num('peakSpvT', 'SPV pico torsional', f.peakSpvT, '°/s')}
        ${num('latency', 'Latência', f.latency, 's')}
        ${num('duration', 'Duração', f.duration, 's')}
      </div>
      <div class="switches">
        ${chk('persistent', 'Persistente (até ao fim do registo)', f.persistent)}
        ${chk('crescendoDecrescendo', 'Crescendo-decrescendo', f.crescendoDecrescendo)}
        ${chk('directionChangesInPosition', 'Muda de direção na mesma posição', f.directionChangesInPosition)}
      </div>
    </fieldset>
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
    horizontal: (fd.get('horizontal') ?? 'none') as NystagmusFeatures['horizontal'],
    vertical: (fd.get('vertical') ?? 'none') as NystagmusFeatures['vertical'],
    torsional: (fd.get('torsional') ?? 'none') as NystagmusFeatures['torsional'],
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
