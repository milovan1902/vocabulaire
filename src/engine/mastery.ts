/**
 * L'avancement affiché — à ne jamais confondre avec l'ordonnancement.
 *
 * FSRS décide QUAND une carte revient. Ce fichier décide ce que l'élève
 * VOIT monter. Les deux sont volontairement découplés : la stabilité FSRS
 * met plus d'un an à saturer, ce qui est juste pour la mémoire mais illisible
 * comme encouragement. Ici une carte se remplit en deux passages.
 *
 * La loi, en une phrase : « Facile » remplit un demi-quota, « Bien » un
 * quart, une carte ratée recule. Rien d'autre ne compte.
 *
 * Conséquence à assumer : atteindre 100 % ne termine pas le travail. Les
 * cartes pleines reviennent indéfiniment, à intervalles longs. C'est dit à
 * l'écran plutôt que caché — voir la bulle de `Library.tsx`.
 */
import type { Grade, Progress } from '../domain/types';

/** Une carte pleine vaut 100. Les paliers sont donc 0, 25, 50, 75, 100. */
export const PLEIN = 100;

/**
 * Ce que chaque note ajoute à l'avancement d'une carte.
 *
 * Le barème est symétrique : ce qu'un « Bien » fait gagner, un « Difficile »
 * le reprend ; ce qu'un « Facile » fait gagner, un « Encore » le reprend.
 * Sans cette symétrie, l'avancement dérivait vers le haut à force de
 * réponses moyennes et finissait par ne plus rien dire.
 *
 * Le « Bien » à +25 est un compromis choisi contre l'incitation à tricher :
 * si seul « Facile » faisait monter la barre, l'élève apprendrait à appuyer
 * sur « Facile » — or ce bouton envoie la carte à cinq mois et saborde ses
 * propres révisions. L'honnêteté doit rester payante.
 */
export const PAS: Record<Grade, number> = {
  easy: +50,
  good: +25,
  hard: -25,
  again: -50,
};

function borne(v: number): number {
  return Math.min(PLEIN, Math.max(0, Math.round(v)));
}

/** Avancement d'une carte, tolérant aux progressions d'avant ce chantier. */
export function masteryOf(p: Progress | undefined | null): number {
  return borne(p?.mastery ?? 0);
}

/** Avancement après application d'une note. Écrêté aux deux bouts. */
export function applyGrade(p: Progress, grade: Grade): number {
  return borne(masteryOf(p) + PAS[grade]);
}

export interface DeckMastery {
  /**
   * De 0 à 100, NON arrondi.
   *
   * Sur un paquet de deux cents mots, une seule carte pleine vaut un demi
   * pour cent : arrondir à l'entier afficherait 0 % après une session
   * entière de travail, ce qui est exactement le défaut qu'on corrige.
   */
  percent: number;
  /** Cartes retenues au dénominateur — thèmes en jeu seulement. */
  counted: number;
  /** Cartes au complet, pour la bulle. */
  full: number;
  /** true quand des thèmes sont écartés : le pourcentage doit s'en expliquer. */
  partial: boolean;
}

/**
 * Avancement d'un paquet.
 *
 * Le dénominateur ne compte QUE les cartes des thèmes retenus. Un élève qui
 * n'active que trois thèmes sur dix ne pourrait jamais dépasser trente pour
 * cent : l'anneau serait cassé par construction, et il accuserait l'élève
 * d'un retard qui n'existe pas.
 */
export function deckMastery(
  cards: Array<{ id: string; theme: string }>,
  progress: Record<string, Progress>,
  themesInPlay: string[] | null,
): DeckMastery {
  const retenus = themesInPlay && themesInPlay.length ? new Set(themesInPlay) : null;
  const jouees = retenus ? cards.filter((c) => retenus.has(c.theme)) : cards;

  if (jouees.length === 0) {
    return { percent: 0, counted: 0, full: 0, partial: cards.length > 0 };
  }

  let somme = 0;
  let full = 0;
  for (const c of jouees) {
    const m = masteryOf(progress[c.id]);
    somme += m;
    if (m >= PLEIN) full++;
  }

  return {
    percent: (somme / (jouees.length * PLEIN)) * 100,
    counted: jouees.length,
    full,
    partial: jouees.length < cards.length,
  };
}

/**
 * Le pourcentage tel qu'il s'écrit.
 *
 * On tronque au lieu d'arrondir, et on garde une décimale sous dix pour cent.
 * Tronquer évite d'annoncer un pour cent quand on n'a que 0,6 — un compteur
 * qui exagère se fait prendre, et il n'est plus cru ensuite.
 */
export function masteryLabel(percent: number): string {
  if (percent <= 0) return '0 %';
  if (percent >= 100) return '100 %';
  if (percent < 10) {
    const d = Math.floor(percent * 10) / 10;
    if (d === 0) return '<0,1 %';
    return d.toFixed(1).replace('.', ',') + ' %';
  }
  return Math.floor(percent) + ' %';
}
