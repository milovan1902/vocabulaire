import { describe, expect, it } from 'vitest';
import {
  NB, plusAncienJour, pointsAisance, pointsFautes, tranches, type LigneParole,
} from './parole';

const maintenant = new Date(2026, 10, 10, 10, 0); // mardi 10 novembre 2026

const seance = (iso: string, secondes: number, repliques: number, corrections = 0, themes: string[] = []): LigneParole => ({
  finie_le: new Date(iso).toISOString(), secondes, repliques, themes,
  corrections: Array.from({ length: corrections }, () => ({})),
});

describe('404 — les trois échelles de l\'écran Oral', () => {
  it('donne 14 jours, 12 semaines, 12 mois, la tranche courante en dernier', () => {
    for (const e of ['jours', 'semaines', 'mois'] as const) {
      expect(tranches([], null, e, maintenant)).toHaveLength(NB[e]);
    }
    const j = tranches([seance('2026-11-10T09:00:00', 300, 10)], null, 'jours', maintenant);
    expect(j[13].sec).toBe(300);
    expect(j[12].sec).toBe(0);
  });

  it('range une séance dans le bon jour, la bonne semaine et le bon mois', () => {
    const L = [
      seance('2026-11-10T09:00:00', 300, 10), // mardi 10
      seance('2026-11-04T09:00:00', 240, 8),  // mercredi de la semaine d'avant
      seance('2026-09-15T09:00:00', 600, 20), // il y a 2 mois
    ];
    const s = tranches(L, null, 'semaines', maintenant);
    expect(s[11].sec).toBe(300);
    expect(s[10].sec).toBe(240);
    const m = tranches(L, null, 'mois', maintenant);
    expect(m[11].sec).toBe(540); // novembre : 300 + 240
    expect(m[9].sec).toBe(600);  // septembre
  });

  it('ignore ce qui sort de la fenêtre (14 jours)', () => {
    const j = tranches([seance('2026-10-01T09:00:00', 300, 10)], null, 'jours', maintenant);
    expect(j.reduce((s, t) => s + t.sec, 0)).toBe(0);
  });

  it('le temps parlé vient du compteur du jour quand il existe', () => {
    const L = [seance('2026-11-10T09:00:00', 300, 10)];
    const j = tranches(L, [{ jour: '2026-11-10', secondes: 420 }, { jour: '2026-09-03', secondes: 90 }], 'mois', maintenant);
    expect(j[11].parle).toBe(420);
    expect(j[9].parle).toBe(90);
    const sans = tranches(L, null, 'mois', maintenant);
    expect(sans[11].parle).toBe(300);
  });

  it('les fautes par 10 minutes ignorent une tranche de moins d\'une minute', () => {
    const L = [seance('2026-11-10T09:00:00', 600, 10, 3), seance('2026-11-09T09:00:00', 30, 1, 5)];
    const p = pointsFautes(tranches(L, null, 'jours', maintenant));
    expect(p).toHaveLength(1);
    expect(p[0].v).toBeCloseTo(3);
  });

  it('l\'aisance écarte « Comprendre mes phrases »', () => {
    const L = [
      seance('2026-11-10T09:00:00', 300, 15),
      seance('2026-11-10T11:00:00', 300, 2, 0, ['Comprendre mes phrases']),
    ];
    const p = pointsAisance(tranches(L, null, 'jours', maintenant));
    expect(p).toHaveLength(1);
    expect(p[0].v).toBeCloseTo(3); // 15 répliques en 5 minutes
  });

  it('le passage à l\'heure d\'hiver ne décale pas les semaines (363)', () => {
    const L = [seance('2026-10-21T09:00:00', 300, 10)];
    const s = tranches(L, null, 'semaines', maintenant);
    expect(s.reduce((a, t) => a + t.sec, 0)).toBe(300);
  });

  it('la lecture des jours part du premier du mois, onze mois en arrière', () => {
    expect(plusAncienJour(maintenant)).toBe('2025-12-01');
  });
});
