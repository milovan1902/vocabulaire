/**
 * Moteur de répétition espacée.
 *
 * Enveloppe FSRS (l'algorithme utilisé par Anki depuis 2023) pour que le
 * reste de l'application n'ait jamais à manipuler ses types directement.
 * Si l'algorithme change un jour, seul ce fichier bouge.
 */
import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  State,
  type Card as FsrsCard,
} from 'ts-fsrs';
import type { Grade, Progress, CardId } from '../domain/types';

const params = generatorParameters({
  /** Un peu d'aléa sur les intervalles évite que tout retombe le même jour. */
  enable_fuzz: true,
  /** On ne veut pas d'intervalles de plusieurs années pour un examen dans un an. */
  maximum_interval: 365,
});

const engine = fsrs(params);

/** FSRS accepte aussi Rating.Manual, que l'on n'expose pas à l'utilisateur. */
type UserRating = Exclude<Rating, Rating.Manual>;

const GRADE_TO_RATING: Record<Grade, UserRating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/** Progression d'une carte jamais vue. */
export function emptyProgress(cardId: CardId, now = new Date()): Progress {
  return toProgress(cardId, createEmptyCard(now));
}

function toProgress(cardId: CardId, c: FsrsCard): Progress {
  return {
    cardId,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps ?? 0,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as 0 | 1 | 2 | 3,
    lastReview: c.last_review ? c.last_review.getTime() : undefined,
  };
}

function toFsrsCard(p: Progress): FsrsCard {
  return {
    due: new Date(p.due),
    stability: p.stability,
    difficulty: p.difficulty,
    elapsed_days: p.elapsedDays,
    scheduled_days: p.scheduledDays,
    learning_steps: p.learningSteps,
    reps: p.reps,
    lapses: p.lapses,
    state: p.state as State,
    last_review: p.lastReview ? new Date(p.lastReview) : undefined,
  } as FsrsCard;
}

/** Applique une note et renvoie la progression mise à jour. */
export function review(progress: Progress, grade: Grade, now = new Date()): Progress {
  const scheduled = engine.repeat(toFsrsCard(progress), now);
  const next = scheduled[GRADE_TO_RATING[grade]].card;
  return toProgress(progress.cardId, next);
}

/**
 * Intervalles que produiraient les quatre boutons, en texte lisible.
 * Affiché sous chaque bouton pour que l'élève comprenne ce qu'il choisit.
 */
export function previewIntervals(
  progress: Progress,
  now = new Date(),
): Record<Grade, string> {
  const scheduled = engine.repeat(toFsrsCard(progress), now);
  const out = {} as Record<Grade, string>;
  (Object.keys(GRADE_TO_RATING) as Grade[]).forEach((g) => {
    const due = scheduled[GRADE_TO_RATING[g]].card.due.getTime();
    out[g] = humanDelay(due - now.getTime());
  });
  return out;
}

function humanDelay(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'tout de suite';
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} j`;
  const mo = Math.round(d / 30);
  return `${mo} mois`;
}

export function isDue(p: Progress, now = Date.now()): boolean {
  return p.due <= now;
}

export function isNew(p: Progress): boolean {
  return p.state === State.New;
}
