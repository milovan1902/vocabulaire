/**
 * CHANTIER 168 — LES XP, GAGNÉS PAR L'ASSIDUITÉ.
 * CHANTIER 228 — LA SEMAINE DE CINQ JOURS, ET LES GELS.
 *
 * Pas par les notes : appuyer sur « Facile » ne rapporte rien de plus.
 * Un jour VALIDÉ = 20 cartes notées dans la journée.
 *
 *   — du lundi au vendredi : 20 XP par jour validé ;
 *   — le vendredi, si la semaine est à 5 / 5 : un bonus de semaine,
 *     +20 la 1re semaine complète d'affilée, +40 la 2e, puis +60 ;
 *     une semaine incomplète fait repartir le bonus à +20 ;
 *   — samedi et dimanche : 30 XP par jour validé, et un GEL par jour,
 *     même si la semaine était incomplète. Rien d'autre ;
 *   — un gel comble un jour manqué du lundi au vendredi. Il est posé le
 *     vendredi (ou dès que la semaine est close) ; le jour comblé ne
 *     rapporte rien, mais la semaine compte pour 5 / 5 et touche son bonus.
 *     S'il n'y a pas assez de gels pour tout combler, aucun n'est utilisé ;
 *   — réserve : 4 gels au plus. Au-delà, le week-end rapporte ses 30 XP
 *     sans gel. Les gels gagnés un week-end servent les semaines suivantes ;
 *   — Parler ne rapporte pas d'XP ;
 *   — gratuit : plafond à 1 000 XP. Payant : pas de plafond.
 *
 * Rien n'est stocké : tout se recalcule depuis `streak.days` et
 * `streak.counts`, déjà synchronisés. Le même total sur tous les
 * appareils, et rien à modifier à la main pour tricher.
 *
 * Les jours d'avant le chantier 168 n'ont pas de compteur : ils comptent
 * comme validés.
 */
import type { Streak } from './streak';
import { shiftDay } from './streak';
import { todayKey } from './session';

export const CARTES_PAR_JOUR = 20;
export const XP_PAR_JOUR = 20;
export const XP_WEEKEND = 30;
export const GELS_MAX = 4;
export const XP_MAX_GRATUIT = 1000;

export function estPremium(): boolean {
  return false;
}

/** Le bonus de la n-ième semaine complète d'affilée : 20, 40, puis 60. */
export function bonusSemaine(n: number): number {
  if (n <= 0) return 0;
  return Math.min(60, 20 * n);
}

export function jourValide(s: Streak, key: string): boolean {
  const n = s.counts?.[key];
  if (n === undefined) return s.days.includes(key);
  return n >= CARTES_PAR_JOUR;
}

/** 0 = lundi … 6 = dimanche. */
export function rangDansSemaine(key: string): number {
  return (new Date(key + 'T12:00:00').getDay() + 6) % 7;
}
export function lundiDe(key: string): string {
  return shiftDay(key, -rangDansSemaine(key));
}
export function estWeekend(key: string): boolean {
  return rangDansSemaine(key) >= 5;
}

/**
 * L'état d'un jour.
 *  'valide'  : 20 cartes notées ;
 *  'gel'     : jour de semaine manqué, comblé par un gel ;
 *  'manque'  : jour de semaine manqué ;
 *  'repos'   : samedi ou dimanche sans travail (ce n'est pas une faute) ;
 *  'encours' : aujourd'hui, pas encore validé ;
 *  'avenir'  : après aujourd'hui.
 */
export type EtatJour = 'valide' | 'gel' | 'manque' | 'repos' | 'encours' | 'avenir';

export interface JourCalc {
  key: string;
  etat: EtatJour;
  base: number;
  /** Bonus de semaine, porté par le vendredi. */
  bonus: number;
  /** Un gel gagné ce jour-là (samedi ou dimanche). */
  gelGagne: boolean;
  cartes: number;
}

