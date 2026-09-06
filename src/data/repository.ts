/**
 * Couche de stockage.
 *
 * Tout passe par IndexedDB, pas par localStorage : pas de limite à 5 Mo,
 * et les images de paquets peuvent grossir sans risque.
 *
 * Chaque clé est préfixée par un identifiant d'utilisateur, même s'il n'y en a
 * qu'un aujourd'hui. C'est ce qui permettra de brancher une synchronisation
 * serveur plus tard sans migration douloureuse : il suffira d'implémenter
 * la même interface `Repository` avec des appels réseau.
 */
import { get, set, del, keys } from 'idb-keyval';
import type {
  Card,
  Category,
  DailyCounter,
  Deck,
  DeckId,
  DeckOverride,
  Progress,
  Settings,
  UserId,
} from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import type { Streak } from '../engine/streak';
import { EMPTY_STREAK } from '../engine/streak';

/** Un seul utilisateur pour l'instant. Le jour venu, cette valeur viendra du compte. */
export const LOCAL_USER: UserId = 'local';

const k = {
  decks: (u: UserId) => `u:${u}:decks`,
  categories: (u: UserId) => `u:${u}:categories`,
  cards: (u: UserId, d: DeckId) => `u:${u}:cards:${d}`,
  progress: (u: UserId, d: DeckId) => `u:${u}:progress:${d}`,
  themes: (u: UserId, d: DeckId) => `u:${u}:themes:${d}`,
  image: (u: UserId, d: DeckId) => `u:${u}:image:${d}`,
  settings: (u: UserId) => `u:${u}:settings`,
  overrides: (u: UserId) => `u:${u}:overrides`,
  // Un compteur par paquet : le quota étant réglable paquet par paquet,
  // un compteur unique ne pourrait pas le refléter.
  counters: (u: UserId) => `u:${u}:counters`,
  // La série, elle, est une seule et même chose pour la personne : réviser
  // dans n'importe quel paquet fait la journée.
  streak: (u: UserId) => `u:${u}:streak`,
  // Les paquets que la personne a ajoutés à sa collection. Distinct de la
  // liste des paquets connus : le catalogue en télécharge davantage qu'elle
  // n'en révise, et une bibliothèque qui s'invite dans « Mes paquets »
  // noierait le travail en cours.
  installed: (u: UserId) => `u:${u}:installed`,
};

export interface Repository {
  listDecks(): Promise<Deck[]>;
  saveDecks(decks: Deck[]): Promise<void>;
  listCategories(): Promise<Category[]>;
  saveCategories(c: Category[]): Promise<void>;
  getCards(deckId: DeckId): Promise<Card[]>;
  saveCards(deckId: DeckId, cards: Card[]): Promise<void>;
  getProgress(deckId: DeckId): Promise<Record<string, Progress>>;
  saveProgress(deckId: DeckId, p: Record<string, Progress>): Promise<void>;
  getThemes(deckId: DeckId): Promise<string[] | null>;
  saveThemes(deckId: DeckId, themes: string[]): Promise<void>;
  getImage(deckId: DeckId): Promise<string | null>;
  saveImage(deckId: DeckId, dataUrl: string): Promise<void>;
  removeImage(deckId: DeckId): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
  getOverrides(): Promise<Record<DeckId, DeckOverride>>;
  saveOverrides(o: Record<DeckId, DeckOverride>): Promise<void>;
  getCounters(): Promise<Record<DeckId, DailyCounter>>;
  saveCounters(c: Record<DeckId, DailyCounter>): Promise<void>;
  getStreak(): Promise<Streak>;
  saveStreak(s: Streak): Promise<void>;
  /** `null` = la notion n'existe pas encore sur cet appareil (voir migration). */
  getInstalled(): Promise<DeckId[] | null>;
  saveInstalled(ids: DeckId[]): Promise<void>;
  deleteDeck(deckId: DeckId): Promise<void>;
  exportAll(): Promise<Record<string, unknown>>;
  importAll(data: Record<string, unknown>): Promise<void>;
}

