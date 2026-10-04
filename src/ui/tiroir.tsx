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
import { useEffect } from 'react';
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
 * CHANTIER 186 — LE TIROIR DEVIENT UNE PAGE.
 *
 * Il montait du bas par-dessus l'écran. Il prend maintenant la place de
 * la liste, comme « Mes mots » et « Mon calendrier » (chantiers 63-64) :
 * un chevron de retour, le titre, le contenu. Même nom, mêmes props :
 * les écrans qui l'appellent n'ont qu'à masquer leur liste pendant qu'il
 * est ouvert. Les règles `.sheet …` qui calaient les contrôles à
 * l'intérieur sont reprises par `.page-tiroir` (apparence.css).
 */
export function Tiroir({
  titre, onFermer, retour = 'Retour', children,
}: {
  titre: string;
  onFermer: () => void;
  /** Le libellé du chevron : l'écran auquel on revient. */
  retour?: string;
  children: ReactNode;
}) {
  /* On arrive en haut de la page, pas à la hauteur où l'on était dans la liste. */
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <section className="sousecran page-tiroir" aria-label={titre}>
      <button className="sousecran-retour" onClick={onFermer}>
        <span aria-hidden="true">‹</span>
        {retour}
      </button>
      <h2 className="screen-title">{titre}</h2>
      {children}
    </section>
  );
}
