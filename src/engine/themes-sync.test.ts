/**
 * CHANTIER 163 — les thèmes retenus d'un appareil à l'autre.
 * Le cas réel : « 3 thèmes sur 6 » sur le téléphone, 6 sur l'ordinateur.
 */
import { describe, it, expect } from 'vitest';
import { fusionnerThemes } from '../data/sync';

describe('thèmes retenus : synchronisation', () => {
  it('un appareil sans choix reçoit celui de l’autre', () => {
    const r = fusionnerThemes({}, { 'reprise-oral': { t: ['A', 'B', 'C'], at: 0 } });
    expect(r['reprise-oral'].t).toEqual(['A', 'B', 'C']);
  });

  it('le choix le plus récent gagne, dans les deux sens', () => {
    const vieux = { p: { t: ['A'], at: 1_000 } };
    const recent = { p: { t: ['A', 'B'], at: 2_000 } };
    expect(fusionnerThemes(vieux, recent).p.t).toEqual(['A', 'B']);
    expect(fusionnerThemes(recent, vieux).p.t).toEqual(['A', 'B']);
  });

  it('à égalité, le local reste', () => {
    const r = fusionnerThemes({ p: { t: ['A'], at: 0 } }, { p: { t: ['B'], at: 0 } });
    expect(r.p.t).toEqual(['A']);
  });

  it('chaque paquet est arbitré séparément', () => {
    const r = fusionnerThemes(
      { p: { t: ['A'], at: 5 }, q: { t: ['X'], at: 1 } },
      { p: { t: ['B'], at: 1 }, q: { t: ['Y'], at: 5 } },
    );
    expect(r.p.t).toEqual(['A']);
    expect(r.q.t).toEqual(['Y']);
  });
});
