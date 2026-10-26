/**
 * CHANTIER 325 — ÉLÈVE OU ADULTE : LE PROFIL, ET LE TON QUI VA AVEC.
 *
 * Choisi à la toute première étape de la visite (Visite.tsx), puis dans
 * Réglages › Mon profil. Gardé dans localStorage : la visite le lit au
 * premier rendu, avant que les réglages soient chargés. Un niveau adulte
 * enregistré (settings.adulte, qui voyage avec le compte) l'emporte.
 *
 * Élève = tu. Adulte = vous.
 */
import type { Settings } from '../domain/types';

export type Profil = 'eleve' | 'adulte';

const CLE = 'vocab:profil';

/** Envoyé par Réglages › Mon profil quand une classe ou un niveau adulte est validé. */
export const EVT_PROFIL = 'vocab:profil-choisi';

export function profilLocal(): Profil | null {
  try {
    const v = localStorage.getItem(CLE);
    return v === 'adulte' || v === 'eleve' ? v : null;
  } catch {
    return null;
  }
}

export function poseProfil(p: Profil): void {
  try { localStorage.setItem(CLE, p); } catch { /* stockage plein : le ton restera celui par défaut */ }
}

/* 325 bis — le dernier choix fait sur cet appareil (visite ou Mon profil)
   l'emporte : un ancien niveau adulte ne doit pas cacher la liste des classes
   à quelqu'un qui vient de dire « Je suis élève ». */
export function estAdulte(s?: Pick<Settings, 'adulte' | 'classe'> | null): boolean {
  const p = profilLocal();
  if (p) return p === 'adulte';
  return !!s?.adulte;
}

/** Le même texte, au tutoiement ou au vouvoiement. */
export const tv = (adulte: boolean, tu: string, vous: string): string => (adulte ? vous : tu);
