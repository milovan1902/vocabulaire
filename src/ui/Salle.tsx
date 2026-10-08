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
import { useEffect, useState, type CSSProperties } from 'react';
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
    </div>
  );
}

/* CHANTIER 225 — l'alambic n'est plus collé au bas de l'écran : il est posé tout en bas
   d'« Aujourd'hui », sous les tuiles (Today.tsx), et ne se voit qu'en descendant.
   La fiole, la goutte et la fumée restent centrées sur le bec verseur (x = 304). */
export function Alambic() {
  const anime = !calme();
  return (
    <div className="cb-alambic-bloc" aria-hidden="true">
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

/* CHANTIER 227 — Japon zen : le mont Fuji, deux nuages qui passent devant le sommet, le sol,
   et des pétales de cerisier qui filent au vent. */
const VENT: Array<[number, number, number]> = [[10, 0, 9], [28, -3, 11], [48, -6, 8.5], [66, -1.5, 10], [84, -5, 12], [38, -8, 9.5], [74, -9, 11]];

function Japon({ anime }: { anime: boolean }) {
  return (
    <div className="fond-anime japon jp-salle" aria-hidden="true">
      <i className="jp-fuji" />
      {anime && <><i className="jp-nuage n1" /><i className="jp-nuage n2" /></>}
      <i className="jp-sol" />
      {anime && VENT.map(([x, d, t], k) => <i key={k} className={`jp-petale${k % 2 ? ' g' : ''}`} style={{ left: `${x}%`, animationDuration: `${t}s`, animationDelay: `${d}s` }} />)}
    </div>
  );
}

/* CHANTIER 235 — Plage et surf : le soleil qui pulse.
   CHANTIER 236 — la mer, ses éclats et l'écume sont passés dans la scène des planches (plage.css,
   .ly-scene) : la plage suit le paquet au lieu d'être peinte à hauteur fixe derrière l'écran. */
function Plage() {
  return (
    <div className="fond-anime plage su-salle" aria-hidden="true">
      <i className="su-soleil" />
    </div>
  );
}

/* CHANTIER 235 — Château : deux nuages, le rempart ; 20 s de jour, 20 s de nuit (lune, étoiles).
   Le cycle suit l'horloge (même calcul que le château d'Eventail.tsx), une fois au montage. */
const ETOILES: Array<[number, number, number]> = [[33, 20, 2], [56, 30, 2], [69, 16, 3], [92, 44, 2], [3, 264, 2], [94, 258, 3], [44, 8, 2]];

function Chateau({ anime }: { anime: boolean }) {
  const [cycle] = useState(() => `${-((Date.now() / 1000) % 40)}s`);
  return (
    <div className="fond-anime chateau ch-salle" aria-hidden="true" style={{ '--cycle': cycle } as CSSProperties}>
      {anime && <><i className="ch-nuage" /><i className="ch-nuage n2" /></>}
      <i className="ch-creneaux" /><i className="ch-mur" />
      {anime && (
        <>
          <i className="ch-nuit" />
          <span className="ch-ciel-nuit">
            <i className="ch-lune" />
            {ETOILES.map(([x, y, t], k) => <i key={k} className="ch-etoile" style={{ left: `${x}%`, top: y, width: t, height: t }} />)}
          </span>
        </>
      )}
    </div>
  );
}

/* CHANTIER 237 — Jungle et safari : la canopée sur trois couches, les rayons et leurs poussières, deux lianes
   et des fougères qui ondulent. [gauche %, largeur, durée, décalage] pour les rayons ; [gauche %, haut px, durée, décalage] pour les poussières. */
const RAYONS: Array<[number, number, number, number]> = [[17, 50, 3.4, 0], [47, 70, 4.2, -1.5], [72, 46, 3.8, -0.7]];
const MOTES: Array<[number, number, number, number]> = [[27, 300, 4, 0], [33, 420, 5, -2], [58, 360, 4.5, -1], [66, 470, 5.5, -3], [83, 330, 4.2, -0.5], [42, 230, 4.8, -2.4]];
/* [gauche %, haut, largeur, hauteur, angle, couleur] — trois couches de feuilles. */
const COUCHES: Array<{ d: number; r: number; f: Array<[number, number, number, number, number, string]> }> = [
  { d: 6, r: 0, f: [[-6, -34, 150, 72, 25, '#1f4d28'], [22, -46, 160, 72, -12, '#1f4d28'], [50, -40, 150, 70, 18, '#1f4d28'], [73, -34, 150, 74, -24, '#1f4d28']] },
  { d: 4.6, r: -1.8, f: [[-8, -6, 110, 50, -28, '#2f7a3a'], [17, -20, 120, 54, 14, '#2f7a3a'], [42, -16, 110, 50, -20, '#2f7a3a'], [66, -4, 130, 54, 30, '#2f7a3a'], [86, 26, 90, 44, 48, '#2f7a3a']] },
  { d: 3.8, r: -0.9, f: [[-1, 34, 76, 34, -42, '#5aa64a'], [7, 6, 70, 30, 18, '#5aa64a'], [81, 10, 70, 30, -18, '#5aa64a'], [92, 50, 64, 30, 56, '#5aa64a']] },
];
/* [côté, décalage px, hauteur, angle, durée, retard, couleur] — les fougères des deux coins bas. */
const FOUGERES: Array<['g' | 'd', number, number, number, number, number, string]> = [
  ['g', -6, 150, -52, 3.6, 0, '#3f8f3a'], ['g', 2, 170, -30, 4.2, -1, '#2f7a32'], ['g', 10, 140, -12, 3.9, -0.6, '#4f9e42'],
  ['d', -6, 150, 52, 3.8, -1.2, '#3f8f3a'], ['d', 2, 170, 30, 4.4, 0, '#2f7a32'], ['d', 10, 140, 12, 4, -2, '#4f9e42'],
];

function Jungle({ anime }: { anime: boolean }) {
  return (
    <div className="fond-anime jungle jg-salle" aria-hidden="true">
      <i className="jg-tronc" style={{ left: '11%', width: 16, opacity: 0.22 }} /><i className="jg-tronc" style={{ left: '36%', width: 22, opacity: 0.18 }} />
      <i className="jg-tronc" style={{ left: '66%', width: 14, opacity: 0.2 }} /><i className="jg-tronc" style={{ left: '83%', width: 20, opacity: 0.16 }} />
      {RAYONS.map(([x, w, d, r], k) => <i key={k} className="jg-rayon" style={{ left: `${x}%`, width: w, animationDuration: `${d}s`, animationDelay: `${r}s` }} />)}
      {anime && MOTES.map(([x, y, d, r], k) => <i key={k} className="jg-mote" style={{ left: `${x}%`, top: y, animationDuration: `${d}s`, animationDelay: `${r}s` }} />)}
      {COUCHES.map((c, n) => (
        <span key={n} className="jg-canopee" style={{ animationDuration: `${c.d}s`, animationDelay: `${c.r}s` }}>
          {c.f.map(([x, y, w, h, a, col], k) => <i key={k} style={{ left: `${x}%`, top: y, width: w, height: h, transform: `rotate(${a}deg)`, '--c': col } as CSSProperties} />)}
        </span>
      ))}
      <span className="jg-liane" style={{ left: -12, height: 420 }}><i style={{ left: -6, top: 60, transform: 'rotate(-30deg)' }} /><i style={{ left: 2, top: 140, transform: 'rotate(30deg)' }} /><i style={{ left: -6, top: 230, transform: 'rotate(-30deg)' }} /><i style={{ left: 2, top: 320, transform: 'rotate(30deg)' }} /></span>
      <span className="jg-liane d" style={{ right: -12, height: 360, animationDuration: '5.4s', animationDelay: '-2s' }}><i style={{ right: -6, top: 60, transform: 'rotate(-30deg)' }} /><i style={{ right: 2, top: 140, transform: 'rotate(30deg)' }} /><i style={{ right: -6, top: 230, transform: 'rotate(-30deg)' }} /><i style={{ right: 2, top: 320, transform: 'rotate(30deg)' }} /></span>
      {FOUGERES.map(([c, x, h, a, d, r, col], k) => (
        <i key={k} className="jg-fougere" style={{ ...(c === 'g' ? { left: x } : { right: x }), height: h, '--r': `${a}deg`, '--c': col, animationDuration: `${d}s`, animationDelay: `${r}s` } as CSSProperties} />
      ))}
    </div>
  );
}

/* CHANTIER 237 — Pacific Express : le soleil qui se couche et se lève, les mesas, l'aigle qui tourne, la poussière,
   deux cactus ; la nuit, les étoiles et la lune. Le cycle de 40 s suit l'horloge (même calcul qu'Eventail.tsx). */
const ETOILES_PE: Array<[number, number, number]> = [[8, 40, 2], [22, 22, 2], [36, 60, 3], [56, 30, 2], [69, 70, 2], [83, 26, 3], [92, 90, 2], [44, 120, 2], [17, 140, 2], [81, 150, 2], [6, 200, 2], [64, 180, 3]];

function Western({ anime }: { anime: boolean }) {
  const [cycle] = useState(() => `${-((Date.now() / 1000) % 40)}s`);
  return (
    <div className="fond-anime western pe-salle" aria-hidden="true" style={{ '--cycle': cycle } as CSSProperties}>
      <span className="pe-ciel">
        <i className="pe-soleil" />
        {anime && <span className="pe-aigle-orbite"><span className="pe-aigle-jour"><span className="pe-aigle-tour"><span className="pe-aigle"><i className="g" /><i className="d" /></span></span></span></span>}
      </span>
      <i className="pe-mesa m1" /><i className="pe-mesa m2" /><i className="pe-mesa m3" /><i className="pe-mesa m4" />
      {anime && <><i className="pe-poussiere" style={{ top: 308 }} /><i className="pe-poussiere p2" /></>}
      <i className="pe-cactus c1" /><i className="pe-cactus c2" />
      {anime && (
        <>
          <i className="pe-nuit" />
          <span className="pe-ciel-nuit">
            {ETOILES_PE.map(([x, y, t], k) => <i key={k} className="pe-etoile" style={{ left: `${x}%`, top: y, width: t, height: t }} />)}
            <i className="pe-lune" />
          </span>
        </>
      )}
    </div>
  );
}

export function Salle() {
  const style = useStyle();
  if (style !== 'cinema' && style !== 'biblio' && style !== 'patisserie' && style !== 'cabinet' && style !== 'japon' && style !== 'plage' && style !== 'chateau' && style !== 'jungle' && style !== 'western') return null;
  const anime = !calme();
  return createPortal(
    style === 'cinema' ? <Cinema anime={anime} />
      : style === 'biblio' ? <Biblio anime={anime} />
      : style === 'patisserie' ? <Patisserie anime={anime} />
      : style === 'japon' ? <Japon anime={anime} />
      : style === 'plage' ? <Plage />
      : style === 'chateau' ? <Chateau anime={anime} />
      : style === 'jungle' ? <Jungle anime={anime} />
      : style === 'western' ? <Western anime={anime} />
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
