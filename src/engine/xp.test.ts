/** CHANTIER 168 / 228 — les XP : semaine de cinq jours, week-end et gels. */
import { describe, it, expect } from 'vitest';
import { EMPTY_STREAK, compterCarte, mergeStreak, record, shiftDay, type Streak } from './streak';
import {
  bonusSemaine, gainDuJour, gelsEnReserve, historiqueXp, semaineEnCours, serieValidee, xpTotal, XP_MAX_GRATUIT,
} from './xp';

/** Un lundi. */
const L0 = '2026-09-07';

function jour(s: Streak, d: string, cartes = 20): Streak {
  let r = record(s, d);
  for (let k = 0; k < cartes; k++) r = compterCarte(r, d);
  return r;
}
/** Motif lun→dim : « 1 » = jour validé. */
function semaine(s: Streak, lundi: string, motif: string): Streak {
  let r = s;
  for (let i = 0; i < 7; i++) if (motif[i] === '1') r = jour(r, shiftDay(lundi, i));
  return r;
}
const sem = (n: number) => shiftDay(L0, 7 * n);
const dim = (n: number) => shiftDay(sem(n), 6);

describe('XP — semaine de cinq jours', () => {
  it('bonus de semaine : +20, +40, puis +60', () => {
    expect([0, 1, 2, 3, 4, 10].map(bonusSemaine)).toEqual([0, 20, 40, 60, 60, 60]);
  });

  it('5 / 5 sans week-end = 120 XP', () => {
    expect(xpTotal(semaine(EMPTY_STREAK, L0, '1111100'), false, dim(0))).toBe(120);
  });

  it('5 / 5 + week-end = 180 XP et 2 gels', () => {
    const s = semaine(EMPTY_STREAK, L0, '1111111');
    expect(xpTotal(s, false, dim(0))).toBe(180);
    expect(gelsEnReserve(s, dim(0))).toBe(2);
  });

  it('19 cartes ne valident pas la journée', () => {
    let s = EMPTY_STREAK;
    for (let i = 0; i < 5; i++) s = jour(s, shiftDay(L0, i), 19);
    expect(xpTotal(s, false, dim(0))).toBe(0);
  });

  it('le tableau validé, semaine par semaine', () => {
    let s = EMPTY_STREAK;
    const attendu: Array<[string, number, number]> = [
      ['1111111', 180, 2],
      ['1111111', 200, 4],
      ['1101111', 200, 4],  // mercredi gelé : 0 XP, bonus +60 ; le dimanche ne donne plus de gel (réserve pleine)
      ['1111111', 220, 4],
      ['1100000', 100, 1],  // 3 gels posés : 40 + 60
      ['1100000', 40, 1],   // il faudrait 3 gels, il n'y en a qu'un : aucun n'est utilisé
      ['1111100', 120, 1],  // le bonus repart à +20
    ];
    let cumul = 0;
    attendu.forEach(([motif, xp, gels], n) => {
      s = semaine(s, sem(n), motif);
      cumul += xp;
      expect(xpTotal(s, true, dim(n))).toBe(cumul);
      expect(gelsEnReserve(s, dim(n))).toBe(gels);
    });
  });

  it('un jour gelé rapporte 0 XP mais le vendredi porte le bonus', () => {
    let s = semaine(EMPTY_STREAK, L0, '0000011');
    s = semaine(s, sem(1), '1101100');
    const h = historiqueXp(s, 7, dim(1));
    expect(h.map((j) => j.etat)).toEqual(['valide', 'valide', 'gel', 'valide', 'valide', 'repos', 'repos']);
    expect(h[2].base).toBe(0);
    expect(h[4].bonus).toBe(20);
  });

  it('les jours de cette semaine repartent à zéro le lundi', () => {
    const s = semaine(EMPTY_STREAK, L0, '1111111');
    expect(semaineEnCours(s, dim(0)).ouvres).toBe(5);
    expect(semaineEnCours(s, dim(0)).weekend).toBe(2);
    expect(semaineEnCours(s, sem(1)).ouvres).toBe(0);
  });

  it('vendredi qui boucle le 5 / 5 : +20 XP du jour + le bonus', () => {
    let s = semaine(EMPTY_STREAK, L0, '1111000');
    const ven = shiftDay(L0, 4);
    s = jour(s, ven, 7);
    expect(gainDuJour(s, ven)).toEqual({ valide: false, xp: 40, gel: false });
    s = jour(s, ven, 13);
    expect(gainDuJour(s, ven)).toEqual({ valide: true, xp: 40, gel: false });
  });

  it('samedi : 30 XP et un gel', () => {
    const s = semaine(EMPTY_STREAK, L0, '0000010');
    expect(gainDuJour(s, shiftDay(L0, 5))).toEqual({ valide: true, xp: 30, gel: true });
  });

  it('la flamme : un jour manqué en semaine ne la casse pas tant qu’un gel peut le combler', () => {
    let s = semaine(EMPTY_STREAK, L0, '1111111');       // 2 gels
    s = semaine(s, sem(1), '1010000');                   // mardi manqué, mercredi fait
    expect(serieValidee(s, shiftDay(sem(1), 2))).toBe(9);
    const sansGel = semaine(semaine(EMPTY_STREAK, L0, '1111100'), sem(1), '1010000');
    expect(serieValidee(sansGel, shiftDay(sem(1), 2))).toBe(1);
  });

  it('plafond à 1 000 XP en gratuit, aucun en payant', () => {
    let s = EMPTY_STREAK;
    for (let n = 0; n < 8; n++) s = semaine(s, sem(n), '1111111');
    expect(xpTotal(s, false, dim(7))).toBe(XP_MAX_GRATUIT);
    expect(xpTotal(s, true, dim(7))).toBeGreaterThan(XP_MAX_GRATUIT);
  });

  it('fusion : le plus grand compteur du jour, jamais la somme', () => {
    const a = jour(EMPTY_STREAK, L0, 12);
    const b = jour(EMPTY_STREAK, L0, 15);
    expect(mergeStreak(a, b).counts?.[L0]).toBe(15);
    expect(mergeStreak(b, b).counts?.[L0]).toBe(15);
  });
});
