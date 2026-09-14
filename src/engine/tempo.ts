/**
 * Combien de temps ça prend.
 *
 * CHANTIER 50 — quatre endroits de l'application annonçaient une durée,
 * et trois étaient d'accord. `deckSummary` et `progressStats` comptaient
 * vingt secondes par carte ; « Aujourd'hui » divisait par trois, ce qui
 * est la même chose écrite autrement ; et le tiroir « Charge de travail »
 * comptait sept secondes, parce que je l'ai écrit au chantier 41 sans
 * aller voir ce que les autres faisaient déjà.
 *
 * Le remède n'est pas de corriger le sept : c'est de faire en sorte qu'il
 * n'y ait plus qu'un seul endroit où le changer. Une estimation de durée
 * qui existe en deux exemplaires finit toujours par exister en deux
 * valeurs.
 */

/**
 * Vingt secondes par carte : mesuré large, une session courte est plus
 * rapide. Ce chiffre est le seul de l'application — le modifier ici
 * déplace toutes les durées affichées, et elles resteront d'accord.
 *
 * Si votre fille met visiblement plus ou moins, c'est cette ligne, et
 * elle seule, qu'il faut changer.
 */
export const SECONDES_PAR_CARTE = 20;

/**
 * Les minutes d'un nombre de cartes. Jamais zéro : une séance existe,
 * même courte, et « 0 minute » se lirait comme « rien à faire ».
 */
export function minutesPour(cartes: number): number {
  return Math.max(1, Math.round((cartes * SECONDES_PAR_CARTE) / 60));
}
