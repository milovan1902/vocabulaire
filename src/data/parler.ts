/**
 * Le client de l'onglet « Parler ».
 *
 * CHANTIER 104 — CE QUE LE TÉLÉPHONE SAIT, ET CE QU'IL NE SAIT PAS
 *
 * Il sait : combien de minutes il reste, et quoi dire. Il ne sait pas : la
 * clé, les tarifs, le nombre de jetons, la façon dont le quota se calcule.
 * Tout cela vit dans la fonction Cloudflare, et rien ici n'a le moyen de
 * l'apprendre.
 *
 * Conséquence à assumer : **la conversation demande un compte**. Ce n'est
 * pas une contrainte technique arbitraire — un plafond par personne suppose
 * de savoir qui est la personne. Le reste de l'application continue de
 * marcher sans compte, comme avant.
 */
import { supabase } from './supabase';

/** Ce que l'écran affiche. Aucun jeton : ce n'est pas son sujet. */
export interface Budget {
  /** Minutes restantes aujourd'hui, de 0 à 10. */
  minutes: number;
  fini: boolean;
  /** Centimes d'euro dépensés aujourd'hui. Pour la vue exploitant. */
  coutJour: number;
  appels: number;
}

export interface Fiche {
  classe: string | null;
  grammaire: string;
  mots: Array<{ en: string; fr: string }>;
  themes: string[];
  erreurs?: Array<{ dit: string; juste: string; fois: number }>;
}

export interface Tour {
  role: 'user' | 'assistant';
  content: string;
}

export interface Bilan {
  corrections: Array<{ dit: string; juste: string; pourquoi: string; fois?: number }>;
  mots: Array<{ en: string; fr: string }>;
}

/**
 * Levée quand la conversation n'est pas joignable — on la montre telle quelle.
 *
 * Le champ est déclaré puis affecté dans le corps, et NON en propriété de
 * constructeur : TypeScript 5.8 refuse `constructor(readonly x)` quand
 * `erasableSyntaxOnly` est actif, et c'est le cas des gabarits Vite
 * récents. Deux lignes de plus, un build qui passe partout.
 */
export class ErreurParler extends Error {
  quotaEpuise: boolean;
  /** Le message brut du service, quand il y en a un. Pour le débogage. */
  detail?: string;

  constructor(message: string, quotaEpuise = false, detail?: string) {
    super(message);
    this.name = 'ErreurParler';
    this.quotaEpuise = quotaEpuise;
    this.detail = detail;
  }
}

