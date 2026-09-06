/**
 * Installation des paquets fournis, au premier lancement seulement.
 * Ils sont marqués `builtin` : non supprimables, mais enrichissables.
 */
import type { Card, Deck, SeedDeck } from '../../domain/types';
import { collegeUs } from './collegeUs';
import { irregularVerbs } from './irregularVerbs';

export const SEED_DECKS: SeedDeck[] = [collegeUs, irregularVerbs];

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
