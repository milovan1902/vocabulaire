/**
 * CHANTIER 285 — LE MODE CONTRÔLE d'un paquet personnalisé.
 *
 * Un paquet peut porter la date d'un contrôle (« AAAA-MM-JJ », jour local).
 * Tant que le contrôle n'est pas passé :
 *   1. aucun intervalle FSRS ne dépasse la MOITIÉ des jours qui restent ;
 *   2. aucun ne dépasse la VEILLE : tout le paquet revient ce jour-là ;
 *   3. les quotas du jour ne bornent pas ce paquet : tous les mots sont vus dès le premier jour.
 * La veille et après le contrôle, FSRS reprend seul la main : rien n'est effacé,
 * la mémoire de chaque mot continue.
 *
 * La date vit sur la fiche du paquet (IndexedDB), comme le paquet lui-même :
 * un paquet perso ne passe pas par le serveur.
 */
import type { Card, Deck, Progress, Settings } from '../domain/types';

/** 286 — `papier` : la couleur du dos choisie à la création (voir ui/papierPerso.ts). */
export type DeckControle = Deck & { controle?: string | null; papier?: string | null };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function dateLocale(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Le jour local `now`, décalé de `n` jours, à minuit. */
export function jourPlus(n: number, now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
}

/** Jours pleins entre aujourd'hui et le contrôle : 1 = demain. */
export function joursAvant(iso: string, now = new Date()): number {
  return Math.round((dateLocale(iso).getTime() - jourPlus(0, now).getTime()) / 86_400_000);
}

/** La date du contrôle si elle est encore à venir, sinon null. */
export function controleActif(deck: Deck | null | undefined, now = new Date()): string | null {
  const c = (deck as DeckControle | null | undefined)?.controle;
  return c && ISO.test(c) && joursAvant(c, now) > 0 ? c : null;
}

/**
 * 289 — l'étiquette courte d'un contrôle à venir, jour J compris, sinon null.
 * Affichée sous le nom du paquet (Aujourd'hui, collection) et sur sa page.
 */
export function etiquetteControle(deck: Deck | null | undefined, now = new Date()): string | null {
  const c = (deck as DeckControle | null | undefined)?.controle;
  if (!c || !ISO.test(c)) return null;
  const r = joursAvant(c, now);
  if (r < 0) return null;
  if (r === 0) return 'Contrôle aujourd’hui';
  if (r === 1) return 'Contrôle demain';
  return `Contrôle dans ${r} j`;
}

/** Ramène l'échéance d'une carte notée dans le cadre du contrôle. */
export function plafonner(p: Progress, controle: string | null, now = new Date()): Progress {
  if (!controle) return p;
  const reste = joursAvant(controle, now);
  if (reste <= 1) return p;
  const veille = jourPlus(reste - 1, now).getTime();
  const moitie = jourPlus(Math.max(1, Math.floor(reste / 2)), now).getTime();
  const max = Math.min(veille, moitie);
  if (p.due <= max) return p;
  return { ...p, due: max, scheduledDays: Math.max(1, Math.round((max - jourPlus(0, now).getTime()) / 86_400_000)) };
}

/**
 * 290 — quand on POSE ou AVANCE la date. Comme `plafonner`, mais aussi
 * quand le contrôle est demain : la veille, c'est aujourd'hui, donc tout
 * mot programmé plus tard revient aujourd'hui. (`plafonner`, lui, laisse
 * FSRS seul la veille, pour qu'une carte notée ne revienne pas en boucle.)
 */
export function ramenerAuControle(p: Progress, controle: string | null, now = new Date()): Progress {
  if (!controle) return p;
  const reste = joursAvant(controle, now);
  if (reste < 1) return p;
  if (reste >= 2) return plafonner(p, controle, now);
  if (p.reps === 0) return p;
  const auj = jourPlus(0, now).getTime();
  if (p.due <= auj) return p;
  return { ...p, due: auj, scheduledDays: 0 };
}

/** Quotas levés pour un paquet en mode contrôle. */
export function avecControle(s: Settings, deck: Deck | null | undefined): Settings {
  if (!controleActif(deck)) return s;
  return { ...s, newPerDay: Math.max(s.newPerDay, 500), reviewsPerDay: Math.max(s.reviewsPerDay, 500) };
}

/** Les jours de passage prévus, de aujourd'hui (0) à la veille. Sert à l'aperçu. */
export function joursDePassage(reste: number): number[] {
  if (reste <= 1) return [0];
  const out = [0];
  let j = 0;
  while (j < reste - 1) {
    j = Math.min(reste - 1, j + Math.max(1, Math.floor((reste - j) / 2)));
    out.push(j);
  }
  return out;
}

/*
 * CHANTIER 291 — MOTS RATÉS ET MOTS FRAGILES.
 * Raté : « À revoir » à la dernière révision. Fragile : « À revoir » ou « Difficile ».
 * Une carte notée avant le chantier 291 n'a pas de note gardée : on se
 * rabat sur l'état FSRS « en réapprentissage », qui veut dire la même chose.
 */
export function estRate(p: Progress | undefined): boolean {
  if (!p || p.reps === 0) return false;
  return p.lastGrade ? p.lastGrade === 'again' : p.state === 3;
}

export function estFragile(p: Progress | undefined): boolean {
  if (!p || p.reps === 0) return false;
  return p.lastGrade ? p.lastGrade === 'again' || p.lastGrade === 'hard' : p.state === 3;
}

export function motsRates(cards: Card[], progress: Record<string, Progress>): Card[] {
  return cards.filter((c) => estRate(progress[c.id]));
}

export function motsFragiles(cards: Card[], progress: Record<string, Progress>): Card[] {
  return cards.filter((c) => estFragile(progress[c.id]));
}

/** Jours avant le contrôle (0 = aujourd'hui), ou null sans contrôle à venir. */
export function resteControle(deck: Deck | null | undefined, now = new Date()): number | null {
  const c = (deck as DeckControle | null | undefined)?.controle;
  if (!c || !ISO.test(c)) return null;
  const r = joursAvant(c, now);
  return r < 0 ? null : r;
}
