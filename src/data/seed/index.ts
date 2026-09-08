/**
 * Installation des paquets fournis, au premier lancement seulement.
 * Ils sont marqués `builtin` : non supprimables, mais enrichissables.
 *
 * Retirer un paquet de SEED_DECKS suffit à le faire disparaître des
 * appareils : le ménage de `pullDecks` (voir data/sync.ts) supprime tout
 * paquet `builtin` qui n'est ni embarqué ici, ni présent sur le serveur.
 * C'est ce qui a emporté « Verbes irréguliers » — il n'était plus dans
 * cette liste, et sa ligne Supabase avait été effacée par le ménage SQL.
 *
 * Le fichier `irregularVerbs.ts` reste dans le dépôt sans être importé :
 * il n'est plus embarqué dans l'application, et sert d'archive si vous
 * voulez un jour en refaire un paquet Supabase.
 */
import type { Card, Deck, SeedDeck } from '../../domain/types';
import { collegeUs } from './collegeUs';

export const SEED_DECKS: SeedDeck[] = [collegeUs];

/**
 * Identifiant stable d'une carte.
 *
 * Un même mot peut légitimement apparaître dans deux thèmes — « practice »
 * est à la fois l'entraînement et s'entraîner. On suffixe donc les doublons
 * pour que chacun garde sa propre progression. La numérotation suit l'ordre
 * du paquet, donc elle reste identique d'une version à l'autre.
 */
export function cardId(deckId: string, en: string): string {
  return `${deckId}:${en.toLowerCase().replace(/\s+/g, '-')}`;
}

export function materialize(seed: SeedDeck): { deck: Deck; cards: Card[] } {
  const now = Date.now();
  const seen = new Map<string, number>();

  const cards: Card[] = seed.cards.map((c) => {
    const base = cardId(seed.id, c.en);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return {
      id: n === 1 ? base : `${base}-${n}`,
      en: c.en,
      fr: c.fr,
      theme: c.theme,
      example: c.example,
    };
  });

  return {
    deck: {
      id: seed.id,
      name: seed.name,
      description: seed.description,
      builtin: true,
      hasImage: false,
      createdAt: now,
      updatedAt: now,
    },
    cards,
  };
}
