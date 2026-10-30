import { describe, expect, it } from 'vitest';
import { avecQuotaJour, consommeJour, partager } from './quota';
import { DEFAULT_SETTINGS, type DailyCounter, type Settings } from '../domain/types';

const J = '2026-10-30';
const S: Settings = { ...DEFAULT_SETTINGS, newPerDay: 10, reviewsPerDay: 30 };
const c = (n: number, r: number, day = J): DailyCounter => ({ day, newSeen: n, reviewsDone: r });

describe('plafonds de la journée', () => {
  it('additionne les compteurs du jour, hors contrôle et hors autres jours', () => {
    const g = consommeJour({ a: c(4, 10), b: c(3, 5), x: c(50, 50), old: c(9, 9, '2026-10-29') }, (id) => id === 'x', J);
    expect(g).toEqual({ n: 7, r: 15 });
  });

  it('un paquet ne reçoit que ce qui reste à la journée', () => {
    const g = { n: 7, r: 15 };
    const s = avecQuotaJour(S, S, c(4, 10), g, J);
    // Il reste 3 nouveaux et 15 révisions pour la journée : ce paquet peut aller jusqu'à 4+3 et 10+15.
    expect(s.newPerDay).toBe(7);
    expect(s.reviewsPerDay).toBe(25);
  });

  it('la journée épuisée ne donne plus rien', () => {
    const s = avecQuotaJour(S, S, c(0, 0), { n: 10, r: 30 }, J);
    expect([s.newPerDay, s.reviewsPerDay]).toEqual([0, 0]);
  });

  it('partage le reste sans dépasser le plafond', () => {
    const p = partager([
      { id: 'a', nouveaux: 20, revisions: 25 },
      { id: 'b', nouveaux: 20, revisions: 12 },
      { id: 'c', nouveaux: 20, revisions: 3 },
    ], { n: 10, r: 30 });
    const total = [...p.values()].reduce((x, y) => x + y, 0);
    expect(total).toBe(40);
    expect(p.get('a')).toBe(35);
  });
});
