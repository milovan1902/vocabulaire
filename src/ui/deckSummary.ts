/**
 * Charge de travail.
 *
 * Deux notions distinctes, et c'est tout l'objet de ce fichier :
 *  - ce qu'il y a à faire *aujourd'hui* (`due`), qui varie d'un jour à l'autre ;
 *  - ce à quoi l'on s'engage *chaque jour* (`steadyLoad`), qui découle des
 *    paquets mis en jeu et ne bouge que si l'on en ajoute ou en retire.
 *
 * La seconde est celle que « Mon travail » doit montrer : mettre un paquet
 * en jeu n'est pas gratuit, ça se paie tous les matins. Autant l'annoncer
 * avant l'engagement.
 *
 * CHANTIER 51 — LA CHARGE NE COMPTAIT PAS LES BONNES CARTES
 *
 * La boucle ci-dessous parcourait `cards` : TOUTES les cartes du paquet,
 * thèmes écartés compris. Or la révision, elle, ne présente que les thèmes
 * retenus (`App.tsx`, `selectedThemes`), et « Mes progrès » ne compte que
 * ceux-là aussi. Sur un paquet où l'on ne garde que trois thèmes sur dix,
 * « Aujourd'hui » annonçait donc des cartes que la session ne montrerait
 * jamais — un chiffre qu'aucun travail ne pouvait faire descendre.
 *
 * La boucle porte maintenant sur les cartes EN JEU, comme partout ailleurs.
 * Les sept barres de la semaine, les mots qui dorment et le régime établi
 * suivent le même périmètre : ils étaient faux du même défaut.
 */
import type { Deck, Progress, Settings } from '../domain/types';
import { repository } from '../data/repository';
import { imageFor } from './deckImages';
import { isDue, isNew } from '../engine/scheduler';
import { deckMastery, type DeckMastery } from '../engine/mastery';
import { minutesPour } from '../engine/tempo';

export interface DeckSummary {
  deck: Deck;
  /** Cartes du paquet entier, thèmes écartés compris. */
  total: number;
  /**
   * Cartes des thèmes retenus. C'est le nombre de mots sur lesquels on
   * travaille réellement — celui que « Mes progrès » compte aussi.
   */
  enJeu: number;
  /** Cartes à voir aujourd'hui, quotas compris, sur les thèmes retenus. */
  due: number;
  /** Mots appris dont la date n'est pas encore arrivée. */
  resting: number;
  /** Thèmes retenus sur le nombre total, pour l'afficher sans tout recharger. */
  themesSelected: number;
  themesTotal: number;
  image: string | null;
  /** Avancement affiché, calculé sur les seuls thèmes retenus. */
  mastery: DeckMastery;
}

export interface Charge {
  summaries: DeckSummary[];
  /**
   * Cartes attendues par jour, index 0 = aujourd'hui, 6 = dans six jours.
   * Calculé depuis les dates de révision déjà enregistrées : aucune donnée
   * nouvelle, aucune migration.
   */
  dueByDay: number[];
  resting: number;
  /**
   * Cartes par jour en régime établi.
   *
   * Une carte dont l'intervalle est de quatre jours revient un jour sur
   * quatre : elle pèse donc 0,25 carte par jour. En sommant ces fractions on
   * obtient la charge réelle des révisions, sans avoir à simuler l'avenir.
   * On y ajoute les nouveaux mots du jour, qui eux sont un choix.
   */
  steadyLoad: number;
  /** Minutes correspondantes, à vingt secondes la carte. */
  steadyMinutes: number;
}

const JOUR = 86_400_000;

export async function loadSummaries(decks: Deck[], settings: Settings): Promise<Charge> {
  const now = Date.now();
  const cap = settings.newPerDay + settings.reviewsPerDay;

  // Fin de la journée courante : tout ce qui tombe avant est « aujourd'hui ».
  const finDuJour = new Date();
  finDuJour.setHours(24, 0, 0, 0);

  const summaries: DeckSummary[] = [];
  const dueByDay = [0, 0, 0, 0, 0, 0, 0];
  let resting = 0;
  let revisionsParJour = 0;

  for (const deck of decks) {
    const [cards, progress, savedThemes, image] = await Promise.all([
      repository.getCards(deck.id),
      repository.getProgress(deck.id),
      repository.getThemes(deck.id),
      repository.getImage(deck.id),
    ]);

    const themes = [...new Set(cards.map((c) => c.theme))];
    const retenus = savedThemes?.length
      ? savedThemes.filter((t) => themes.includes(t))
      : themes;

    /*
     * Le périmètre du travail. Quand aucun thème n'est enregistré, tout
     * compte — c'est le cas par défaut, et il ne change rien pour les
     * paquets dont on n'a jamais touché les thèmes.
     */
    const filtre = savedThemes?.length ? new Set(retenus) : null;
    const jouees = filtre ? cards.filter((c) => filtre.has(c.theme)) : cards;

    let due = 0;
    let dorment = 0;
    for (const c of jouees) {
      const p: Progress | undefined = progress[c.id];
      if (!p || isNew(p) || isDue(p, now)) {
        due++;
        dueByDay[0]++;
      } else {
        dorment++;
        const dans = Math.ceil((p.due - finDuJour.getTime()) / JOUR);
        if (dans >= 1 && dans <= 6) dueByDay[dans]++;
        // Poids quotidien de cette carte : une révision tous les N jours.
        if (p.scheduledDays > 0) revisionsParJour += 1 / p.scheduledDays;
      }
    }
    resting += dorment;

    /*
     * L'avancement se calcule sur les thèmes RETENUS, pas sur le paquet
     * entier : sans quoi écarter des thèmes plafonnerait le pourcentage
     * sous cent pour toujours.
     */
    const avancement = deckMastery(
      cards,
      progress,
      savedThemes?.length ? retenus : null,
    );

    summaries.push({
      deck,
      total: cards.length,
      enJeu: jouees.length,
      // Un visuel fourni prend le relais quand la personne n'en a choisi aucun.
      image: imageFor(deck.id, image),
      due: Math.min(due, cap),
      resting: dorment,
      themesSelected: retenus.length ? retenus.length : themes.length,
      themesTotal: themes.length,
      mastery: avancement,
    });
  }

  /*
   * Les nouveaux mots ne comptent que s'il reste de la matière à découvrir.
   * `enJeu` et non `total` : sinon un paquet dont tous les thèmes retenus
   * sont terminés continuait d'ajouter les nouveaux mots du jour au régime
   * établi, à cause des thèmes écartés qu'on ne verra pas.
   */
  const resteADecouvrir = summaries.some((s) => s.enJeu > s.resting);
  const steadyLoad = Math.round(
    revisionsParJour + (resteADecouvrir ? settings.newPerDay : 0),
  );

  return {
    summaries,
    dueByDay,
    resting,
    steadyLoad,
    steadyMinutes: minutesPour(steadyLoad),
  };
}
