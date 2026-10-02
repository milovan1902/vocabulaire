/**
 * CHANTIER 165 — NIVEAU DU STYLE LYCÉE.
 * CHANTIER 168 — les niveaux suivent les paliers des apparences : chaque
 * niveau gagné débloque une apparence. Les XP viennent de engine/xp.ts.
 *
 * Niveau 1 : 0 XP · 2 : 100 · 3 : 250 · 4 : 400 · 5 : 600 · 6 : 800 ·
 * 7 : 1 000 (plafond du gratuit). Au-delà (payant), un niveau tous les
 * 250 XP.
 */
export const PALIERS = [0, 100, 250, 400, 600, 800, 1000];

/** XP cumulés à partir desquels on est au niveau `n` (n ≥ 1). */
export function seuil(n: number): number {
  if (n <= PALIERS.length) return PALIERS[n - 1];
  return PALIERS[PALIERS.length - 1] + 250 * (n - PALIERS.length);
}

export interface Niveau {
  niveau: number;
  xp: number;
  /** XP gagnés depuis le début du niveau. */
  dansNiveau: number;
  /** XP que demande le niveau en entier. */
  pourNiveau: number;
}

export function niveauDe(xp: number): Niveau {
  let n = 1;
  while (seuil(n + 1) <= xp) n++;
  return { niveau: n, xp, dansNiveau: xp - seuil(n), pourNiveau: seuil(n + 1) - seuil(n) };
}
