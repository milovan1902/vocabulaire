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

/**
 * Niveau indicatif d'un paquet.
 *
 * Le code européen est doublé d'un repère scolaire à l'affichage : « A2 »
 * ne dit rien à un parent, « collège » si.
 */
export type Level = 'A2' | 'B1' | 'B2';

export const LEVEL_LABELS: Record<Level, string> = {
  A2: 'collège',
  B1: 'lycée',
  B2: 'avancé',
};

export interface Deck {
  id: DeckId;
  name: string;
  description?: string;
  /** Rayon d'appartenance. Absent = paquet non classé. */
  categoryId?: string | null;
  /** Niveau indicatif. Absent = pas d'étiquette au catalogue. */
  level?: Level | null;
  /** Un paquet fourni avec l'application ne peut pas être supprimé. */
  builtin: boolean;
  /**
   * Prix en centimes, tel qu'annoncé par le catalogue. 0 = gratuit.
   * Absent pour les paquets qui n'ont jamais transité par le serveur.
   */
  priceCents?: number;
  /**
   * Nombre de mots ANNONCÉ par la vitrine, indépendant des cartes
   * réellement lisibles. Un paquet payant non acheté n'en a aucune : la
   * base les filtre. C'est ce nombre-là qui doit s'afficher avant l'achat
   * — « 128 mots » vend, « 0 mot » inquiète.
   */
  cardCount?: number;
  /** Image de dos, stockée séparément (voir `imageKey`). */
  hasImage: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Tranches de prix proposées au catalogue, en centimes. */
export const PRICE_TIERS = [0, 200, 300, 500] as const;

export function priceLabel(cents: number | undefined): string {
  if (!cents) return 'Gratuit';
  return `${(cents / 100).toFixed(2).replace('.', ',').replace(',00', '')} €`;
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
 * Chaque paquet peut les redéfinir : voir `DeckOverride`.
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
  /**
   * Heure du rappel quotidien, « HH:MM », ou null si désactivé.
   * Un seul champ plutôt qu'un booléen doublé d'une heure : deux champs
   * finissent toujours par se contredire.
   */
  reminderAt: string | null;
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
  reminderAt: null,
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

/**
 * Les réglages qu'un paquet peut redéfinir, avec leur libellé.
 * Le rappel quotidien n'y figure pas : il vaut pour la personne, pas pour
 * un paquet, et cinq paquets ne doivent pas donner cinq notifications.
 */
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
  level?: Level;
  cards: Array<{ en: string; fr: string; theme: string; example?: string }>;
}
