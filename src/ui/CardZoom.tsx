/**
 * Carte flottante jouée à l'ouverture d'un paquet.
 *
 * Le problème qu'elle résout : la vignette de la bibliothèque disparaît
 * avec sa page au moment du changement d'écran. Une seule carte, posée
 * au-dessus de tout en position fixe, peut au contraire suivre le trajet
 * entier — grandir depuis la vignette, se retourner, puis se réduire
 * jusqu'à la carte recto de l'écran du paquet.
 *
 * Tout se joue en transformations (translation, échelle, rotation), jamais
 * en largeur ni en hauteur : c'est ce qui permet au navigateur de confier
 * l'animation au processeur graphique et de rester fluide sur téléphone.
 */
import { useEffect, useRef } from 'react';
import { DeckFace, paletteFor } from './components';

/** Ratio A6 de la carte, identique au reste de l'application. */
const RATIO = 620 / 874;

export type ZoomSource = {
  deckId: string;
  name: string;
  total: number;
  /** Cartes à voir aujourd'hui, reprises de la vignette cliquée. */
  due: number;
  /** Visuel de dos, ou null si le paquet utilise le dos dessiné. */
  image: string | null;
  /** Position de la vignette cliquée, au moment du clic. */
  from: DOMRect;
};

const CROISSANCE = 300;
const RETOURNEMENT = 380;
const REDUCTION = 300;

export function CardZoom({ source, onDone }: { source: ZoomSource; onDone: () => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const boite = holder.current;
    const carte = inner.current;
    if (!boite || !carte) return onDone();

    /** Transformation amenant la carte pleine taille sur un rectangle donné. */
    const versRect = (r: DOMRect) => {
      const base = boite.getBoundingClientRect();
      const echelle = r.width / base.width;
      const dx = r.left + r.width / 2 - (base.left + base.width / 2);
      const dy = r.top + r.height / 2 - (base.top + base.height / 2);
      return `translate(${dx}px, ${dy}px) scale(${echelle})`;
    };

    const depart = versRect(source.from);
    boite.style.transform = depart;

    let annule = false;
    const jouer = async () => {
      // 1. La vignette grandit jusqu'à occuper l'écran.
      await boite.animate(
        [{ transform: depart }, { transform: 'translate(0px, 0px) scale(1)' }],
        { duration: CROISSANCE, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' },
      ).finished;
      if (annule) return;

      // 2. Elle se retourne, à sa plus grande taille.
      await carte.animate(
        [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }],
        { duration: RETOURNEMENT, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
      ).finished;
      if (annule) return;

      /*
       * 3. Elle se réduit jusqu'à la carte recto de l'écran du paquet, qui
       *    est déjà en place sous la carte flottante mais masquée. On mesure
       *    sa position réelle plutôt que de la calculer : la mise en page
       *    dépend de la largeur d'écran et du contenu.
       */
      const cible = document.querySelector('.deckface .face');
      if (cible) {
        await boite.animate(
          [{ transform: 'translate(0px, 0px) scale(1)' }, { transform: versRect(cible.getBoundingClientRect()) }],
          { duration: REDUCTION, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
        ).finished;
      }
      if (!annule) onDone();
    };

    void jouer().catch(() => onDone());
    return () => { annule = true; };
  }, [source, onDone]);

  // Taille pleine : la carte occupe l'écran sans jamais en déborder.
  const hauteur = Math.min(window.innerHeight * 0.72, (window.innerWidth * 0.86) / RATIO);
  const largeur = hauteur * RATIO;
  const palette = paletteFor(source.deckId);

  return (
    <div className="zoomlayer" aria-hidden="true">
      <div
        ref={holder}
        className="zoomholder"
        style={{ width: largeur, height: hauteur }}
      >
        <div ref={inner} className="zoomcard">
          <div className="zface zdos">
            <DeckFace id={source.deckId} name={source.name} image={source.image} />
          </div>
          <div className="zface zrecto" style={{ ['--accent' as string]: palette.ink }}>
            <span className="corner">{source.total}</span>
            <b>{source.name}</b>
            <span className="zsub">
              {source.due > 0
                ? `${source.due} à voir aujourd’hui`
                : 'rien à réviser aujourd’hui'}
            </span>
            <span className="suit" />
          </div>
        </div>
      </div>
    </div>
  );
}
