/**
 * Les deux briques d'un écran « table des matières » : la ligne, et le
 * tiroir qu'elle ouvre.
 *
 * CHANTIER 49 — le tiroir sort de l'écran pour être posé directement sur
 * le document. Il était jusqu'ici un enfant de `.screen`, et un enfant
 * en `position: fixed` n'est « fixe par rapport à l'écran » que si
 * AUCUN de ses parents ne porte de transformation. Le chantier 45 en a
 * mis une sur `.screen` pour les transitions : à partir de ce jour-là,
 * le voile du tiroir s'est mis à se caler sur la hauteur de la LISTE
 * défilante au lieu de celle de l'écran, et la barre d'onglets — elle,
 * restée à la racine — s'est mise à passer devant. D'où un tiroir coupé
 * net au bord de la barre.
 *
 * `createPortal` le rend là où il a toujours dû être : à la racine du
 * document, hors de tout écran. Le tiroir devient insensible à ce que
 * les écrans font de leurs transformations — aujourd'hui comme le jour
 * où une autre animation arrivera.
 *
 * CHANTIER 42 — ces deux briques vivaient dans `Account.tsx`, qui était
 * le seul écran construit ainsi. « Mes progrès » adopte la même forme :
 * les deux écrans lisent la même ligne et le même tiroir.
 */
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Une ligne de la table des matières.
 *
 * `icone` est un chemin de `public/` : les six lignes en ont une depuis
 * le chantier 40. Le carré en attente reste pour une ligne à venir.
 */
export function Ligne({
  icone, titre, sous, valeur, onClick,
}: {
  icone?: string;
  titre: string;
  sous: string;
  valeur: string;
  onClick: () => void;
}) {
  return (
    <button className="reglig" onClick={onClick}>
      {icone
        ? <img src={icone} alt="" width={40} height={40} />
        : <span className="reglig-attente" aria-hidden="true" />}
      <span>
        <b>{titre}</b>
        <small>{sous}</small>
      </span>
      <em>{valeur}</em>
      <i aria-hidden="true">›</i>
    </button>
  );
}

/**
 * Le tiroir. Il monte du bas et laisse voir l'écran derrière : le
 * réglage est une parenthèse, pas une destination. On en sort par le
 * fond, par la poignée, ou en choisissant.
 *
 * Son balisage n'a pas changé d'une balise : seule sa destination dans
 * le document est différente. Le CSS des chantiers 39 et 46 s'applique
 * donc tel quel, et les neuf tiroirs — six aux Réglages, trois à « Mes
 * progrès » — sont corrigés d'un coup.
 */
export function Tiroir({
  titre, onFermer, children,
}: {
  titre: string;
  onFermer: () => void;
  children: ReactNode;
}) {
  return createPortal(
    <div className="sheet-fond" onClick={onFermer}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="sheet-poignee" aria-label="Fermer" onClick={onFermer} />
        <h3>{titre}</h3>
        {children}
      </div>
    </div>,
    document.body,
  );
}
