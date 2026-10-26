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
/*
 * CHANTIER 320 — `photo_usage` (281) et `parler_idees` (310) manquaient :
 * un compte supprimé laissait derrière lui ses relevés de photos et ses
 * scènes inventées.
 */
/*
 * CHANTIER 329 — `entitlements` (paquets obtenus) et `parler_mois` (minutes du
 * mois) manquaient aussi : leurs lignes empêchaient d'effacer le compte, d'où
 * « un souci technique » au moment de la suppression.
 */
const TABLES = [
  'progress', 'user_settings', 'parler_usage', 'parler_seance', 'parler_signalement',
  'photo_usage', 'parler_idees', 'entitlements', 'parler_mois',
];

/** 328 — le seul code d'erreur Postgres/Supabase (« 23503 », « 42501 »…), jamais le message entier. */
function codeDe(dit: string): string | null {
  return dit.match(/"code"\s*:\s*"([A-Za-z0-9_]+)"/)?.[1] ?? dit.match(/\b(23503|42501|42703|42P01|PGRST\d+)\b/)?.[1] ?? null;
}

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
      const dit = (await r.text()).slice(0, 300);
      console.error(`suppression ${table}`, r.status, dit);
      /* 328 — l'étape et le code partent au suivi des erreurs (app_erreur) : sans eux,
         « un souci technique » ne disait pas quelle table bloquait. Aucun contenu de la base. */
      return json({ erreur: 'la suppression n’a pas abouti, réessaie dans un instant', etape: `${table} ${r.status}`, code: codeDe(dit) }, 502);
    }
  }

  const r = await fetch(
    `${env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: entetes },
  );
  if (!r.ok && r.status !== 404) {
    const dit = (await r.text()).slice(0, 300);
    console.error('suppression du compte', r.status, dit);
    return json({ erreur: 'la suppression n’a pas abouti, réessaie dans un instant', etape: `compte ${r.status}`, code: codeDe(dit) }, 502);
  }

  return json({ ok: true });
};
