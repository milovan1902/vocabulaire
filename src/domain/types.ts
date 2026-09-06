/**
 * Types du domaine.
 *
 * Cette couche ne connaît ni React, ni le stockage, ni FSRS.
 * Elle décrit uniquement « ce qu'est » un paquet, une carte, une progression.
 * C'est volontaire : le jour où la synchronisation serveur arrive,
 * seule la couche `data/` change.
 */

/** Identifiant du propriétaire des données. Aujourd'hui toujours "local". */
export type UserId = string;

export type CardId = string;
export type DeckId = string;

/** Une carte telle qu'elle est écrite dans un paquet (contenu, pas progression). */
export interface Card {
  id: CardId;
  /** Face anglaise. C'est elle qui est prononcée par la synthèse vocale. */
  en: string;
  /** Face française. */
  fr: string;
  /** Regroupement interne au paquet, sert à filtrer les révisions. */
  theme: string;
  /** Phrase d'exemple facultative, affichée sous la réponse. */
  example?: string;
}

/** Un rayon du catalogue. C'est vous qui les définissez, pas l'utilisateur. */
export interface Category {
  id: string;
  name: string;
  description?: string;
  position: number;
}

export interface Deck {
  id: DeckId;
  name: string;
  description?: string;
  /** Rayon d'appartenance. Absent = paquet non classé. */
  categoryId?: string | null;
  /** Un paquet fourni avec l'application ne peut pas être supprimé. */
  builtin: boolean;
  /**
   * Prix en centimes, tel qu'annoncé par le catalogue. 0 = gratuit.
   * Absent pour les paquets qui n'ont jamais transité par le serveur.
   */
  priceCents?: number;
  /** Image de dos, stockée séparément (voir `imageKey`). */
  hasImage: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Notes possibles, alignées sur FSRS. */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

/**
 * Progression d'une carte pour un utilisateur.
 * Les champs `stability`, `difficulty` etc. sont ceux dont FSRS a besoin ;
 * on les stocke tels quels pour ne rien perdre entre deux sessions.
 */
export interface Progress {
  cardId: CardId;
  due: number; // horodatage
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3; // New / Learning / Review / Relearning
  lastReview?: number;
}

/**
 * Réglages généraux, valables par défaut pour tous les paquets.
 * Chaque paquet peut les redéfinir : voir `DeckOverrides`.
 */
export interface Settings {
  /**
   * Horodatage de la dernière modification.
   * Sert d'arbitre à la synchronisation : sans lui, impossible de savoir
   * lequel des deux appareils a raison, et les changements de l'un
   * écrasaient silencieusement ceux de l'autre.
   */
  updatedAt: number;
  newPerDay: number;
  reviewsPerDay: number;
  cardsPerSession: number;
  /** Vitesse de la synthèse vocale, de 0,6 à 1,1. */
  speechRate: number;
  autoSpeak: boolean;
  /** true = on montre l'anglais et on demande le français. */
  reversed: boolean;
  /** Marge du panneau de texte sur le visuel, en pourcentage. */
  panelInsetY: number;
  panelInsetX: number;
}

export const DEFAULT_SETTINGS: Settings = {
  updatedAt: 0,
  newPerDay: 10,
  reviewsPerDay: 100,
  cardsPerSession: 50,
  speechRate: 0.85,
  autoSpeak: true,
  reversed: false,
  panelInsetY: 15,
  panelInsetX: 13,
};

/**
 * Réglages propres à un paquet.
 *
 * Seuls les champs présents remplacent les réglages communs : un paquet
 * peut donc redéfinir son quota tout en gardant la voix commune.
 */
export type DeckOverride = Partial<Omit<Settings, 'updatedAt'>> & { updatedAt: number };

/** Réglages effectivement appliqués à un paquet : commun, puis surcharge. */
export function effectiveSettings(
  common: Settings,
  override: DeckOverride | null | undefined,
): Settings {
  if (!override) return common;
  const { updatedAt: _ignore, ...champs } = override;
  return { ...common, ...champs };
}

/** Les compteurs sont tenus paquet par paquet, comme les objectifs. */
export type DailyCounters = Record<string, DailyCounter>;

/** Les réglages qu'un paquet peut redéfinir, avec leur libellé. */
export const OVERRIDABLE: Array<keyof Omit<Settings, 'updatedAt'>> = [
  'newPerDay',
  'reviewsPerDay',
  'cardsPerSession',
  'speechRate',
  'autoSpeak',
  'reversed',
  'panelInsetY',
  'panelInsetX',
];

/** Compteur remis à zéro chaque jour, pour situer l'objectif du jour. */
export interface DailyCounter {
  day: string; // AAAA-MM-JJ
  newSeen: number;
  reviewsDone: number;
  /**
   * Ce qui avait déjà été mis en commun à la dernière synchronisation.
   * Permet de n'additionner que le travail nouveau, sans quoi chaque
   * synchronisation regonflerait le compteur avec le total de l'autre appareil.
   */
  synced?: { newSeen: number; reviewsDone: number };
}

/** Format des paquets livrés avec l'application. */
export interface SeedDeck {
  id: string;
  name: string;
  description?: string;
  cards: Array<{ en: string; fr: string; theme: string; example?: string }>;
}
