/**
 * CHANTIER 110 — LE PAQUET « REPRISE DES FAUTES À L'ORAL »
 *
 * À la fin d'une conversation, le bilan propose jusqu'à cinq mots qui ont
 * posé problème. L'élève coche ceux qu'il veut retravailler. Chaque mot coché
 * suit UNE règle, décidée ici et nulle part ailleurs :
 *
 *   1. LE MOT EXISTE DANS UN PAQUET EN JEU → on ne crée rien. La carte
 *      existante revient dans « Aujourd'hui », en « À reprendre » :
 *      échéance ramenée à maintenant, avancement remis à zéro. Son
 *      historique est gardé ; c'est un mot connu qui a lâché à l'oral.
 *
 *   2. LE MOT EXISTE DANS UN PAQUET EN PAUSE → une copie rejoint le paquet
 *      de reprise. Ramener la carte d'origine ne servirait à rien : un
 *      paquet en pause ne passe pas dans la journée. L'écran le dit.
 *
 *   3. LE MOT N'EXISTE NULLE PART → il rejoint le paquet de reprise.
 *
 *   4. LE MOT EST DÉJÀ DANS LE PAQUET DE REPRISE → rien. La case est
 *      grisée ; c'est ce qui empêche les doublons d'une séance à l'autre.
 *
 * Les fautes de grammaire (« I am agree ») ne deviennent pas des cartes :
 * elles restent dans le bilan, et l'IA les retrouve à la séance suivante.
 *
 * LE PAQUET EST LOCAL, comme ceux qu'on crée soi-même dans l'éditeur : il
 * n'existe pas côté serveur, et la synchronisation le laisse tranquille.
 */
import type { Card, Deck, Progress } from '../domain/types';
import { repository } from './repository';

export const REPRISE_ID = 'reprise-oral';
export const REPRISE_NOM = 'Reprise des fautes à l’oral';

export type Statut =
  | { type: 'ramene'; deckId: string; deckNom: string; cardId: string }
  | { type: 'copie'; deckNom: string }
  | { type: 'nouveau' }
  | { type: 'deja' };

export interface Proposition {
  en: string;
  fr: string;
  statut: Statut;
}

/**
 * La forme de comparaison d'un mot. Minuscules, sans accents ni
 * ponctuation, sans article en tête : « A crowd! » et « crowd » sont le
 * même mot. « to » n'est PAS retiré — « to train » et « a train » ne
 * se confondent pas.
 */
export function cle(en: string): string {
  return en
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(a|an|the) /, '');
}

/** Toutes les formes d'une carte : « a factory / a plant » en donne deux. */
function formes(en: string): string[] {
  return en.split(/\s*(?:\/|,|;|\bor\b)\s*/).map(cle).filter(Boolean);
}

/**
 * Ce qu'il adviendra de chaque mot, AVANT que l'élève coche quoi que ce soit.
 * Rien n'est écrit ici.
 */
export async function analyse(
  mots: Array<{ en: string; fr: string }>,
  enJeu: string[],
): Promise<Proposition[]> {
  const decks = await repository.listDecks();
  const trouve = new Map<string, { deck: Deck; card: Card }>();
  const dejaReprise = new Set<string>();

  for (const deck of decks) {
    const cards = await repository.getCards(deck.id);
    for (const card of cards) {
      for (const f of formes(card.en)) {
        if (deck.id === REPRISE_ID) { dejaReprise.add(f); continue; }
        const avant = trouve.get(f);
        /* Un paquet en jeu l'emporte sur un paquet en pause. */
        if (!avant || (!enJeu.includes(avant.deck.id) && enJeu.includes(deck.id))) {
          trouve.set(f, { deck, card });
        }
      }
    }
  }

  const vus = new Set<string>();
  const out: Proposition[] = [];
  for (const m of mots) {
    const k = cle(m.en);
    if (!k || vus.has(k)) continue;
    vus.add(k);
    const t = trouve.get(k);
    let statut: Statut;
    if (dejaReprise.has(k)) statut = { type: 'deja' };
    else if (t && enJeu.includes(t.deck.id)) {
      statut = { type: 'ramene', deckId: t.deck.id, deckNom: t.deck.name, cardId: t.card.id };
    } else if (t) statut = { type: 'copie', deckNom: t.deck.name };
    else statut = { type: 'nouveau' };
    out.push({ en: m.en.trim(), fr: m.fr.trim(), statut });
  }
  return out;
}

