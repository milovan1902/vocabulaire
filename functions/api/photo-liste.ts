/**
 * `GET /api/photo-liste` — combien de photos me reste-t-il cette semaine ?
 * `POST /api/photo-liste` — lire une liste de mots prise en photo.
 *
 * CHANTIER 281 — LA LISTE EN PHOTO
 *
 * Même porte que Parler, mêmes règles :
 *   1. QUI ? le jeton Supabase est vérifié. Sans compte, rien.
 *   2. COMBIEN RESTE-T-IL ? lu AVANT l'appel. Trois photos LUES par
 *      semaine (lundi → dimanche, UTC). Une photo où l'IA ne trouve aucun
 *      mot n'est pas comptée — mais elle reste notée, et dix essais par
 *      semaine au plus ferment la porte à qui enverrait des photos vides
 *      en boucle.
 *   3. ON APPELLE.
 *   4. ON NOTE ce que ça a coûté, une ligne par appel (table `photo_usage`).
 *
 * Réservé aux abonnés. Tant que les abonnements Google Play ne sont pas
 * branchés, « abonné » = adresse de PARLER_ILLIMITE, comme dans l'admin.
 * PHOTO_POUR_TOUS=1 ouvre la photo à tous les comptes (période de test).
 */
import {
  coutCentimes, estIllimite, json, jourUtc, lundiUtc, utilisateurEtEmail,
  type Env, type Usage,
} from './_parler-commun';

type EnvPhoto = Env & { MODELE_PHOTO?: string; PHOTO_POUR_TOUS?: string };
interface ContextePhoto { request: Request; env: EnvPhoto }

export const PHOTOS_SEMAINE = 3;
const ESSAIS_SEMAINE = 10;
/** ~2,2 Mo d'image une fois décodée. Le téléphone envoie ~300 Ko. */
const MAX_BASE64 = 3_000_000;
const MAX_MOTS = 150;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MODELES = new Set(['claude-sonnet-4-5', 'claude-haiku-4-5']);

function modelePhoto(env: EnvPhoto): string {
  return env.MODELE_PHOTO && MODELES.has(env.MODELE_PHOTO) ? env.MODELE_PHOTO : 'claude-sonnet-4-5';
}

function autorise(email: string | null, env: EnvPhoto): boolean {
  return env.PHOTO_POUR_TOUS === '1' || estIllimite(email, env);
}

