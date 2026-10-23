/**
 * CHANTIER 310 — « PAS D'INSPIRATION ? »
 *
 * GET  /api/parler-idees?classe=4e  → les 3 scènes du jour si elles existent déjà.
 * POST /api/parler-idees            → les invente (Haiku), une fois par jour et par
 *                                     compte. Un 2e appel le même jour renvoie les
 *                                     mêmes, sans nouvel appel au modèle.
 *
 * Les comptes « illimités » (PARLER_ILLIMITE) peuvent en redemander : c'est
 * l'exploitant qui teste.
 *
 * CHANTIER 312 — LA SCÈNE INVENTÉE RESTE AU NIVEAU DE L'ÉLÈVE.
 * Avant, Haiku ne recevait que « Classe : 4e ». Il reçoit maintenant :
 *   • la grammaire de la classe (table tenue ICI, pas envoyée par l'appli :
 *     aucun texte libre du téléphone n'entre dans la consigne) ;
 *   • une règle de complexité par classe (un seul but simple en 4e…) ;
 *   • le cran de difficulté (1 à 20) ;
 *   • les mots de la semaine, filtrés (lettres seulement, 20 au plus).
 * Il rend aussi 3 à 6 « mots utiles » par scène, montrés à l'élève.
 * Si la classe change dans la journée, les scènes sont refaites (3 fois par
 * jour au plus, pour qu'un aller-retour dans les Réglages ne coûte rien).
 *
 * Coût : ~750 jetons d'entrée + ~800 de sortie sur Haiku ≈ 0,45 centime
 * d'euro par génération.
 */
import {
  appelleClaude, json, jourUtc, modeleParler, noteConsommation, quotaDe, utilisateurEtEmail,
  voixOuverte, type Contexte, type Env,
} from './_parler-commun';
import { sceneValide, TITRES_BANQUE, type Scene } from './_situations';

/** En dur : la génération ne doit jamais partir sur un modèle plus cher. */
const MODELE = 'claude-haiku-4-5';
/** 312 — générations au plus par jour (la 1re + 2 changements de classe). */
const MAX_GEN_JOUR = 3;

/** 312 — la même table que l'appli (Parler.tsx), relue ici : le serveur ne prend pas le texte du téléphone. */
const GRAMMAIRE: Record<string, string> = {
  '4e': 'présent, prétérit, futur, present perfect',
  '3e': 'tous les temps du collège, conditionnel',
  '2de': 'temps composés, explications détaillées',
  '1re': 'nuances, hypothèses, récits riches',
  Tle: 'registre soutenu, vocabulaire précis, hypothèses',
};

/** 312 — ce que la scène a le droit de demander, par classe. */
const COMPLEXITE: Record<string, string> = {
  '4e': 'UN seul but très simple (demander, acheter, réserver, s’orienter) ; 4 étapes courtes ; des imprévus qui se règlent avec des mots courants. Ni explication longue, ni négociation.',
  '3e': 'un seul but simple ; 4 ou 5 étapes ; un imprévu peut demander de proposer une autre solution, toujours avec des mots courants.',
  '2de': 'un but concret avec un petit problème à expliquer ou à résoudre ; 4 ou 5 étapes.',
  '1re': 'l’élève peut expliquer un problème, comparer deux options pratiques, demander une précision, négocier poliment.',
  Tle: 'l’élève peut expliquer un problème en détail, comparer deux options pratiques et justifier son choix, négocier poliment.',
};

interface Niveau { classe: string; cran: number; mots: string[] }