export interface Bilan {
  jours: Record<string, JourCalc>;
  /** XP sans plafond. */
  xp: number;
  /** Gels en réserve à la fin du calcul. */
  gels: number;
  /** Semaines complètes d'affilée (la dernière close comprise). */
  semaines: number;
}

function cle(d: string, today: string): 'passe' | 'auj' | 'avenir' {
  return d < today ? 'passe' : d === today ? 'auj' : 'avenir';
}

/**
 * Le calcul complet, semaine par semaine, du lundi de la première semaine
 * travaillée jusqu'à la semaine d'aujourd'hui.
 */
export function bilan(s: Streak, today = todayKey()): Bilan {
  const jours: Record<string, JourCalc> = {};
  let xp = 0;
  let gels = 0;
  let semaines = 0;
  const tries = [...s.days].sort();
  if (!tries.length) return { jours, xp, gels, semaines };

  for (let w = lundiDe(tries[0]); w <= today; w = shiftDay(w, 7)) {
    const vendredi = shiftDay(w, 4);
    const manques: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = shiftDay(w, i);
      const quand = cle(d, today);
      const cartes = s.counts?.[d] ?? 0;
      if (quand === 'avenir') { jours[d] = { key: d, etat: 'avenir', base: 0, bonus: 0, gelGagne: false, cartes: 0 }; manques.push(d); continue; }
      if (jourValide(s, d)) {
        xp += XP_PAR_JOUR;
        jours[d] = { key: d, etat: 'valide', base: XP_PAR_JOUR, bonus: 0, gelGagne: false, cartes };
      } else {
        jours[d] = { key: d, etat: quand === 'auj' ? 'encours' : 'manque', base: 0, bonus: 0, gelGagne: false, cartes };
        manques.push(d);
      }
    }

    /* La semaine est close quand le vendredi est passé, ou validé. */
    const close = today > vendredi || jourValide(s, vendredi);
    if (close) {
      let complete = manques.length === 0;
      if (!complete && manques.length <= gels) {
        gels -= manques.length;
        for (const d of manques) jours[d] = { ...jours[d], etat: 'gel' };
        complete = true;
      }
      if (complete) {
        semaines += 1;
        const b = bonusSemaine(semaines);
        xp += b;
        jours[vendredi] = { ...jours[vendredi], bonus: b };
      } else {
        semaines = 0;
      }
    }

    for (let i = 5; i < 7; i++) {
      const d = shiftDay(w, i);
      const quand = cle(d, today);
      const cartes = s.counts?.[d] ?? 0;
      if (quand === 'avenir') { jours[d] = { key: d, etat: 'avenir', base: 0, bonus: 0, gelGagne: false, cartes: 0 }; continue; }
      if (jourValide(s, d)) {
        xp += XP_WEEKEND;
        const gelGagne = gels < GELS_MAX;
        if (gelGagne) gels += 1;
        jours[d] = { key: d, etat: 'valide', base: XP_WEEKEND, bonus: 0, gelGagne, cartes };
      } else {
        jours[d] = { key: d, etat: quand === 'auj' ? 'encours' : 'repos', base: 0, bonus: 0, gelGagne: false, cartes };
      }
    }
  }
  return { jours, xp, gels, semaines };
}

/** Les XP gagnés depuis le début, plafonnés en gratuit. */
export function xpTotal(s: Streak, premium = estPremium(), today = todayKey()): number {
  const xp = bilan(s, today).xp;
  return premium ? xp : Math.min(xp, XP_MAX_GRATUIT);
}

export function gelsEnReserve(s: Streak, today = todayKey()): number {
  return bilan(s, today).gels;
}

/**
 * La série (la flamme) : les jours de semaine tenus d'affilée, gels compris.
 * Le week-end ne la casse pas s'il est chômé, et l'allonge s'il est travaillé.
 * Dans la semaine en cours, un jour manqué ne la casse que si les gels en
 * réserve ne suffisent plus à le combler vendredi.
 */
