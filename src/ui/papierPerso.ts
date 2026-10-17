/**
 * CHANTIER 286 — les six couleurs de dos d'un paquet perso.
 *
 * Choisie à l'étape 2 de « Créer mon paquet », gardée sur la fiche du
 * paquet (`papier`). Même forme que les papiers de deckPaper.ts :
 * pale = le fond, mid = le filet, ink = le disque du monogramme.
 */
export const PAPIERS_PERSO = [
  { id: 'creme', nom: 'Crème', pale: '#f7efdd', mid: '#c4aa74', ink: '#8a6d35' },
  { id: 'vert', nom: 'Vert', pale: '#e8f0e7', mid: '#9eb39a', ink: '#5a7356' },
  { id: 'lilas', nom: 'Lilas', pale: '#ece8f2', mid: '#a59cba', ink: '#625985' },
  { id: 'ciel', nom: 'Ciel', pale: '#e7eef2', mid: '#9ab1bf', ink: '#557083' },
  { id: 'peche', nom: 'Pêche', pale: '#f7eae4', mid: '#c69a88', ink: '#8a5848' },
  { id: 'rose', nom: 'Rose', pale: '#f4e8ee', mid: '#ba97a8', ink: '#7d5468' },
] as const;

export const PAPIER_DEFAUT = 'ciel';

export function papierPerso(id: string | null | undefined) {
  return id ? PAPIERS_PERSO.find((p) => p.id === id) ?? null : null;
}
