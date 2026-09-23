/**
 * Ce que les deux fonctions partagent.
 *
 * CHANTIER 104 — LE PROXY, LE QUOTA, LA CONSOMMATION RÉELLE
 *
 * Le préfixe `_` compte : sur Cloudflare Pages, un fichier qui commence par
 * un souligné n'est pas publié comme route. Ce module n'est donc joignable
 * que par les deux fonctions voisines, jamais depuis l'extérieur.
 *
 * TROIS RÈGLES QUE CE FICHIER FAIT TENIR :
 *
 * 1. LA CLÉ NE QUITTE JAMAIS LE SERVEUR. Elle vit dans les variables
 *    d'environnement Cloudflare et n'est lue qu'ici. Aucune ligne du code
 *    envoyé au téléphone ne la connaît, et il n'existe aucun chemin pour
 *    la lui faire dire.
 *
 * 2. LE QUOTA SE VÉRIFIE AVANT L'APPEL, et côté serveur. Un plafond posé
 *    dans l'application est une suggestion ; celui-ci est une porte.
 *
 * 3. LA CONSOMMATION EST CELLE QUE LE MODÈLE DÉCLARE, pas une estimation.
 *    Chaque réponse porte son décompte de jetons — c'est le chiffre
 *    facturé, on l'écrit tel quel.
 *
 * Le runtime n'est pas Node : pas de bibliothèque, pas de `process.env`,
 * rien que `fetch` et les liaisons passées dans `env`. C'est plus simple
 * qu'il n'y paraît.
 */

export interface Env {
  /** La clé d'API. Secret Cloudflare, jamais dans le dépôt. */
  ANTHROPIC_API_KEY: string;
  /**
   * Facultatif. À renseigner seulement si la clé n'est pas rattachée à un
   * espace de travail : l'API refuse alors l'appel (400) tant qu'on ne lui
   * dit pas quel espace débiter.
   */
  ANTHROPIC_WORKSPACE_ID?: string;
  /** L'URL du projet Supabase — la même que celle du client. */
  SUPABASE_URL: string;
  /**
   * La clé de SERVICE. Elle passe outre les règles d'accès : c'est elle qui
   * écrit la consommation, et c'est pour cela qu'elle ne doit jamais
   * apparaître ailleurs qu'ici.
   */
  SUPABASE_SERVICE_KEY: string;
  /**
   * Les identifiants de modèles, en variables et non en dur.
   *
   * Ils changent au fil des versions, et une chaîne codée dans le fichier
   * obligerait à redéployer pour un mot. Relevez les identifiants du jour
   * dans la console et posez-les ici ; les valeurs de repli ci-dessous
   * servent uniquement à ne pas planter si la variable manque.
   */
  MODELE_PARLER?: string;
  MODELE_BILAN?: string;
}

/**
 * Le contexte d'une fonction Pages, déclaré ici.
 *
 * On n'emploie PAS le type ambiant `PagesFunction` : il n'existe que si
 * `@cloudflare/workers-types` est installé, et un dépôt qui ne l'a pas voit
 * son build échouer sur un nom inconnu. Ces trois champs suffisent.
 */
export interface Contexte {
  request: Request;
  env: Env;
}

const PARLER_DEFAUT = 'claude-sonnet-4-5';
const BILAN_DEFAUT = 'claude-sonnet-4-5';

/**
 * Plafond de gamme : Sonnet 4.5 au plus. Une variable d'environnement qui
 * nommerait un autre modèle (Opus, faute de frappe) est ignorée.
 */
const MODELES_AUTORISES = new Set(['claude-sonnet-4-5', 'claude-haiku-4-5']);

function borne(demande: string | undefined, defaut: string): string {
  return demande && MODELES_AUTORISES.has(demande) ? demande : defaut;
}

/**
 * Le prix par million de jetons, en dollars.
 *
 * La table vit ICI et non dans l'application : les tarifs bougent, et vous
 * ne voulez pas redéployer le téléphone pour ça. Une clé inconnue retombe
 * sur le tarif le plus cher — se tromper vers le haut fait un chiffre
 * pessimiste, jamais une facture surprise.
 */
