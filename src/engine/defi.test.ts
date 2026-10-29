import { describe, expect, it } from 'vitest';
import { estAcquis, finDuJour, tirerMots, xpDefi, type MotDefi } from './defi';
import { EMPTY_STREAK, mergeStreak, noterDefi, record } from './streak';
import { bilan } from './xp';
import type { Progress } from '../domain/types';

const NOW = new Date('2026-10-28T10:00:00').getTime();
const JOUR = 86_400_000;
function prog(o: Partial<Progress>): Progress {
  return { cardId: 'd:1', due: NOW + 5 * JOUR, stability: 10, difficulty: 5, elapsedDays: 0, scheduledDays: 5, learningSteps: 0, reps: 3, lapses: 0, state: 2, lastGrade: 'good', ...o };
}
function mot(i: number, en = `word ${i}`): MotDefi {
  return { deckId: 'd', card: { id: `d:${i}`, en, fr: `mot ${i}`, theme: 't' } as MotDefi['card'], progress: prog({ cardId: `d:${i}`, lastReview: i }) };
}

describe('défi éclair', () => {
  it('ne retient que les mots acquis, pas dus aujourd’hui', () => {
    const fin = finDuJour(NOW);
    expect(estAcquis(prog({}), fin)).toBe(true);
    expect(estAcquis(prog({ reps: 1 }), fin)).toBe(false);
    expect(estAcquis(prog({ lastGrade: 'hard' }), fin)).toBe(false);
    expect(estAcquis(prog({ lastGrade: 'again' }), fin)).toBe(false);
    expect(estAcquis(prog({ due: NOW + 3600_000 }), fin)).toBe(false);
    expect(estAcquis(undefined, fin)).toBe(false);
  });

  it('tire 5 mots distincts, ou rien s’il en manque', () => {
    const t = tirerMots(Array.from({ length: 30 }, (_, i) => mot(i)), 5, () => 0.3);
    expect(t).toHaveLength(5);
    expect(new Set(t.map((m) => m.card.en)).size).toBe(5);
    expect(tirerMots([mot(1), mot(2), mot(3), mot(4), mot(5, 'word 1')])).toEqual([]);
  });

  it('rapporte 10 XP pour 5/5, 5 XP pour 4/5, rien en dessous', () => {
    expect([5, 4, 3, 0].map(xpDefi)).toEqual([10, 5, 0, 0]);
    const jour = '2026-10-28';
    const s = record(EMPTY_STREAK, jour);
    const base = bilan(s, jour).xp;
    expect(bilan(noterDefi(s, 5, jour), jour).xp).toBe(base + 10);
    expect(bilan(noterDefi(s, 4, jour), jour).xp).toBe(base + 5);
  });

  it('garde le résultat du défi d’un jour à l’autre et entre appareils', () => {
    const a = noterDefi(record(EMPTY_STREAK, '2026-10-27'), 4, '2026-10-27');
    const b = record(a, '2026-10-28');
    expect(b.defis?.['2026-10-27']).toBe(4);
    expect(mergeStreak(record(EMPTY_STREAK, '2026-10-27'), a).defis?.['2026-10-27']).toBe(4);
  });
});
