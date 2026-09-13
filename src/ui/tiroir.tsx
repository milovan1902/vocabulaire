/**
 * Les deux briques d'un écran « table des matières » : la ligne, et le
 * tiroir qu'elle ouvre.
 *
 * CHANTIER 42 — elles vivaient dans `Account.tsx`, qui était le seul
 * écran construit ainsi. « Mes progrès » adopte la même forme : plutôt
 * que de recopier vingt lignes de JSX, les deux écrans lisent la même.
 * Une ligne mal alignée dans un seul des deux écrans devient
 * impossible.
 *
 * Rien n'a changé dans leur code : ce fichier est un déménagement.
 */
import type { ReactNode } from 'react';

/**
 * Une ligne de la table des matières.
 *
 * `icone` est un chemin de `public/` : les six lignes en ont une depuis
 * le chantier 40. Le carré en attente reste pour une ligne à venir.
 */
function Ligne({
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
 */
function Tiroir({
  titre, onFermer, children,
}: {
  titre: string;
  onFermer: () => void;
  children: ReactNode;
}) {
  return (
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
    </div>
  );
}
