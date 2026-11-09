/**
 * `GET  /api/parler-profil` — mon profil de conversation, tel que le serveur le connaît.
 * `POST /api/parler-profil` — le déclarer : classe, niveau d'adulte, « j'ai 18 ans ou plus »,
 *                             accord d'un parent.
 *
 * CHANTIER 402 — voir `_protection.ts`. C'est le SEUL chemin d'écriture de
 * `parler_profil` : le téléphone ne peut pas y écrire directement. L'identifiant
 * vient du jeton, jamais du corps.
 *
 * Les dates d'accord sont posées par le serveur, à l'instant de l'appel, et ne
 * se réécrivent pas : un accord donné reste daté du jour où il l'a été.
 */
import { json, utilisateur, type Contexte } from './_parler-commun';
import { enregistreProfil, profilDe, verdictProfil } from './_protection';

interface Corps {
  classe?: string | null;
  adulte?: string | null;
  majeur?: boolean;
  accord?: boolean;
}

export const onRequestGet = async ({ request, env }: Contexte): Promise<Response> => {
  const userId = await utilisateur(request, env);
  if (!userId) return json({ erreur: 'compte requis' }, 401);
  try {
    const p = await profilDe(userId, env);
    return json({ profil: p, verdict: verdictProfil(p) });
  } catch (e) {
    console.error('profil lecture', String(e));
    return json({ erreur: 'profil illisible' }, 503);
  }
};

export const onRequestPost = async ({ request, env }: Contexte): Promise<Response> => {
  const userId = await utilisateur(request, env);
  if (!userId) return json({ erreur: 'compte requis' }, 401);

  let c: Corps;
  try { c = (await request.json()) as Corps; } catch { return json({ erreur: 'corps illisible' }, 400); }

  /* Seuls les quatre champs connus passent ; « classe » et « adulte » peuvent valoir null (effacer). */
  const d: Corps = {};
  if ('classe' in c) d.classe = typeof c.classe === 'string' ? c.classe : null;
  if ('adulte' in c) d.adulte = typeof c.adulte === 'string' ? c.adulte : null;
  if (c.majeur === true) d.majeur = true;
  if (c.accord === true) d.accord = true;

  try {
    const p = await enregistreProfil(userId, d, env);
    return json({ profil: p, verdict: verdictProfil(p) });
  } catch (e) {
    console.error('profil écriture', String(e));
    return json({ erreur: 'profil non enregistré' }, 503);
  }
};