const PRIX: Record<string, { in: number; out: number }> = {
  'claude-sonnet-4-5': { in: 3, out: 15 },
  'claude-opus-4-1': { in: 15, out: 75 },
  'claude-haiku-4-5': { in: 1, out: 5 },
};

const PRIX_MAX = { in: 15, out: 75 };

/** Un jeton relu en cache coûte le dixième d'un jeton d'entrée. */
const PART_CACHE = 0.1;

/** Dollars vers centimes d'euro. À ajuster si le change dérive. */
const TAUX_EUR = 0.92;

/**
 * Le quota du jour, en jetons.
 *
 * L'ÉLÈVE VOIT DES MINUTES, LE SERVEUR COMPTE DES JETONS. C'est la seule
 * façon d'avoir une promesse lisible pour lui et un plafond sûr pour vous :
 * « dix minutes » ne veut rien dire pour un bavard — deux élèves à dix
 * minutes peuvent différer d'un facteur trois.
 *
 * La valeur vient du calcul d'une séance pleine : une quinzaine d'échanges
 * de dix minutes pèse environ 31 000 jetons d'entrée (l'historique est
 * renvoyé à chaque tour) et 2 000 de sortie.
 */
export const JETONS_JOUR = 33_000;

/**
 * CHANTIER 106 — LE SECOND QUOTA : LE TEMPS RÉEL.
 *
 * Le compte en jetons restait juste et restait ILLISIBLE : un élève qui
 * parle huit minutes par phrases courtes consomme peu de jetons, et voyait
 * « 10 min restantes » en sortant. Le chiffre était vrai au sens du
 * serveur et faux au sens de l'élève — donc faux.
 *
 * On compte désormais aussi les SECONDES réellement passées en séance, et
 * le temps affiché est le plus petit des deux budgets. Le quota en jetons
 * reste la ceinture (un bavard ne ruine personne), les secondes sont la
 * promesse (dix minutes veut dire dix minutes).
 */
export const SECONDES_JOUR = 600;

/**
 * Second plafond, en centimes d'euro. Une ceinture en plus de la bretelle :
 * si un tarif change ou si un modèle plus cher est branché par erreur, le
 * compte en jetons ne verrait rien passer. Celui-ci, si.
 */
export const PLAFOND_CENTIMES_JOUR = 45;

export interface Usage {
  jetonsIn: number;
  jetonsCache: number;
  jetonsOut: number;
  /** Part de jetonsIn écrite en cache : facturée 1,25× au lieu de 1×. */
  jetonsEcriture?: number;
}

/** Écrire en cache coûte un quart de plus qu'une entrée ordinaire. */
const SURCOUT_ECRITURE = 0.25;

export interface Consommation extends Usage {
  /** Jetons pondérés, tels que le quota les compte. */
  ponderes: number;
  coutCentimes: number;
  appels: number;
  /** Secondes de séance réellement écoulées aujourd'hui. */
  secondes: number;
}

export function modeleParler(env: Env): string {
  return borne(env.MODELE_PARLER, PARLER_DEFAUT);
}

export function modeleBilan(env: Env): string {
  return borne(env.MODELE_BILAN, BILAN_DEFAUT);
}

/**
 * Jetons pondérés : ce que le quota décompte.
 *
 * Le cache compte pour un dixième, parce qu'il coûte un dixième. La sortie
 * compte pour un, et non pour cinq comme son prix le voudrait : le quota
 * mesure du TEMPS DE PAROLE, et une réponse longue occupe l'élève aussi
 * longtemps qu'une question longue. C'est le second plafond, en centimes,
 * qui garde le prix à l'œil.
 */
export function ponderes(u: Usage): number {
  return u.jetonsIn + u.jetonsCache * PART_CACHE + u.jetonsOut;
}

export function coutCentimes(modele: string, u: Usage): number {
  const p = PRIX[modele] ?? PRIX_MAX;
  const dollars =
    ((u.jetonsIn + (u.jetonsEcriture ?? 0) * SURCOUT_ECRITURE + u.jetonsCache * PART_CACHE) * p.in
      + u.jetonsOut * p.out) / 1_000_000;
  return dollars * TAUX_EUR * 100;
}

