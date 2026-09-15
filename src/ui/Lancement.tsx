import { useEffect, useRef, useState } from 'react';
import profilGauche from '../assets/profil-gauche.png';
import profilDroit from '../assets/profil-droit.png';

/*
 * L'ouverture de l'application.
 *
 * L'animation est commandée depuis React, par étapes, et non par un
 * @keyframes : c'est le composant qui décide quand chaque chose entre, donc
 * l'état de départ est celui du premier rendu — pas celui qu'une règle CSS
 * manquante ou neutralisée laisserait apparaître.
 *
 * Un seul passage par lancement : le drapeau vit au niveau du module, donc
 * un remontage de React ne rejoue pas l'ouverture.
 */
let dejaJoue = false;

/** Les étapes, en millisecondes depuis le premier rendu. */
const PROFILS = 60;
const TRAIT = 1150;
const NOM = 2000;
const FIN = 4000;
/** L'estompage qui découvre l'application. Égal à la transition du CSS. */
const SORTIE = 450;
/** Mouvement réduit : l'état final, tenu sept dixièmes de seconde. */
const FIN_SOBRE = 700;

type Etape = 0 | 1 | 2 | 3;

export default function Lancement() {
  const [vivant, setVivant] = useState(!dejaJoue);
  const [etape, setEtape] = useState<Etape>(0);
  const [sort, setSort] = useState(false);
  const minuteries = useRef<number[]>([]);

  const arreter = () => {
    minuteries.current.forEach((m) => clearTimeout(m));
    minuteries.current = [];
  };

  useEffect(() => {
    if (dejaJoue) return;
    dejaJoue = true;
    const sobre = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = (ms: number, f: () => void) => window.setTimeout(f, ms);
    minuteries.current = sobre
      ? [t(0, () => setEtape(3)), t(FIN_SOBRE, () => setSort(true)), t(FIN_SOBRE + SORTIE, () => setVivant(false))]
      : [
          t(PROFILS, () => setEtape(1)),
          t(TRAIT, () => setEtape(2)),
          t(NOM, () => setEtape(3)),
          t(FIN, () => setSort(true)),
          t(FIN + SORTIE, () => setVivant(false)),
        ];
    return arreter;
  }, []);

  if (!vivant) return null;

  /** Un appui passe l'ouverture : personne ne doit attendre son application. */
  const passer = () => {
    arreter();
    setSort(true);
    minuteries.current = [window.setTimeout(() => setVivant(false), SORTIE)];
  };

  return (
    <div
      className={`lancement e${etape}${sort ? ' sort' : ''}`}
      onClick={passer}
      role="presentation"
      aria-hidden="true"
    >
      <div className="lancement-scene">
        <div className="lancement-profils">
          <img className="lancement-g" src={profilGauche} alt="" />
          <img className="lancement-d" src={profilDroit} alt="" />
        </div>
        <div className="lancement-trait" />
        <p className="lancement-nom">Neuro Anglais</p>
      </div>
    </div>
  );
}
