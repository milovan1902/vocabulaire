/**
 * CHANTIER 405 — LES TROIS POINTS QUI S'ALLUMENT UN À UN.
 *
 * Pendant que l'IA travaille (trois scènes à inventer, une réplique à
 * écrire), un « … » fixe ne dit pas si l'appli réfléchit ou si elle est
 * figée. Trois points qui s'allument l'un après l'autre, en boucle, disent
 * « ça travaille ». Décoratif (aria-hidden) : le texte voisin porte le sens.
 * Sans animation si l'appareil la refuse (prefers-reduced-motion).
 */
import './points-attente.css';

export function PointsAttente() {
  return <span className="points-attente" aria-hidden="true"><i /><i /><i /></span>;
}
