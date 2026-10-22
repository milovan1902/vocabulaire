/**
 * CHANTIER 310 — « PAS D'INSPIRATION ? »
 *
 * GET  /api/parler-idees  → les 3 scènes du jour si elles existent déjà.
 * POST /api/parler-idees  → les invente (Haiku), une fois par jour et par
 *                           compte. Un 2e appel le même jour renvoie les
 *                           mêmes, sans nouvel appel au modèle.
 *
 * Les comptes « illimités » (PARLER_ILLIMITE) peuvent en redemander : c'est
 * l'exploitant qui teste.
 *
 * Coût : ~600 jetons d'entrée + ~700 de sortie sur Haiku ≈ 0,4 centime
 * d'euro par génération, au plus une fois par jour et par élève.
 */
import {
  appelleClaude, json, jourUtc, noteConsommation, quotaDe, utilisateurEtEmail,
  voixOuverte, type Contexte, type Env,
} from './_parler-commun';
import { sceneValide, TITRES_BANQUE, type Scene } from './_situations';

/** En dur : la génération ne doit jamais partir sur un modèle plus cher. */
const MODELE = 'claude-haiku-4-5';

const CONSIGNE = `Tu inventes des mises en situation pour un élève français
(collège ou lycée) qui s'entraîne à PARLER anglais avec une IA. L'IA jouera
un personnage ; l'élève jouera le sien.

Invente EXACTEMENT 3 scènes, très différentes entre elles (lieux, situations
et personnages variés). Chaque scène :
- se passe dans un pays anglophone, dans la vie de tous les jours (voyage,
  commerce, loisirs, services, école, transports, santé bénigne…) ;
- a un but concret à atteindre pour l'élève ;
- convient à un mineur : rien sur la politique, la religion, l'actualité,
  l'argent en grande quantité, l'alcool, la drogue, la violence, la police,
  la séduction, la peur ; aucun accident grave ; aucun débat ni opinion
  à défendre ;
- ne demande jamais à l'élève ses vraies informations personnelles.

Ne reprends AUCUNE de ces scènes déjà proposées par l'application :
${TITRES_BANQUE.join(' ; ')}.

Réponds UNIQUEMENT par un tableau JSON, sans texte autour, en français :
[{"titre": "6 à 8 mots",
  "role": "le personnage joué par l'IA, avec le lieu (ex. : guide d'un château en Écosse)",
  "eleve": "le personnage joué par l'élève, avec son but",
  "etapes": ["4 ou 5 étapes courtes, dans l'ordre de la scène"],
  "imprevus": ["2 imprévus sans gravité"]}]`;

async function duJour(userId: string, env: Env): Promise<Scene[] | null> {
  const r = await fetch(
    `${env.SUPABASE_URL}/rest/v1/parler_idees?select=scenes&user_id=eq.${userId}&jour=eq.${jourUtc()}&limit=1`,
    { headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` } },
  );
  if (!r.ok) throw new Error(`lecture parler_idees ${r.status}`);
  const lignes = (await r.json()) as Array<{ scenes: unknown }>;
  const s = lignes[0]?.scenes;
  if (!Array.isArray(s)) return null;
  const valides = s.map(sceneValide).filter((x): x is Scene => !!x);
  return valides.length === 3 ? valides : null;
}

/** Ce que l'écran reçoit : de quoi afficher, pas le déroulé (qui reste une surprise). */
function sortie(scenes: Scene[] | null, encore: boolean): Response {
  return json({
    scenes: scenes ? scenes.map((s) => ({ titre: s.titre, role: s.role, eleve: s.eleve })) : null,
    encore,
  });
}

/** Le tableau JSON, même si le modèle a mis une phrase autour. */
function litScenes(texte: string): Scene[] {
  const a = texte.indexOf('[');
  const b = texte.lastIndexOf(']');
  if (a < 0 || b <= a) return [];
  try {
    const brut = JSON.parse(texte.slice(a, b + 1)) as unknown;
    return Array.isArray(brut) ? brut.map(sceneValide).filter((x): x is Scene => !!x).slice(0, 3) : [];
  } catch {
    return [];
  }
}

export const onRequestGet = async ({ request, env }: Contexte): Promise<Response> => {
  const qui = await utilisateurEtEmail(request, env);
  if (!qui) return json({ erreur: 'compte requis' }, 401);
  try {
    const s = await duJour(qui.id, env);
    return sortie(s, !s || quotaDe(qui.email, env).illimite);
  } catch (e) {
    console.error('idees get', String(e));
    return json({ erreur: 'les idées n’ont pas pu être lues' }, 503);
  }
};

export const onRequestPost = async ({ request, env }: Contexte): Promise<Response> => {
  const qui = await utilisateurEtEmail(request, env);
  if (!qui) return json({ erreur: 'compte requis' }, 401);
  const illimite = quotaDe(qui.email, env).illimite;

  let corps: { classe?: string | null };
  try {
    corps = (await request.json()) as { classe?: string | null };
  } catch {
    return json({ erreur: 'corps illisible' }, 400);
  }
  if (!voixOuverte(corps.classe)) {
    return json({ erreur: 'la conversation s’ouvre à partir de la 4e' }, 403);
  }

  /* Une fois par jour : si elles existent, on les rend sans rappeler le modèle. */
  let existantes: Scene[] | null;
  try {
    existantes = await duJour(qui.id, env);
  } catch (e) {
    /* Lecture ratée = on refuse : sinon chaque clic repartirait au modèle. */
    console.error('idees lecture', String(e));
    return json({ erreur: 'les idées n’ont pas pu être vérifiées' }, 503);
  }
  if (existantes && !illimite) return sortie(existantes, false);

  let resultat;
  try {
    resultat = await appelleClaude(
      env, MODELE, CONSIGNE,
      [{ role: 'user', content: `Classe de l'élève : ${corps.classe}. Invente les 3 scènes.` }],
      1200, false,
    );
  } catch (e) {
    console.error('idees appel', String(e));
    return json({ erreur: 'l’IA n’a pas répondu' }, 502);
  }
  await noteConsommation(qui.id, MODELE, resultat.usage, 0, env);

  const scenes = litScenes(resultat.texte);
  if (scenes.length < 3) return json({ erreur: 'les idées reçues étaient incomplètes, réessaie' }, 502);

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/parler_idees?on_conflict=user_id,jour`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ user_id: qui.id, jour: jourUtc(), scenes }),
  });
  if (!r.ok) {
    console.error('idees ecriture', r.status, await r.text());
    return json({ erreur: 'les idées n’ont pas pu être enregistrées' }, 503);
  }

  return sortie(scenes, illimite);
};
