/**
 * CHANTIER 390 — LES DÉFIS ENTRE AMIS, côté données.
 *
 * Tout passe par les fonctions Supabase `duel_*` (supabase/390-duels.sql).
 * Le serveur compare les scores et calcule les XP des deux joueurs ; le
 * téléphone ne fait que les relire et les reporter dans la série
 * (`streak.duels`, jour → XP), qui voyage avec le compte.
 *
 * Un défi ne touche jamais aux révisions : ni la date des cartes, ni le
 * compteur du jour.
 */
import { supabase } from './supabase';
import { repository } from './repository';
import { estMot } from '../engine/reponse';
import { estAcquis, finDuJour } from '../engine/defi';
import { shiftDay } from '../engine/streak';
import { todayKey } from '../engine/session';
import type { Card, Progress } from '../domain/types';

export const MOTS_DUEL = 5;
export const SECONDES_DUEL = 20;
export const DUELS_PAR_JOUR = 3;
export const EVT_DUELS = 'vocab:duels';

export interface MotDuel { fr: string; en: string }
export interface Coup { ok: boolean; ms: number }
export interface Duel {
  id: string;
  deMoi: boolean;
  autre: string;
  prenom: string;
  jour: string;
  mots: MotDuel[];
  coupsDe: Coup[];
  scoreDe: number;
  tempsDe: number;
  classeDe: number;
  scoreA: number | null;
  tempsA: number | null;
  classeA: number | null;
  payeA: boolean | null;
  xpMoi: number;
  joue: boolean;
}
interface LigneSql {
  id: string; de_moi: boolean; autre: string; prenom: string | null; jour: string; mots: MotDuel[];
  detail_de: Coup[]; score_de: number; temps_de: number; classe_de: number;
  score_a: number | null; temps_a: number | null; classe_a: number | null; paye_a: boolean | null; xp_moi: number;
}

export const scoreDe = (c: Coup[]) => c.filter((x) => x.ok).length;
export const tempsDe = (c: Coup[]) => c.reduce((t, x) => t + x.ms, 0);
/** « 31,2 s ». Les temps se comparent au dixième, comme sur le serveur. */
export const tempsDit = (ms: number) => `${(Math.round(ms / 100) / 10).toFixed(1).replace('.', ',')} s`;

/** Mon résultat face à l'autre, dans un défi joué. */
export function issue(d: Duel): 'gagne' | 'perdu' | 'nul' | null {
  if (!d.joue || d.scoreA === null || d.tempsA === null) return null;
  const moi = d.deMoi ? { s: d.scoreDe, t: d.tempsDe } : { s: d.scoreA, t: d.tempsA };
  const lui = d.deMoi ? { s: d.scoreA, t: d.tempsA } : { s: d.scoreDe, t: d.tempsDe };
  if (moi.s !== lui.s) return moi.s > lui.s ? 'gagne' : 'perdu';
  const a = Math.round(moi.t / 100);
  const b = Math.round(lui.t / 100);
  return a === b ? 'nul' : a < b ? 'gagne' : 'perdu';
}

function versDuel(r: LigneSql): Duel {
  return {
    id: r.id, deMoi: !!r.de_moi, autre: r.autre, prenom: r.prenom || '?', jour: r.jour,
    mots: Array.isArray(r.mots) ? r.mots : [], coupsDe: Array.isArray(r.detail_de) ? r.detail_de : [],
    scoreDe: r.score_de, tempsDe: r.temps_de, classeDe: r.classe_de ?? -1,
    scoreA: r.score_a, tempsA: r.temps_a, classeA: r.classe_a, payeA: r.paye_a,
    xpMoi: r.xp_moi ?? 0, joue: r.score_a !== null,
  };
}

/** Les défis des 7 derniers jours. Reporte au passage mes XP de défi dans la série. */
export async function listeDuels(): Promise<Duel[]> {
  const today = todayKey();
  const { data, error } = await supabase.rpc('duel_liste', { p_depuis: shiftDay(today, -7) });
  if (error) throw error;
  const liste = ((data ?? []) as LigneSql[]).map(versDuel);
  const parJour: Record<string, number> = {};
  for (const d of liste) if (d.xpMoi > 0) parJour[d.jour] = (parJour[d.jour] ?? 0) + d.xpMoi;
  if (Object.keys(parJour).length) window.dispatchEvent(new CustomEvent(EVT_DUELS, { detail: parJour }));
  /* La tuile « Mes amis » annonce les défis à relever. */
  const recus = liste.filter((d) => !d.deMoi && !d.joue && d.jour === today).length;
  if (recus) {
    try { localStorage.setItem('vocab:amis-resume', `${recus} défi${recus > 1 ? 's' : ''} reçu${recus > 1 ? 's' : ''}`); } catch { /* rien */ }
  }
  return liste;
}

