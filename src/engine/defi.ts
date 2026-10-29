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

/**
 * Le tirage : on écarte les doublons (même mot anglais dans deux paquets),
 * on garde les mots les moins revus récemment, puis on tire au hasard dans
 * ce vivier, pour que le défi change d'un jour à l'autre.
 */
export function tirerMots(candidats: MotDefi[], n = MOTS_DEFI, hasard: () => number = Math.random): MotDefi[] {
  const vus = new Set<string>();
  const uniques = candidats.filter((m) => {
    const cle = m.card.en.trim().toLowerCase();
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
  if (uniques.length < n) return [];
  const vivier = [...uniques]
    .sort((a, b) => (a.progress.lastReview ?? 0) - (b.progress.lastReview ?? 0))
    .slice(0, Math.max(n * 4, 20));
  for (let i = vivier.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [vivier[i], vivier[j]] = [vivier[j], vivier[i]];
  }
  return vivier.slice(0, n);
}