/**
 * Minutes restantes, telles que l'élève les lit. Jamais négatives.
 *
 * LE PLUS PETIT DES DEUX BUDGETS — les jetons et les secondes. Et deux
 * précautions d'affichage, qui ne sont pas de la coquetterie :
 *
 * — dès qu'une seule seconde a été consommée, le chiffre ne peut plus
 *   afficher 10. Un compteur qui reste à son maximum pendant trois minutes
 *   passe pour cassé, et il l'était à moitié : l'arrondi au plus proche
 *   gardait « 10 » jusqu'à 5 % du quota.
 * — tant qu'il reste quoi que ce soit, il ne peut pas afficher 0. « 0 min
 *   restantes » alors que la conversation marche encore est le même
 *   mensonge, dans l'autre sens.
 */
export function minutesRestantes(ponderesDuJour: number, secondesDuJour = 0): number {
  const partJetons = 1 - ponderesDuJour / JETONS_JOUR;
  const partTemps = 1 - secondesDuJour / SECONDES_JOUR;
  const part = Math.min(partJetons, partTemps);
  if (part <= 0) return 0;
  if (part >= 1) return 10;
  return Math.min(9, Math.max(1, Math.round(part * 10)));
}

export function json(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * À qui parle-t-on ?
 *
 * Le jeton d'accès Supabase du téléphone est vérifié en le présentant à
 * Supabase lui-même. Aucune bibliothèque de signature, aucune clé publique
 * à tenir à jour : la base est déjà l'autorité, on lui demande.
 *
 * Sans compte, pas de conversation — et c'est une conséquence du quota, pas
 * une punition : un plafond par personne suppose de savoir qui est la
 * personne.
 */
export async function utilisateur(request: Request, env: Env): Promise<string | null> {
  const entete = request.headers.get('authorization');
  if (!entete?.startsWith('Bearer ')) return null;

  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      authorization: entete,
      apikey: env.SUPABASE_SERVICE_KEY,
    },
  });
  if (!r.ok) return null;
  const u = (await r.json()) as { id?: string };
  return u.id ?? null;
}

/** Le jour courant en UTC, comme la colonne `jour` de la table. */
export function jourUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ce qui a été consommé aujourd'hui.
 *
 * On additionne les lignes du jour en JavaScript plutôt qu'en SQL : il y en
 * a quelques dizaines au plus, et cela évite une fonction stockée à
 * maintenir de l'autre côté.
 */
export async function consommationDuJour(userId: string, env: Env): Promise<Consommation> {
  const url = `${env.SUPABASE_URL}/rest/v1/parler_usage`
    + `?select=jetons_in,jetons_cache,jetons_out,cout_centimes,secondes`
    + `&user_id=eq.${userId}&jour=eq.${jourUtc()}`;

  const r = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    },
  });

  /*
   * CHANTIER 106 — UNE LECTURE RATÉE N'EST PAS UNE CONSOMMATION NULLE.
   *
   * Cette fonction renvoyait des zéros quand la base ne répondait pas. Le
   * résultat se voyait à l'écran : le compteur remontait tout seul à dix
   * minutes au milieu d'une séance. Pire, invisible celui-là : pendant
   * cette panne, le plafond du jour n'existait plus — chaque appel croyait
   * repartir d'un budget intact.
   *
   * On lève donc, et l'appelant refuse. Un quota qu'on ne sait pas lire se
   * traite comme un quota épuisé, jamais comme un quota neuf.
   */
  if (!r.ok) {
    /*
     * CHANTIER 107 — LE MOTIF REMONTE JUSQU'À L'ÉCRAN.
     *
     * « Budget non joignable » ne se répare pas : une table absente, une
     * clé de service périmée et une politique d'accès mal posée donnent
     * exactement la même phrase. Le corps renvoyé par PostgREST, lui,
     * nomme la panne en un mot — il coûte deux lignes à faire suivre et
     * il économise une soirée.
     */
    const dit = await r.text().catch(() => '');
    throw new Error(`lecture du quota impossible (${r.status}) ${dit.slice(0, 200)}`);
  }

  const vide: Consommation = {
    jetonsIn: 0, jetonsCache: 0, jetonsOut: 0,
    ponderes: 0, coutCentimes: 0, appels: 0, secondes: 0,
  };

  const lignes = (await r.json()) as Array<{
    jetons_in: number; jetons_cache: number; jetons_out: number;
    cout_centimes: number; secondes: number;
  }>;

  const c = { ...vide, appels: lignes.length };
  for (const l of lignes) {
    c.jetonsIn += l.jetons_in ?? 0;
    c.jetonsCache += l.jetons_cache ?? 0;
    c.jetonsOut += l.jetons_out ?? 0;
    c.coutCentimes += Number(l.cout_centimes ?? 0);
    c.secondes += l.secondes ?? 0;
  }
  c.ponderes = ponderes(c);
  return c;
}

