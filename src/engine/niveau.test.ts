import { describe, it, expect } from 'vitest';
import { niveauDe, seuil, xpDe } from './niveau';

describe('niveau du style Lycée', () => {
  it('on commence au niveau 1, à zéro', () => {
    const n = niveauDe(0);
    expect(n.niveau).toBe(1);
    expect(n.dansNiveau).toBe(0);
    expect(n.pourNiveau).toBe(150);
  });

  it('les paliers s’allongent', () => {
    expect(seuil(2)).toBe(150);
    expect(seuil(3)).toBe(450);
    expect(seuil(7)).toBe(3150);
  });

  it('le niveau change pile au seuil', () => {
    expect(niveauDe(149).niveau).toBe(1);
    expect(niveauDe(150).niveau).toBe(2);
    expect(niveauDe(3150).niveau).toBe(7);
  });

  it('10 XP par carte révisée, jamais négatif', () => {
    expect(xpDe(31)).toBe(310);
    expect(xpDe(-5)).toBe(0);
  });

  it('la barre ne dépasse jamais le niveau', () => {
    for (const xp of [0, 1, 149, 150, 999, 5000]) {
      const n = niveauDe(xp);
      expect(n.dansNiveau).toBeGreaterThanOrEqual(0);
      expect(n.dansNiveau).toBeLessThan(n.pourNiveau);
    }
  });
});
