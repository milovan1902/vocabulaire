/**
 * Les chiffres de « Mes progrès ».
 *
 * Tout se calcule ici, à partir de ce qui est déjà stocké : les paliers des
 * cartes et les passages (`reps`) enregistrés par FSRS. Aucune donnée
 * nouvelle n'est nécessaire — à deux exceptions près, les jalons mensuels
 * et les relevés quotidiens, qui ne peuvent pas se déduire (voir
 * `engine/jalons.ts` et `engine/paliers.ts`).
 *
 * Le fichier est séparé de l'écran pour la même raison que `deckSummary` :
 * un écran qui calcule ses propres chiffres finit par en calculer deux
 * versions différentes.
 *
 * CHANTIER 51 — DEUX PÉRIMÈTRES, DITS COMME TELS
 *
 * L'écran additionnait tous les paquets possédés et appelait le résultat
 * « mots en jeu ». Or « Aujourd'hui » emploie les mêmes mots pour une
 * autre chose : les cartes dues ce matin sur les seuls paquets en jeu. Deux
 * chiffres sans rapport, un seul nom — on ne pouvait que s'y perdre.
 *
 * Les deux totaux sont maintenant calculés et rendus séparément :
 *  - `charge` : les paquets EN JEU. C'est le vocabulaire que la charge de
 *    travail d'aujourd'hui fait tourner.
 *  - `tout` : tous les paquets possédés, pauses comprises.
 *
 * Aucun des deux n'est « le bon » : le tiroir « Mes mots » les montre l'un
 * sous l'autre, et la différence — les mots en pause — est dite en clair.
 */
import type { Deck, Progress, Settings } from '../domain/types';
import { repository } from '../data/repository';
import { deckMastery, type DeckMastery, type MasteryBreakdown } from '../engine/mastery';
import { noteJalon, type Jalon } from '../engine/jalons';
import { noteReleve, type Releve } from '../engine/paliers';
import { SECONDES_PAR_CARTE } from '../engine/tempo';

export interface DeckProgressRow {
  deck: Deck;
  /** Faux quand le paquet est en pause : il compte dans `tout`, pas dans `charge`. */
  enJeu: boolean;
  /** Mots au palier 100. */
  acquis: number;
  /** Mots comptés — thèmes en jeu seulement, comme partout ailleurs. */
  total: number;
  /** 0 à 100, non arrondi. */
  percent: number;
}

/**
 * Un total, et de quoi il est fait. La même forme pour les deux périmètres :
 * c'est ce qui permet au tiroir de les afficher avec le même bloc, donc de
 * les rendre comparables d'un coup d'œil.
 */
export interface Perimetre {
  /** Paquets retenus dans ce total. */
  paquets: number;
  /** Mots comptés : les cartes des thèmes retenus de ces paquets. */
  mots: number;
  acquis: number;
  /** Mots commencés mais pas finis : ni « à découvrir », ni acquis. */
  enCours: number;
  /** 0 à 100, non arrondi. */
  percent: number;
  /** Les cinq tas, sur les mêmes cartes que `mots`. */
  tas: MasteryBreakdown;
}

export interface ProgressStats {
  /** Tous les paquets possédés, ceux en pause compris. */
  tout: Perimetre;
  /** Les seuls paquets en jeu : le vocabulaire que la charge du jour fait tourner. */
  charge: Perimetre;
  /** Mots des paquets en pause. La différence entre les deux, dite d'un mot. */
  motsEnPause: number;
  paquetsEnPause: number;
  /** Cartes notées depuis le début, tous paquets confondus. */
  revisions: number;
  /** Minutes correspondantes — une estimation, jamais un chronomètre. */
  minutes: number;
  rows: DeckProgressRow[];
  jalons: Jalon[];
  /** L'historique quotidien des cinq paliers (chantier 62). */
  releves: Releve[];
}

const AUCUN: MasteryBreakdown = {
  decouvrir: 0, reprendre: 0, cours: 0, presque: 0, acquis: 0,
};

/** Un total en cours de constitution. `somme` porte les pourcentages pondérés. */
interface Cumul { paquets: number; mots: number; acquis: number; enCours: number; somme: number; tas: MasteryBreakdown }

