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

/** Levée quand la conversation n'est pas joignable — on la montre telle quelle. */
export class ErreurParler extends Error {
  constructor(message: string, readonly quotaEpuise = false) {
    super(message);
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
    const d = (await r.json().catch(() => ({}))) as { erreur?: string };
    throw new ErreurParler(d.erreur ?? `erreur ${r.status}`);
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
 */
export async function tourDeParole(
  messages: Tour[], fiche: Fiche, secondes: number,
): Promise<{ texte: string; budget: Budget }> {
  return appelle('/api/parler', { messages, fiche, secondes });
}

/** Le compte rendu, une fois la séance finie. Un appel, pas un par tour. */
export async function bilanDeSeance(
  messages: Tour[], fiche: Fiche, secondes: number,
): Promise<{ bilan: Bilan; trop_court?: boolean }> {
  return appelle('/api/parler-bilan', { messages, fiche, secondes });
}

/** « 0,19 € », « 12 centimes ». Toujours lisible, jamais scientifique. */
export function euros(centimes: number): string {
  if (centimes < 1) return `${centimes.toFixed(2).replace('.', ',')} centime`;
  return `${(centimes / 100).toFixed(2).replace('.', ',')} €`;
}
