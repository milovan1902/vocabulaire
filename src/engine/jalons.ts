/**
 * Les jalons : un relevé par mois du nombre de mots acquis.
 *
 * POURQUOI UNE DONNÉE NOUVELLE. Le palier d'une carte dit où elle en est,
 * jamais quand elle y est arrivée. Aucune addition sur les données
 * existantes ne peut donc reconstituer la courbe du passé : il faut avoir
 * noté. C'est la seule chose de « Mes progrès » qui ne se calcule pas.
 *
 * CE QU'ON ÉCRIT, ET RIEN DE PLUS. Un couple mois → nombre, douze lignes
 * par an, quelques octets. Pas un historique par carte : on ne saurait
 * qu'en faire, et une donnée qu'on ne sait pas lire est une dette.
 *
 * LA RÈGLE DU PASSÉ. Le mois courant est réécrit à chaque relevé — il n'est
 * pas fini, son chiffre est provisoire. Les mois clos ne sont jamais
 * retouchés : une courbe dont le passé bouge n'est plus une mémoire.
 */

export interface Jalon {
  /** AAAA-MM. */
  month: string;
  /** Mots au palier 100, tous paquets possédés confondus, ce mois-là. */
  acquis: number;
}

/** Le mois d'une date, au format AAAA-MM. */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Libellé court d'un mois, pour l'axe de la courbe. */
const MOIS_COURTS = ['jan', 'fév', 'mars', 'avr', 'mai', 'juin',
  'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

export function monthLabel(key: string): string {
  const [, m] = key.split('-').map(Number);
  return MOIS_COURTS[(m - 1) % 12] ?? key;
}

/**
 * Note le relevé du mois courant.
 *
 * Renvoie la liste triée. Le mois courant est remplacé s'il existe déjà :
 * c'est un instantané du mois en cours, pas un cumul d'événements.
 */
export function noteJalon(
  jalons: Jalon[],
  acquis: number,
  month: string = monthKey(),
): Jalon[] {
  const autres = jalons.filter((j) => j.month !== month);
  return [...autres, { month, acquis }].sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * La courbe telle qu'elle s'affiche.
 *
 * Les trous sont laissés tels quels : un mois sans relevé est un mois où
 * l'application n'a pas été ouverte, et inventer un point entre deux
 * mesures serait inventer du travail. Le tracé relie simplement les points
 * connus, et l'axe porte leurs vrais mois.
 */
export function courbe(jalons: Jalon[], max = 12): Jalon[] {
  return jalons.slice(-max);
}
