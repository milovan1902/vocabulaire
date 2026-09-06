/**
 * État applicatif.
 *
 * Un seul hook centralise le chargement et l'écriture, pour que les
 * composants restent purement visuels.
 *
 * Les réglages existent à deux niveaux : des réglages communs, et une
 * surcharge facultative par paquet qui prend le dessus. Le compteur du
 * jour est lui aussi tenu paquet par paquet, puisque le quota peut
 * différer d'un paquet à l'autre.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Card,
  Category,
  DailyCounter,
  Deck,
  DeckId,
  DeckOverride,
  Grade,
  Progress,
  Settings,
} from '../domain/types';
import { DEFAULT_SETTINGS, effectiveSettings } from '../domain/types';
import { repository } from '../data/repository';
import { SEED_DECKS, materialize } from '../data/seed';
import { emptyProgress, review } from '../engine/scheduler';
import { freshCounter, rollDay } from '../engine/session';
import { imageFor } from './deckImages';

export interface Store {
  ready: boolean;
  /** Tous les paquets connus de l'appareil : collection et catalogue. */
  decks: Deck[];
  /** Ceux que la personne a ajoutés à sa collection. */
  installed: DeckId[];
  addDeck(id: DeckId): Promise<void>;
  /** Retire de la collection sans effacer la progression : le retour est indolore. */
  removeDeck(id: DeckId): Promise<void>;
  /** Rayons du catalogue, dans l'ordre d'affichage. */
  categories: Category[];
  /** Réglages communs à tous les paquets. */
  common: Settings;
  /** Surcharges par paquet. Absent = le paquet suit les réglages communs. */
  overrides: Record<DeckId, DeckOverride>;
  setCommon(s: Settings): Promise<void>;
  /** `null` supprime la surcharge : le paquet repasse en réglages communs. */
  setOverride(deckId: DeckId, o: Partial<Settings> | null): Promise<void>;
  settingsFor(deckId: DeckId): Settings;
  counterFor(deckId: DeckId): DailyCounter;
  refreshAll(): Promise<void>;
  loadDeck(id: DeckId): Promise<LoadedDeck>;
  gradeCard(
    deckId: DeckId,
    progress: Progress,
    grade: Grade,
    wasNew: boolean,
  ): Promise<Progress>;
}

export interface LoadedDeck {
  deck: Deck;
  cards: Card[];
  progress: Record<string, Progress>;
  themes: string[];
  selectedThemes: string[];
  image: string | null;
}

