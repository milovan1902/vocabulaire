/**
 * CHANTIER 165 — NIVEAU ET XP DU STYLE LYCÉE.
 *
 * Rien n'est stocké : les XP se déduisent des répétitions déjà enregistrées
 * (10 XP par carte révisée), le niveau se déduit des XP. Conséquences :
 *   — aucune donnée nouvelle, rien à synchroniser, rien à déclarer ;
 *   — impossible de « perdre » des XP : ils ne font que monter ;
 *   — rien ne s'achète (programme Familles de Google Play).
 *
 * Paliers : il faut 150 XP pour le niveau 2, puis 300 de plus pour le 3,
 * 450 de plus pour le 4… Le niveau 7 demande 3 150 XP, soit 315 cartes.
 */
export const XP_PAR_REVISION = 10;

/** XP cumulés à partir desquels on est au niveau `n` (n ≥ 1). */
export function seuil(n: number): number {
  return 75 * (n - 1) * n;
}

export function xpDe(revisions: number): number {
  return Math.max(0, revisions) * XP_PAR_REVISION;
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
