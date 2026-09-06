/**
 * Client Supabase.
 *
 * L'URL et la clé « publishable » sont publiques par conception : elles se
 * retrouvent dans le code envoyé au navigateur. La sécurité repose sur les
 * règles d'accès de la base (RLS), pas sur le secret de cette clé.
 *
 * Elles sont lues depuis les variables d'environnement pour qu'un second
 * projet — un environnement de test, par exemple — ne demande pas de toucher
 * au code. Les valeurs par défaut sont celles du projet actuel.
 */
import { createClient, type Session } from '@supabase/supabase-js';

const url =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://lvgcbezgznudvtijsjyq.supabase.co';
const key =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_L4eDpmDF0RMR8gs4xBlt-A_d-f-JmYv';

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type { Session };

/** Lance la connexion Google. Le navigateur quitte la page puis y revient. */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
