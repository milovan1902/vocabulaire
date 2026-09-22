/**
 * Les mots fraîchement acquis, tous paquets en jeu confondus.
 *
 * CHANTIER 103 — CE QUI REND LA CONVERSATION IRREMPLAÇABLE
 *
 * Une IA généraliste sait parler anglais. Elle ne sait pas QUELS mots cet
 * élève-ci vient d'apprendre. C'est la seule chose que cette application
 * possède et qu'aucun chatbot ne peut deviner — et c'est donc la première
 * qu'on lui donne.
 *
 * Aucune donnée nouvelle n'est stockée : on relit les paliers déjà écrits
 * par `engine/mastery`, exactement comme `progressStats`. Un mot est
 * « fraîchement acquis » quand il est au palier 100 et qu'il a été revu
 * récemment — l'horodatage de sa dernière révision fait l'ordre.
 *
 * DEUX RÉSERVES ASSUMÉES :
 *
 * 1. `lastReview` est absent des progressions d'avant le chantier 43. Ces
 *    mots-là tombent en fin de liste plutôt que d'être écartés : mieux vaut
 *    un ordre imparfait qu'un trou.
 * 2. On ne retient que les paquets EN JEU, pas tous les paquets possédés.
 *    Faire parler l'élève d'un vocabulaire mis en pause serait lui
 *    redemander un travail qu'il a justement rangé.
 */
import type { Card, Deck, Progress } from '../domain/types';
import { repository } from '../data/repository';
import { masteryOf, PLEIN } from '../engine/mastery';

export interface MotRecent {
  en: string;
  fr: string;
  /** Dernière révision, ou l'échéance à défaut. Sert uniquement à trier. */
  quand: number;
}

export interface MotsRecents {
  /** Les plus récents d'abord, dédoublonnés, au plus `combien`. */
  mots: MotRecent[];
  /** Tous les mots acquis des paquets en jeu, celui-là compris. */
  total: number;
}

export async function motsRecents(
  decks: Deck[],
  active: string[],
  combien = 6,
): Promise<MotsRecents> {
  const enJeu = decks.filter((d) => active.includes(d.id));
  const tous: MotRecent[] = [];

  for (const deck of enJeu) {
    const [cards, progress, savedThemes] = await Promise.all([
      repository.getCards(deck.id),
      repository.getProgress(deck.id),
      repository.getThemes(deck.id),
    ]);

    /*
     * Les thèmes écartés le sont aussi ici. Un élève qui a mis de côté le
     * thème « nourriture » ne doit pas l'entendre revenir par la voix.
     */
    const retenus = savedThemes && savedThemes.length ? new Set(savedThemes) : null;
    const pm = progress as Record<string, Progress>;

    for (const c of cards as Card[]) {
      if (retenus && !retenus.has(c.theme)) continue;
      const p = pm[c.id];
      if (!p || masteryOf(p) < PLEIN) continue;
      tous.push({ en: c.en, fr: c.fr, quand: p.lastReview ?? p.due ?? 0 });
    }
  }

  tous.sort((a, b) => b.quand - a.quand);

  /*
   * Dédoublonnage sur la face anglaise : deux paquets peuvent enseigner le
   * même mot (c'est le cas des verbes irréguliers, présents en 5e et en
   * 4e), et le voir deux fois dans la même liste de six ferait perdre une
   * place pour rien.
   */
  const vus = new Set<string>();
  const mots: MotRecent[] = [];
  for (const m of tous) {
    const cle = m.en.trim().toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    if (mots.length < combien) mots.push(m);
  }

  return { mots, total: vus.size };
}
