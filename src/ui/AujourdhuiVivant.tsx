/**
 * CHANTIER 279 — « AUJOURD'HUI » QUI VIT (maquette « Aujourdhui anime - Cahier Tableau Lycee », 1a, 1b, 1c).
 *
 * Ce qui bouge tout seul sur l'écran « Aujourd'hui », sans qu'on touche à rien :
 *   — Cahier (les quatre papiers) : un gribouillis au stylo dans la marge (toutes les 10 s :
 *     étoile, spirale, cœur, cube), le surligneur qui repasse sur « Défi du jour » ou sur
 *     le nom du paquet (toutes les 12 s) ;
 *   — Tableau (vert et noir) : un mot qui s'écrit à la craie puis que la brosse efface
 *     (toutes les 14 s), l'horloge de classe à la vraie heure (trotteuse par à-coups, elle
 *     sonne à l'heure pile), un reflet sur la punaise (tableau.css seul) ;
 *   — Lycée (foncé et clair) : le petit mot plié qui traverse l'écran et s'ouvre au milieu
 *     (toutes les 15 s), le post-it du défi du jour qui se soulève (lycee.css seul).
 *
 * Tout est décoratif (aria-hidden, pointer-events: none). Rien ne se déclenche si le
 * téléphone demande moins d'animations ; la vitrine de la boutique (apercu) n'en lance pas.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type Css = CSSProperties & Record<`--${string}`, string | number>;

const bouge = () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Un compteur qui avance tout seul : 0 au départ, +1 après `premier` ms, puis toutes les `toutes` ms. */
function useCadence(actif: boolean, toutes: number, premier: number): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!actif || !bouge()) return;
    let t = 0;
    const go = () => { setN((v) => v + 1); t = window.setTimeout(go, toutes); };
    t = window.setTimeout(go, premier);
    return () => window.clearTimeout(t);
  }, [actif, toutes, premier]);
  return n;
}

/* ---------------------------------------------------------------- Cahier */

