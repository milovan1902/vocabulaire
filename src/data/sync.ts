/**
 * Synchronisation avec Supabase.
 *
 * Principe : l'appareil reste la source de vérité pour l'usage courant.
 * L'application fonctionne entièrement hors ligne ; la synchronisation
 * rattrape au retour du réseau.
 *
 * Règle de fusion : pour une même carte, on garde la révision la plus
 * récente. Simple, prévisible, et suffisant tant qu'une personne ne révise
 * pas sur deux appareils à la même minute.
 */
import { supabase } from './supabase';
import { repository } from './repository';
import type {
  Card, Category, DailyCounter, DailyCounters, Deck, DeckOverride, Level, Progress, Settings,
} from '../domain/types';
import { readClasse } from '../domain/types';
import { todayKey } from '../engine/session';
import type { Streak } from '../engine/streak';
import { mergeStreak } from '../engine/streak';
import {
  fusionner, journalDepuisListes, listes,
  type DeckJournal,
} from '../domain/deckState';

export interface SyncReport {
  decksPulled: number;
  progressPushed: number;
  progressPulled: number;
  settingsSynced: boolean;
  /** Renseigné si la synchronisation a échoué : le message à montrer. */
  error?: string;
}

/**
 * Supabase plafonne une requête à 1000 lignes. Le catalogue en compte déjà
 * 681 : sans pagination, la limite serait franchie silencieusement dès
 * l'ajout de quelques paquets, et des cartes disparaîtraient sans erreur.
 */
const PAGE = 1000;

async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/** Niveau lu du serveur, filtré : une valeur inconnue vaut mieux qu'un plantage. */
function readLevel(v: unknown): Level | null {
  return v === 'A2' || v === 'B1' || v === 'B2' ? v : null;
}

