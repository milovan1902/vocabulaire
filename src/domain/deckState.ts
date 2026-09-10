/**
 * Le journal des décisions d'appartenance.
 *
 * ── Le bug qu'il corrige ───────────────────────────────────────────────
 *
 * `syncSettings` fusionnait les deux listes de paquets par UNION :
 *
 *     const installed = [...new Set([...localInstalled, ...remoteInstalled])];
 *     const active    = [...new Set([...localActive,    ...remoteActive])];
 *
 * Une union ne peut pas exprimer un retrait. « Je ne possède plus ce
 * paquet » et « je n'ai jamais eu ce paquet » y produisent le même
 * ensemble vide, donc la synchronisation suivante rapatrie ce que le
 * serveur avait gardé : des paquets se rajoutent, une mise en pause ne
 * tient pas, et une liste « en jeu » soigneusement choisie revient
 * peuplée d'autre chose.
 *
 * L'intention d'origine était bonne — « personne ne désobtient un paquet
 * par erreur » — mais elle rendait toute décision négative impossible.
 *
 * ── Ce qui le remplace ─────────────────────────────────────────────────
 *
 * Non plus deux ensembles, mais un journal : pour chaque paquet, la
 * DERNIÈRE décision prise et QUAND. La fusion arbitre paquet par paquet
 * sur l'horodatage, exactement comme `overrides` le fait déjà pour les
 * réglages — le mécanisme existait dans la maison, il n'était simplement
 * pas appliqué à l'appartenance.
 *
 * Un retrait devient alors une information à part entière, aussi
 * transportable qu'un ajout, et le dernier geste de la personne gagne,
 * quel que soit l'appareil.
 *
 * Les deux listes restent la forme sous laquelle le reste de
 * l'application lit l'état : elles sont désormais DÉRIVÉES du journal
 * (`listes`), jamais la source de vérité.
 */
import type { DeckId } from './types';

export type DeckDecision = {
  /** Le paquet appartient à la personne. */
  owned: boolean;
  /** Le paquet est en jeu. Sans effet si `owned` est faux. */
  active: boolean;
  /**
   * Quand la décision a été prise, en millisecondes.
   *
   * `0` a un sens précis : « état hérité, jamais daté ». C'est ce que
   * produit la migration depuis les deux anciennes listes, et c'est ce qui
   * permet à la première synchronisation de ne rien casser (voir
   * `fusionnerDecision`).
   */
  at: number;
};

export type DeckJournal = Record<DeckId, DeckDecision>;

/**
 * Le journal d'un appareil qui n'en avait pas encore.
 *
 * Daté à `0` : cet état n'est pas une décision observée, c'est une
 * photographie de ce qui existait. Il doit donc perdre contre n'importe
 * quelle décision réelle venue d'ailleurs, et ne jamais faire disparaître
 * quoi que ce soit chez quelqu'un qui n'a rien demandé.
 */
export function journalDepuisListes(installed: DeckId[], active: DeckId[]): DeckJournal {
  const out: DeckJournal = {};
  for (const id of installed) {
    out[id] = { owned: true, active: active.includes(id), at: 0 };
  }
  // Un paquet en jeu sans être possédé n'existe pas ; s'il traîne dans les
  // données, on le note tel quel plutôt que de le perdre en silence.
  for (const id of active) {
    if (!out[id]) out[id] = { owned: true, active: true, at: 0 };
  }
  return out;
}

/** Les deux listes que lit le reste de l'application. */
export function listes(journal: DeckJournal): { installed: DeckId[]; active: DeckId[] } {
  const installed: DeckId[] = [];
  const active: DeckId[] = [];
  for (const [id, d] of Object.entries(journal)) {
    if (!d.owned) continue;
    installed.push(id);
    if (d.active) active.push(id);
  }
  return { installed, active };
}

/**
 * Inscrit une décision, horodatée à maintenant.
 *
 * C'est le seul point d'entrée en écriture : une décision non datée ne
 * gagnerait aucun arbitrage, et c'est précisément le défaut qu'on répare.
 */
export function noter(
  journal: DeckJournal,
  id: DeckId,
  changement: Partial<Pick<DeckDecision, 'owned' | 'active'>>,
  maintenant: number = Date.now(),
): DeckJournal {
  const avant = journal[id] ?? { owned: false, active: false, at: 0 };
  const apres: DeckDecision = { ...avant, ...changement, at: maintenant };
  // Un paquet retiré de la collection ne peut pas rester en jeu.
  if (!apres.owned) apres.active = false;
  return { ...journal, [id]: apres };
}

/**
 * Arbitrage d'un seul paquet.
 *
 * Le plus récent gagne, et le local gagne à égalité — l'utilisateur voit
 * ainsi ce qu'il vient de faire, comme pour `mergeSettings`.
 *
 * Le cas des deux dates à `0` est le filet de la migration : deux
 * appareils qui n'ont encore jamais rien daté retrouvent l'ancien
 * comportement, l'union, et personne ne perd un paquet en installant cette
 * version. Dès qu'un vrai geste est posé quelque part, il tranche.
 */
export function fusionnerDecision(
  local: DeckDecision | undefined,
  remote: DeckDecision | undefined,
): DeckDecision | undefined {
  if (!local) return remote;
  if (!remote) return local;
  if (local.at === 0 && remote.at === 0) {
    return {
      owned: local.owned || remote.owned,
      active: local.active || remote.active,
      at: 0,
    };
  }
  return local.at >= remote.at ? local : remote;
}

/** Arbitrage du journal entier, paquet par paquet. */
export function fusionner(local: DeckJournal, remote: DeckJournal): DeckJournal {
  const out: DeckJournal = {};
  for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const d = fusionnerDecision(local[id], remote[id]);
    if (d) out[id] = d;
  }
  return out;
}
