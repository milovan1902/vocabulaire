/**
 * CHANTIER 168 — LES XP, GAGNÉS PAR L'ASSIDUITÉ.
 *
 * Pas par les notes : appuyer sur « Facile » ne rapporte rien de plus.
 *   — un jour VALIDÉ (20 cartes notées) rapporte 20 XP ;
 *   — tous les 5 jours validés d'affilée, un bonus : +20 au 5e jour,
 *     +40 au 10e, +60 au 15e, puis +60 tous les 5 jours ;
 *   — un jour non validé remet le bonus à zéro (pas les XP) ;
 *   — Parler ne rapporte pas d'XP (c'est le poste le plus coûteux) ;
 *   — gratuit : plafond à 1 000 XP. Payant : pas de plafond.
 *
 * Rien n'est stocké : tout se recalcule depuis `streak.days` et
 * `streak.counts`, déjà synchronisés. Le même total sur tous les
 * appareils, et rien à modifier à la main pour tricher.
 *
 * Les jours d'avant ce chantier n'ont pas de compteur : chacun vaut 20 XP,
 * sans bonus. Ils comptent en revanche dans la longueur de la série, pour
 * qu'une série en cours ne reparte pas de zéro le jour de la mise à jour.
 */
import type { Streak } from './streak';
import { shiftDay } from './streak';
import { todayKey } from './session';

export const CARTES_PAR_JOUR = 20;
export const XP_PAR_JOUR = 20;
export const XP_MAX_GRATUIT = 1000;

/**
 * Le mode payant n'existe pas encore. Le jour où il arrive, c'est ici
 * qu'on branche le vrai état de l'abonnement.
 */
export function estPremium(): boolean {
  return false;
}

/** Le bonus du n-ième jour validé d'affilée. */
export function bonusSerie(n: number): number {
  if (n <= 0 || n % 5 !== 0) return 0;
  return Math.min(60, 20 * (n / 5));
}

/** Un jour sans compteur est un jour d'avant le chantier 168 : validé. */
function ancien(s: Streak, key: string): boolean {
  return s.counts?.[key] === undefined;
}

export function jourValide(s: Streak, key: string): boolean {
  const n = s.counts?.[key];
  if (n === undefined) return s.days.includes(key);
  return n >= CARTES_PAR_JOUR;
}

/** Les XP gagnés depuis le début, plafonnés en gratuit. */
export function xpTotal(s: Streak, premium = estPremium()): number {
  let xp = 0;
  let serie = 0;
  let dernier: string | null = null;
  for (const d of [...s.days].sort()) {
    if (!jourValide(s, d)) { serie = 0; dernier = null; continue; }
    serie = dernier && shiftDay(dernier, 1) === d ? serie + 1 : 1;
    dernier = d;
    xp += XP_PAR_JOUR;
    if (!ancien(s, d)) xp += bonusSerie(serie);
  }
  return premium ? xp : Math.min(xp, XP_MAX_GRATUIT);
}

/** Jours validés d'affilée jusqu'à `jusqua` inclus. */
function serieJusqua(s: Streak, jusqua: string): number {
  let n = 0;
  for (let d = jusqua; jourValide(s, d); d = shiftDay(d, -1)) n++;
  return n;
}

/**
 * La série affichée (la flamme) : les jours validés d'affilée. Tant que
 * la journée n'est pas validée, la série d'hier tient encore.
 */
export function serieValidee(s: Streak, today = todayKey()): number {
  if (jourValide(s, today)) return serieJusqua(s, today);
  return serieJusqua(s, shiftDay(today, -1));
}

export function cartesDuJour(s: Streak, today = todayKey()): number {
  return s.counts?.[today] ?? 0;
}

/** Ce que la journée rapporte (ou a rapporté), bonus compris. */
export function gainDuJour(s: Streak, today = todayKey()): { valide: boolean; xp: number } {
  const valide = jourValide(s, today) && !ancien(s, today);
  const rang = serieJusqua(s, shiftDay(today, -1)) + 1;
  return { valide, xp: XP_PAR_JOUR + bonusSerie(rang) };
}