function niveauDe(c: { classe?: unknown; cran?: unknown; mots?: unknown }): Niveau {
  const classe = typeof c.classe === 'string' ? c.classe : '';
  const n = Math.round(Number(c.cran));
  const cran = Number.isFinite(n) ? Math.min(20, Math.max(1, n)) : 10;
  /* Les mots viennent des paquets de l'élève, qui peut en avoir tapé lui-même :
     lettres, espaces, apostrophes et tirets seulement. */
  const mots = Array.isArray(c.mots)
    ? c.mots
      .filter((m): m is string => typeof m === 'string')
      .map((m) => m.trim().slice(0, 30))
      .filter((m) => /^[A-Za-z][A-Za-z '’-]*$/.test(m))
      .slice(0, 20)
    : [];
  return { classe, cran, mots };
}

function cranDit(n: number): string {
  const nuance = n <= 7
    ? 'Situation encore plus simple que la moyenne de la classe.'
    : n >= 14
      ? 'Un imprévu un peu plus riche est permis, sans sortir de la grammaire de la classe.'
      : 'Situation typique de la classe.';
  return `Cran de difficulté ${n} sur 20 (10 = milieu). ${nuance}`;
}

function consigne(niv: Niveau): string {
  return `Tu inventes des mises en situation pour un élève français
(collège ou lycée) qui s'entraîne à PARLER anglais avec une IA. L'IA jouera
un personnage ; l'élève jouera le sien.

NIVEAU DE L'ÉLÈVE — c'est la règle la plus importante :
- classe : ${niv.classe} ;
- grammaire qu'il maîtrise : ${GRAMMAIRE[niv.classe] ?? GRAMMAIRE['4e']} ;
- complexité permise : ${COMPLEXITE[niv.classe] ?? COMPLEXITE['4e']}
- ${cranDit(niv.cran)}
La scène doit pouvoir se jouer ENTIÈREMENT avec cette grammaire et du
vocabulaire courant pour ce niveau. Pas de démarche administrative, juridique,
bancaire ou technique.

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

Réponds UNIQUEMENT par un tableau JSON, sans texte autour, en français
(sauf "mots", en anglais) :
[{"titre": "6 à 8 mots",
  "role": "le personnage joué par l'IA, avec le lieu (ex. : guide d'un château en Écosse)",
  "eleve": "le personnage joué par l'élève, avec son but",
  "etapes": ["4 ou 5 étapes courtes, dans l'ordre de la scène"],
  "imprevus": ["2 imprévus sans gravité"],
  "mots": ["4 ou 5 mots ou expressions ANGLAIS utiles pour cette scène, connus à ce niveau"]}]`;
}

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

/** 312 — la classe a changé depuis la génération, et il reste un essai ce jour. */
function aRefaire(s: Scene[], classe: string | null | undefined): boolean {
  const avant = s[0]?.classe;
  return !!classe && !!avant && avant !== classe && (s[0]?.gen ?? 1) < MAX_GEN_JOUR;
}

/** Ce que l'écran reçoit : de quoi afficher, pas le déroulé (qui reste une surprise). */
function sortie(scenes: Scene[] | null, encore: boolean): Response {
  return json({
    scenes: scenes
      ? scenes.map((s) => ({ titre: s.titre, role: s.role, eleve: s.eleve, mots: s.mots ?? [], classe: s.classe ?? null }))
      : null,
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
  const classe = new URL(request.url).searchParams.get('classe');
  try {
    const s = await duJour(qui.id, env);
    return sortie(s, !s || quotaDe(qui.email, env).illimite || aRefaire(s, classe));
  } catch (e) {
    console.error('idees get', String(e));
    return json({ erreur: 'les idées n’ont pas pu être lues', detail: String(e).slice(0, 300) }, 503);
  }
};

export const onRequestPost = async ({ request, env }: Contexte): Promise<Response> => {
  const qui = await utilisateurEtEmail(request, env);
  if (!qui) return json({ erreur: 'compte requis' }, 401);
  const illimite = quotaDe(qui.email, env).illimite;

  let corps: { classe?: string | null; cran?: unknown; mots?: unknown };
  try {
    corps = (await request.json()) as typeof corps;
  } catch {
    return json({ erreur: 'corps illisible' }, 400);
  }
  if (!voixOuverte(corps.classe)) {
    return json({ erreur: 'la conversation s’ouvre à partir de la 4e' }, 403);
  }
  const niv = niveauDe(corps);

  /* Une fois par jour : si elles existent (et que la classe n'a pas changé), on les rend. */
  let existantes: Scene[] | null;
  try {
    existantes = await duJour(qui.id, env);
  } catch (e) {
    /* Lecture ratée = on refuse : sinon chaque clic repartirait au modèle. */
    console.error('idees lecture', String(e));
    return json({ erreur: 'les idées n’ont pas pu être vérifiées', detail: String(e).slice(0, 300) }, 503);
  }
  if (existantes && !illimite && !aRefaire(existantes, niv.classe)) return sortie(existantes, false);

  const mots = niv.mots.length ? niv.mots.join(', ') : 'aucun pour l’instant';
  const demande = `Classe de l'élève : ${niv.classe}. Mots anglais qu'il connaît déjà (réutilise-en quelques-uns dans "mots" ou les étapes, si ça va avec la scène) : ${mots}. Invente les 3 scènes.`;

  /*
   * CHANTIER 311 — Haiku d'abord ; s'il est refusé ou rend un JSON
   * inutilisable, on retente UNE fois avec le modèle de la conversation.
   */
  const modeles = [MODELE, modeleParler(env)].filter((m, i, t) => t.indexOf(m) === i);
  let scenes: Scene[] = [];
  const pannes: string[] = [];
  for (const modele of modeles) {
    try {
      const resultat = await appelleClaude(
        env, modele, consigne(niv),
        [{ role: 'user', content: demande }],
        1700, false,
      );
      await noteConsommation(qui.id, modele, resultat.usage, 0, env);
      scenes = litScenes(resultat.texte);
      if (scenes.length >= 3) break;
      pannes.push(`${modele} : réponse incomplète (${scenes.length}/3) « ${resultat.texte.slice(0, 120)} »`);
    } catch (e) {
      console.error('idees appel', modele, String(e));
      pannes.push(`${modele} : ${String(e).slice(0, 200)}`);
    }
  }
  if (scenes.length < 3) {
    return json({ erreur: 'l’IA n’a pas répondu', detail: pannes.join(' | ').slice(0, 500) }, 502);
  }

  const gen = (existantes?.[0]?.gen ?? (existantes ? 1 : 0)) + 1;
  scenes = scenes.map((s) => ({ ...s, classe: niv.classe, gen }));

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
    const t = await r.text();
    console.error('idees ecriture', r.status, t);
    return json({ erreur: 'les idées n’ont pas pu être enregistrées', detail: `${r.status} ${t.slice(0, 300)}` }, 503);
  }

  return sortie(scenes, illimite);
};