function series(s: Streak, today: string): { courante: number; meilleure: number } {
  const b = bilan(s, today);
  const cles = Object.keys(b.jours).sort();
  const lundiAuj = lundiDe(today);
  const manquesSemaine = cles.filter((d) => d >= lundiAuj && b.jours[d].etat === 'manque').length;
  const vendrediAuj = shiftDay(lundiAuj, 4);
  const ouverte = !(today > vendrediAuj || jourValide(s, vendrediAuj));
  const sauvable = ouverte && manquesSemaine <= b.gels;
  let run = 0;
  let meilleure = 0;
  for (const d of cles) {
    const e = b.jours[d].etat;
    if (e === 'valide' || e === 'gel') run += 1;
    else if (e === 'manque') { if (!(d >= lundiAuj && sauvable)) run = 0; }
    meilleure = Math.max(meilleure, run);
  }
  return { courante: run, meilleure };
}

export function serieValidee(s: Streak, today = todayKey()): number {
  return series(s, today).courante;
}

export function meilleureSerie(s: Streak, today = todayKey()): number {
  return series(s, today).meilleure;
}

export function cartesDuJour(s: Streak, today = todayKey()): number {
  return s.counts?.[today] ?? 0;
}

/**
 * Ce que la journée rapporte (ou a rapporté) : la base, le bonus de semaine
 * si c'est le vendredi qui boucle le 5 / 5, et le gel du week-end.
 */
export function gainDuJour(s: Streak, today = todayKey()): { valide: boolean; xp: number; gel: boolean } {
  const valide = jourValide(s, today) && s.counts?.[today] !== undefined;
  if (valide) {
    const j = bilan(s, today).jours[today];
    return { valide, xp: (j?.base ?? 0) + (j?.bonus ?? 0), gel: !!j?.gelGagne };
  }
  /* Pas encore validée : ce qu'elle rapporterait. */
  const simule: Streak = { ...s, days: [...new Set([...s.days, today])].sort(), counts: { ...(s.counts ?? {}), [today]: CARTES_PAR_JOUR } };
  const j = bilan(simule, today).jours[today];
  return { valide: false, xp: (j?.base ?? 0) + (j?.bonus ?? 0), gel: !!j?.gelGagne };
}

/**
 * La semaine en cours pour « Cette semaine » : les jours de semaine tenus
 * (validés ou gelés) et les jours de week-end travaillés. Repart à zéro
 * chaque lundi.
 */
export function semaineEnCours(s: Streak, today = todayKey()): {
  jours: JourCalc[]; ouvres: number; weekend: number; complete: boolean; gels: number;
} {
  const b = bilan(s, today);
  const lundi = lundiDe(today);
  const jours: JourCalc[] = [];
  for (let i = 0; i < 7; i++) {
    const d = shiftDay(lundi, i);
    jours.push(b.jours[d] ?? { key: d, etat: d > today ? 'avenir' : d === today ? 'encours' : i >= 5 ? 'repos' : 'manque', base: 0, bonus: 0, gelGagne: false, cartes: 0 });
  }
  const ouvres = jours.slice(0, 5).filter((j) => j.etat === 'valide' || j.etat === 'gel').length;
  const weekend = jours.slice(5).filter((j) => j.etat === 'valide').length;
  return { jours, ouvres, weekend, complete: ouvres === 5, gels: b.gels };
}

/** Les `n` derniers jours, du plus ancien à aujourd'hui, avec leurs XP. */
export function historiqueXp(s: Streak, n = 14, today = todayKey()): JourCalc[] {
  const b = bilan(s, today);
  const out: JourCalc[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = shiftDay(today, -i);
    out.push(b.jours[key] ?? {
      key,
      etat: i === 0 ? 'encours' : estWeekend(key) ? 'repos' : 'manque',
      base: 0, bonus: 0, gelGagne: false, cartes: s.counts?.[key] ?? 0,
    });
  }
  return out;
}

/** Ancien nom, gardé pour les écrans qui l'importent encore. */
export type JourXp = JourCalc;
