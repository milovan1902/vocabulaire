import { useEffect, useRef, useState } from 'react';
import profilGauche from '../assets/profil-gauche.png';
import profilDroit from '../assets/profil-droit.png';

/*
 * L'ouverture de l'application.
 *
 * Tout ce qui bouge est écrit dans le style en ligne des éléments, et non
 * dans une classe : un style en ligne est présent dans la toute première
 * image peinte, avant même que la feuille de styles soit lue. C'est la
 * seule façon d'être certain que les deux profils ne se montrent jamais à
 * leur place d'arrivée avant d'avoir glissé.
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
/** L'estompage qui découvre l'application. */
const SORTIE = 450;
/** Mouvement réduit : l'état final, tenu sept dixièmes de seconde. */
const FIN_SOBRE = 700;

const COURBE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

export default function Lancement() {
  const [vivant, setVivant] = useState(!dejaJoue);
  const [etape, setEtape] = useState(0);
  const [sort, setSort] = useState(false);
  const [sobre, setSobre] = useState(false);
  const minuteries = useRef<number[]>([]);

  const arreter = () => {
    minuteries.current.forEach((m) => clearTimeout(m));
    minuteries.current = [];
  };

  useEffect(() => {
    if (dejaJoue) return;
    dejaJoue = true;
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setSobre(reduit);
    const t = (ms: number, f: () => void) => window.setTimeout(f, ms);
    minuteries.current = reduit
      ? [
          t(0, () => setEtape(3)),
          t(FIN_SOBRE, () => setSort(true)),
          t(FIN_SOBRE + SORTIE, () => setVivant(false)),
        ]
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

  const duree = (s: number) => (sobre ? '0.01s' : `${s}s`);
  const entre = etape >= 1;

  const profil = (cote: 'g' | 'd') => ({
    transition: `transform ${duree(1)} ${COURBE}, opacity ${duree(0.75)} ease`,
    transform: entre ? 'translateX(0)' : `translateX(${cote === 'g' ? '-62%' : '62%'})`,
    opacity: entre ? 1 : 0,
  });

  return (
    <div
      className={`lancement${sort ? ' sort' : ''}`}
      onClick={passer}
      role="presentation"
      aria-hidden="true"
    >
      <div className="lancement-scene">
        <div className="lancement-profils">
          <img className="lancement-g" src={profilGauche} alt="" style={profil('g')} />
          <img className="lancement-d" src={profilDroit} alt="" style={profil('d')} />
        </div>
        <div
          className="lancement-trait"
          style={{
            transition: `transform ${duree(0.6)} ${COURBE}`,
            transform: `scaleX(${etape >= 2 ? 1 : 0})`,
          }}
        />
        <p
          className="lancement-nom"
          style={{
            transition: `opacity ${duree(0.7)} ease, letter-spacing ${duree(0.7)} ${COURBE}, transform ${duree(0.7)} ${COURBE}`,
            opacity: etape >= 3 ? 1 : 0,
            letterSpacing: etape >= 3 ? '0.2em' : '0.34em',
            transform: etape >= 3 ? 'translateY(0)' : 'translateY(7px)',
          }}
        >
          Neuro Anglais
        </p>
      </div>
    </div>
  );
}
