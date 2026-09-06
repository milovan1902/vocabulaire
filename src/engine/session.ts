/**
 * Construction d'une session de révision.
 *
 * Deux plafonds indépendants :
 *  - le quota journalier (nouveaux mots et révisions), qui borne la charge de travail ;
 *  - la taille de session, qui découpe cette charge en passages courts.
 */
import type { Card, DailyCounter, Progress, Settings } from '../domain/types';
import { isDue, isNew } from './scheduler';

export interface SessionItem {
  card: Card;
  progress: Progress;
  /** true si la carte n'avait jamais été vue au moment de la construction. */
  wasNew: boolean;
}

export interface DeckStats {
  /** Nouveaux mots proposés aujourd'hui, dans la limite de l'objectif. */
  newAvailable: number;
  /** Révisions dues aujourd'hui, dans la limite de l'objectif. */
  dueAvailable: number;
  /** Mots déjà appris dont la date de révision n'est pas encore arrivée. */
  resting: number;
  /** Total de mots du paquet, filtres de thème appliqués. */
  total: number;
  /** Nouveaux mots restants une fois l'objectif dépassé. */
  newBeyondGoal: number;
  /** Révisions restantes une fois l'objectif dépassé. */
  dueBeyondGoal: number;
  /** L'objectif du jour est atteint, mais il reste des cartes à faire. */
  goalReached: boolean;
}

/**
 * Le jour courant, en heure locale.
 *
 * `toISOString` donnait le jour UTC : en France, la date basculait à une ou
 * deux heures du matin. Une révision faite à minuit et demi comptait donc
 * pour la veille — sans conséquence visible sur le compteur du jour, mais
 * fatal à la série de jours, qui se cassait précisément chez ceux qui
 * révisent le soir.
 */
export function todayKey(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function freshCounter(now = new Date()): DailyCounter {
  return { day: todayKey(now), newSeen: 0, reviewsDone: 0 };
}

/** Remet le compteur à zéro si l'on a changé de jour. */
export function rollDay(counter: DailyCounter, now = new Date()): DailyCounter {
  return counter.day === todayKey(now) ? counter : freshCounter(now);
}

export function remainingNew(s: Settings, c: DailyCounter): number {
  return Math.max(0, s.newPerDay - c.newSeen);
}

export function remainingReviews(s: Settings, c: DailyCounter): number {
  return Math.max(0, s.reviewsPerDay - c.reviewsDone);
}

export function computeStats(
  cards: Card[],
  progressOf: (id: string) => Progress,
  settings: Settings,
  counter: DailyCounter,
  now = Date.now(),
): DeckStats {
  let fresh = 0;
  let due = 0;
  let resting = 0;
  for (const card of cards) {
    const p = progressOf(card.id);
    if (isNew(p)) fresh++;
    else if (isDue(p, now)) due++;
    else resting++;
  }
  const newAvailable = Math.min(fresh, remainingNew(settings, counter));
  const dueAvailable = Math.min(due, remainingReviews(settings, counter));
  const restant = fresh - newAvailable + (due - dueAvailable);

  return {
    newAvailable,
    dueAvailable,
    resting,
    total: cards.length,
    newBeyondGoal: fresh - newAvailable,
    dueBeyondGoal: due - dueAvailable,
    // L'objectif est « atteint » seulement s'il bornait vraiment quelque chose.
    goalReached: newAvailable + dueAvailable === 0 && restant > 0,
  };
}

/**
 * Construit la file d'une session.
 *
 * `ignoreGoal` permet de continuer au-delà de l'objectif du jour : le quota
 * est un repère, pas une barrière. Le compteur continue de compter, il
 * n'interdit simplement plus rien.
 */
export function buildSession(
  cards: Card[],
  progressOf: (id: string) => Progress,
  settings: Settings,
  counter: DailyCounter,
  now = Date.now(),
  ignoreGoal = false,
): SessionItem[] {
  const dueItems: SessionItem[] = [];
  const newItems: SessionItem[] = [];

  for (const card of cards) {
    const progress = progressOf(card.id);
    if (isNew(progress)) newItems.push({ card, progress, wasNew: true });
    else if (isDue(progress, now)) dueItems.push({ card, progress, wasNew: false });
  }

  shuffle(dueItems);
  shuffle(newItems);

  const size = settings.cardsPerSession;
  const capDue = ignoreGoal ? Number.POSITIVE_INFINITY : remainingReviews(settings, counter);
  const capNew = ignoreGoal ? Number.POSITIVE_INFINITY : remainingNew(settings, counter);
  const takeDue = Math.min(dueItems.length, capDue, size);
  const takeNew = Math.min(newItems.length, capNew, size - takeDue);

  const queue = [...dueItems.slice(0, takeDue), ...newItems.slice(0, takeNew)];
  shuffle(queue);
  return queue;
}

function shuffle<T>(a: T[]): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
