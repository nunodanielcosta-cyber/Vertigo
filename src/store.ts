import type { Exam } from './types';

/**
 * Persistência local (apenas neste dispositivo). Os vídeos NÃO são guardados — só as
 * características extraídas e os sinais oculares. Nenhum dado sai do dispositivo.
 */
const KEY = 'vertigo.exams.v1';

export function newExam(label?: string): Exam {
  const now = new Date();
  return {
    id: Math.random().toString(36).slice(2, 10),
    label: label || `Exame ${now.toLocaleDateString('pt-PT')} ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`,
    createdAt: now.toISOString(),
    tests: {},
    redFlags: { neuroSymptoms: false, severeHeadache: false, cannotWalk: false, hearingLossAcute: false, vascularRisk: false },
  };
}

export function loadExams(): Exam[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Exam[]) : [];
  } catch {
    return [];
  }
}

export function saveExam(exam: Exam) {
  try {
    const all = loadExams().filter((e) => e.id !== exam.id);
    // não persistir URLs de blobs (inválidos após recarregar)
    const clean: Exam = JSON.parse(JSON.stringify(exam, (k, v) => (k === 'videoUrl' ? undefined : v)));
    all.unshift(clean);
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 30)));
  } catch {
    /* armazenamento indisponível ou cheio — o exame continua em memória */
  }
}

export function deleteExam(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadExams().filter((e) => e.id !== id)));
  } catch { /* ignorar */ }
}

export function exportExam(exam: Exam) {
  const blob = new Blob([JSON.stringify(exam, (k, v) => (k === 'videoUrl' ? undefined : v), 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vertigo-${exam.label.replace(/[^\w-]+/g, '_')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