function cumulVide(): Cumul {
  return { paquets: 0, mots: 0, acquis: 0, enCours: 0, somme: 0, tas: { ...AUCUN } };
}

function ajoute(c: Cumul, m: DeckMastery) {
  const b = m.breakdown;
  c.paquets += 1;
  c.mots += m.counted;
  c.acquis += b.acquis;
  c.enCours += b.reprendre + b.cours + b.presque;
  c.somme += m.percent * m.counted;
  c.tas.decouvrir += b.decouvrir;
  c.tas.reprendre += b.reprendre;
  c.tas.cours += b.cours;
  c.tas.presque += b.presque;
  c.tas.acquis += b.acquis;
}

/*
 * Le pourcentage d'ensemble est pondéré par le nombre de mots, jamais une
 * moyenne des pourcentages : sans quoi un paquet de dix mots pèserait
 * autant qu'un paquet de deux cents, et le total ne voudrait rien dire.
 */
function clos(c: Cumul): Perimetre {
  return {
    paquets: c.paquets,
    mots: c.mots,
    acquis: c.acquis,
    enCours: c.enCours,
    percent: c.mots ? c.somme / c.mots : 0,
    tas: c.tas,
  };
}

export async function loadProgressStats(
  decks: Deck[],
  /** Identifiants des paquets en jeu — ceux que « Aujourd'hui » fait travailler. */
  active: string[],
  _settings: Settings,
): Promise<ProgressStats> {
  const rows: DeckProgressRow[] = [];
  const tout = cumulVide();
  const charge = cumulVide();
  let revisions = 0;

  for (const deck of decks) {
    const [cards, progress, savedThemes] = await Promise.all([
      repository.getCards(deck.id),
      repository.getProgress(deck.id),
      repository.getThemes(deck.id),
    ]);

    const m = deckMastery(cards, progress as Record<string, Progress>, savedThemes);
    if (m.counted === 0) continue;

    const enJeu = active.includes(deck.id);

    rows.push({
      deck,
      enJeu,
      acquis: m.breakdown.acquis,
      total: m.counted,
      percent: m.percent,
    });

    ajoute(tout, m);
    if (enJeu) ajoute(charge, m);

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

  const perimetreTout = clos(tout);

  /*
   * Les deux relevés sont écrits à la lecture de l'écran.
   *
   * C'est le seul moment où les chiffres sont certainement justes et où
   * l'on est certain que l'application tourne. Conséquence assumée : un
   * jour pendant lequel cet onglet n'est jamais ouvert ne laisse pas de
   * point, et la courbe relie alors les deux mesures voisines.
   *
   * LES DEUX SUIVENT LE PÉRIMÈTRE COMPLET, et c'est voulu : mettre un
   * paquet en pause ne doit pas faire plonger une courbe historique. Un mot
   * acquis reste acquis. C'est la seule règle qui rende la courbe lisible
   * dans le temps — indexée sur la charge du moment, elle mesurerait les
   * changements d'avis plutôt que le travail.
   *
   * CHANTIER 62 — le relevé quotidien des cinq paliers vient s'ajouter au
   * jalon mensuel, sans le remplacer. Le jalon porte le passé déjà noté,
   * que les relevés ne peuvent pas inventer : ils commencent aujourd'hui.
   */
  const [jalonsVus, relevesVus] = await Promise.all([
    repository.getJalons(),
    repository.getReleves(),
  ]);

  const jalons = noteJalon(jalonsVus ?? [], perimetreTout.acquis);
  const releves = noteReleve(relevesVus ?? [], perimetreTout.tas);

  await Promise.all([
    repository.saveJalons(jalons),
    repository.saveReleves(releves),
  ]);

  return {
    tout: perimetreTout,
    charge: clos(charge),
    motsEnPause: perimetreTout.mots - charge.mots,
    paquetsEnPause: perimetreTout.paquets - charge.paquets,
    revisions,
    minutes: Math.round((revisions * SECONDES_PAR_CARTE) / 60),
    rows,
    jalons,
    releves,
  };
}

/** « environ 16 h », « environ 40 minutes ». Toujours approximatif, et ça se dit. */
export function dureeLabel(minutes: number): string {
  if (minutes < 1) return 'moins d’une minute';
  if (minutes < 90) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  const h = Math.round(minutes / 60);
  return `${h} heures`;
}
