/**
 * CHANTIER 386 — LES AMIS, côté données.
 *
 * Tout passe par les fonctions Supabase `amis_*` (supabase/386-amis.sql) :
 * les tables ne sont pas lisibles directement. Le téléphone publie cinq
 * chiffres (série, XP de la semaine, mots acquis, défi du jour) et le
 * prénom ; il lit ceux de ses amis acceptés.
 *
 * Les chiffres d'un ami sont datés : une série dont le dernier jour est
 * avant-hier vaut 0, des XP d'une autre semaine valent 0, un défi d'un autre
 * jour ne s'affiche pas. Un ami qui n'ouvre plus l'application ne garde donc
 * pas un score figé.
 */
import { supabase } from './supabase';
import { repository } from './repository';
import { nettoiePrenom } from '../domain/types';
import type { Streak } from '../engine/streak';
import { liveStreak, shiftDay } from '../engine/streak';
import { bilan, lundiDe } from '../engine/xp';
import { todayKey } from '../engine/session';

const CLE_ACTIF = 'vocab:amis-actif';
const CLE_ACQUIS = 'vocab:amis-acquis';
const CLE_RESUME = 'vocab:amis-resume';

export type Relation = 'moi' | 'ami' | 'recue' | 'envoyee';
export interface Ami {
  userId: string;
  prenom: string;
  relation: Relation;
  code: string | null;
  actif: boolean;
  serie: number;
  xpSemaine: number;
  mots: number;
  defi: number | null;
}
interface LigneSql {
  user_id: string; prenom: string | null; relation: Relation; code: string | null; actif: boolean;
  serie: number | null; serie_jour: string | null; xp_semaine: number | null; semaine: string | null;
  mots_acquis: number | null; defi_score: number | null; defi_jour: string | null;
}

const lit = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrit = (k: string, v: string | null) => {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* rien */ }
};

export function amisActifs(): boolean { return lit(CLE_ACTIF) === '1'; }

/** Ce que la ligne « Mes amis » affiche à droite, sans appel réseau. */
export function resumeAmis(): string { return lit(CLE_RESUME) ?? ''; }

/** Les XP gagnés depuis lundi (jours, bonus de semaine, défis). */
export function xpSemaine(streak: Streak, today = todayKey()): number {
  const lundi = lundiDe(today);
  let xp = 0;
  for (const [d, j] of Object.entries(bilan(streak, today).jours)) {
    if (d >= lundi && d <= today) xp += j.base + j.bonus + (j.defi ?? 0) + (j.duel ?? 0); // 390 — défis entre amis
  }
  return xp;
}

/** Publie ses chiffres. `acquis` vient de « Mes progrès » ; sinon le dernier connu. */
export async function publieAmis(streak: Streak, prenom: string | null, acquis?: number): Promise<void> {
  if (acquis !== undefined) ecrit(CLE_ACQUIS, String(acquis));
  if (!amisActifs()) return;
  const today = todayKey();
  const defi = streak.defis?.[today];
  try {
    await supabase.rpc('amis_publier', {
      p_prenom: prenom,
      p_serie: liveStreak(streak, today),
      p_serie_jour: streak.lastDay,
      p_xp_semaine: xpSemaine(streak, today),
      p_semaine: lundiDe(today),
      p_mots: acquis ?? (Number(lit(CLE_ACQUIS)) || 0),
      p_defi_score: defi ?? null,
      p_defi_jour: defi === undefined ? null : today,
    });
  } catch { /* hors ligne : ce sera pour la prochaine fois */ }
}

/** Après une synchronisation : la série et les XP à jour, sans ouvrir « Mes progrès ». */
export async function publieDepuisAppareil(): Promise<void> {
  if (!amisActifs()) return;
  const [streak, s] = await Promise.all([repository.getStreak(), repository.getSettings()]);
  await publieAmis(streak, nettoiePrenom(s.prenom));
}

function versAmi(r: LigneSql, today: string): Ami {
  return {
    userId: r.user_id,
    prenom: r.prenom || '?',
    relation: r.relation,
    code: r.code,
    actif: !!r.actif,
    serie: r.serie_jour && r.serie_jour >= shiftDay(today, -1) ? r.serie ?? 0 : 0,
    xpSemaine: r.semaine === lundiDe(today) ? r.xp_semaine ?? 0 : 0,
    mots: r.mots_acquis ?? 0,
    defi: r.defi_jour === today ? r.defi_score : null,
  };
}

export async function listeAmis(): Promise<Ami[]> {
  const { data, error } = await supabase.rpc('amis_liste');
  if (error) throw error;
  const today = todayKey();
  const liste = ((data ?? []) as LigneSql[]).map((r) => versAmi(r, today));
  const moi = liste.find((a) => a.relation === 'moi');
  ecrit(CLE_ACTIF, moi?.actif ? '1' : null);
  const amis = liste.filter((a) => a.relation === 'ami').length;
  const recues = liste.filter((a) => a.relation === 'recue').length;
  ecrit(CLE_RESUME, !moi?.actif ? null
    : recues ? `${recues} demande${recues > 1 ? 's' : ''}`
      : amis ? `${amis} ami${amis > 1 ? 's' : ''}` : null);
  return liste;
}

export async function activerAmis(prenom: string, quinzePlus: boolean, accordParent: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('amis_activer', {
    p_prenom: prenom, p_quinze_plus: quinzePlus, p_accord_parent: accordParent,
  });
  if (error) throw error;
  ecrit(CLE_ACTIF, '1');
  return data as string;
}

export async function desactiverAmis(): Promise<void> {
  const { error } = await supabase.rpc('amis_desactiver');
  if (error) throw error;
  ecrit(CLE_ACTIF, null);
  ecrit(CLE_RESUME, null);
}

export type Reponse = 'envoyee' | 'ami' | 'inconnu' | 'soi' | 'deja' | 'trop' | 'plein' | 'inactif' | 'compte';
export async function demanderAmi(code: string): Promise<Reponse> {
  const { data, error } = await supabase.rpc('amis_demander', { p_code: code });
  if (error) throw error;
  return data as Reponse;
}

export async function repondreAmi(userId: string, ok: boolean): Promise<void> {
  const { error } = await supabase.rpc('amis_repondre', { p_autre: userId, p_ok: ok });
  if (error) throw error;
}

export async function retirerAmi(userId: string): Promise<void> {
  const { error } = await supabase.rpc('amis_retirer', { p_autre: userId });
  if (error) throw error;
}
