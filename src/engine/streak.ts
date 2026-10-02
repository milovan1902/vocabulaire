/**
 * Série de jours.
 *
 * Une seule donnée : la liste des jours travaillés. Tout le reste — la série
 * en cours, le record, le total, le calendrier de « Mes progrès » — s'en
 * recalcule. C'est ce qui rend la fusion entre deux appareils sûre :
 * additionner des compteurs dépend de l'ordre des synchronisations, réunir
 * des dates non.
 *
 * CHANTIER 34 — ce qui change ici, et c'est la seule chose : les jours ne
 * sont plus oubliés au bout de trente. « Mes progrès » montre un vrai
 * calendrier et un total depuis le début ; l'un et l'autre sont impossibles
 * sur une fenêtre glissante d'un mois.
 */
import { todayKey } from './session';

export interface Streak {
  /** Dernier jour où au moins une carte a été notée. */
  lastDay: string | null;
  /** Jours consécutifs jusqu'à `lastDay` inclus. */
  current: number;
  best: number;
  /** Jours travaillés, triés, du plus ancien au plus récent. */
  days: string[];
  /**
   * CHANTIER 168 — cartes notées par jour (AAAA-MM-JJ → nombre). Absent
   * pour les jours d'avant ce chantier : ceux-là comptent comme validés
   * (voir engine/xp.ts). Fusion entre appareils : le plus grand des deux.
   */
  counts?: Record<string, number>;
  updatedAt: number;
}

export const EMPTY_STREAK: Streak = {
  lastDay: null,
  current: 0,
  best: 0,
  days: [],
  updatedAt: 0,
};

/**
 * Le plafond d'historique — dix ans.
 *
 * Il était de trente jours : assez pour la réglette de la semaine, pas pour
 * un calendrier. Une date fait dix caractères ; dix ans d'assiduité totale
 * pèsent moins de quarante kilo-octets, et une année normale bien moins.
 * C'est un prix négligeable pour la seule donnée que l'application ne peut
 * pas reconstituer après coup.
 *
 * Le plafond n'est pas retiré pour autant : une liste sans borne est une
 * fuite qui attend son heure.
 */
const GARDE = 3660;

/** Décale une date AAAA-MM-JJ de `delta` jours. */
export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + delta));
}

/**
 * Série encore vivante, ou zéro.
 *
 * Elle ne meurt qu'après une journée entière sautée : à l'ouverture de
 * l'application le lendemain, la série d'hier est toujours là, et c'est
 * précisément ce qui donne envie de la garder.
 */
export function liveStreak(s: Streak, today = todayKey()): number {
  if (!s.lastDay) return 0;
  if (s.lastDay === today || s.lastDay === shiftDay(today, -1)) return s.current;
  return 0;
}

/** La journée est-elle déjà faite ? */
export function doneToday(s: Streak, today = todayKey()): boolean {
  return s.lastDay === today;
}

/**
 * Enregistre une révision faite aujourd'hui.
 * Sans effet si la journée est déjà comptée : appelable à chaque carte.
 */
export function record(s: Streak, today = todayKey()): Streak {
  if (s.lastDay === today) return s;
  const current = s.lastDay === shiftDay(today, -1) ? s.current + 1 : 1;
  return {
    lastDay: today,
    current,
    best: Math.max(s.best, current),
    days: [...s.days.filter((d) => d !== today), today].sort().slice(-GARDE),
    updatedAt: Date.now(),
  };
}

/**
 * CHANTIER 168 — une carte de plus notée aujourd'hui. Appelée à chaque
 * carte, APRÈS `record`. Les compteurs des jours sortis de l'historique
 * sont retirés avec eux.
 */
export function compterCarte(s: Streak, today = todayKey()): Streak {
  const counts: Record<string, number> = {};
  const garde = new Set(s.days);
  for (const [k, v] of Object.entries(s.counts ?? {})) if (garde.has(k)) counts[k] = v;
  counts[today] = (counts[today] ?? 0) + 1;
  return { ...s, counts, updatedAt: Date.now() };
}

/** Les sept derniers jours, du plus ancien à aujourd'hui. */
export function lastSeven(
  s: Streak,
  today = todayKey(),
): Array<{ key: string; done: boolean }> {
  const faits = new Set(s.days);
  const out: Array<{ key: string; done: boolean }> = [];
  for (let i = 6; i >= 0; i--) {
    const key = shiftDay(today, -i);
    out.push({ key, done: faits.has(key) });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 *  Ce que « Mes progrès » lit. Rien de stocké en plus : trois lectures
 *  de la même liste de dates.
 * ------------------------------------------------------------------ */

/** Les jours travaillés, en ensemble, pour une recherche en temps constant. */
export function workedSet(s: Streak): Set<string> {
  return new Set(s.days);
}

/** Le premier jour travaillé connu. C'est l'origine de tous les écrans. */
export function firstDay(s: Streak): string | null {
  return s.days.length ? s.days[0] : null;
}

/**
 * Le total des jours travaillés.
 *
 * Sur un appareil qui tournait avant ce chantier, l'application n'avait
 * gardé que les trente derniers jours : ce total commence donc à cette
 * fenêtre-là, puis devient exact. Mieux vaut un total honnête qui démarre
 * bas qu'un total inventé.
 */
export function totalWorked(s: Streak): number {
  return s.days.length;
}

/**
 * Fusion entre appareils.
 *
 * On réunit les jours, puis on recalcule la série : deux appareils qui ont
 * chacun travaillé des jours différents obtiennent ainsi la bonne série,
 * quel que soit l'ordre dans lequel ils se synchronisent. Le record est le
 * plus grand des trois, pour ne pas perdre un exploit tombé hors de
 * l'historique conservé.
 */
export function mergeStreak(local: Streak, remote: Streak | null): Streak {
  if (!remote) return local;
  const days = [...new Set([...local.days, ...remote.days])].sort().slice(-GARDE);
  const last = days.length ? days[days.length - 1] : null;

  let current = 0;
  if (last) {
    const faits = new Set(days);
    for (let d = last; faits.has(d); d = shiftDay(d, -1)) current++;
  }

  /*
   * CHANTIER 168 — les compteurs du jour : le plus grand des deux, jamais
   * la somme. Une même journée synchronisée deux fois serait sinon comptée
   * deux fois. Contrepartie assumée : 10 cartes sur le téléphone et 10 sur
   * l'ordinateur le même jour comptent 10, pas 20.
   */
  let counts: Record<string, number> | undefined;
  if (local.counts || remote.counts) {
    counts = {};
    const garde = new Set(days);
    for (const src of [local.counts ?? {}, remote.counts ?? {}]) {
      for (const [k, v] of Object.entries(src)) {
        if (garde.has(k)) counts[k] = Math.max(counts[k] ?? 0, v);
      }
    }
  }

  return {
    lastDay: last,
    current,
    best: Math.max(local.best, remote.best, current),
    days,
    ...(counts ? { counts } : {}),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
}
