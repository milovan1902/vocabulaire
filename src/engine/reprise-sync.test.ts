/**
 * CHANTIER 162 — le paquet « Reprise des fautes à l'oral » d'un appareil à
 * l'autre. Le cas réel : rempli sur le téléphone, absent de l'ordinateur.
 */
import { describe, it, expect } from 'vitest';
import { fusionnerReprise, type RepriseVoyage } from '../data/sync';
import type { Card, Progress } from '../domain/types';

function carte(mot: string): Card {
  return { id: `reprise-oral:${mot}`, en: mot, fr: mot, theme: 'Conversation du 1 oct.' };
}

function prog(id: string, reps: number, lastReview: number, mastery?: number): Progress {
  return {
    cardId: id, due: 0, stability: 1, difficulty: 5, elapsedDays: 0,
    scheduledDays: 0, learningSteps: 0, reps, lapses: 0, state: 2, lastReview, mastery,
  };
}

const vide: RepriseVoyage = { cards: [], progress: {} };

describe('paquet de reprise : synchronisation', () => {
  it('sans rien sur le serveur, le local reste tel quel', () => {
    const local: RepriseVoyage = { cards: [carte('crowd')], progress: {} };
    expect(fusionnerReprise(local, null)).toBe(local);
  });

  it('un appareil vide reçoit tout le paquet de l’autre', () => {
    const a = carte('crowd');
    const telephone: RepriseVoyage = {
      cards: [a, carte('referee')],
      progress: { [a.id]: prog(a.id, 3, 5_000, 40) },
    };
    const r = fusionnerReprise(vide, telephone);
    expect(r.cards.map((c) => c.en).sort()).toEqual(['crowd', 'referee']);
    expect(r.progress[a.id].reps).toBe(3);
    expect(r.progress[a.id].mastery).toBe(40);
  });

  it('les cartes des deux appareils s’additionnent, sans doublon', () => {
    const local: RepriseVoyage = { cards: [carte('crowd'), carte('season')], progress: {} };
    const distant: RepriseVoyage = { cards: [carte('crowd'), carte('referee')], progress: {} };
    const r = fusionnerReprise(local, distant);
    expect(r.cards.map((c) => c.en).sort()).toEqual(['crowd', 'referee', 'season']);
  });

  it('la révision la plus récente gagne, et l’avancement connu n’est jamais perdu', () => {
    const a = carte('crowd');
    const local: RepriseVoyage = { cards: [a], progress: { [a.id]: prog(a.id, 5, 9_000) } };
    const distant: RepriseVoyage = { cards: [a], progress: { [a.id]: prog(a.id, 4, 6_000, 55) } };
    const r = fusionnerReprise(local, distant);
    expect(r.progress[a.id].reps).toBe(5);
    expect(r.progress[a.id].mastery).toBe(55);
  });

  it('refusionner ne change plus rien', () => {
    const a = carte('crowd');
    const local: RepriseVoyage = { cards: [a], progress: { [a.id]: prog(a.id, 2, 3_000, 20) } };
    const distant: RepriseVoyage = { cards: [carte('referee')], progress: {} };
    const une = fusionnerReprise(local, distant);
    const deux = fusionnerReprise(une, une);
    expect(deux.cards.length).toBe(une.cards.length);
    expect(deux.progress[a.id]).toEqual(une.progress[a.id]);
  });
});