export type ReponseLancer = 'ok' | 'trop' | 'pasami' | 'mots' | 'date' | 'compte';
export async function lancerDuel(ami: string, mots: MotDuel[], coups: Coup[], classe: number): Promise<ReponseLancer> {
  const { data, error } = await supabase.rpc('duel_lancer', {
    p_a: ami, p_jour: todayKey(), p_mots: mots, p_detail: coups,
    p_score: scoreDe(coups), p_temps: tempsDe(coups), p_classe: classe,
  });
  if (error) throw error;
  const r = String(data);
  return (['trop', 'pasami', 'mots', 'date', 'compte'] as const).includes(r as never) ? (r as ReponseLancer) : 'ok';
}

export type ReponseJouer = 'ok' | 'deja' | 'expire' | 'introuvable' | 'invalide' | 'compte';
export async function jouerDuel(id: string, coups: Coup[], classe: number): Promise<ReponseJouer> {
  const { data, error } = await supabase.rpc('duel_jouer', {
    p_id: id, p_jour: todayKey(), p_detail: coups,
    p_score: scoreDe(coups), p_temps: tempsDe(coups), p_classe: classe,
  });
  if (error) throw error;
  return String(data) as ReponseJouer;
}

/* ---------------- le tirage des mots ---------------- */

const RANG_NOTE: Record<string, number> = { easy: 3, good: 2, hard: 1, again: 0 };

function melanger<T>(t: T[]): T[] {
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

/**
 * 5 mots neufs pour un défi : des mots acquis, hors défi éclair du jour et
 * hors défis déjà envoyés aujourd'hui. Un débutant qui n'en a pas assez
 * complète avec ses mots les mieux notés. [] = pas assez de mots.
 */
export async function tirerMotsDuel(dejaPoses: MotDuel[]): Promise<MotDuel[]> {
  const exclus = new Set(dejaPoses.map((m) => m.en.trim().toLowerCase()));
  let eclair: Array<{ d: string; c: string }> = [];
  try {
    const g = JSON.parse(localStorage.getItem('vocab:defi-jour') ?? 'null') as { jour: string; mots: Array<{ d: string; c: string }> } | null;
    if (g?.jour === todayKey()) eclair = g.mots;
  } catch { /* rien */ }

  const fin = finDuJour();
  const acquis: Card[] = [];
  const autres: Array<{ card: Card; p: Progress }> = [];
  const vus = new Set<string>();
  for (const id of (await repository.getInstalled()) ?? []) {
    try {
      const [cards, progress] = await Promise.all([repository.getCards(id), repository.getProgress(id)]);
      for (const card of cards) {
        const cle = card.en.trim().toLowerCase();
        if (!card.fr || !estMot(card.en) || exclus.has(cle) || vus.has(cle)) continue;
        if (eclair.some((m) => m.d === id && m.c === card.id)) continue;
        const p = progress[card.id];
        if (!p || p.reps < 1) continue;
        vus.add(cle);
        if (estAcquis(p, fin)) acquis.push(card);
        else autres.push({ card, p });
      }
    } catch { /* paquet illisible : on passe */ }
  }
  let choisis = melanger(acquis).slice(0, MOTS_DUEL);
  if (choisis.length < MOTS_DUEL) {
    const meilleurs = autres
      .sort((x, y) => (RANG_NOTE[y.p.lastGrade ?? ''] ?? -1) - (RANG_NOTE[x.p.lastGrade ?? ''] ?? -1)
        || (y.p.mastery ?? 0) - (x.p.mastery ?? 0))
      .slice(0, MOTS_DUEL - choisis.length)
      .map((x) => x.card);
    choisis = melanger([...choisis, ...meilleurs]);
  }
  if (choisis.length < MOTS_DUEL) return [];
  return choisis.map((c) => ({ fr: c.fr, en: c.en }));
}
