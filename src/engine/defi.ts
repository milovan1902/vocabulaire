import type { Card, Progress } from '../domain/types';

/*
 * CHANTIER 357 — LE DÉFI ÉCLAIR.
 *
 * Une fois par jour, 5 mots déjà acquis, tirés dans TOUS les paquets de la
 * collection (en jeu, en pause, terminés), à écrire en anglais en 20 s
 * chacun (30 s en « Très grand »). L'application juge seule.
 *
 *   — acquis : au moins 2 révisions, la dernière en Bien ou Facile, et pas
 *     à revoir aujourd'hui. L'application ne garde pas chaque note, seulement
 *     le nombre de révisions et la dernière ;
 *   — seulement des mots (pas de phrases à taper sur un téléphone) ;
 *   — 5/5 : +10 XP ; 4/5 : +5 XP ; en dessous, rien ;
 *   — un mot raté repasse « à revoir » ; un mot réussi garde sa date ;
 *   — les 5 mots comptent dans les 20 cartes du jour.
 *
 * CHANTIER 384 — PLUS DE MOTS QUI REVIENNENT.
 * Un mot réussi gardant sa date, il restait parmi les « moins revus » et
 * retombait dans le vivier tous les jours. Le tirage tient maintenant compte
 * des mots déjà posés au défi : d'abord ceux jamais posés, puis, quand tout
 * a été vu, ceux posés il y a le plus longtemps.
 */
export const MOTS_DEFI = 5;

export interface MotDefi { deckId: string; card: Card; progress: Progress }

export function finDuJour(maintenant = Date.now()): number {
  const d = new Date(maintenant);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function estAcquis(p: Progress | undefined, fin = finDuJour()): p is Progress {
  if (!p || p.reps < 2 || p.due <= fin) return false;
  return p.lastGrade ? p.lastGrade === 'good' || p.lastGrade === 'easy' : p.state === 2;
}

export function xpDefi(score: number): number {
  return score >= MOTS_DEFI ? 10 : score === MOTS_DEFI - 1 ? 5 : 0;
}

/** La clé d'un mot : le même mot anglais dans deux paquets compte une fois. */
export function cleMot(m: MotDefi): string {
  return m.card.en.trim().toLowerCase();
}

function melanger<T>(t: T[], hasard: () => number): T[] {
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

/**
 * Le tirage. `vus` : clé du mot → jour où il a été posé au défi (AAAA-MM-JJ).
 *   1. on écarte les doublons ;
 *   2. s'il reste au moins 5 mots jamais posés : on prend les moins revus
 *      récemment parmi eux, et on tire au hasard ;
 *   3. sinon : tous les jamais posés, complétés par les mots posés il y a
 *      le plus longtemps.
 */
export function tirerMots(
  candidats: MotDefi[],
  n = MOTS_DEFI,
  hasard: () => number = Math.random,
  vus: Record<string, string> = {},
): MotDefi[] {
  const deja = new Set<string>();
  const uniques = candidats.filter((m) => {
    const cle = cleMot(m);
    if (deja.has(cle)) return false;
    deja.add(cle);
    return true;
  });
  if (uniques.length < n) return [];
  const jamais = uniques.filter((m) => !vus[cleMot(m)]);
  if (jamais.length >= n) {
    const vivier = [...jamais]
      .sort((a, b) => (a.progress.lastReview ?? 0) - (b.progress.lastReview ?? 0))
      .slice(0, Math.max(n * 4, 20));
    return melanger(vivier, hasard).slice(0, n);
  }
  const anciens = melanger(uniques.filter((m) => vus[cleMot(m)]), hasard)
    .sort((a, b) => vus[cleMot(a)].localeCompare(vus[cleMot(b)]));
  return melanger([...jamais, ...anciens.slice(0, n - jamais.length)], hasard);
}