const MOTIFS: Array<[string, string]> = [
  ['0 0 24 24', 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z'],
  ['0 0 40 40', 'M20 20 a2 2 0 1 1 4 0 a5 5 0 1 1 -9 0 a8 8 0 1 1 15 0 a11 11 0 1 1 -21 0 a14 14 0 1 1 27 0'],
  ['0 0 40 40', 'M20 34 C6 24 4 14 10 9 C15 5 20 9 20 13 C20 9 25 5 30 9 C36 14 34 24 20 34 Z'],
  ['0 0 40 40', 'M8 14 L21 7 L34 14 L21 21 Z M8 14 L8 28 L21 35 L21 21 M34 14 L34 28 L21 35'],
];
const HAUTEURS = ['12%', '40%', '62%', '26%', '80%'];

/** Le stylo dessine un petit motif dans la marge, qui s'efface quelques secondes plus tard. */
export function GribouillisCahier() {
  const n = useCadence(true, 10000, 1200);
  if (!n) return null;
  const i = n - 1;
  const [vb, d] = MOTIFS[i % MOTIFS.length];
  return (
    <svg key={n} className="cx-gri" viewBox={vb} aria-hidden="true" style={{ top: HAUTEURS[i % HAUTEURS.length], rotate: `${((i % 3) - 1) * 8}deg` }}>
      <path d={d} pathLength={1} style={{ strokeWidth: vb === '0 0 24 24' ? 1.6 : 2.4 }} />
    </svg>
  );
}

/** Le surligneur : une fois « Défi du jour », une fois le nom du paquet (s'il y en a un de choisi). */
export function useSurligneur(actif: boolean, aNom: boolean): { k: number; cible: 'defi' | 'nom' } | null {
  const n = useCadence(actif, 12000, 5200);
  if (!n) return null;
  return { k: n, cible: aNom && n % 2 === 0 ? 'nom' : 'defi' };
}

export function Surligne() {
  return <i className="cx-surl" aria-hidden="true" />;
}

/* ---------------------------------------------------------------- Tableau */

const CRAIE = ['Bravo', 'Silence !', '7 × 8 = 56', 'Devoirs p. 42'];

/** Un mot à la craie : à côté du nombre de cartes, puis au-dessus des fiches, en alternance. */
export function useMotCraie(actif: boolean): { k: number; txt: string; spot: 'defi' | 'scene' } | null {
  const n = useCadence(actif, 14000, 2600);
  if (!n) return null;
  return { k: n, txt: CRAIE[(n - 1) % CRAIE.length], spot: n % 2 ? 'defi' : 'scene' };
}

/** Le mot s'écrit, la brosse passe et l'efface dans un peu de poussière. Ancré à droite : il ne déborde jamais. */
export function MotCraie({ txt, spot }: { txt: string; spot: 'defi' | 'scene' }) {
  return (
    <span className={`tb-mot ${spot}`} aria-hidden="true">
      <b>{txt}</b>
      <i className="brosse" />
      {Array.from({ length: 6 }, (_, j) => (
        <s key={j} style={{ left: `${8 + j * 15}%`, top: `${8 + (j % 3) * 4}px`, '--dx': `${((j % 3) - 1) * 10}px`, '--dy': `${18 + (j % 4) * 6}px`, animationDelay: `${(j * 0.08).toFixed(2)}s` } as Css} />
      ))}
    </span>
  );
}

/** L'horloge de classe, à la vraie heure. À l'heure pile, elle tremble et deux ondes partent. */
export function HorlogeTableau({ sonnerie }: { sonnerie: boolean }) {
  const [now, setNow] = useState(() => new Date());
  const [sonne, setSonne] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const d = new Date();
      setNow(d);
      if (sonnerie && d.getMinutes() === 0 && d.getSeconds() === 0 && bouge()) setSonne((v) => v + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [sonnerie]);
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  const aiguille = (deg: number, long: number, w: number, c: string) => (
    <line x1="22" y1="22" x2="22" y2={22 - long} stroke={c} strokeWidth={w} strokeLinecap="round" transform={`rotate(${deg} 22 22)`} />
  );
  return (
    <span className={`tb-horloge${sonne ? ' sonne' : ''}`} aria-hidden="true">
      {sonne > 0 && <><i key={`a${sonne}`} className="onde" /><i key={`b${sonne}`} className="onde tard" /></>}
      <svg key={sonne} viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="20" fill="#f4efe2" stroke="#9a6b3f" strokeWidth="3" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="22" y1="5.5" x2="22" y2={i % 3 ? 7.5 : 9} stroke="#3a3226" strokeWidth={i % 3 ? 1 : 1.6} transform={`rotate(${i * 30} 22 22)`} />
        ))}
        {aiguille(h * 30, 9, 2.4, '#1e2326')}
        {aiguille(m * 6, 13, 1.8, '#1e2326')}
        {aiguille(s * 6, 15, 1, '#c0392b')}
        <circle cx="22" cy="22" r="1.8" fill="#c0392b" />
      </svg>
    </span>
  );
}

/* ---------------------------------------------------------------- Lycée */

const PAPIERS = ['t’as révisé ?', '20/20 !!', 'interro demain…', 'passe-moi tes fiches'];

/** Le petit mot plié : il traverse l'écran (une fois dans chaque sens), s'ouvre au milieu, se replie et repart. */
export function MotQuiCircule() {
  const n = useCadence(true, 15000, 3800);
  if (!n) return null;
  const i = n - 1;
  return createPortal(
    <div className="lyv-couloir" aria-hidden="true">
      <span key={n} className={`lyv-mot ${i % 2 ? 'd' : 'g'}`} style={{ top: i % 2 ? '40%' : '47%' }}>
        <i className="plie" />
        <b>{PAPIERS[i % PAPIERS.length]}</b>
      </span>
    </div>,
    document.body,
  );
}

/** Le post-it du défi du jour (il se soulève tout seul, lycee.css). */
export function PostIt() {
  return <span className="lyv-postit" aria-hidden="true">à faire !</span>;
}
