import { describe, it, expect } from 'vitest';
import { niveauDe, seuil } from './niveau';

describe('niveaux (paliers des apparences)', () => {
  it('on commence au niveau 1, à zéro', () => {
    const n = niveauDe(0);
    expect(n.niveau).toBe(1);
    expect(n.dansNiveau).toBe(0);
    expect(n.pourNiveau).toBe(100);
  });

  it('les paliers', () => {
    expect([2, 3, 4, 5, 6, 7].map(seuil)).toEqual([100, 250, 400, 600, 800, 1000]);
    expect(seuil(8)).toBe(1250);
  });

  it('le niveau change pile au seuil', () => {
    expect(niveauDe(99).niveau).toBe(1);
    expect(niveauDe(100).niveau).toBe(2);
    expect(niveauDe(1000).niveau).toBe(7);
  });

  it('la barre ne dépasse jamais le niveau', () => {
    for (const xp of [0, 1, 99, 100, 999, 1000, 5000]) {
      const n = niveauDe(xp);
      expect(n.dansNiveau).toBeGreaterThanOrEqual(0);
      expect(n.dansNiveau).toBeLessThan(n.pourNiveau);
    }
  });
});
