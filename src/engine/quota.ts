import type { DailyCounter, Settings } from '../domain/types';
import { todayKey } from './session';

/*
 * CHANTIER 367 — DES PLAFONDS POUR LA JOURNÉE ENTIÈRE.
 *
 * Jusqu'ici, « 10 nouveaux mots, 30 révisions au plus » valait pour CHAQUE
 * paquet : avec 6 paquets en jeu, la journée pouvait monter à 240 cartes, et
 * l'écran annonçait 78 cartes pour un réglage de 40. Désormais le plafond
 * vaut pour tous les paquets réunis.
 *
 * Les paquets en mode contrôle restent hors plafond (ils doivent être prêts
 * le jour J) et ne consomment pas le quota des autres.
 */
export interface Consomme { n: number; r: number }

/** Nouveaux mots et révisions déjà faits aujourd'hui, tous paquets réunis (hors contrôle). */
export function consommeJour(
  counters: Record<string, DailyCounter>,
  horsPlafond: (id: string) => boolean = () => false,
  today = todayKey(),
): Consomme {
  let n = 0;
  let r = 0;
  for (const [id, c] of Object.entries(counters)) {
    if (!c || c.day !== today || horsPlafond(id)) continue;
    n += c.newSeen;
    r += c.reviewsDone;
  }
  return { n, r };
}

/**
 * Les réglages d'un paquet, bornés par ce qui reste de la journée.
 * Ce qui reste à CE paquet = ce qui reste à la journée : son propre compteur
 * est déjà dans le total consommé.
 */
export function avecQuotaJour(s: Settings, journee: Settings, c: DailyCounter, g: Consomme, today = todayKey()): Settings {
  const n = c.day === today ? c.newSeen : 0;
  const r = c.day === today ? c.reviewsDone : 0;
  return {
    ...s,
    newPerDay: Math.min(s.newPerDay, n + Math.max(0, journee.newPerDay - g.n)),
    reviewsPerDay: Math.min(s.reviewsPerDay, r + Math.max(0, journee.reviewsPerDay - g.r)),
  };
}

export interface Ligne { id: string; nouveaux: number; revisions: number }

/**
 * Partage le reste de la journée entre les paquets : les révisions d'abord
 * (un mot oublié coûte plus cher qu'un mot pas encore appris), en servant
 * d'abord les paquets qui en ont le plus ; puis les nouveaux mots.
 */
export function partager(lignes: Ligne[], reste: { n: number; r: number }): Map<string, number> {
  const out = new Map<string, number>();
  let r = Math.max(0, reste.r);
  let n = Math.max(0, reste.n);
  const ordre = [...lignes].sort((a, b) => b.revisions - a.revisions);
  for (const l of ordre) { const v = Math.min(l.revisions, r); r -= v; out.set(l.id, v); }
  for (const l of ordre) { const v = Math.min(l.nouveaux, n); n -= v; out.set(l.id, (out.get(l.id) ?? 0) + v); }
  return out;
}
