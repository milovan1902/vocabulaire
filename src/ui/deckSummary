/**
 * Charge du jour, paquet par paquet.
 *
 * Le même calcul servait dans la bibliothèque et sert maintenant aussi à
 * l'écran « Aujourd'hui ». Il est sorti ici pour n'exister qu'une fois :
 * deux copies auraient fini par donner deux chiffres différents pour la
 * même journée.
 */
import type { Deck, Progress, Settings } from '../domain/types';
import { repository } from '../data/repository';
import { imageFor } from './deckImages';
import { isDue, isNew } from '../engine/scheduler';

export interface DeckSummary {
  deck: Deck;
  total: number;
  /** Cartes à voir aujourd'hui, quotas compris. */
  due: number;
  image: string | null;
}

export interface Charge {
  summaries: DeckSummary[];
  /**
   * Cartes attendues par jour, index 0 = aujourd'hui, 6 = dans six jours.
   * Calculé depuis les dates de révision déjà enregistrées : aucune
   * donnée nouvelle, aucune migration.
   */
  dueByDay: number[];
  /** Mots appris dont la date n'est pas encore arrivée. */
  resting: number;
}

const JOUR = 86_400_000;

export async function loadSummaries(decks: Deck[], settings: Settings): Promise<Charge> {
  const now = Date.now();
  const cap = settings.newPerDay + settings.reviewsPerDay;

  // Fin de la journée courante : tout ce qui tombe avant est « aujourd'hui ».
  const finDuJour = new Date();
  finDuJour.setHours(24, 0, 0, 0);

  const summaries: DeckSummary[] = [];
  const dueByDay = [0, 0, 0, 0, 0, 0, 0];
  let resting = 0;

  for (const deck of decks) {
    const [cards, progress, image] = await Promise.all([
      repository.getCards(deck.id),
      repository.getProgress(deck.id),
      repository.getImage(deck.id),
    ]);

    let due = 0;
    for (const c of cards) {
      const p: Progress | undefined = progress[c.id];
      if (!p || isNew(p) || isDue(p, now)) {
        due++;
        dueByDay[0]++;
      } else {
        resting++;
        const dans = Math.ceil((p.due - finDuJour.getTime()) / JOUR);
        if (dans >= 1 && dans <= 6) dueByDay[dans]++;
      }
    }

    summaries.push({
      deck,
      total: cards.length,
      // Un visuel fourni prend le relais quand la personne n'en a choisi aucun.
      image: imageFor(deck.id, image),
      due: Math.min(due, cap),
    });
  }

  return { summaries, dueByDay, resting };
}
