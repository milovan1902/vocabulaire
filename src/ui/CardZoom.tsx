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

/*
 * Les trois temps, en millisecondes.
 *
 * La croissance était à 300 : la carte ne grandissait pas, elle apparaissait
 * déjà grande. Un mouvement se lit à partir d'environ 400 ms ; en deçà, l'œil
 * enregistre le résultat sans voir le trajet. Elle est donc à 460, avec une
 * décélération plus longue — c'est la fin du mouvement qui donne l'impression
 * de douceur, pas son début.
 *
 * Le total fait 1,2 s. C'est une animation que vous verrez des dizaines de
 * fois par jour : si elle finit par lasser, c'est ici que ça se règle, et
 * nulle part ailleurs.
 */
const CROISSANCE = 460;
const RETOURNEMENT = 420;
const REDUCTION = 320;

/**
 * La courbe du retournement, et pourquoi elle est symétrique.
 *
 * Le basculement des deux faces se fait à la moitié du temps. Il faut donc
 * que la carte soit exactement de profil à cet instant — ce qui n'est vrai
 * que si la courbe est symétrique. L'ancienne, cubic-bezier(0.4, 0, 0.2, 1),
 * atteignait 90° vers 43 % du temps : pendant les 30 ms suivantes on voyait
 * encore le dos, en miroir. C'était le défaut constaté.
 */
const COURBE_RETOURNEMENT = 'ease-in-out';

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
        { duration: CROISSANCE, easing: 'cubic-bezier(0.16, 0.84, 0.32, 1)', fill: 'forwards' },
      ).finished;
      if (annule) return;

      /*
       * 2. Elle se retourne, à sa plus grande taille.
       *
       * `backface-visibility: hidden` devrait suffire à cacher le dos une
       * fois passé le profil. En pratique elle est appliquée par le
       * compositeur, qui n'est pas tenu de la réévaluer à la frame près :
       * sur mobile la face arrière survit quelques images de trop, et on la
       * voit en miroir avant le mot. On ne s'y fie donc plus — les deux
       * faces sont commutées explicitement, d'un coup, à la moitié du
       * temps. La propriété CSS reste en place comme seconde barrière.
       */
      const dos = carte.querySelector('.zdos');
      const recto = carte.querySelector('.zrecto');
      const bascule = (visibleAvant: boolean) => [
        { opacity: visibleAvant ? 1 : 0, offset: 0 },
        { opacity: visibleAvant ? 1 : 0, offset: 0.4999 },
        { opacity: visibleAvant ? 0 : 1, offset: 0.5 },
        { opacity: visibleAvant ? 0 : 1, offset: 1 },
      ];
      const enMemeTemps = { duration: RETOURNEMENT, fill: 'forwards' as const };

      await Promise.all([
        carte.animate(
          [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }],
          { duration: RETOURNEMENT, easing: COURBE_RETOURNEMENT, fill: 'forwards' },
        ).finished,
        dos?.animate(bascule(true), enMemeTemps).finished,
        recto?.animate(bascule(false), enMemeTemps).finished,
      ]);
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