export function useStore(): Store {
  const [ready, setReady] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [common, setCommonState] = useState<Settings>(DEFAULT_SETTINGS);
  const [overrides, setOverridesState] = useState<Record<DeckId, DeckOverride>>({});
  const [counters, setCounters] = useState<Record<DeckId, DailyCounter>>({});
  const [installed, setInstalled] = useState<DeckId[]>([]);

  useEffect(() => {
    (async () => {
      let list = await repository.listDecks();

      // Premier lancement : on installe les paquets fournis.
      if (list.length === 0) {
        const created: Deck[] = [];
        for (const seed of SEED_DECKS) {
          const { deck, cards } = materialize(seed);
          await repository.saveCards(deck.id, cards);
          created.push(deck);
        }
        await repository.saveDecks(created);
        list = created;
      }

      const [cats, s, o, c] = await Promise.all([
        repository.listCategories(),
        repository.getSettings(),
        repository.getOverrides(),
        repository.getCounters(),
      ]);

      /*
       * Migration : avant cette version, tout paquet présent était dans la
       * collection. On reprend donc la liste telle quelle plutôt que de vider
       * l'écran de quelqu'un qui révise depuis des semaines.
       */
      let inst = await repository.getInstalled();
      if (inst === null) {
        inst = list.map((d) => d.id);
        await repository.saveInstalled(inst);
      }

      setDecks(list);
      setInstalled(inst);
      setCategories(cats);
      setCommonState(s);
      setOverridesState(o);
      setCounters(rollAll(c));
      setReady(true);
    })();
  }, []);

  const setCommon = useCallback(async (s: Settings) => {
    // Chaque modification est datée : c'est ce qui la fera gagner face à
    // une version plus ancienne venue d'un autre appareil.
    const stamped: Settings = { ...s, updatedAt: Date.now() };
    setCommonState(stamped);
    // L'écriture est attendue : un rechargement déclenché juste après
    // relirait sinon la valeur d'avant et écraserait la modification.
    await repository.saveSettings(stamped);
  }, []);

  const setOverride = useCallback(
    async (deckId: DeckId, o: Partial<Settings> | null) => {
      // On repart de ce qui est réellement enregistré, pas de l'état React :
      // deux modifications rapprochées se perdraient sinon l'une l'autre.
      const next = { ...(await repository.getOverrides()) };
      if (o === null) {
        delete next[deckId];
      } else {
        const champs = { ...o };
        delete (champs as Partial<Settings>).updatedAt;
        next[deckId] = { ...champs, updatedAt: Date.now() };
      }
      await repository.saveOverrides(next);
      setOverridesState(next);
    },
    [],
  );

  const settingsFor = useCallback(
    (deckId: DeckId) => effectiveSettings(common, overrides[deckId]),
    [common, overrides],
  );

  const counterFor = useCallback(
    (deckId: DeckId) => counters[deckId] ?? freshCounter(),
    [counters],
  );

  const refreshAll = useCallback(async () => {
    // Après une synchronisation, réglages, surcharges et compteurs ont pu
    // changer sur le serveur : on relit tout avec les paquets.
    const [list, cats, s, o, c] = await Promise.all([
      repository.listDecks(),
      repository.listCategories(),
      repository.getSettings(),
      repository.getOverrides(),
      repository.getCounters(),
    ]);
    setDecks(list);
    setCategories(cats);
    setCommonState(s);
    setOverridesState(o);
    setCounters(rollAll(c));
    setInstalled((await repository.getInstalled()) ?? []);
  }, []);

  const addDeck = useCallback(async (id: DeckId) => {
    // On relit avant d'écrire : deux ajouts rapprochés se perdraient sinon.
    const current = (await repository.getInstalled()) ?? [];
    if (current.includes(id)) return;
    const next = [...current, id];
    await repository.saveInstalled(next);
    setInstalled(next);
  }, []);

  const removeDeck = useCallback(async (id: DeckId) => {
    const current = (await repository.getInstalled()) ?? [];
    const next = current.filter((x) => x !== id);
    await repository.saveInstalled(next);
    setInstalled(next);
  }, []);

  const loadDeck = useCallback(async (id: DeckId): Promise<LoadedDeck> => {
    const all = await repository.listDecks();
    const deck = all.find((d) => d.id === id)!;
    const [cards, progress, saved, image] = await Promise.all([
      repository.getCards(id),
      repository.getProgress(id),
      repository.getThemes(id),
      repository.getImage(id),
    ]);
    const themes = [...new Set(cards.map((c) => c.theme))];
    const selected =
      saved && saved.length ? saved.filter((t) => themes.includes(t)) : themes;
    return {
      deck,
      cards,
      progress,
      themes,
      selectedThemes: selected.length ? selected : themes,
      image: imageFor(id, image),
    };
  }, []);

  const gradeCard = useCallback(
    async (deckId: DeckId, progress: Progress, grade: Grade, wasNew: boolean) => {
      const next = review(progress, grade);

      const stored = await repository.getProgress(deckId);
      stored[next.cardId] = next;
      await repository.saveProgress(deckId, stored);

      setCounters((prev) => {
        const rolled = rollDay(prev[deckId] ?? freshCounter());
        const updated: Record<DeckId, DailyCounter> = {
          ...prev,
          [deckId]: {
            ...rolled,
            newSeen: rolled.newSeen + (wasNew ? 1 : 0),
            reviewsDone: rolled.reviewsDone + (wasNew ? 0 : 1),
          },
        };
        void repository.saveCounters(updated);
        return updated;
      });

      return next;
    },
    [],
  );

  return useMemo(
    () => ({
      ready, decks, installed, categories, common, overrides,
      addDeck, removeDeck,
      setCommon, setOverride, settingsFor, counterFor,
      refreshAll, loadDeck, gradeCard,
    }),
    [
      ready, decks, installed, categories, common, overrides,
      addDeck, removeDeck,
      setCommon, setOverride, settingsFor, counterFor,
      refreshAll, loadDeck, gradeCard,
    ],
  );
}

/** Remet à zéro les compteurs dont la date n'est plus celle du jour. */
function rollAll(all: Record<DeckId, DailyCounter>): Record<DeckId, DailyCounter> {
  const out: Record<DeckId, DailyCounter> = {};
  for (const [id, c] of Object.entries(all)) out[id] = rollDay(c);
  return out;
}

/** Progression d'une carte, ou progression vierge si elle n'a jamais été vue. */
export function progressFor(
  map: Record<string, Progress>,
  cardId: string,
): Progress {
  return map[cardId] ?? emptyProgress(cardId);
}
