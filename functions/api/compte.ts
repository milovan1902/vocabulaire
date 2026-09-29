/**
 * `DELETE /api/compte` — supprimer son compte et tout ce qui s'y rattache.
 *
 * CHANTIER 137 — GOOGLE PLAY L'EXIGE, ET C'EST JUSTE
 *
 * Une application qui permet de créer un compte doit permettre de le
 * supprimer, depuis l'application même. Ceci en est le seul point
 * d'entrée : la clé de service ne descend jamais dans le téléphone.
 *
 * L'ordre compte :
 *   1. QUI ? le jeton Supabase est vérifié. On ne supprime que soi-même :
 *      l'identifiant vient du jeton, jamais du corps de la requête.
 *   2. LES DONNÉES : progression, réglages, consommation, conversations.
 *      Effacées explicitement, table par table — on ne compte pas sur une
 *      cascade qu'aucun fichier du dépôt ne garantit pour `progress` et
 *      `user_settings`.
 *   3. LE COMPTE lui-même, par l'API d'administration.
 *
 * Si l'étape 3 échoue après la 2, les données sont déjà parties : l'élève
 * relance, l'étape 2 ne trouve plus rien, l'étape 3 réessaie. Rien ne reste
 * à moitié.
 *
 * Aucun détail interne ne repart vers le téléphone : il est écrit dans les
 * journaux Cloudflare, l'élève reçoit une phrase.
 */
import { json, utilisateur, type Contexte } from './_parler-commun';

/** Les tables qui portent une colonne `user_id`. À compléter si une table s'ajoute. */
const TABLES = ['progress', 'user_settings', 'parler_usage', 'parler_seance', 'parler_signalement'];

export const onRequestDelete = async ({ request, env }: Contexte): Promise<Response> => {
  const userId = await utilisateur(request, env);
  if (!userId) return json({ erreur: 'compte requis' }, 401);

  const entetes = {
    apikey: env.SUPABASE_SERVICE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };

  for (const table of TABLES) {
    const r = await fetch(
      `${env.SUPABASE_URL}/rest/v1/${table}?user_id=eq.${encodeURIComponent(userId)}`,
      { method: 'DELETE', headers: entetes },
    );
    // Une table absente (404) n'empêche pas la suite : il n'y a rien à y effacer.
    if (!r.ok && r.status !== 404) {
      console.error(`suppression ${table}`, r.status, await r.text());
      return json({ erreur: 'la suppression n’a pas abouti, réessaie dans un instant' }, 502);
    }
  }

  const r = await fetch(
    `${env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: entetes },
  );
  if (!r.ok && r.status !== 404) {
    console.error('suppression du compte', r.status, await r.text());
    return json({ erreur: 'la suppression n’a pas abouti, réessaie dans un instant' }, 502);
  }

  return json({ ok: true });
};
