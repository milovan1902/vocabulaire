/**
 * CHANTIER 221 — les décors animés du Cinéma muet et de la Bibliothèque.
 *
 * Une couche fixe, derrière tout (classe `fond-anime`, comme Defile.tsx),
 * affichée sur « Aujourd'hui » seulement (cinema.css, biblio.css).
 *
 * Cinéma muet : le faisceau du projecteur et sa poussière, une rayure de
 * pellicule usée de temps en temps, le pianiste de la salle (en bas à gauche).
 * Bibliothèque : la lampe de banquier qui respire, la poussière dorée,
 * l'horloge comtoise (en bas à gauche). CHANTIER 222 — le chat passe au premier plan, sur le
 * rayon des livres : il est dessiné par Eventail.tsx (forme 'rayon').
 *
 * `Amorce` : le compte à rebours « 3, 2, 1 » du Cinéma muet, une fois par
 * jour, posé par Today.tsx sur « Aujourd'hui ».
 *
 * « Réduire les animations » : le décor reste, immobile ; pas d'amorce.
 * Tout le mouvement est en CSS.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStyle } from './useStyle';

const calme = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/* [gauche %, haut %, taille px, durée s, décalage s] — positions fixes, pour un décor qui ne saute pas. */
const POUSSIERE: Array<[number, number, number, number, number]> = [
  [44, 12, 2, 9, 0], [52, 20, 1.5, 11, -3], [48, 30, 2.5, 13, -6], [56, 38, 1.5, 10, -2],
  [41, 44, 2, 12, -8], [59, 52, 1.5, 9, -5], [46, 58, 2, 14, -10], [53, 66, 1.5, 11, -1],
  [38, 26, 1.5, 12, -7], [62, 28, 2, 10, -4], [50, 46, 1.5, 13, -9], [43, 72, 2, 12, -11],
];

function Grains({ classe }: { classe: string }) {
  return (
    <>
      {POUSSIERE.map(([x, y, t, d, r], k) => (
        <i
          key={k}
          className={classe}
          style={{ left: `${x}%`, top: `${y}%`, width: t, height: t, animationDuration: `${d}s`, animationDelay: `${r}s` }}
        />
      ))}
    </>
  );
}

function Cinema({ anime }: { anime: boolean }) {
  return (
    <div className="fond-anime cinema ci-salle" aria-hidden="true">
      <i className="ci-faisceau" />
      {anime && <Grains classe="ci-grain" />}
      {anime && <i className="ci-rayure a" />}
      {anime && <i className="ci-rayure b" />}
      {/* Le pianiste : le piano droit, le tabouret, le dos, la tête, deux bras qui jouent. */}
      <span className="ci-pianiste">
        <i className="ci-piano" />
        <i className="ci-clavier" />
        <i className="ci-tabouret" />
        <i className="ci-dos" />
        <i className="ci-tete" />
        <i className={`ci-bras g${anime ? ' joue' : ''}`} />
        <i className={`ci-bras d${anime ? ' joue' : ''}`} />
        {anime && <span className="ci-notes"><i>♪</i><i>♫</i></span>}
      </span>
    </div>
  );
}

function Biblio({ anime }: { anime: boolean }) {
  return (
    <div className="fond-anime biblio bi-salle" aria-hidden="true">
      <i className={`bi-lampe${anime ? ' respire' : ''}`} />
      {anime && <Grains classe="bi-grain" />}
      {/* L'horloge comtoise : la tête et son cadran, le corps, la fenêtre du balancier. */}
      <span className="bi-horloge">
        <i className="bi-h-tete" />
        <i className="bi-h-cadran" />
        <i className="bi-h-aiguille" />
        <i className="bi-h-corps" />
        <i className="bi-h-fenetre" />
        <span className={`bi-h-balancier${anime ? ' bat' : ''}`}><i /></span>
        <i className="bi-h-pied" />
      </span>
    </div>
  );
}

/* CHANTIER 224 — Salon de thé : des pétales de rose qui descendent en tournoyant. */
const PETALES: Array<[number, number, number]> = [[8, 0, 11], [30, -4, 13], [55, -8, 10], [78, -2, 14], [18, -6.5, 12], [66, -10, 15], [90, -12, 12]];