/**
 * Une ligne par appel. Jamais une mise à jour d'un total.
 *
 * Un compteur qu'on incrémente se perd au premier appel concurrent ; une
 * ligne par appel ne se perd pas, et elle garde le détail — quel modèle,
 * quand, combien. Le jour où un chiffre vous surprend, il est explicable.
 */
/**
 * CHANTIER 106 — `secondes` EST DÉSORMAIS UN ÉCART, PAS UN TOTAL.
 *
 * L'application envoyait les secondes écoulées DEPUIS LE DÉBUT de la
 * séance, à chaque tour. Additionner ces lignes donnait des heures pour
 * une conversation de dix minutes — le chiffre était donc inutilisable, et
 * c'est pour cela que le quota l'ignorait.
 *
 * Elle envoie maintenant les secondes écoulées DEPUIS LE TOUR PRÉCÉDENT :
 * la somme des lignes du jour est exactement le temps parlé. Le plafond
 * ci-dessous (cinq minutes pour un seul tour) écarte le cas de l'écran
 * resté ouvert pendant le dîner.
 */
export async function noteConsommation(
  userId: string, modele: string, u: Usage, secondes: number, env: Env,
): Promise<void> {
  const ecart = Math.min(300, Math.max(0, Math.round(secondes)));
  await fetch(`${env.SUPABASE_URL}/rest/v1/parler_usage`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      jour: jourUtc(),
      modele,
      jetons_in: u.jetonsIn,
      jetons_cache: u.jetonsCache,
      jetons_out: u.jetonsOut,
      cout_centimes: Number(coutCentimes(modele, u).toFixed(4)),
      secondes: ecart,
    }),
  });
}

export interface Fiche {
  /** Classe déclarée dans les Réglages. Elle FIXE le niveau. */
  classe: string | null;
  /** Ce que la classe autorise — temps, tournures. */
  grammaire: string;
  /** Les mots fraîchement acquis, à faire revenir en situation. */
  mots: Array<{ en: string; fr: string }>;
  /** Les thèmes choisis avant la séance. */
  themes: string[];
  /** Erreurs déjà vues, avec leur compteur. Écrites par l'application. */
  erreurs?: Array<{ dit: string; juste: string; fois: number }>;
}

/**
 * Le prompt système, engendré à chaque séance.
 *
 * C'est votre prompt, passé en production. Trois de ses clauses ne
 * survivaient pas au changement de porte, et sont remplacées ici :
 *
 * 1. « Appuie-toi sur nos échanges précédents dans ce Project » — les
 *    Projects sont une fonction de claude.ai ; l'API ne se souvient de
 *    rien. À la place : la FICHE ci-dessous, quelques centaines de jetons
 *    engendrés depuis vos paliers. Taille fixe, donc coût fixe — rien
 *    n'enfle avec les mois.
 *
 * 2. « Propose-moi de passer au niveau supérieur » — le modèle ne peut pas
 *    en juger, il n'a pas la mémoire des séances passées, et si on le lui
 *    demande il le proposera par politesse au deuxième jour. C'est
 *    l'application qui décidera ; lui ne fait que le formuler quand on le
 *    lui dit.
 *
 * 3. Le PLAFOND DE LONGUEUR, qui manquait, et c'est la clause la plus
 *    rentable des deux côtés : la verbosité du modèle est à la fois votre
 *    facture et le silence de l'élève. La règle pédagogique et la règle
 *    économique disent ici la même chose — l'élève doit parler.
 */
