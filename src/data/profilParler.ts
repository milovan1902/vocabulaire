/**
 * CHANTIER 402 — LE PROFIL DE CONVERSATION, LU ET ÉCRIT PAR LE SERVEUR
 *
 * La classe, « j'ai 18 ans ou plus » et l'accord d'un parent sont enregistrés
 * sur le serveur, avec leur date. Le téléphone les déclare ; il ne les écrit
 * pas lui-même, et le serveur ne croit plus la fiche qu'il envoie.
 */
import { supabase } from './supabase';

export interface ProfilParler {
  classe: string | null;
  adulte: string | null;
  majeurDeclareLe: string | null;
  accordParentalLe: string | null;
}

export interface Declaration {
  classe?: string | null;
  adulte?: string | null;
  majeur?: boolean;
  accord?: boolean;
}

/** Le profil du serveur après la déclaration, ou `null` (sans compte, hors ligne, panne). */
export async function declareProfil(d: Declaration): Promise<ProfilParler | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const t = data.session?.access_token;
    if (!t) return null;
    const r = await fetch('/api/parler-profil', {
      method: 'POST',
      headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
      body: JSON.stringify(d),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { profil?: ProfilParler | null };
    return j.profil ?? null;
  } catch {
    return null;
  }
}
