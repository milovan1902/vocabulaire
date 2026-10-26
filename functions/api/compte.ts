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
/* 330 — la suppression se dit aussi dans les journaux, étape par étape. */
const TABLES = [
  'progress', 'user_settings', 'parler_usage', 'parler_seance', 'parler_signalement',
  'photo_usage', 'parler_idees', 'entitlements',
  /* 333 — `parler_mois` retiré : c'est une VUE calculée sur parler_usage
     (« cannot delete from view », 55000). Elle se vide avec parler_usage. */
];

/** 328 — le seul code d'erreur Postgres/Supabase (« 23503 », « 42501 »…), jamais le message entier. */
/* 331 — le message court de Supabase (« Database error deleting user »…), sans données. */
function motDe(dit: string): string {
  return (dit.match(/"(?:msg|message|error_description|error)"\s*:\s*"([^"]{1,120})"/)?.[1] ?? '').trim();
}

function codeDe(dit: string): string | null {
  return dit.match(/"code"\s*:\s*"([A-Za-z0-9_]+)"/)?.[1] ?? dit.match(/\b(23503|42501|42703|42P01|PGRST\d+)\b/)?.[1] ?? null;
}

/*
 * CHANTIER 331 — JAMAIS DE 502. Cloudflare remplace une réponse 502 d'une
 * fonction par sa propre page « Bad gateway » : notre explication en JSON
 * n'arrivait jamais au téléphone. Toutes les erreurs repartent en 500.
 */
export const onRequestDelete = async (ctx: Contexte): Promise<Response> => {
  /* 330 — une exception (réseau, variable manquante…) donnait un 502 de Cloudflare,
     sans rien dire. Elle est maintenant rattrapée et décrite en une ligne. */
  try {
    return await supprime(ctx);
  } catch (e) {
    console.error('suppression : exception', String(e));
    return json({ erreur: 'la suppression n’a pas abouti, réessaie dans un instant', etape: `exception ${String(e).slice(0, 160)}` }, 500);
  }
};

async function supprime({ request, env }: Contexte): Promise<Response> {
  if (!env.SUPABASE_SERVICE_KEY) {
    return json({ erreur: 'la suppression n’a pas abouti, réessaie dans un instant', etape: 'configuration SUPABASE_SERVICE_KEY absente' }, 500);
  }
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
      return json({ erreur: 'la suppression n’a pas abouti, réessaie dans un instant', etape: `${table} ${r.status} ${motDe(dit)}`.trim(), code: codeDe(dit) }, 500);
    }
  }

  const r = await fetch(
    `${env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: entetes },
  );
  if (!r.ok && r.status !== 404) {
    const dit = (await r.text()).slice(0, 300);
    console.error('suppression du compte', r.status, dit);
    return json({ erreur: 'la suppression n’a pas abouti, réessaie dans un instant', etape: `compte ${r.status} ${motDe(dit)}`.trim(), code: codeDe(dit) }, 500);
  }

  return json({ ok: true });
}