export function promptSysteme(f: Fiche): string {
  const mots = f.mots.length
    ? f.mots.map((m) => `${m.en} (${m.fr})`).join(', ')
    : '(aucun pour l’instant)';

  const themes = f.themes.length ? f.themes.join(', ') : 'la vie de tous les jours';

  const erreurs = f.erreurs?.length
    ? f.erreurs.map((e) => `« ${e.dit} » au lieu de « ${e.juste} » (${e.fois} fois)`).join(' ; ')
    : '(aucune relevée pour l’instant)';

  return `Tu es le partenaire de conversation orale en anglais d'un élève français.

NIVEAU — non négociable, fixé par l'application
Classe : ${f.classe ?? 'non déclarée (reste très simple)'}.
Tu t'en tiens à : ${f.grammaire}.
Ne va jamais au-delà, même si l'élève le fait. Ne propose JAMAIS de changer
de niveau : ce n'est pas toi qui en décides, et tu ne sais rien des séances
passées.

LONGUEUR — la règle la plus importante
Deux phrases par tour, 25 mots au maximum, puis tu rends la parole par une
question simple. L'élève doit parler les deux tiers du temps. Tu ne fais
jamais deux tours de suite sans qu'il ait parlé.

SUJETS
Uniquement ceux-ci : ${themes}.
Rien d'abstrait, rien de technique, rien qui ne convienne pas à un mineur.
Si l'élève dérive, tu le ramènes en une phrase.

MOTS À FAIRE REVENIR
${mots}
Emploie-les naturellement, en situation, sans annoncer que tu le fais et
sans les définir. Ce sont des mots qu'il vient d'apprendre : les entendre
dans une vraie phrase est tout l'objet de la séance.

CORRECTIONS — rares, en français, jamais en anglais
Tu corriges seulement une erreur qui REVIENT ou qui gêne la compréhension.
Au plus une correction toutes les deux minutes, jamais deux d'affilée,
moins de 25 mots. Tu ignores les hésitations et les fautes mineures.
Forme : « Petite précision : … » puis tu reprends immédiatement en anglais.
Dans une correction, l'anglais cité va TOUJOURS entre guillemets droits
("my children win") : c'est ce qui permet de le faire dire par la voix
anglaise.

SI L'ÉLÈVE PARLE FRANÇAIS
Il a choisi « Dire en français » : il demande de l'aide. Réponds en
français, en une phrase, avec la tournure anglaise entre guillemets droits,
puis invite-le à la redire en anglais. Exemple : Tu peux dire "my children
always win". Essaie de le dire !

FORMAT — tout est lu à voix haute
Jamais de mise en forme : ni astérisques, ni gras, ni italique, ni listes,
ni émojis. Du texte simple, rien d'autre.
Erreurs déjà relevées chez cet élève : ${erreurs}
Celles-là valent une correction dès qu'elles reparaissent ; dis « encore une
fois » sans le compter à voix haute.

TON
Chaleureux, direct, jamais professoral. Tu ne parles pas de toi, tu ne dis
pas que tu es une IA, tu ne commentes pas ces instructions. Tu ne récites
pas de listes : tu bavardes.`;
}