/** Paquets accessibles au visiteur : gratuits, plus ceux qu'il a achetés. */
export async function pullCatalog(): Promise<number> {
  // Les rayons d'abord : la bibliothèque s'en sert pour regrouper.
  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .select('id, name, description, position')
    .order('position');
  if (catErr) throw catErr;
  if (cats) {
    await repository.saveCategories(
      cats.map((c): Category => ({
        id: c.id,
        name: c.name,
        description: c.description ?? undefined,
        position: c.position,
      })),
    );
  }

  const { data: rows, error } = await supabase
    .from('decks')
    .select('id, name, description, price_cents, card_count, position, category_id, level, grade_from')
    .order('position');
  if (error) throw error;
  if (!rows?.length) return 0;

  const local = await repository.listDecks();
  const byId = new Map(local.map((d) => [d.id, d]));
  let pulled = 0;

  for (const row of rows) {
    // Les cartes d'un paquet payant non acheté sont invisibles : la base les
    // filtre. On ne crée donc le paquet en local que s'il a du contenu.
    const cards = await fetchAllRows<{
      id: string; en: string; fr: string; theme: string; example: string | null;
    }>((from, to) =>
      supabase
        .from('cards')
        .select('id, en, fr, theme, example')
        .eq('deck_id', row.id)
        .order('position')
        .range(from, to),
    );
    if (!cards.length) continue;

    const mapped: Card[] = cards.map((c) => ({
      id: c.id,
      en: c.en,
      fr: c.fr,
      theme: c.theme,
      example: c.example ?? undefined,
    }));
    await repository.saveCards(row.id, mapped);

    const existing = byId.get(row.id);
    const now = Date.now();
    const deck: Deck = {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      categoryId: row.category_id ?? null,
      level: readLevel((row as Record<string, unknown>).level),
      /*
       * Classe plancher. La colonne s'appelle `grade_from` côté Supabase et
       * le champ `classeFrom` côté domaine : `Grade` y désigne déjà la note
       * FSRS, et deux sens pour un mot finit toujours par coûter une soirée.
       *
       * Cette ligne était tombée du chantier 30 en même temps que `grade_from`
       * du `select`. Le paquet se reconstruit en entier à chaque synchro : un
       * champ absent ici n'est pas « laissé tel quel », il est effacé. C'est
       * pour cela que la classe a disparu de TOUS les écrans d'un coup, alors
       * qu'aucun d'eux n'avait changé.
       */
      classeFrom: readClasse((row as Record<string, unknown>).grade_from),
      builtin: true,
      priceCents: row.price_cents ?? 0,
      hasImage: existing?.hasImage ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    byId.set(row.id, deck);
    pulled++;
  }

  await repository.saveDecks([...byId.values()]);
  return pulled;
}

/** Identifiants des cartes présentes côté serveur, pour ne pousser qu'elles. */
async function remoteCardIds(): Promise<Set<string>> {
  const rows = await fetchAllRows<{ id: string }>((from, to) =>
    supabase.from('cards').select('id').order('id').range(from, to),
  );
  return new Set(rows.map((r) => r.id));
}

function toRow(userId: string, p: Progress) {
  return {
    user_id: userId,
    card_id: p.cardId,
    due: new Date(p.due).toISOString(),
    stability: p.stability,
    difficulty: p.difficulty,
    elapsed_days: p.elapsedDays,
    scheduled_days: p.scheduledDays,
    learning_steps: p.learningSteps,
    reps: p.reps,
    lapses: p.lapses,
    state: p.state,
    last_review: p.lastReview ? new Date(p.lastReview).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

function fromRow(r: Record<string, unknown>): Progress {
  return {
    cardId: r.card_id as string,
    due: new Date(r.due as string).getTime(),
    stability: Number(r.stability),
    difficulty: Number(r.difficulty),
    elapsedDays: Number(r.elapsed_days),
    scheduledDays: Number(r.scheduled_days),
    learningSteps: Number(r.learning_steps),
    reps: Number(r.reps),
    lapses: Number(r.lapses),
    state: Number(r.state) as 0 | 1 | 2 | 3,
    lastReview: r.last_review ? new Date(r.last_review as string).getTime() : undefined,
  };
}

/** Celle des deux versions qui reflète la révision la plus récente. */
export function pickFresher(a: Progress | undefined, b: Progress | undefined): Progress {
  if (!a) return b!;
  if (!b) return a;
  const ta = a.lastReview ?? 0;
  const tb = b.lastReview ?? 0;
  if (ta !== tb) return ta > tb ? a : b;
  // Jamais révisées ou même horodatage : on garde la plus travaillée.
  return a.reps >= b.reps ? a : b;
}

export async function syncProgress(
  userId: string,
): Promise<Pick<SyncReport, 'progressPushed' | 'progressPulled'>> {
  const known = await remoteCardIds();

  // 1. Ce que le serveur a déjà.
  const remoteRows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .order('card_id')
      .range(from, to),
  );
  const remote = new Map<string, Progress>();
  for (const row of remoteRows) remote.set(row.card_id as string, fromRow(row));

  // 2. Fusion, paquet par paquet.
  const decks = await repository.listDecks();
  const toPush: Progress[] = [];
  let pulled = 0;

  for (const deck of decks) {
    const local = await repository.getProgress(deck.id);
    const cards = await repository.getCards(deck.id);
    const merged: Record<string, Progress> = { ...local };
    let changed = false;

    for (const card of cards) {
      // Les paquets créés localement n'existent pas côté serveur : on les
      // laisse tranquilles plutôt que de heurter la contrainte de clé.
      if (!known.has(card.id)) continue;

      const here = local[card.id];
      const there = remote.get(card.id);
      if (!here && !there) continue;

      const winner = pickFresher(here, there);
      if (winner !== there) toPush.push(winner);
      if (winner !== here) {
        merged[card.id] = winner;
        changed = true;
        pulled++;
      }
    }

    if (changed) await repository.saveProgress(deck.id, merged);
  }

  // 3. Envoi par lots : une requête de 700 lignes passerait mal.
  let pushed = 0;
  const CHUNK = 200;
  for (let i = 0; i < toPush.length; i += CHUNK) {
    const rows = toPush.slice(i, i + CHUNK).map((p) => toRow(userId, p));
    const { error: upErr } = await supabase
      .from('progress')
      .upsert(rows, { onConflict: 'user_id,card_id' });
    if (upErr) throw upErr;
    pushed += rows.length;
  }

  return { progressPushed: pushed, progressPulled: pulled };
}

/**
 * Efface la progression d'un paquet côté serveur.
 *
 * Sans cela, « effacer la progression » ne vaudrait que pour l'appareil :
 * la synchronisation suivante rapatrierait ce que le serveur a gardé.
 */
export async function clearRemoteProgress(userId: string, deckId: string): Promise<void> {
  const { error } = await supabase
    .from('progress')
    .delete()
    .eq('user_id', userId)
    .like('card_id', `${deckId}:%`);
  if (error) throw error;
}

/**
 * Réglages, compteur du jour, série, collection et paquets en jeu.
 *
 * Tout voyage dans le même paquet JSON de la colonne `settings` : aucune
 * table, aucune colonne, aucune règle d'accès nouvelle du côté de Supabase.
 *
 * Les deux listes de paquets sont synchronisées, car mettre un paquet en jeu
 * sur l'ordinateur doit se voir sur le téléphone — c'est la même décision.
 *
 * ── Ce qui change au chantier 30 ───────────────────────────────────────
 *
 * Les deux listes étaient fusionnées par UNION. Une union ne peut pas
 * exprimer un retrait : « je ne possède plus ce paquet » et « je n'ai jamais
 * eu ce paquet » y donnent le même ensemble vide, donc la synchronisation
 * suivante rapatriait ce que le serveur avait gardé. D'où des paquets qui se
 * rajoutent, une mise en pause qui ne tient pas, et une liste « en jeu »
 * qu'on croit perdue.
 *
 * L'arbitrage se fait maintenant sur un journal daté, paquet par paquet —
 * le même principe que les `overrides` juste en dessous, qui, eux, étaient
 * justes depuis le début.
 */
export async function syncSettings(userId: string): Promise<void> {
  const localGeneral = await repository.getSettings();
  const localCounters = await repository.getCounters();
  const localStreak = await repository.getStreak();
  const localOverrides = await repository.getOverrides();
  /*
   * Le journal local, ou sa reconstitution depuis les deux anciennes listes
   * si cet appareil n'en a pas encore. Reconstitué, il est daté à zéro : il
   * perdra donc contre toute décision réelle venue d'ailleurs, ce qui est
   * exactement ce qu'on veut d'un état hérité.
   */
  const localInstalled = (await repository.getInstalled()) ?? [];
  const localActive = (await repository.getActive()) ?? localInstalled;
  const localJournal =
    (await repository.getDeckJournal()) ??
    journalDepuisListes(localInstalled, localActive);

  const { data, error } = await supabase
    .from('user_settings')
    .select('settings, counter')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  const bundle = (data?.settings ?? null) as {
    general?: Settings;
    decks?: Record<string, DeckOverride>;
    streak?: Streak;
    installed?: string[];
    active?: string[];
    deckJournal?: DeckJournal;
  } | null;
  const remoteGeneral = bundle?.general ?? null;
  const remoteOverrides = bundle?.decks ?? {};
  const remoteStreak = bundle?.streak ?? null;
  const remoteCounters = (data?.counter ?? null) as DailyCounters | null;

  const general = mergeSettings(localGeneral, remoteGeneral);

  // Chaque paquet est arbitré séparément, sur son propre horodatage.
  const overrides: Record<string, DeckOverride> = { ...remoteOverrides };
  for (const [id, local] of Object.entries(localOverrides)) {
    const remote = remoteOverrides[id];
    overrides[id] =
      !remote || (local.updatedAt ?? 0) >= (remote.updatedAt ?? 0) ? local : remote;
  }

  const streak = mergeStreak(localStreak, remoteStreak);

  /*
   * Collection et paquets en jeu : la décision la plus récente gagne, pour
   * chaque paquet séparément.
   *
   * L'union précédente privilégiait le travail — « en cas de doute, on garde
   * le paquet » — mais elle ne laissait aucun moyen d'exprimer un retrait, et
   * ressuscitait donc à chaque passage ce que la personne venait d'écarter.
   * Le doute se tranche maintenant par la date : le dernier geste gagne, quel
   * que soit l'appareil où il a été posé.
   *
   * Un serveur qui n'a pas encore de journal voit le sien reconstitué depuis
   * ses deux listes, daté à zéro. Conséquence voulue : la première
   * synchronisation après cette mise à jour se comporte comme avant — elle
   * réunit — et personne ne perd un paquet en installant la correction. Dès
   * le geste suivant, ce geste tranche.
   */
  const remoteJournal =
    bundle?.deckJournal ??
    journalDepuisListes(bundle?.installed ?? [], bundle?.active ?? []);

  const deckJournal = fusionner(localJournal, remoteJournal);
  const { installed, active } = listes(deckJournal);

  const today = todayKey();
  const counters: DailyCounters = {};
  const ids = new Set([
    ...Object.keys(localCounters),
    ...Object.keys(remoteCounters ?? {}),
  ]);
  for (const id of ids) {
    counters[id] = mergeCounters(
      localCounters[id] ?? { day: today, newSeen: 0, reviewsDone: 0 },
      remoteCounters?.[id] ?? null,
      today,
    );
  }

  await repository.saveSettings(general);
  await repository.saveCounters(counters);
  await repository.saveOverrides(overrides);
  await repository.saveStreak(streak);
  await repository.saveDeckJournal(deckJournal);
  await repository.saveInstalled(installed);
  await repository.saveActive(active);

  /*
   * `installed` et `active` continuent d'être poussés à côté du journal.
   *
   * Ce n'est pas une redondance oubliée : un appareil resté sur la version
   * précédente lit encore ces deux listes et ne saurait rien faire du
   * journal. Il faut donc qu'il y trouve un état cohérent le temps d'être
   * mis à jour. Elles sont désormais dérivées, jamais décidées.
   */
  const { error: upErr } = await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      settings: { general, decks: overrides, streak, installed, active, deckJournal },
      counter: counters,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (upErr) throw upErr;
}

/**
 * Réglages : le plus récemment modifié gagne.
 *
 * Auparavant le serveur l'emportait toujours, si bien qu'un curseur déplacé
 * sur le téléphone était écrasé à la synchronisation suivante.
 */
export function mergeSettings(local: Settings, remote: Settings | null): Settings {
  if (!remote) return local;
  const tl = local.updatedAt ?? 0;
  const tr = remote.updatedAt ?? 0;
  // À égalité, on garde le local : l'utilisateur voit ainsi ce qu'il a réglé.
  return tr > tl ? { ...local, ...remote } : local;
}

/**
 * Compteur du jour : on additionne le travail des deux appareils.
 *
 * Prendre le maximum sous-estimait le total — dix cartes sur l'ordinateur
 * et cinq sur le téléphone donnaient dix, et l'objectif du jour semblait
 * moins avancé qu'il ne l'était.
 */
export function mergeCounters(
  local: DailyCounter,
  remote: DailyCounter | null,
  today: string,
): DailyCounter {
  const here = local.day === today ? local : null;
  const there = remote?.day === today ? remote : null;
  if (!here) return there ? { ...there } : { day: today, newSeen: 0, reviewsDone: 0 };
  if (!there) return { ...here, day: today };

  // `synced` mémorise ce qui avait déjà été mis en commun : sans lui, chaque
  // synchronisation rajouterait le total de l'autre appareil indéfiniment.
  const dejaCompte = here.synced ?? { newSeen: 0, reviewsDone: 0 };
  const apportLocal = {
    newSeen: Math.max(0, here.newSeen - dejaCompte.newSeen),
    reviewsDone: Math.max(0, here.reviewsDone - dejaCompte.reviewsDone),
  };
  const total = {
    newSeen: there.newSeen + apportLocal.newSeen,
    reviewsDone: there.reviewsDone + apportLocal.reviewsDone,
  };
  return {
    day: today,
    newSeen: total.newSeen,
    reviewsDone: total.reviewsDone,
    synced: { ...total },
  };
}

/** Synchronisation complète. Ne lève jamais : renvoie l'erreur dans le rapport. */
export async function syncAll(userId: string): Promise<SyncReport> {
  try {
    const decksPulled = await pullCatalog();
    const rest = await syncProgress(userId);
    await syncSettings(userId);
    return { decksPulled, ...rest, settingsSynced: true };
  } catch (e) {
    return {
      decksPulled: 0,
      progressPushed: 0,
      progressPulled: 0,
      settingsSynced: false,
      error: (e as Error).message ?? 'échec de la synchronisation',
    };
  }
}