function Patisserie({ anime }: { anime: boolean }) {
  if (!anime) return null;
  return (
    <div className="fond-anime patisserie pa-salle" aria-hidden="true">
      {PETALES.map(([x, d, t], k) => (
        <i key={k} className={`pa-petale${k % 2 ? ' g' : ''}`} style={{ left: `${x}%`, animationDuration: `${t}s`, animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}

/* CHANTIER 224 — Cabinet 1900 : les lueurs qui flottent, et l'alambic en bas de l'écran.
   La fiole, la goutte et la fumée sont centrées sur le bec verseur (x = 304 dans le dessin). */
const LUEURS: Array<[number, number, number, number]> = [[12, 30, 7, 0], [24, 58, 9, -3], [40, 18, 8, -5], [62, 44, 10, -2], [78, 26, 7, -6], [88, 62, 9, -1], [50, 70, 8, -4], [18, 80, 10, -7], [70, 84, 9, -3.5], [34, 40, 11, -8]];

function Cabinet({ anime }: { anime: boolean }) {
  return (
    <div className="fond-anime cabinet cb-salle" aria-hidden="true">
      {anime && LUEURS.map(([x, y, d, r], k) => (
        <i key={k} className={`cb-lueur${k % 2 ? ' g' : ''}`} style={{ left: `${x}%`, top: `${y}%`, animationDuration: `${d}s`, animationDelay: `${r}s` }} />
      ))}
      <span className="cb-alambic">
        <i className="foyer" /><i className="braise" /><i className={`flamme${anime ? ' vive' : ''}`} />
        <i className="cucurbite" /><i className="rivets r1" /><i className="rivets r2" />
        <i className="robinet-a" /><i className="robinet-b" />
        <i className="bague" /><i className="chapiteau" /><i className="bouton" />
        <i className="col" /><i className="col-bague" />
        <i className="cuve-pied p1" /><i className="cuve-pied p2" /><i className="cuve-socle" />
        <i className="cuve" /><i className="cuve-haut" /><i className="cuve-entree" />
        <i className="sortie" /><i className="bec" /><i className="clef" />
        {anime && <i className="goutte" />}
        <i className="fiole" /><i className="etiquette" />
        {anime && <><i className="fumee f1" /><i className="fumee f2" /><i className="fumee f3" /></>}
      </span>
    </div>
  );
}

export function Salle() {
  const style = useStyle();
  if (style !== 'cinema' && style !== 'biblio' && style !== 'patisserie' && style !== 'cabinet') return null;
  const anime = !calme();
  return createPortal(
    style === 'cinema' ? <Cinema anime={anime} />
      : style === 'biblio' ? <Biblio anime={anime} />
      : style === 'patisserie' ? <Patisserie anime={anime} />
      : <Cabinet anime={anime} />,
    document.body,
  );
}

const CLE_AMORCE = 'cinema-amorce-jour';

function jour(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Le compte à rebours de l'amorce : 3, 2, 1, puis il s'efface. Une fois par jour. */
export function Amorce() {
  const [voir, setVoir] = useState(false);
  useEffect(() => {
    if (calme()) return;
    try {
      if (localStorage.getItem(CLE_AMORCE) === jour()) return;
      localStorage.setItem(CLE_AMORCE, jour());
    } catch { /* stockage indisponible : l'amorce passe, tant pis */ }
    setVoir(true);
    /* Pas de nettoyage : en mode strict, le second passage s'arrête au « déjà vu » et c'est
       ce minuteur-ci qui doit effacer l'amorce. */
    window.setTimeout(() => setVoir(false), 2300);
  }, []);
  if (!voir) return null;
  return createPortal(
    <div className="ci-amorce" aria-hidden="true">
      <span className="ci-a-cercle">
        <i className="ci-a-anneau" />
        <i className="ci-a-croix h" />
        <i className="ci-a-croix v" />
        <i className="ci-a-aiguille" />
        <b className="n3">3</b>
        <b className="n2">2</b>
        <b className="n1">1</b>
      </span>
    </div>,
    document.body,
  );
}