async function jeton(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function appelle<T>(chemin: string, corps?: unknown): Promise<T> {
  const t = await jeton();
  if (!t) throw new ErreurParler('compte requis');

  const r = await fetch(chemin, {
    method: corps ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${t}`,
      ...(corps ? { 'content-type': 'application/json' } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });

  if (r.status === 429) {
    throw new ErreurParler('quota du jour épuisé', true);
  }
  if (!r.ok) {
    const d = (await r.json().catch(() => ({}))) as { erreur?: string; detail?: string };
    /*
     * CHANTIER 105 — LE DÉTAIL REMONTE JUSQU'À L'ÉCRAN.
     *
     * « La conversation ne répond pas » est une phrase honnête pour un
     * élève et inutilisable pour vous : clé invalide, crédit à zéro et
     * identifiant de modèle inconnu donnent le même message, et il faut
     * une demi-heure pour les distinguer. Le détail renvoyé par la
     * fonction est donc conservé ici, et l'écran l'affiche en petit.
     */
    throw new ErreurParler(d.erreur ?? `erreur ${r.status}`, false, d.detail);
  }
  return (await r.json()) as T;
}

/**
 * Le budget du jour, lu sur le serveur.
 *
 * Renvoie `null` sans compte, plutôt que de lever : la jauge doit pouvoir
 * s'afficher éteinte et l'écran expliquer pourquoi, sans traiter cela
 * comme une panne.
 */
export async function budgetParler(): Promise<Budget | null> {
  try {
    return await appelle<Budget>('/api/parler');
  } catch (e) {
    if (e instanceof ErreurParler && e.message === 'compte requis') return null;
    throw e;
  }
}

/**
 * Un tour de parole.
 *
 * L'historique complet de la SÉANCE est envoyé à chaque tour — c'est ainsi
 * que le modèle se souvient de la phrase d'avant. Il ne s'accumule pas d'un
 * jour sur l'autre : chaque séance repart de zéro.
 *
 * CHANTIER 106 — `secondes` est l'ÉCART depuis le tour précédent, et non
 * le temps écoulé depuis le début de la séance. Le serveur additionne les
 * écarts du jour pour connaître le temps réellement parlé ; additionner
 * des totaux donnait des heures, et c'est pour cela que le compteur ne
 * bougeait pas.
 */
export async function tourDeParole(
  messages: Tour[], fiche: Fiche, secondes: number,
): Promise<{ texte: string; budget: Budget }> {
  return appelle('/api/parler', { messages, fiche, secondes });
}

/**
 * Le compte rendu, une fois la séance finie. Un appel, pas un par tour.
 *
 * `secondes` reste l'écart depuis le dernier tour ; `totalSecondes` est la
 * durée entière de la séance, qui part avec l'archive.
 */
export async function bilanDeSeance(
  messages: Tour[], fiche: Fiche, secondes: number, totalSecondes: number,
): Promise<{ bilan: Bilan; trop_court?: boolean }> {
  return appelle('/api/parler-bilan', { messages, fiche, secondes, totalSecondes });
}

/** « 0,19 € », « 12 centimes ». Toujours lisible, jamais scientifique. */
export function euros(centimes: number): string {
  if (centimes < 1) return `${centimes.toFixed(2).replace('.', ',')} centime`;
  return `${(centimes / 100).toFixed(2).replace('.', ',')} €`;
}


/* ------------------------------------------------------------------
   CHANTIER 106 — LES CONVERSATIONS GARDÉES

   « Où puis-je retrouver la synthèse de mon échange ? » — nulle part,
   jusqu'ici : le compte rendu s'affichait une fois et mourait avec
   l'écran. Il est désormais rangé sous le compte de l'élève, avec la
   transcription entière.

   ÉCRITURE : la fonction Cloudflare, clé de service, comme la
   consommation. LECTURE : le téléphone, directement, à travers la RLS de
   Supabase — chacun ses lignes. Pas de route de plus à écrire pour lire
   ce qu'une politique de sécurité sait déjà filtrer.
   ------------------------------------------------------------------ */

export interface SeanceGardee {
  id: number;
  /** Quand la séance s'est terminée. */
  finieLe: string;
  secondes: number;
  repliques: number;
  themes: string[];
  classe: string | null;
  transcription: Tour[];
  corrections: Array<{ dit: string; juste: string; pourquoi: string }>;
  mots: Array<{ en: string; fr: string }>;
}

interface LigneSeance {
  id: number;
  finie_le: string;
  secondes: number | null;
  repliques: number | null;
  themes: string[] | null;
  classe: string | null;
  transcription: Tour[] | null;
  corrections: SeanceGardee['corrections'] | null;
  mots: SeanceGardee['mots'] | null;
}

/**
 * Les conversations gardées, la plus récente d'abord.
 *
 * Soixante au plus : au-delà, il faudrait paginer, et personne n'a encore
 * soixante conversations. Renvoie une liste vide sans compte, plutôt que
 * de lever — l'écran doit pouvoir dire « connecte-toi » sans traiter cela
 * comme une panne.
 */
export async function mesSeances(): Promise<SeanceGardee[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return [];

  const { data, error } = await supabase
    .from('parler_seance')
    .select('id,finie_le,secondes,repliques,themes,classe,transcription,corrections,mots')
    .order('finie_le', { ascending: false })
    .limit(60);

  /*
   * CHANTIER 107 — le message de PostgREST est conservé tel quel dans
   * `detail`. « relation "public.parler_seance" does not exist » veut dire
   * que le SQL du 106 n'a pas été passé ; aucune autre phrase ne le dit.
   */
  if (error) throw new ErreurParler('archive illisible', false, error.message);

  return ((data ?? []) as LigneSeance[]).map((l) => ({
    id: l.id,
    finieLe: l.finie_le,
    secondes: l.secondes ?? 0,
    repliques: l.repliques ?? 0,
    themes: l.themes ?? [],
    classe: l.classe,
    transcription: l.transcription ?? [],
    corrections: l.corrections ?? [],
    mots: l.mots ?? [],
  }));
}

/**
 * Effacer une conversation.
 *
 * C'est la parole d'un enfant, enregistrée : elle doit pouvoir partir sur
 * un geste, sans demander la permission à personne. La politique de
 * suppression de la table n'autorise que le propriétaire de la ligne.
 */
export async function oublieSeance(id: number): Promise<void> {
  const { error } = await supabase.from('parler_seance').delete().eq('id', id);
  if (error) throw new ErreurParler('effacement impossible', false, error.message);
}

/** « 7 min 20 s » — la durée d'une séance, telle qu'on la lit. */
export function duree(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  if (!m) return `${s} s`;
  return s ? `${m} min ${String(s).padStart(2, '0')} s` : `${m} min`;
}

/** « mardi 22 septembre, 17 h 57 » — la date d'une conversation. */
export function quand(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const jour = d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${jour}, ${heure.replace(':', ' h ')}`;
}
