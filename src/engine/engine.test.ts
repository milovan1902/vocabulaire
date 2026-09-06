/**
 * Tests du moteur : ce sont les régressions les plus coûteuses, car elles
 * font perdre de la progression sans que personne ne s'en aperçoive.
 */
import { describe, it, expect } from 'vitest';
import { emptyProgress, review, isDue, isNew, previewIntervals } from './scheduler';
import { buildSession, computeStats, rollDay, freshCounter, todayKey } from './session';
import type { Card, Progress, Settings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';

const NOW = new Date('2026-09-03T09:00:00Z');

function card(n: number, theme = 'A'): Card {
  return { id: `d:${n}`, en: `word${n}`, fr: `mot${n}`, theme };
}

describe('scheduler', () => {
  it('une carte neuve est due et sans révision', () => {
    const p = emptyProgress('d:1', NOW);
    expect(isNew(p)).toBe(true);
    expect(isDue(p, NOW.getTime())).toBe(true);
    expect(p.reps).toBe(0);
  });

  it('« correct » repousse la carte et incrémente les répétitions', () => {
    const p = emptyProgress('d:1', NOW);
    const next = review(p, 'good', NOW);
    expect(next.reps).toBe(1);
    expect(next.due).toBeGreaterThan(NOW.getTime());
    expect(isNew(next)).toBe(false);
  });

  it('« facile » repousse plus loin que « correct », qui repousse plus loin que « à revoir »', () => {
    const p = emptyProgress('d:1', NOW);
    const again = review(p, 'again', NOW).due;
    const good = review(p, 'good', NOW).due;
    const easy = review(p, 'easy', NOW).due;
    expect(again).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it('les intervalles annoncés couvrent les quatre boutons', () => {
    const preview = previewIntervals(emptyProgress('d:1', NOW), NOW);
    expect(Object.keys(preview).sort()).toEqual(['again', 'easy', 'good', 'hard']);
    for (const v of Object.values(preview)) expect(v).toBeTruthy();
  });

  it('une carte bien sue finit par dépasser la semaine', () => {
    let p = emptyProgress('d:1', NOW);
    let when = new Date(NOW);
    for (let i = 0; i < 5; i++) {
      p = review(p, 'easy', when);
      when = new Date(p.due);
    }
    const jours = (p.due - new Date(p.lastReview!).getTime()) / 86_400_000;
    expect(jours).toBeGreaterThan(7);
  });

  it('la progression survit à un aller-retour JSON', () => {
    const p = review(emptyProgress('d:1', NOW), 'good', NOW);
    const copie: Progress = JSON.parse(JSON.stringify(p));
    expect(review(copie, 'good', new Date(copie.due)).reps).toBe(2);
  });
});

describe('quotas et sessions', () => {
  const cards = Array.from({ length: 40 }, (_, i) => card(i));
  const settings: Settings = { ...DEFAULT_SETTINGS, newPerDay: 10, cardsPerSession: 50 };
  const empty = (id: string) => emptyProgress(id, NOW);

  it('le quota de nouveaux mots plafonne la session', () => {
    const q = buildSession(cards, empty, settings, freshCounter(NOW), NOW.getTime());
    expect(q).toHaveLength(10);
  });

  it('le quota déjà consommé réduit d’autant', () => {
    const counter = { day: todayKey(NOW), newSeen: 7, reviewsDone: 0 };
    const q = buildSession(cards, empty, settings, counter, NOW.getTime());
    expect(q).toHaveLength(3);
  });

  it('la taille de session borne sans changer le quota du jour', () => {
    const s: Settings = { ...settings, newPerDay: 40, cardsPerSession: 12 };
    const q = buildSession(cards, empty, s, freshCounter(NOW), NOW.getTime());
    expect(q).toHaveLength(12);
  });

  it('les révisions passent avant les nouveautés', () => {
    const progress: Record<string, Progress> = {};
    for (let i = 0; i < 30; i++) {
      const p = review(empty(`d:${i}`), 'good', new Date('2026-08-01T09:00:00Z'));
      progress[`d:${i}`] = p; // largement en retard, donc dues
    }
    const s: Settings = { ...settings, newPerDay: 10, cardsPerSession: 10 };
    const q = buildSession(cards, (id) => progress[id] ?? empty(id), s, freshCounter(NOW), NOW.getTime());
    expect(q).toHaveLength(10);
    expect(q.every((i) => !i.wasNew)).toBe(true);
  });

  it('rien à faire quand tout est déjà planifié plus tard', () => {
    const progress: Record<string, Progress> = {};
    for (let i = 0; i < 40; i++) progress[`d:${i}`] = review(empty(`d:${i}`), 'easy', NOW);
    const q = buildSession(cards, (id) => progress[id], settings, freshCounter(NOW), NOW.getTime());
    expect(q).toHaveLength(0);
  });

  it('les statistiques comptent séparément neuf, dû et en mémoire', () => {
    const progress: Record<string, Progress> = {};
    for (let i = 0; i < 5; i++) progress[`d:${i}`] = review(empty(`d:${i}`), 'easy', NOW);
    const stats = computeStats(cards, (id) => progress[id] ?? empty(id), settings, freshCounter(NOW), NOW.getTime());
    expect(stats.total).toBe(40);
    expect(stats.resting).toBe(5);
    expect(stats.newAvailable).toBe(10); // 35 neuves, plafonnées par le quota
  });

  it('le compteur repart à zéro le lendemain', () => {
    const hier = { day: '2026-09-02', newSeen: 10, reviewsDone: 80 };
    const c = rollDay(hier, NOW);
    expect(c.newSeen).toBe(0);
    expect(c.reviewsDone).toBe(0);
    expect(c.day).toBe('2026-09-03');
  });

  it('le compteur du jour n’est pas remis à zéro', () => {
    const today = { day: todayKey(NOW), newSeen: 4, reviewsDone: 9 };
    expect(rollDay(today, NOW)).toBe(today);
  });
});

describe('objectif non bloquant', () => {
  const cards = Array.from({ length: 40 }, (_, i) => card(i));
  const settings: Settings = { ...DEFAULT_SETTINGS, newPerDay: 10, cardsPerSession: 50 };
  const empty = (id: string) => emptyProgress(id, NOW);
  const atteint = { day: todayKey(NOW), newSeen: 10, reviewsDone: 0 };

  it('signale l’objectif atteint et ce qui reste au-delà', () => {
    const stats = computeStats(cards, empty, settings, atteint, NOW.getTime());
    expect(stats.newAvailable).toBe(0);
    expect(stats.goalReached).toBe(true);
    expect(stats.newBeyondGoal).toBe(40);
  });

  it('ne propose rien tant que l’objectif borne', () => {
    const q = buildSession(cards, empty, settings, atteint, NOW.getTime());
    expect(q).toHaveLength(0);
  });

  it('mais laisse continuer si on le demande', () => {
    const q = buildSession(cards, empty, settings, atteint, NOW.getTime(), true);
    expect(q).toHaveLength(40);
  });

  it('la taille de session s’applique toujours au-delà de l’objectif', () => {
    const s: Settings = { ...settings, cardsPerSession: 15 };
    const q = buildSession(cards, empty, s, atteint, NOW.getTime(), true);
    expect(q).toHaveLength(15);
  });

  it('objectif non « atteint » quand il n’y a simplement plus rien à faire', () => {
    const progress: Record<string, Progress> = {};
    for (let i = 0; i < 40; i++) progress[`d:${i}`] = review(empty(`d:${i}`), 'easy', NOW);
    const stats = computeStats(cards, (id) => progress[id], settings, atteint, NOW.getTime());
    expect(stats.goalReached).toBe(false);
    expect(stats.resting).toBe(40);
  });
});
