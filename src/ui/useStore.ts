/**
 * État applicatif.
 *
 * Un seul hook centralise le chargement et l'écriture, pour que les
 * composants restent purement visuels.
 *
 * Trois listes de paquets, à ne pas confondre :
 *  - `decks`     : tout ce que l'appareil connaît, catalogue compris ;
 *  - `installed` : ce qui appartient à la personne ;
 *  - `active`    : ce sur quoi elle travaille, et qui seul pèse sur la journée.
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
import type { Streak } from '../engine/streak';
import { EMPTY_STREAK, record as recordDay } from '../engine/streak';
import { imageFor } from './deckImages';

export interface Store {
  ready: boolean;
  decks: Deck[];
  installed: DeckId[];
  active: DeckId[];
  addDeck(id: DeckId): Promise<void>;
  removeDeck(id: DeckId): Promise<void>;
  /** Met un paquet en jeu, ou le met en pause. */
  setActive(id: DeckId, on: boolean): Promise<void>;
  categories: Category[];
  common: Settings;
  overrides: Record<DeckId, DeckOverride>;
  streak: Streak;
  setCommon(s: Settings): Promise<void>;
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
  const [streak, setStreak] = useState<Streak>(EMPTY_STREAK);
  const [installed, setInstalled] = useState<DeckId[]>([]);
  const [active, setActiveState] = useState<DeckId[]>([]);

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

      const [cats, s, o, c, st] = await Promise.all([
        repository.listCategories(),
        repository.getSettings(),
        repository.getOverrides(),
        repository.getCounters(),
        repository.getStreak(),
      ]);

      /*
       * Migration : avant cette version, tout paquet présent était possédé.
       * On reprend la liste telle quelle plutôt que de vider l'écran de
       * quelqu'un qui révise depuis des semaines.
       */
      let inst = await repository.getInstalled();
      if (inst === null) {
        inst = list.map((d) => d.id);
        await repository.saveInstalled(inst);
      }

      /*
       * Migration de la notion « en jeu ».
       *
       * Point de vigilance : jusqu'ici tout paquet possédé pesait sur la
       * journée. Si l'on démarrait avec une liste vide, la charge de travail
       * de tous les utilisateurs tomberait à zéro du jour au lendemain, sans
       * qu'ils comprennent pourquoi. On reprend donc l'existant à l'identique.
       */
      let act = await repository.getActive();
      if (act === null) {
        act = [...inst];
        await repository.saveActive(act);
      }

      setDecks(list);
      setInstalled(inst);
      setActiveState(act);
      setCategories(cats);
      setCommonState(s);
      setOverridesState(o);
      setCounters(rollAll(c));
      setStreak(st);
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
    const [list, cats, s, o, c, st] = await Promise.all([
      repository.listDecks(),
      repository.listCategories(),
      repository.getSettings(),
      repository.getOverrides(),
      repository.getCounters(),
      repository.getStreak(),
    ]);
    setDecks(list);
    setCategories(cats);
    setCommonState(s);
    setOverridesState(o);
    setCounters(rollAll(c));
    setStreak(st);
    const inst = (await repository.getInstalled()) ?? [];
    setInstalled(inst);
    setActiveState((await repository.getActive()) ?? inst);
  }, []);

  /** Obtenir un paquet : il rejoint la collection, en pause. */
  const addDeck = useCallback(async (id: DeckId) => {
    // On relit avant d'écrire : deux ajouts rapprochés se perdraient sinon.
    const current = (await repository.getInstalled()) ?? [];
    if (current.includes(id)) return;
    const next = [...current, id];
    await repository.saveInstalled(next);
    setInstalled(next);
    /*
     * Volontairement pas mis en jeu : sinon chaque achat alourdirait le
     * lendemain à la place de la personne. C'est elle qui décide quand
     * commencer.
     */
  }, []);

  const removeDeck = useCallback(async (id: DeckId) => {
    const inst = ((await repository.getInstalled()) ?? []).filter((x) => x !== id);
    await repository.saveInstalled(inst);
    setInstalled(inst);
    // Un paquet qu'on ne possède plus ne peut pas rester en jeu.
    const act = ((await repository.getActive()) ?? []).filter((x) => x !== id);
    await repository.saveActive(act);
    setActiveState(act);
  }, []);

  const setActive = useCallback(async (id: DeckId, on: boolean) => {
    const inst = (await repository.getInstalled()) ?? [];
    // On ne met en jeu que ce qui appartient à la personne.
    if (on && !inst.includes(id)) return;
    const current = (await repository.getActive()) ?? inst;
    const next = on
      ? current.includes(id) ? current : [...current, id]
      : current.filter((x) => x !== id);
    await repository.saveActive(next);
    setActiveState(next);
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

      /*
       * La journée est marquée dès la première carte notée. `record` est sans
       * effet si elle l'est déjà, donc appelable à chaque carte sans compter
       * plusieurs fois.
       */
      setStreak((prev) => {
        const suivant = recordDay(prev);
        if (suivant !== prev) void repository.saveStreak(suivant);
        return suivant;
      });

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
      ready, decks, installed, active, categories, common, overrides, streak,
      addDeck, removeDeck, setActive,
      setCommon, setOverride, settingsFor, counterFor,
      refreshAll, loadDeck, gradeCard,
    }),
    [
      ready, decks, installed, active, categories, common, overrides, streak,
      addDeck, removeDeck, setActive,
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