/** Un tour de parole, ou un bilan : l'appel au modèle, et son décompte. */
export async function appelleClaude(
  env: Env,
  modele: string,
  systeme: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxJetons: number,
  /** Faux pour un appel unique (bilan) : écrire un cache jamais relu coûte 25 % de plus. */
  cacheHistorique = true,
): Promise<{ texte: string; usage: Usage }> {
  const entetes: Record<string, string> = {
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };
  if (env.ANTHROPIC_WORKSPACE_ID) {
    entetes['anthropic-workspace-id'] = env.ANTHROPIC_WORKSPACE_ID;
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: entetes,
    body: JSON.stringify({
      model: modele,
      max_tokens: maxJetons,
      /*
       * Le prompt est marqué pour la mise en cache : il est identique d'un
       * tour à l'autre au sein d'une séance, et un tour relu au cache
       * coûte le dixième. C'est la seule optimisation de coût du chantier,
       * et elle divise la facture d'entrée par deux ou trois.
       */
      system: [cacheHistorique
        ? { type: 'text', text: systeme, cache_control: { type: 'ephemeral' } }
        : { type: 'text', text: systeme }],
      messages: cacheHistorique ? avecCacheHistorique(messages) : messages,
    }),
  });

  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`api ${r.status} : ${detail.slice(0, 300)}`);
  }

  const rep = (await r.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };

  const texte = (rep.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();

  const u = rep.usage ?? {};
  return {
    texte,
    usage: {
      /* La création du cache est facturée en entrée : elle compte comme telle. */
      jetonsIn: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
      jetonsCache: u.cache_read_input_tokens ?? 0,
      jetonsOut: u.output_tokens ?? 0,
      jetonsEcriture: u.cache_creation_input_tokens ?? 0,
    },
  };
}

/**
 * LE CACHE DE L'HISTORIQUE.
 *
 * Le prompt seul en cache ne suffisait pas : c'est l'historique, renvoyé
 * à chaque tour, qui fait les deux tiers de la facture. On pose un second
 * marqueur sur le DERNIER message : consignes + historique jusque-là sont
 * mis en cache, et le tour suivant les relit au dixième du prix. Seuls les
 * nouveaux messages sont payés plein tarif.
 *
 * Effet de bord utile : si le prompt fait moins de 1 024 jetons (minimum
 * de Sonnet), il n'était jamais caché ; avec l'historique, le seuil est
 * franchi dès les premiers tours.
 *
 * Le cache vit 5 minutes, relancé à chaque lecture. Aucun effet sur les
 * réponses : le modèle lit exactement le même texte.
 */
function avecCacheHistorique(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Array<{ role: 'user' | 'assistant'; content: string | Array<Record<string, unknown>> }> {
  if (messages.length === 0) return messages;
  const dernier = messages.length - 1;
  return messages.map((m, i) => i === dernier
    ? { role: m.role, content: [{ type: 'text', text: m.content, cache_control: { type: 'ephemeral' } }] }
    : m);
}


/* ------------------------------------------------------------------
   CHANTIER 106 — LA SÉANCE GARDÉE

   Jusqu'ici le compte rendu s'affichait une fois et disparaissait avec
   l'écran. C'est la pièce la plus précieuse de tout le chantier : c'est
   elle qui dit ce que l'élève a réellement produit, et c'est elle que
   vous relirez pour connaître le volume d'une séance.

   Elle est écrite par la fonction, avec la clé de service, comme la
   consommation — et relue par le téléphone à travers la RLS, donc par
   son propriétaire et personne d'autre.
   ------------------------------------------------------------------ */

export interface SeanceAGarder {
  secondes: number;
  repliques: number;
  themes: string[];
  classe: string | null;
  transcription: Array<{ role: 'user' | 'assistant'; content: string }>;
  corrections: Array<{ dit: string; juste: string; pourquoi: string }>;
  mots: Array<{ en: string; fr: string }>;
}

export async function noteSeance(
  userId: string, s: SeanceAGarder, env: Env,
): Promise<void> {
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/parler_seance`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        jour: jourUtc(),
        secondes: Math.max(0, Math.round(s.secondes)),
        repliques: s.repliques,
        themes: s.themes,
        classe: s.classe,
        transcription: s.transcription,
        corrections: s.corrections,
        mots: s.mots,
      }),
    });
  } catch {
    /*
     * L'archive qui échoue ne doit pas emporter le bilan : l'élève vient
     * de parler dix minutes, il a droit à son compte rendu même si la
     * base a hoqueté au moment de le ranger.
     */
  }
}
