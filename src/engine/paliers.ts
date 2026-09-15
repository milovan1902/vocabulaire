/**
 * Les relevés de paliers : un instantané par jour des cinq tas.
 *
 * POURQUOI UNE DONNÉE NOUVELLE, ENCORE. Même raison que `jalons.ts`, et
 * elle vaut d'être redite : le palier d'une carte dit où elle en est,
 * jamais quand elle y est arrivée. Aucune addition sur les données
 * existantes ne peut reconstituer la courbe du passé — il faut avoir noté.
 * Conséquence à assumer, et annoncée avant le codage : cette courbe
 * commence le jour de la livraison. Elle ne montrera rien du travail des
 * mois précédents.
 *
 * POURQUOI PAS LES JALONS. Les jalons existants ne portent qu'un nombre,
 * les mots acquis, et un point par mois. Ici il en faut cinq, et par jour :
 * c'est un autre grain et un autre contenu. Les deux séries cohabitent —
 * les jalons gardent le passé déjà noté, que ce fichier ne peut pas
 * inventer.
 *
 * CE QU'ON ÉCRIT. Six nombres par jour : la date et les cinq tas. Deux
 * kilo-octets par an. Pas d'historique par carte : on ne saurait qu'en
 * faire, et une donnée qu'on ne sait pas lire est une dette.
 *
 * LA RÈGLE DU PASSÉ. Le jour courant est réécrit à chaque lecture de
 * l'écran — il n'est pas fini, son chiffre est provisoire. Les jours clos
 * ne sont jamais retouchés : une courbe dont le passé bouge n'est plus une
 * mémoire.
 */
import { todayKey } from './session';
import { monthLabel } from './jalons';
import type { MasteryBreakdown } from './mastery';

/** Un jour, et les cinq tas ce jour-là. */
export interface Releve extends MasteryBreakdown {
  /** AAAA-MM-JJ, comme les jours de la série. */
  jour: string;
}

export type Grain = 'jour' | 'semaine' | 'mois';

export const GRAINS: ReadonlyArray<{ cle: Grain; libelle: string }> = [
  { cle: 'jour', libelle: 'Jour' },
  { cle: 'semaine', libelle: 'Semaine' },
  { cle: 'mois', libelle: 'Mois' },
];

/**
 * Deux ans de relevés conservés, pas plus.
 *
 * Un plafond franc vaut mieux qu'une croissance sans fin qu'on découvre
 * cinq ans plus tard : à ce terme, les points les plus anciens ne sont
 * plus lus par aucune des trois vues — la plus large en montre douze mois.
 */
const MAX_JOURS = 730;

/** Combien de points chaque vue affiche. Au-delà, le tracé n'est plus lisible. */
const COMBIEN: Record<Grain, number> = { jour: 30, semaine: 12, mois: 12 };

/**
 * Note le relevé du jour.
 *
 * Renvoie la liste triée, le jour courant remplacé s'il existait déjà.
 * C'est un instantané, pas un cumul d'événements : deux passages dans
 * l'écran le même jour ne doivent pas faire deux points.
 */
export function noteReleve(
  releves: Releve[],
  tas: MasteryBreakdown,
  jour: string = todayKey(),
): Releve[] {
  const autres = releves.filter((r) => r.jour !== jour);
  return [...autres, { jour, ...tas }]
    .sort((a, b) => a.jour.localeCompare(b.jour))
    .slice(-MAX_JOURS);
}

/**
 * La semaine ISO d'un jour, au format AAAA-Sxx.
 *
 * Norme ISO : la semaine appartient à l'année de son jeudi, et non à celle
 * de son lundi. Sans cette règle, une semaine à cheval sur le nouvel an
 * apparaîtrait deux fois dans la vue « semaine » — deux points pour une
 * semaine, et une fausse chute entre les deux.
 */
function semaineKey(jour: string): string {
  const d = new Date(`${jour}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const jeudi1 = new Date(d.getFullYear(), 0, 4);
  jeudi1.setDate(jeudi1.getDate() - ((jeudi1.getDay() + 6) % 7) + 3);
  const n = 1 + Math.round((d.getTime() - jeudi1.getTime()) / (7 * 86_400_000));
  return `${d.getFullYear()}-S${String(n).padStart(2, '0')}`;
}

function periode(grain: Grain, jour: string): string {
  if (grain === 'mois') return jour.slice(0, 7);
  if (grain === 'semaine') return semaineKey(jour);
  return jour;
}

/**
 * La série telle qu'elle s'affiche, au grain demandé.
 *
 * ON PREND LE DERNIER RELEVÉ DE CHAQUE PÉRIODE, JAMAIS LA MOYENNE. Un
 * palier est un état, pas un débit : la moyenne de 380 et 390 mots acquis
 * ne veut rien dire, et une moyenne sur une semaine à trois relevés
 * inventerait des demi-mots. Le dernier relevé, lui, est un fait — l'état
 * où la semaine s'est achevée.
 *
 * Les trous sont laissés tels quels : une semaine sans relevé est une
 * semaine où l'application n'a pas été ouverte, et interpoler entre deux
 * mesures serait inventer du travail. Le tracé relie les points connus.
 */
export function serie(releves: Releve[], grain: Grain): Releve[] {
  if (grain === 'jour') return releves.slice(-COMBIEN.jour);
  const parPeriode = new Map<string, Releve>();
  // `releves` est trié : la dernière écriture d'une clé est bien le dernier
  // relevé de la période, et `Map` garde la position de la première.
  for (const r of releves) parPeriode.set(periode(grain, r.jour), r);
  return [...parPeriode.values()].slice(-COMBIEN[grain]);
}

/** Le libellé d'un point sous l'axe. Court : il y en a jusqu'à quatre. */
export function labelDe(jour: string, grain: Grain): string {
  const [annee, mois, j] = jour.split('-');
  if (grain === 'mois') return monthLabel(`${annee}-${mois}`);
  return `${j}/${mois}`;
}
