/**
 * Tests de la fusion des progressions et de l'analyse des listes collées.
 * La fusion est le point le plus sensible : une erreur ici efface
 * silencieusement le travail de quelqu'un.
 */
import { describe, it, expect } from 'vitest';
import { pickFresher } from '../data/sync';
import { parseWordList } from '../ui/Editor';
import { materialize } from '../data/seed';
import { collegeUs } from '../data/seed/collegeUs';
import { irregularVerbs } from '../data/seed/irregularVerbs';
import type { Progress } from '../domain/types';

function p(reps: number, lastReview?: number): Progress {
  return {
    cardId: 'c', due: 0, stability: 1, difficulty: 5, elapsedDays: 0,
    scheduledDays: 0, learningSteps: 0, reps, lapses: 0, state: 2, lastReview,
  };
}

describe('fusion des progressions', () => {
  it('garde la révision la plus récente', () => {
    const ancien = p(3, 2_000);
    const recent = p(5, 5_000);
    expect(pickFresher(ancien, recent)).toBe(recent);
    expect(pickFresher(recent, ancien)).toBe(recent);
  });

  it('accepte qu’un seul côté existe', () => {
    const local = p(3, 2_000);
    expect(pickFresher(local, undefined)).toBe(local);
    expect(pickFresher(undefined, local)).toBe(local);
  });

  it('à horodatage égal, garde la plus travaillée', () => {
    const peu = p(2, 1_000);
    const beaucoup = p(7, 1_000);
    expect(pickFresher(peu, beaucoup)).toBe(beaucoup);
    expect(pickFresher(beaucoup, peu)).toBe(beaucoup);
  });

  it('une carte révisée l’emporte sur une carte jamais vue', () => {
    const neuve = p(0, undefined);
    const revisee = p(1, 500);
    expect(pickFresher(neuve, revisee)).toBe(revisee);
    expect(pickFresher(revisee, neuve)).toBe(revisee);
  });

  it('est stable : refusionner ne change plus rien', () => {
    const a = p(3, 2_000);
    const b = p(5, 5_000);
    const once = pickFresher(a, b);
    expect(pickFresher(once, b)).toBe(once);
    expect(pickFresher(once, a)).toBe(once);
  });
});

describe('analyse des listes collées', () => {
  it('accepte virgule, point-virgule et tabulation', () => {
    const { rows, badLines } = parseWordList('a, un\nb;deux\nc\ttrois');
    expect(rows).toEqual([
      { en: 'a', fr: 'un' }, { en: 'b', fr: 'deux' }, { en: 'c', fr: 'trois' },
    ]);
    expect(badLines).toEqual([]);
  });

  it('regroupe les traductions multiples', () => {
    const { rows } = parseWordList('see off, accompagner, dire au revoir');
    expect(rows[0].fr).toBe('accompagner, dire au revoir');
  });

  it('signale les lignes sans séparateur, par leur numéro', () => {
    const { rows, badLines } = parseWordList('a, un\nligne_seule\nb, deux');
    expect(rows).toHaveLength(2);
    expect(badLines).toEqual([2]);
  });

  it('ignore les lignes vides sans les signaler', () => {
    const { rows, badLines } = parseWordList('a, un\n\n\nb, deux\n');
    expect(rows).toHaveLength(2);
    expect(badLines).toEqual([]);
  });
});

describe('paquets fournis', () => {
  it('les identifiants sont uniques malgré les mots répétés', () => {
    for (const seed of [collegeUs, irregularVerbs]) {
      const { cards } = materialize(seed);
      const ids = cards.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('la numérotation des doublons est stable d’un appel à l’autre', () => {
    const a = materialize(collegeUs).cards.map((c) => c.id);
    const b = materialize(collegeUs).cards.map((c) => c.id);
    expect(a).toEqual(b);
  });

  it('le contenu attendu est bien là', () => {
    expect(materialize(collegeUs).cards).toHaveLength(578);
    expect(materialize(irregularVerbs).cards).toHaveLength(103);
  });

  it('aucune carte n’a de face vide', () => {
    for (const seed of [collegeUs, irregularVerbs]) {
      for (const c of materialize(seed).cards) {
        expect(c.en.trim()).not.toBe('');
        expect(c.fr.trim()).not.toBe('');
      }
    }
  });
});
