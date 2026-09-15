import { useEffect, useRef, useState } from 'react';
import profilGauche from '../assets/profil-gauche.png';
import profilDroit from '../assets/profil-droit.png';

/*
 * L'ouverture de l'application : les deux profils du logo entrent par les
 * bords, le trait d'or se tire entre eux, le nom entre en dernier.
 *
 * Un seul passage par lancement. Le drapeau vit au niveau du module, pas
 * dans l'état : si React remonte l'arbre (le double montage de StrictMode
 * en développement, une reprise après une erreur), l'ouverture ne rejoue
 * pas. Un logo qu'on revoit dix fois par jour devient une porte à pousser.
 */
let dejaJoue = false;

/** Durée de l'animation. Doit rester égale aux 4s du CSS. */
const DUREE = 4000;
/** L'estompage qui découvre l'application. Égal à la transition du CSS. */
const SORTIE = 450;
/** Mouvement réduit : on montre l'état final, sans le glissement. */
const DUREE_SOBRE = 700;

export default function Lancement() {
  const [etat, setEtat] = useState<'joue' | 'sort' | 'fini'>(() =>
    dejaJoue ? 'fini' : 'joue',
  );
  const minuteries = useRef<number[]>([]);

  useEffect(() => {
    if (etat !== 'joue') return;
    dejaJoue = true;
    const sobre = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const attente = sobre ? DUREE_SOBRE : DUREE;
    minuteries.current = [
      window.setTimeout(() => setEtat('sort'), attente),
      window.setTimeout(() => setEtat('fini'), attente + SORTIE),
    ];
    return () => {
      minuteries.current.forEach((m) => clearTimeout(m));
      minuteries.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (etat === 'fini') return null;

  /** Un appui passe l'ouverture : personne ne doit attendre son application. */
  const passer = () => {
    minuteries.current.forEach((m) => clearTimeout(m));
    minuteries.current = [];
    setEtat('sort');
    minuteries.current = [window.setTimeout(() => setEtat('fini'), SORTIE)];
  };

  return (
    <div
      className={`lancement${etat === 'sort' ? ' sort' : ''}`}
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