export class IdbRepository implements Repository {
  private user: UserId;

  constructor(user: UserId = LOCAL_USER) {
    this.user = user;
  }

  async listDecks() {
    return (await get<Deck[]>(k.decks(this.user))) ?? [];
  }
  async saveDecks(decks: Deck[]) {
    await set(k.decks(this.user), decks);
  }
  async listCategories() {
    return (await get<Category[]>(k.categories(this.user))) ?? [];
  }
  async saveCategories(c: Category[]) {
    await set(k.categories(this.user), c);
  }
  async getCards(d: DeckId) {
    return (await get<Card[]>(k.cards(this.user, d))) ?? [];
  }
  async saveCards(d: DeckId, cards: Card[]) {
    await set(k.cards(this.user, d), cards);
  }
  async getProgress(d: DeckId) {
    return (await get<Record<string, Progress>>(k.progress(this.user, d))) ?? {};
  }
  async saveProgress(d: DeckId, p: Record<string, Progress>) {
    await set(k.progress(this.user, d), p);
  }
  async getThemes(d: DeckId) {
    return (await get<string[]>(k.themes(this.user, d))) ?? null;
  }
  async saveThemes(d: DeckId, t: string[]) {
    await set(k.themes(this.user, d), t);
  }
  async getImage(d: DeckId) {
    return (await get<string>(k.image(this.user, d))) ?? null;
  }
  async saveImage(d: DeckId, dataUrl: string) {
    await set(k.image(this.user, d), dataUrl);
  }
  async removeImage(d: DeckId) {
    await del(k.image(this.user, d));
  }
  async getSettings() {
    const s = await get<Partial<Settings>>(k.settings(this.user));
    return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  }
  async saveSettings(s: Settings) {
    await set(k.settings(this.user), s);
  }
  async getOverrides() {
    return (await get<Record<DeckId, DeckOverride>>(k.overrides(this.user))) ?? {};
  }
  async saveOverrides(o: Record<DeckId, DeckOverride>) {
    await set(k.overrides(this.user), o);
  }
  async getCounters() {
    return (await get<Record<DeckId, DailyCounter>>(k.counters(this.user))) ?? {};
  }
  async saveCounters(c: Record<DeckId, DailyCounter>) {
    await set(k.counters(this.user), c);
  }
  async getStreak() {
    // Fusion avec la valeur vide : une série enregistrée par une version
    // antérieure du format n'a pas tous les champs.
    const s = await get<Partial<Streak>>(k.streak(this.user));
    return { ...EMPTY_STREAK, ...(s ?? {}) };
  }
  async saveStreak(s: Streak) {
    await set(k.streak(this.user), s);
  }
  async getInstalled() {
    return (await get<DeckId[]>(k.installed(this.user))) ?? null;
  }
  async saveInstalled(ids: DeckId[]) {
    await set(k.installed(this.user), ids);
  }
  async deleteDeck(d: DeckId) {
    await Promise.all([
      del(k.cards(this.user, d)),
      del(k.progress(this.user, d)),
      del(k.themes(this.user, d)),
      del(k.image(this.user, d)),
    ]);
    const overrides = await this.getOverrides();
    delete overrides[d];
    await this.saveOverrides(overrides);
    const counters = await this.getCounters();
    delete counters[d];
    await this.saveCounters(counters);
    const decks = (await this.listDecks()).filter((x) => x.id !== d);
    await this.saveDecks(decks);
  }

  /** Sauvegarde complète, pour transporter les données d'un appareil à l'autre. */
  async exportAll() {
    const all = await keys();
    const prefix = `u:${this.user}:`;
    const out: Record<string, unknown> = {};
    for (const key of all) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        out[key] = await get(key);
      }
    }
    return out;
  }

  async importAll(data: Record<string, unknown>) {
    const all = await keys();
    const prefix = `u:${this.user}:`;
    for (const key of all) {
      if (typeof key === 'string' && key.startsWith(prefix)) await del(key);
    }
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith(prefix)) await set(key, value);
    }
  }
}

export const repository: Repository = new IdbRepository();