/** Le dimanche qui clôt la semaine en cours : la date que l'écran affiche. */
function dimancheUtc(): string {
  const d = new Date(`${lundiUtc()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

/** 283 — la cause d'une lecture ratée, en clair, pour l'écran. */
function causeDe(e: unknown): string {
  const t = String(e);
  if (/PGRST205|42P01|does not exist|Could not find the table|\(404\)/i.test(t)) return 'table photo_usage absente : passer le SQL de la livraison 281';
  if (/\(401\)|\(403\)|JWT|apikey/i.test(t)) return 'clé de service Supabase refusée';
  return 'quota illisible';
}

export interface EtatPhoto { restantes: number; max: number; jusquau: string }

function etatDe(lues: number): EtatPhoto {
  return { restantes: Math.max(0, PHOTOS_SEMAINE - lues), max: PHOTOS_SEMAINE, jusquau: dimancheUtc() };
}

function entetesService(env: Env): Record<string, string> {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };
}

/** Lecture ratée = on lève : un quota illisible vaut un quota épuisé. */
async function semaine(userId: string, env: Env): Promise<{ lues: number; essais: number }> {
  const r = await fetch(
    `${env.SUPABASE_URL}/rest/v1/photo_usage?select=lue&user_id=eq.${userId}&jour=gte.${lundiUtc()}`,
    { headers: entetesService(env) },
  );
  if (!r.ok) {
    const dit = await r.text().catch(() => '');
    throw new Error(`lecture photo_usage impossible (${r.status}) ${dit.slice(0, 200)}`);
  }
  const lignes = (await r.json()) as Array<{ lue: boolean }>;
  return { lues: lignes.filter((l) => l.lue).length, essais: lignes.length };
}

async function note(userId: string, modele: string, u: Usage, mots: number, env: Env): Promise<void> {
  await fetch(`${env.SUPABASE_URL}/rest/v1/photo_usage`, {
    method: 'POST',
    headers: { ...entetesService(env), 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      jour: jourUtc(),
      modele,
      jetons_in: u.jetonsIn,
      jetons_out: u.jetonsOut,
      cout_centimes: Number(coutCentimes(modele, u).toFixed(4)),
      mots,
      lue: mots > 0,
    }),
  }).catch((e) => console.error('photo_usage non écrite', String(e)));
}

const CONSIGNE = `Tu lis la photo d'une liste de vocabulaire d'un élève français qui apprend l'anglais (cahier, fiche du professeur, page de manuel).

Réponds UNIQUEMENT par des lignes de cette forme :
mot anglais ; traduction française

Une ligne par mot ou expression. Rien d'autre : pas de titre, pas de numéro, pas de tiret, pas de commentaire.
Recopie ce qui est écrit, en corrigeant seulement une faute évidente de lecture.
Garde les articles et le "to" des verbes s'ils sont écrits (the kitchen ; la cuisine, to borrow ; emprunter).
Si un mot anglais n'a pas de traduction sur la photo, donne la traduction française la plus courante.
Ignore tout ce qui n'est pas du vocabulaire : consignes, exercices, phrases d'exemple, dates, noms propres.
Si la photo ne contient aucune liste de vocabulaire anglais, réponds exactement : AUCUN`;

/** « the kitchen ; la cuisine » → { en, fr }. Tolère les puces, numéros et tirets. */
function lignesEnMots(texte: string): Array<{ en: string; fr: string }> {
  if (/^\s*AUCUN\s*$/i.test(texte)) return [];
  const vus = new Set<string>();
  const mots: Array<{ en: string; fr: string }> = [];
  for (const brut of texte.split('\n')) {
    const l = brut.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim();
    const i = l.indexOf(';');
    if (i < 0) continue;
    /* La virgule sépare les colonnes dans l'éditeur : on n'en laisse pas côté anglais. */
    const en = l.slice(0, i).trim().replace(/\s*,\s*/g, ' / ');
    const fr = l.slice(i + 1).trim();
    if (!en || !fr || en.length > 80 || fr.length > 120) continue;
    const k = en.toLowerCase();
    if (vus.has(k)) continue;
    vus.add(k);
    mots.push({ en, fr });
    if (mots.length >= MAX_MOTS) break;
  }
  return mots;
}

export const onRequestGet = async ({ request, env }: ContextePhoto): Promise<Response> => {
  const qui = await utilisateurEtEmail(request, env);
  if (!qui) return json({ erreur: 'compte requis' }, 401);
  if (!autorise(qui.email, env)) return json({ erreur: 'réservé aux abonnés' }, 403);
  try {
    return json(etatDe((await semaine(qui.id, env)).lues));
  } catch (e) {
    console.error('quota photo illisible', String(e));
    return json({ erreur: causeDe(e) }, 503);
  }
};

export const onRequestPost = async ({ request, env }: ContextePhoto): Promise<Response> => {
  const qui = await utilisateurEtEmail(request, env);
  if (!qui) return json({ erreur: 'compte requis' }, 401);
  if (!autorise(qui.email, env)) return json({ erreur: 'réservé aux abonnés' }, 403);

  let corps: { image?: string; type?: string };
  try {
    corps = (await request.json()) as typeof corps;
  } catch {
    return json({ erreur: 'corps illisible' }, 400);
  }
  const type = corps.type ?? 'image/jpeg';
  if (typeof corps.image !== 'string' || !corps.image || !TYPES.has(type)) {
    return json({ erreur: 'image manquante' }, 400);
  }
  if (corps.image.length > MAX_BASE64) return json({ erreur: 'image trop lourde' }, 413);

  let avant: { lues: number; essais: number };
  try {
    avant = await semaine(qui.id, env);
  } catch (e) {
    console.error('quota photo non vérifié', String(e));
    return json({ erreur: causeDe(e) }, 503);
  }
  if (avant.lues >= PHOTOS_SEMAINE || avant.essais >= ESSAIS_SEMAINE) {
    return json({ erreur: 'quota épuisé', etat: { ...etatDe(avant.lues), restantes: 0 } }, 429);
  }

  const modele = modelePhoto(env);
  const entetes: Record<string, string> = {
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };
  if (env.ANTHROPIC_WORKSPACE_ID) entetes['anthropic-workspace-id'] = env.ANTHROPIC_WORKSPACE_ID;

  let texte = '';
  let usage: Usage = { jetonsIn: 0, jetonsCache: 0, jetonsOut: 0 };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: entetes,
      body: JSON.stringify({
        model: modele,
        /* ~100 mots : 2 000 jetons suffisent largement, et bornent la facture. */
        max_tokens: 2000,
        system: CONSIGNE,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: type, data: corps.image } },
            { type: 'text', text: 'Voici la liste.' },
          ],
        }],
      }),
    });
    if (!r.ok) throw new Error(`api ${r.status} : ${(await r.text()).slice(0, 300)}`);
    const rep = (await r.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    texte = (rep.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('').trim();
    usage = { jetonsIn: rep.usage?.input_tokens ?? 0, jetonsCache: 0, jetonsOut: rep.usage?.output_tokens ?? 0 };
  } catch (e) {
    /* Un appel qui échoue n'est pas facturé : rien n'est noté, l'élève garde sa photo. */
    console.error('appel au modèle (photo)', String(e));
    return json({ erreur: 'la lecture de la photo n’a pas répondu' }, 502);
  }

  const mots = lignesEnMots(texte);
  await note(qui.id, modele, usage, mots.length, env);

  const etat = etatDe(avant.lues + (mots.length ? 1 : 0));
  if (!mots.length) return json({ erreur: 'aucun mot lu', etat }, 422);
  return json({ mots, etat });
};
