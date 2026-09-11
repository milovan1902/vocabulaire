/**
 * Les chiffres de « Mes progrès ».
 *
 * Tout se calcule ici, à partir de ce qui est déjà stocké : les paliers des
 * cartes et les passages (`reps`) enregistrés par FSRS. Aucune donnée
 * nouvelle n'est nécessaire — à une exception près, les jalons mensuels,
 * qui ne peuvent pas se déduire (voir `engine/jalons.ts`).
 *
 * Le fichier est séparé de l'écran pour la même raison que `deckSummary` :
 * un écran qui calcule ses propres chiffres finit par en calculer deux
 * versions différentes.
 */
import type { Deck, Progress, Settings } from '../domain/types';
import { repository } from '../data/repository';
import { deckMastery } from '../engine/mastery';
import { noteJalon, type Jalon } from '../engine/jalons';

export interface DeckProgressRow {
  deck: Deck;
  /** Mots au palier 100. */
  acquis: number;
  /** Mots comptés — thèmes en jeu seulement, comme partout ailleurs. */
  total: number;
  /** 0 à 100, non arrondi. */
  percent: number;
}

export interface ProgressStats {
  acquis: number;
  /** Mots commencés mais pas finis : ni « à découvrir », ni acquis. */
  enCours: number;
  motsEnJeu: number;
  /** 0 à 100, non arrondi. */
  percent: number;
  /** Cartes notées depuis le début, tous paquets confondus. */
  revisions: number;
  /** Minutes correspondantes — une estimation, jamais un chronomètre. */
  minutes: number;
  rows: DeckProgressRow[];
  jalons: Jalon[];
}

/**
 * Vingt secondes par carte, comme dans `deckSummary`.
 *
 * La même constante des deux côtés : deux estimations de durée qui ne
 * tombent pas d'accord dans la même application, c'est une de trop.
 */
const SECONDES_PAR_CARTE = 20;

export async function loadProgressStats(
  decks: Deck[],
  _settings: Settings,
): Promise<ProgressStats> {
  const rows: DeckProgressRow[] = [];
  let acquis = 0;
  let enCours = 0;
  let motsEnJeu = 0;
  let somme = 0;
  let revisions = 0;

  for (const deck of decks) {
    const [cards, progress, savedThemes] = await Promise.all([
      repository.getCards(deck.id),
      repository.getProgress(deck.id),
      repository.getThemes(deck.id),
    ]);

    const m = deckMastery(cards, progress as Record<string, Progress>, savedThemes);
    if (m.counted === 0) continue;

    rows.push({
      deck,
      acquis: m.breakdown.acquis,
      total: m.counted,
      percent: m.percent,
    });

    acquis += m.breakdown.acquis;
    enCours += m.breakdown.reprendre + m.breakdown.cours + m.breakdown.presque;
    motsEnJeu += m.counted;
    somme += m.percent * m.counted;

    /*
     * Les passages FSRS font le total des cartes revues. C'est la seule
     * source déjà écrite : les compteurs quotidiens, eux, sont remis à zéro
     * chaque matin et ne peuvent rien dire du passé.
     */
    for (const p of Object.values(progress) as Progress[]) {
      revisions += p.reps ?? 0;
    }
  }

  // Le plus avancé en tête : on vient voir ce qui marche, pas l'inverse.
  rows.sort((a, b) => b.percent - a.percent);

  const percent = motsEnJeu ? somme / motsEnJeu : 0;

  /*
   * Le relevé du mois est écrit à la lecture de l'écran.
   *
   * C'est le seul moment où le chiffre est certainement juste et où l'on
   * est certain que l'application tourne. Conséquence assumée : un mois
   * pendant lequel cet onglet n'est jamais ouvert ne laisse pas de point,
   * et la courbe relie alors les deux mois voisins.
   */
  const jalons = noteJalon((await repository.getJalons()) ?? [], acquis);
  await repository.saveJalons(jalons);

  return {
    acquis,
    enCours,
    motsEnJeu,
    percent,
    revisions,
    minutes: Math.round((revisions * SECONDES_PAR_CARTE) / 60),
    rows,
    jalons,
  };
}

/** « environ 16 h », « environ 40 minutes ». Toujours approximatif, et ça se dit. */
export function dureeLabel(minutes: number): string {
  if (minutes < 1) return 'moins d’une minute';
  if (minutes < 90) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  const h = Math.round(minutes / 60);
  return `${h} heures`;
}
