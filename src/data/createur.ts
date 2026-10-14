/**
 * CHANTIER 270 — LE COMPTE DU CRÉATEUR : toutes les apparences, sans crédits.
 *
 * Le créateur doit pouvoir essayer chaque apparence sans l'acheter. On
 * reconnaît son compte à son adresse (celle du tableau de bord /admin,
 * contact@marlotin.com par défaut ; VITE_CREATEURS pour en mettre d'autres,
 * séparées par des virgules).
 *
 * Rien n'est écrit : ni achat, ni crédit dépensé. Déconnecté, ou sur un
 * autre compte, la boutique redevient normale.
 */
import { supabase } from './supabase';

const CREATEURS = (import.meta.env.VITE_CREATEURS ?? 'contact@marlotin.com')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

let courriel: string | null = null;

export function estCreateur(): boolean {
  return !!courriel && CREATEURS.includes(courriel);
}

function suivre(e: string | null | undefined) {
  const avant = estCreateur();
  courriel = e ? e.trim().toLowerCase() : null;
  /* Prévient les écrans qui lisent l'apparence (useStyle) : la boutique se redessine. */
  if (avant !== estCreateur()) window.dispatchEvent(new Event('apparence'));
}

void supabase.auth.getSession().then(({ data }) => suivre(data.session?.user.email));
supabase.auth.onAuthStateChange((_evenement, session) => suivre(session?.user.email));
