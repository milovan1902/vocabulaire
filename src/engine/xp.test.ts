/** CHANTIER 168 — les XP gagnés par l'assiduité. */
import { describe, it, expect } from 'vitest';
import { EMPTY_STREAK, compterCarte, mergeStreak, record, shiftDay, type Streak } from './streak';
import { bonusSerie, gainDuJour, serieValidee, xpTotal, XP_MAX_GRATUIT } from './xp';

const J0 = '2026-10-01';

/** n jours d'affilée à partir de J0, avec `cartes` cartes chacun. */
function jours(n: number, cartes = 20, depart = J0, s: Streak = EMPTY_STREAK): Streak {
  let r = s;
  for (let i = 0; i < n; i++) {
    const d = shiftDay(depart, i);
    r = record(r, d);
    for (let k = 0; k < cartes; k++) r = compterCarte(r, d);
  }
  return r;
}

describe('XP par assiduité', () => {
  it('bonus : +20 au 5e jour, +40 au 10e, +60 au 15e puis plafonné', () => {
    expect([1, 4, 5, 10, 15, 20, 25].map(bonusSerie)).toEqual([0, 0, 20, 40, 60, 60, 60]);
  });

  it('5 jours à 20 cartes = 120 XP', () => {
    expect(xpTotal(jours(5), false)).toBe(120);
  });

  it('19 cartes ne valident pas la journée', () => {
    expect(xpTotal(jours(5, 19), false)).toBe(0);
  });

  it('un jour non validé remet le bonus à zéro, pas les XP', () => {
    let s = jours(4);                                  // 80
    s = jours(1, 5, shiftDay(J0, 4), s);               // jour raté
    s = jours(5, 20, shiftDay(J0, 5), s);              // 100 + 20 de bonus
    expect(xpTotal(s, false)).toBe(80 + 120);
  });

  it('les jours d’avant la mise à jour valent 20 XP, sans bonus', () => {
    const ancien: Streak = { ...EMPTY_STREAK, days: [0, 1, 2, 3, 4, 5].map((i) => shiftDay(J0, i)) };
    expect(xpTotal(ancien, false)).toBe(120);
    expect(serieValidee(ancien, shiftDay(J0, 5))).toBe(6);
  });

  it('plafond à 1 000 XP en gratuit, aucun en payant', () => {
    const s = jours(60);
    expect(xpTotal(s, false)).toBe(XP_MAX_GRATUIT);
    expect(xpTotal(s, true)).toBeGreaterThan(XP_MAX_GRATUIT);
  });

  it('la flamme tient tant que la journée est en cours', () => {
    let s = jours(3);
    const auj = shiftDay(J0, 3);
    s = jours(1, 7, auj, s);
    expect(serieValidee(s, auj)).toBe(3);
    expect(gainDuJour(s, auj)).toEqual({ valide: false, xp: 20 });
  });

  it('fusion : le plus grand compteur du jour, jamais la somme', () => {
    const a = jours(1, 12);
    const b = jours(1, 15);
    expect(mergeStreak(a, b).counts?.[J0]).toBe(15);
    expect(mergeStreak(b, b).counts?.[J0]).toBe(15);
  });
});
