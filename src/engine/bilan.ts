import type { Grade } from '../domain/types';

/*
 * CHANTIER 356 — LE BILAN D'UNE SESSION.
 *
 * On garde la PREMIÈRE note de chaque carte : une carte ratée revient dans
 * la séance jusqu'à être réussie, et la dernière note serait presque
 * toujours « Bien ». La réussite = Bien + Facile du premier coup.
 */
export interface NoteSession { id: string; en: string; fr: string; note: Grade }
export interface BilanSession { notes: NoteSession[]; duree: number }

export const ORDRE_NOTES: Grade[] = ['again', 'hard', 'good', 'easy'];
export const NOM_NOTE: Record<Grade, string> = { again: 'Raté', hard: 'Dur', good: 'Bien', easy: 'Facile' };

export function compteNotes(b: BilanSession): Record<Grade, number> {
  const c: Record<Grade, number> = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const n of b.notes) c[n.note] += 1;
  return c;
}

export function reussite(b: BilanSession): number {
  if (!b.notes.length) return 0;
  const c = compteNotes(b);
  return Math.round(((c.good + c.easy) / b.notes.length) * 100);
}

function minuit(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Quand reviennent les cartes de la session : d'ici demain, dans la semaine, plus tard. */
export function retours(dues: number[], maintenant = Date.now()): { demain: number; semaine: number; plusTard: number } {
  const r = { demain: 0, semaine: 0, plusTard: 0 };
  const auj = minuit(maintenant);
  for (const due of dues) {
    const jours = Math.round((minuit(due) - auj) / 86_400_000);
    if (jours <= 1) r.demain += 1;
    else if (jours <= 7) r.semaine += 1;
    else r.plusTard += 1;
  }
  return r;
}