export interface Versement {
  /** Cartes créées dans le paquet de reprise. */
  ajoutes: number;
  /** Cartes existantes ramenées dans la journée. */
  ramenes: number;
}

/** « Conversation du 23 sept. » — le thème des cartes d'une séance. */
function themeDu(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const j = Number.isNaN(d.getTime()) ? new Date() : d;
  return `Conversation du ${j.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

function slug(en: string): string {
  return cle(en).replace(/\s+/g, '-').replace(/'/g, '') || 'mot';
}

/**
 * Applique la règle aux mots cochés. Renvoie ce qui a été fait, pour que
 * l'écran le dise.
 *
 * Le paquet est créé au premier versement. L'appelant se charge ensuite de
 * l'obtenir et de le mettre en jeu (`onReprise`) : c'est le journal des
 * paquets qui tient ces deux listes, pas ce fichier.
 */
export async function verse(choisis: Proposition[], quandIso?: string): Promise<Versement> {
  let ajoutes = 0;
  let ramenes = 0;
  const maintenant = Date.now();

  /* 1. Les cartes existantes, paquet par paquet. */
  const parPaquet = new Map<string, string[]>();
  for (const p of choisis) {
    if (p.statut.type !== 'ramene') continue;
    const l = parPaquet.get(p.statut.deckId) ?? [];
    l.push(p.statut.cardId);
    parPaquet.set(p.statut.deckId, l);
  }
  for (const [deckId, ids] of parPaquet) {
    const stored = await repository.getProgress(deckId);
    for (const id of ids) {
      const p: Progress | undefined = stored[id];
      /*
       * Une carte jamais vue n'a rien à reprendre : elle arrivera avec
       * les mots nouveaux. On la compte quand même : elle est dans la
       * journée, c'est ce que l'élève voulait savoir.
       */
      if (p && p.reps > 0) {
        stored[id] = { ...p, due: maintenant, mastery: 0 };
      }
      ramenes++;
    }
    await repository.saveProgress(deckId, stored);
  }

  /* 2. Les cartes à créer dans le paquet de reprise. */
  const aCreer = choisis.filter((p) => p.statut.type === 'nouveau' || p.statut.type === 'copie');
  if (aCreer.length > 0) {
    const decks = await repository.listDecks();
    if (!decks.some((d) => d.id === REPRISE_ID)) {
      decks.push({
        id: REPRISE_ID,
        name: REPRISE_NOM,
        description: 'Les mots qui ont posé problème pendant tes conversations.',
        categoryId: null,
        builtin: false,
        hasImage: false,
        createdAt: maintenant,
        updatedAt: maintenant,
      });
    } else {
      const d = decks.find((x) => x.id === REPRISE_ID)!;
      d.updatedAt = maintenant;
    }
    await repository.saveDecks(decks);

    const cartes = await repository.getCards(REPRISE_ID);
    const ids = new Set(cartes.map((c) => c.id));
    const deja = new Set(cartes.flatMap((c) => formes(c.en)));
    const theme = themeDu(quandIso);

    for (const p of aCreer) {
      if (deja.has(cle(p.en))) continue;
      let id = `${REPRISE_ID}:${slug(p.en)}`;
      for (let n = 2; ids.has(id); n++) id = `${REPRISE_ID}:${slug(p.en)}-${n}`;
      ids.add(id);
      deja.add(cle(p.en));
      cartes.push({ id, en: p.en, fr: p.fr, theme });
      ajoutes++;
    }
    await repository.saveCards(REPRISE_ID, cartes);
  }

  return { ajoutes, ramenes };
}
