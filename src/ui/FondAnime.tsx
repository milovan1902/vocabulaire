/**
 * CHANTIER 187 — LES FONDS ANIMÉS (maquettes 23a, 25b, 25c).
 *
 *   — Grand bleu : des bulles montent du fond en ondulant, des rayons de
 *     lumière ondulent sous la surface ;
 *   — Décollage : un ciel FIXE (petites étoiles, quelques brillantes avec
 *     halo et aigrettes, une Voie lactée), traversé par UNE étoile filante
 *     à un moment pris au hasard, 2 à 6 s après la précédente ;
 *   — Orbite : quelques étoiles qui scintillent (la planète, l'anneau et
 *     les satellites sont dans Eventail.tsx et anime.css).
 * Au toucher, sur les trois : une petite gerbe (bulles, étincelles, poussière d'or).
 *
 * CHANTIER 189 — deux de plus (maquettes 27a, 27b) :
 *   — Borne arcade : quatre envahisseurs en pixels traversent le fond par
 *     à-coups ; au toucher, une explosion de pixels et un « +1 » ;
 *   — Néon : une pluie fine et des reflets sur le sol quadrillé ; et toutes
 *     les 4 à 9 s, UNE enseigne lumineuse prise au hasard grésille.
 *
 * CHANTIER 190 — Carnet kraft (maquette 28a) : toutes les 6 à 12 s (le
 *     premier au bout d'une seconde), un petit avion en papier traverse le
 *     fond en courbe, d'un bord à l'autre, et laisse derrière lui une ligne
 *     de pointillés qui s'efface. Au toucher, un coup de tampon encreur
 *     (« VU », une étoile ou un avion ; rouge, bleu ou vert).
 *
 * CHANTIER 191 — Manga et BD pop (maquettes 29a, 29b) :
 *   — Manga : toutes les 5 à 9 s, une carte est lancée comme une attaque :
 *     elle tourne, laisse des traits de vitesse et se plante dans le décor
 *     avec un éclat « ズバッ! ». Au toucher, des traits de vitesse
 *     convergent vers le doigt et une onomatopée (ドン!, バン!, ズン!) tremble ;
 *   — BD pop : la trame de points respire lentement ; toutes les 5 à 10 s,
 *     une bulle (POW!, ZAP!, BOOM!…) surgit en haut ou en bas puis éclate.
 *     Au toucher, une explosion en étoile et des points de trame qui giclent.
 *
 * CHANTIER 192 — Jardin (maquette 30a) : le temps qu'il fait, en cycle de
 *     37,5 s (CHANTIER 195 ; 2 min 30 au départ). Beau (soleil, pollen, deux papillons), ça se couvre (nuages,
 *     ciel gris, les fleurs se balancent), averse, éclaircie. Les fleurs de
 *     la bande de terre doublent après la 1re averse, triplent après la 2e,
 *     puis restent à leur taille ; elles repartent petites à chaque
 *     ouverture de l'appli (rien n'est stocké). Au toucher, une fleur éclot.
 *
 * CHANTIER 193 — Jardin : le cycle ne part plus du début (une minute de
 *     soleil avant le premier nuage) mais d'un point pris au hasard vers la
 *     fin du beau temps : les nuages arrivent 5 à 25 s après l'ouverture.
 *
 * CHANTIER 196 — Parquet (maquette 31a) : la salle tamisée, trois projecteurs
 *     de scène qui balaient le terrain (faisceau + flaque de lumière), des
 *     flashs de photographes toutes les 3 à 7 s ; et sur « Aujourd'hui », un
 *     petit tableau d'affichage : chrono des 24 s, sirène et « +2 » à zéro.
 *
 * CHANTIER 197 — Pelouse (maquette 32a), sur « Aujourd'hui » seulement : le
 *     stade de nuit (quatre pylônes, cônes de lumière, jusqu'à trois ombres
 *     de joueurs sur des trajectoires au hasard) et la tribune en haut (ola
 *     toutes les 8 à 12 s, puis parfois un fumigène ou des confettis).
 *
 * CHANTIER 198 — Mêlée (maquette 33a), sur « Aujourd'hui » seulement : une
 *     pluie fine et oblique, des flaques où se forment des ronds, une brume
 *     rase ; toutes les 7 à 11 s, une mêlée surgit au hasard du terrain (deux
 *     packs de huit vus de dessus), pousse, se relève et disparaît sous la
 *     pelouse avec un « plop ! ». Au toucher, une éclaboussure de boue.
 *
 * CHANTIER 199 — Strass (maquette 34a), sur « Aujourd'hui » seulement : une
 *     boule à facettes (CHANTIER 201 : au centre, plus grosse, voilée, derrière la
 *     ligne du niveau ; une vraie sphère de petits
 *     miroirs, un tour en 20 s) et une cinquantaine de reflets blancs ou dorés
 *     qui glissent sur le fond et s'étirent en s'éloignant d'elle. Dessinés sur
 *     une toile (canvas), 30 images/s au plus, et plus rien quand elle est
 *     masquée. Toutes les 8 à 10 s, un éclat en croix sur un objet brillant
 *     (diamant de la série, paquet, bouton, niveau). Au toucher, des paillettes.
 *
 * Posé à la racine du document, DERRIÈRE tout (z-index -1, anime.css) : il
 * ne gêne aucun toucher et ne connaît aucun écran. Rien n'est stocké.
 *
 * Sobriété : si le téléphone demande de réduire les animations, tout est
 * figé et il n'y a ni étoile filante ni gerbe. En Révision, le fond est
 * atténué, sans étoile filante ni gerbe : on y lit et on réfléchit.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { useStyle } from './useStyle';

type Css = CSSProperties & Record<`--${string}`, string | number>;

function hasard(graine: number) {
  let s = graine;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const calme = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const enRevision = () => !!document.querySelector('.studybg');

function Ocean() {
  const { bulles, rayons } = useMemo(() => {
    const r = hasard(7);
    const bulles = Array.from({ length: 16 }, () => {
      const dur = 10 + r() * 12;
      return { t: 6 + r() * 22, x: r() * 96, bas: -40 - r() * 200, dur, del: -r() * dur, osc: 2.5 + r() * 2, oscDel: -r() * 3 };
    });
    const rayons = [-14, -4, 8, 18].map((a, i) => ({ a, x: 10 + i * 22, dur: 7 + i * 1.7, del: -i }));
    return { bulles, rayons };
  }, []);
  return (
    <>
      {rayons.map((y, i) => (
        <i key={`r${i}`} className="fa-rayon" style={{ left: `${y.x}%`, '--r': `${y.a}deg`, animationDuration: `${y.dur}s`, animationDelay: `${y.del}s` } as Css} />
      ))}
      {bulles.map((b, i) => (
        <span key={`b${i}`} className="fa-bulle" style={{ left: `${b.x}%`, bottom: b.bas, animationDuration: `${b.dur}s`, animationDelay: `${b.del}s` }}>
          <i style={{ width: b.t, height: b.t, animationDuration: `${b.osc}s`, animationDelay: `${b.oscDel}s` }} />
        </span>
      ))}
    </>
  );
}

const TEINTES = ['255,255,255', '206,222,255', '255,244,222', '255,218,178', '190,210,255'];

function Ciel() {
  const etoiles = useMemo(() => {
    const r = hasard(97);
    const teinte = () => TEINTES[Math.floor(r() * TEINTES.length)];
    const out: Array<{ x: number; y: number; t: number; c: string; a: number; lueur?: number }> = [];
    for (let i = 0; i < 110; i++) out.push({ x: r() * 100, y: r() * 100, t: 0.6 + r() * 0.8, c: teinte(), a: 0.3 + r() * 0.5 });
    /* La Voie lactée : une bande en diagonale, plus dense. */
    for (let i = 0; i < 80; i++) {
      const u = r(), v = (r() - 0.5) * 0.16;
      out.push({ x: (u * 120 - 10), y: 75 - u * 70 + v * 100, t: 0.5 + r() * 0.8, c: teinte(), a: 0.25 + r() * 0.45 });
    }
    for (let i = 0; i < 18; i++) out.push({ x: r() * 100, y: r() * 100, t: 1.5 + r(), c: teinte(), a: 1, lueur: 3 + r() * 3 });
    return out;
  }, []);
  const brillantes = useMemo(() => {
    const r = hasard(41);
    return [[14, 12, 1], [83, 22, 2], [27, 58, 0], [87, 66, 3], [58, 84, 4]].map(([x, y, k]) => ({ x, y, c: TEINTES[k], halo: 18 + r() * 12, br: 14 + r() * 10 }));
  }, []);
  const [filante, setFilante] = useState<null | { id: number; x: number; y: number; angle: number; l: number; d: number; dur: number }>(null);
  useEffect(() => {
    if (calme()) return;
    let fini = false;
    let minuteur = 0;
    const suivante = () => {
      minuteur = window.setTimeout(() => {
        if (fini) return;
        if (!enRevision() && document.visibilityState === 'visible') {
          const droite = Math.random() > 0.5;
          const a = 18 + Math.random() * 34;
          setFilante({
            id: Date.now(),
            x: droite ? -10 + Math.random() * 45 : 55 + Math.random() * 55,
            y: 3 + Math.random() * 55,
            angle: droite ? a : 180 - a,
            l: 70 + Math.random() * 70,
            d: 300 + Math.random() * 200,
            dur: 0.6 + Math.random() * 0.6,
          });
        }
        suivante();
      }, 2000 + Math.random() * 4000);
    };
    suivante();
    return () => { fini = true; window.clearTimeout(minuteur); };
  }, []);
  return (
    <>
      <i className="fa-voie" />
      {etoiles.map((e, i) => (
        <i key={i} className="fa-etoile" style={{
          left: `${e.x}%`, top: `${e.y}%`, width: e.t, height: e.t,
          background: e.lueur ? `rgb(${e.c})` : `rgba(${e.c},${e.a.toFixed(2)})`,
          boxShadow: e.lueur ? `0 0 ${e.lueur}px rgba(${e.c},0.7)` : undefined,
        }} />
      ))}
      {brillantes.map((b, i) => (
        <span key={`s${i}`} className="fa-brillante" style={{ left: `${b.x}%`, top: `${b.y}%`, '--c': b.c, '--h': `${b.halo}px`, '--b': `${b.br}px` } as Css}><i /><i /><i /><i /></span>
      ))}
      {filante && (
        <span key={filante.id} className="fa-filante" style={{ left: `${filante.x}%`, top: `${filante.y}%`, transform: `rotate(${filante.angle}deg)` }}>
          <i style={{ width: filante.l, '--d': `${filante.d}px`, animationDuration: `${filante.dur}s` } as Css} />
        </span>
      )}
    </>
  );
}

function Scintille() {
  const etoiles = useMemo(() => {
    const r = hasard(53);
    return Array.from({ length: 24 }, () => ({ x: r() * 100, y: r() * 100, t: 1.5 + r() * 2.2, c: r() > 0.75 ? '#ffe9a8' : r() > 0.5 ? '#ffd6f0' : '#fff', dur: 2 + r() * 3, del: -r() * 4 }));
  }, []);
  return (
    <>
      {etoiles.map((e, i) => (
        <i key={i} className="fa-scintille" style={{ left: `${e.x}%`, top: `${e.y}%`, width: e.t, height: e.t, background: e.c, animationDuration: `${e.dur}s`, animationDelay: `${e.del}s` }} />
      ))}
    </>
  );
}

/* ---------- CHANTIER 189 — Borne arcade ---------- */
const PATTES_A = ['..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'];
const PATTES_B = ['..X.....X..', 'X..X...X..X', 'X.XXXXXXX.X', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..X.....X..', '.X.......X.'];
function pixels(m: string[], p: number, c: string): string {
  return m.flatMap((l, y) => l.split('').map((ch, x) => (ch === 'X' ? `${x * p}px ${y * p}px 0 0 ${c}` : ''))).filter(Boolean).join(',');
}
/* [gauche %, haut %, couleur, taille d'un pixel, trajet en vw, nombre de pas, durée s] */
const LUTINS: Array<[number, number, string, number, number, number, number]> = [
  [4, 4, '#ff3ea5', 3, 42, 14, 7],
  [60, 31, '#29f0ff', 3, -46, 12, 7.2],
  [8, 61, '#ffe14d', 3, 48, 16, 9.6],
  [66, 84, '#3dff8b', 2.5, -52, 10, 6],
];
function Arcade() {
  return (
    <>
      {LUTINS.map(([x, y, c, p, d, n, dur], i) => (
        <span key={i} className="fa-lutin" style={{ left: `${x}%`, top: `${y}%`, width: 11 * p, height: 8 * p, filter: `drop-shadow(0 0 4px ${c})`, '--d': `${d}vw`, animation: `fa-pas ${dur}s steps(${n}) infinite alternate` } as Css}>
          <i className="fa-patte-a" style={{ width: p, height: p, boxShadow: pixels(PATTES_A, p, c), animationDuration: `${(2 * dur) / n}s` }} />
          <i className="fa-patte-b" style={{ width: p, height: p, boxShadow: pixels(PATTES_B, p, c), animationDuration: `${(2 * dur) / n}s` }} />
        </span>
      ))}
    </>
  );
}

/* ---------- CHANTIER 189 — Néon ---------- */
/* Les enseignes qui peuvent grésiller : ce qui porte un halo dans neon.css. */
const ENSEIGNES = '.ly-defi, .ly-niv, .ly-flamme, .eventail-carte.centre .eventail-dos, .btn.ly-go';
function Neon() {
  const { gouttes, reflets, ronds } = useMemo(() => {
    const r = hasard(71);
    const gouttes = Array.from({ length: 46 }, () => {
      const dur = 0.9 + r() * 0.7;
      const c = r() > 0.7 ? '255,79,216' : r() > 0.5 ? '77,232,255' : '255,255,255';
      return { x: r() * 130, haut: -20 - r() * 30, l: 12 + r() * 12, c, dur, del: -r() * dur };
    });
    const reflets = [['255,79,216', 10, 76, 34], ['77,232,255', 46, 80, 42], ['162,89,255', 16, 85, 46], ['255,79,216', 56, 88, 30], ['77,232,255', 8, 92, 38]]
      .map(([c, x, y, w], i) => ({ c: c as string, x: x as number, y: y as number, w: w as number, dur: 2.6 + i * 0.7, del: -i * 0.6 }));
    const ronds = [[20, 80], [70, 77], [42, 86], [82, 90], [12, 92], [56, 82]].map(([x, y], i) => ({ x, y, c: i % 2 ? '77,232,255' : '255,79,216', dur: 1.6 + (i % 3) * 0.4, del: -i * 0.5 }));
    return { gouttes, reflets, ronds };
  }, []);

  /* Toutes les 4 à 9 s, une seule enseigne grésille, prise au hasard. */
  useEffect(() => {
    if (calme()) return;
    let fini = false;
    let minuteur = 0;
    const suivante = () => {
      minuteur = window.setTimeout(() => {
        if (fini) return;
        if (!enRevision() && document.visibilityState === 'visible') {
          const liste = Array.from(document.querySelectorAll<HTMLElement>(ENSEIGNES));
          const el = liste[Math.floor(Math.random() * liste.length)];
          if (el) {
            el.classList.remove('fa-gresille');
            void el.offsetWidth; // relance l'animation si c'est la même enseigne
            el.classList.add('fa-gresille');
            window.setTimeout(() => el.classList.remove('fa-gresille'), 1200);
          }
        }
        suivante();
      }, 4000 + Math.random() * 5000);
    };
    suivante();
    return () => { fini = true; window.clearTimeout(minuteur); };
  }, []);

  return (
    <>
      {gouttes.map((g, i) => (
        <i key={`g${i}`} className="fa-goutte" style={{ left: `${g.x}%`, top: `${g.haut}%`, height: g.l, background: `linear-gradient(180deg, transparent, rgba(${g.c},0.45))`, animationDuration: `${g.dur}s`, animationDelay: `${g.del}s` }} />
      ))}
      {reflets.map((r, i) => (
        <i key={`r${i}`} className="fa-reflet" style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, background: `linear-gradient(90deg, transparent, rgba(${r.c},0.8), transparent)`, animationDuration: `${r.dur}s`, animationDelay: `${r.del}s` }} />
      ))}
      {ronds.map((o, i) => (
        <i key={`o${i}`} className="fa-rond" style={{ left: `${o.x}%`, top: `${o.y}%`, borderColor: `rgba(${o.c},0.7)`, animationDuration: `${o.dur}s`, animationDelay: `${o.del}s` }} />
      ))}
    </>
  );
}

/* ---------- CHANTIER 190 — Carnet kraft : l'avion en papier ---------- */
type Vol = { id: number; d: string; w: number; h: number; dur: number };
/* Une courbe d'un bord à l'autre, en pixels de l'écran (comme la maquette, à l'échelle). */
function routeAuHasard(): Vol {
  const w = window.innerWidth, h = window.innerHeight;
  const g = Math.random() > 0.5;
  const y0 = h * (0.14 + Math.random() * 0.63), y3 = h * (0.14 + Math.random() * 0.63);
  const x0 = g ? -40 : w + 40, x3 = g ? w + 40 : -40;
  const c1x = w * (g ? 0.25 + Math.random() * 0.17 : 0.75 - Math.random() * 0.17);
  const c2x = w * (g ? 0.58 + Math.random() * 0.17 : 0.42 - Math.random() * 0.17);
  const c1y = y0 + (Math.random() - 0.5) * h * 0.47, c2y = y3 + (Math.random() - 0.5) * h * 0.47;
  const f = (n: number) => n.toFixed(0);
  return { id: Date.now(), w, h, dur: 5 + Math.random() * 2, d: `M ${f(x0)} ${f(y0)} C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(x3)} ${f(y3)}` };
}
function Carnet() {
  const [vol, setVol] = useState<Vol | null>(null);
  useEffect(() => {
    if (calme()) return;
    let fini = false;
    let minuteur = 0;
    const suivant = (delai: number) => {
      minuteur = window.setTimeout(() => {
        if (fini) return;
        if (!enRevision() && document.visibilityState === 'visible') setVol(routeAuHasard());
        suivant(6000 + Math.random() * 6000);
      }, delai);
    };
    suivant(1000);
    return () => { fini = true; window.clearTimeout(minuteur); };
  }, []);
  if (!vol) return null;
  const m = `fa-m${vol.id}`;
  return (
    <div key={vol.id} className="fa-vol" style={{ animationDuration: `${vol.dur + 2.5}s` }}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setVol(null); }}>
      <svg className="fa-route" width={vol.w} height={vol.h} viewBox={`0 0 ${vol.w} ${vol.h}`}>
        <defs>
          <mask id={m} maskUnits="userSpaceOnUse" x={0} y={0} width={vol.w} height={vol.h}>
            <path className="fa-trace" d={vol.d} fill="none" stroke="#fff" strokeWidth={8} pathLength={1} strokeDasharray={1} strokeDashoffset={1} style={{ animationDuration: `${vol.dur}s` }} />
          </mask>
        </defs>
        <path d={vol.d} fill="none" stroke="#6b5640" strokeOpacity={0.55} strokeWidth={1.6} strokeDasharray="3 7" strokeLinecap="round" mask={`url(#${m})`} />
      </svg>
      <span className="fa-avion" style={{ offsetPath: `path("${vol.d}")`, animationDuration: `${vol.dur}s` } as Css}>
        <span>
          <svg width="26" height="26" viewBox="0 0 24 24">
            <path d="M2 11.5 22 3l-6.5 18-4.2-6.8z" fill="#fbf6ea" stroke="#2f5d8a" strokeWidth={1.6} strokeLinejoin="round" />
            <path d="M22 3 11.3 14.2 10 20.5l3.4-3.6" fill="none" stroke="#2f5d8a" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
      </span>
    </div>
  );
}

/* ---------- CHANTIER 190 — Carnet kraft : le coup de tampon au toucher ---------- */
type Tampon = { id: number; x: number; y: number; motif: 'vu' | 'etoile' | 'avion'; c: string; r: number };
const MOTIFS: Tampon['motif'][] = ['vu', 'etoile', 'avion'];
const ENCRES = ['#b5452f', '#2f5d8a', '#3d7a46'];
function Tampons() {
  const [tampons, setTampons] = useState<Tampon[]>([]);
  useEffect(() => {
    let n = 0;
    const toucher = (e: PointerEvent) => {
      if (calme() || enRevision()) return;
      const id = ++n;
      const t: Tampon = {
        id, x: e.clientX, y: e.clientY,
        motif: MOTIFS[Math.floor(Math.random() * MOTIFS.length)],
        c: ENCRES[Math.floor(Math.random() * ENCRES.length)],
        r: -16 + Math.random() * 32,
      };
      setTampons((l) => [...l.slice(-3), t]);
      window.setTimeout(() => setTampons((l) => l.filter((b) => b.id !== id)), 1300);
    };
    document.addEventListener('pointerdown', toucher, { passive: true });
    return () => document.removeEventListener('pointerdown', toucher);
  }, []);
  if (!tampons.length) return null;
  return (
    <div className="fa-eclats" aria-hidden="true">
      {tampons.map((t) => (
        <span key={t.id} className="fa-tampon" style={{ left: t.x - 34, top: t.y - 34, '--c': t.c, '--r': `${t.r}deg` } as Css}>
          {t.motif === 'vu' ? <b>VU</b> : (
            <svg width="28" height="28" viewBox="0 0 24 24">
              <path fill={t.c} d={t.motif === 'etoile' ? 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z' : 'M2 11.5 22 3l-6.5 18-4.2-6.8z'} />
            </svg>
          )}
        </span>
      ))}
    </div>
  );
}

/* ---------- CHANTIER 191 — outils communs à Manga et BD pop ---------- */
/* Un tir toutes les `min` à `min + ecart` ms (le premier après `premier`), jamais en Révision ni onglet caché. */
function useCadence(premier: number, min: number, ecart: number, tir: () => void) {
  useEffect(() => {
    if (calme()) return;
    let fini = false;
    let minuteur = 0;
    const suivant = (delai: number) => {
      minuteur = window.setTimeout(() => {
        if (fini) return;
        if (!enRevision() && document.visibilityState === 'visible') tir();
        suivant(min + Math.random() * ecart);
      }, delai);
    };
    suivant(premier);
    return () => { fini = true; window.clearTimeout(minuteur); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
/* Les effets au toucher : 4 au plus à l'écran, chacun retiré après `duree` ms. */
function useCoups<T>(duree: number, fabrique: (x: number, y: number) => T): Array<T & { id: number }> {
  const [liste, setListe] = useState<Array<T & { id: number }>>([]);
  useEffect(() => {
    let n = 0;
    const toucher = (e: PointerEvent) => {
      if (calme() || enRevision()) return;
      const id = ++n;
      const coup = { ...fabrique(e.clientX, e.clientY), id };
      setListe((l) => [...l.slice(-3), coup]);
      window.setTimeout(() => setListe((l) => l.filter((b) => b.id !== id)), duree);
    };
    document.addEventListener('pointerdown', toucher, { passive: true });
    return () => document.removeEventListener('pointerdown', toucher);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return liste;
}
const auHasard = <T,>(l: T[]): T => l[Math.floor(Math.random() * l.length)];

/* ---------- CHANTIER 191 — Manga : le jet de carte ---------- */
type Jet = { id: number; sx: number; sy: number; th: number; d: number; tr: number };
function jetAuHasard(): Jet {
  const w = window.innerWidth, h = window.innerHeight, k = Math.min(w / 360, 1.6);
  const g = Math.random() > 0.5;
  const a = (Math.random() - 0.5) * 40;
  const th = g ? a : 180 + a;
  const ex = w * (g ? 0.6 + Math.random() * 0.25 : 0.14 + Math.random() * 0.25);
  const ey = h * (0.17 + Math.random() * 0.63);
  const d = (260 + Math.random() * 80) * k;
  const r = (th * Math.PI) / 180;
  return { id: Date.now(), sx: ex - d * Math.cos(r), sy: ey - d * Math.sin(r), th, d, tr: -th + (Math.random() - 0.5) * 24 };
}
function Manga() {
  const [jet, setJet] = useState<Jet | null>(null);
  useCadence(1500, 5000, 4000, () => setJet(jetAuHasard()));
  if (!jet) return null;
  return (
    <span key={jet.id} className="fa-jet" style={{ left: jet.sx, top: jet.sy, transform: `rotate(${jet.th}deg)` }}
      onAnimationEnd={(e) => { if ((e.target as HTMLElement).classList.contains('fa-carte')) setJet(null); }}>
      <i className="fa-trainee" style={{ width: jet.d }} />
      <span className="fa-impact" style={{ left: jet.d - 46 }}><i /><i /><b style={{ transform: `rotate(${jet.tr}deg)` }}>ズバッ!</b></span>
      <span className="fa-carte" style={{ '--d': `${jet.d}px` } as Css}><i /><i /></span>
    </span>
  );
}
function CoupsManga() {
  const coups = useCoups(1000, (x, y) => ({ x, y, mot: auHasard(['ドン!', 'バン!', 'ズン!']), r: -12 + Math.random() * 24 }));
  if (!coups.length) return null;
  return (
    <div className="fa-eclats" aria-hidden="true">
      {coups.map((c) => (
        <span key={c.id} className="fa-don" style={{ left: c.x, top: c.y }}><i /><b style={{ '--r': `${c.r}deg` } as Css}>{c.mot}</b></span>
      ))}
    </div>
  );
}

/* ---------- CHANTIER 191 — BD pop : la trame et les bulles ---------- */
type BulleBd = { id: number; x: number; y: number; mot: string; f: string; r: number };
const GICLES = Array.from({ length: 8 }, (_, i) => { const a = (Math.PI * 2 * i) / 8; return { dx: Math.cos(a) * 90, dy: Math.sin(a) * 60, c: i % 2 ? '#e63946' : '#1d4ed8' }; });
function bulleAuHasard(): BulleBd {
  const w = window.innerWidth, h = window.innerHeight;
  const haut = Math.random() > 0.5;
  return {
    id: Date.now(),
    x: w * 0.05 + Math.random() * Math.max(0, w * 0.9 - 140),
    y: h * (haut ? 0.2 + Math.random() * 0.08 : 0.74 + Math.random() * 0.09),
    mot: auHasard(['POW!', 'ZAP!', 'BOOM!', 'WHAM!', 'BAM!']),
    f: auHasard(['#e63946', '#1d4ed8', '#ffffff']),
    r: -14 + Math.random() * 28,
  };
}
function BdPop() {
  const [bulle, setBulle] = useState<BulleBd | null>(null);
  useCadence(2200, 5000, 5000, () => setBulle(bulleAuHasard()));
  return (
    <>
      <i className="fa-trame" />
      {bulle && (
        <span key={bulle.id} className="fa-bd-bulle" style={{ left: bulle.x, top: bulle.y }}>
          <span className={`fa-bd-ovale${bulle.f === '#ffffff' ? ' clair' : ''}`} style={{ background: bulle.f, '--r': `${bulle.r}deg` } as Css}><i /><b>{bulle.mot}</b></span>
          {GICLES.map((g, i) => (
            <i key={i} className="fa-bd-gicle" style={{ background: g.c, '--dx': `${g.dx}px`, '--dy': `${g.dy}px` } as Css} />
          ))}
        </span>
      )}
    </>
  );
}
function CoupsBd() {
  const coups = useCoups(1000, (x, y) => ({
    x, y, mot: auHasard(['POW!', 'BAM!', 'ZAP!']), r: -12 + Math.random() * 24,
    parts: Array.from({ length: 10 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 10 + Math.random() * 0.4, d = 60 + Math.random() * 40;
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, c: i % 2 ? '#e63946' : '#1d4ed8', t: 8 + Math.random() * 6 };
    }),
  }));
  if (!coups.length) return null;
  return (
    <div className="fa-eclats" aria-hidden="true">
      {coups.map((c) => (
        <span key={c.id} className="fa-boum-lieu" style={{ left: c.x, top: c.y }}>
          {c.parts.map((p, i) => (
            <i key={i} className="fa-boum-pt" style={{ left: -p.t / 2, top: -p.t / 2, width: p.t, height: p.t, background: p.c, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` } as Css} />
          ))}
          <span className="fa-boum" style={{ '--r': `${c.r}deg` } as Css}><i /><i /><i /><b>{c.mot}</b></span>
        </span>
      ))}
    </div>
  );
}

/* ---------- CHANTIER 192 — Jardin : le temps qu'il fait ---------- */
const FLEURS_J: Array<[string, number]> = [['#f28b82', 12], ['#ffd966', 9], ['#ffffff', 11], ['#b4a7d6', 14], ['#f6b26b', 9], ['#8ecae6', 12]];
const coeurDe = (c: string) => (c === '#ffd966' ? '#c4643c' : '#ffd966');
const NUAGES_J: Array<[number, number, number]> = [[11, 9, 150], [53, 16, 120], [-5, 25, 130]];
const MONARQUE = { '--c1': '#ffb347', '--c2': '#e2691b', '--bord': '#3b2615', '--corps': '#2a1d12', '--bat': '0.19s' };
const AZURE = { '--c1': '#bfe3f7', '--c2': '#6f8fe0', '--bord': '#2f3a5a', '--corps': '#232a40', '--bat': '0.15s' };

/* Les fleurs de la bande de terre : posées DANS la barre d'onglets, au-dessus
   d'elle, comme l'était le dessin fixe (jardin.css). La barre peut disparaître
   (Révision) puis revenir : la pousse reprend où elle en était. */
/* CHANTIER 193 — où l'on entre dans le cycle (en secondes), le même pour tout le Jardin. */
/* CHANTIER 195 — quatre fois plus rapide : 37,5 s (à garder égal à --cycle-j, anime.css). */
const CYCLE_J = 37.5;
const DECAL_J = CYCLE_J * (0.36 - Math.random() * 0.13);

function FleursJardin({ t0 }: { t0: number }) {
  const [barre, setBarre] = useState<HTMLElement | null>(() => document.querySelector<HTMLElement>('.tabbar'));
  useEffect(() => {
    let attente = 0;
    const chercher = () => { attente = 0; setBarre(document.querySelector<HTMLElement>('.tabbar')); };
    const obs = new MutationObserver(() => { if (!attente) attente = requestAnimationFrame(chercher); });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); cancelAnimationFrame(attente); };
  }, []);
  if (!barre) return null;
  const ecoule = (performance.now() - t0) / 1000 + DECAL_J;
  const n = Math.max(6, Math.round(window.innerWidth / 40));
  return createPortal(
    <span className="fa-j-fleurs" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const [coul, h] = FLEURS_J[i % FLEURS_J.length];
        return (
          <span key={i} className="fa-j-fleur" style={{ left: `${((i + 0.5) * 100) / n}%`, animationDelay: `${-ecoule - i * 0.15}s` }}>
            <i className="fa-j-tige" style={{ height: h, animationDelay: `${-ecoule}s` }} />
            <i className="fa-j-tete" style={{ bottom: h - 1, '--c': coul, '--coeur': coeurDe(coul), '--h': `${h}px`, animationDelay: `${-ecoule}s` } as Css} />
          </span>
        );
      })}
    </span>,
    barre,
  );
}

function Papillon({ couleurs, chemin, dur, del }: { couleurs: Record<string, string>; chemin: string; dur: number; del: number }) {
  const ailes = <><i /><i /></>;
  return (
    <span className="fa-papillon" style={{ offsetPath: `path("${chemin}")`, animationDuration: `${dur}s`, animationDelay: `${del}s`, ...couleurs } as Css}>
      <span className="fa-aile g">{ailes}</span>
      <span className="fa-aile d"><span>{ailes}</span></span>
      <i className="fa-corps" /><i className="fa-tete" /><i className="fa-antenne g" /><i className="fa-antenne d" />
    </span>
  );
}

function Jardin() {
  const [t0] = useState(() => performance.now());
  const { pollen, pluie, chemins } = useMemo(() => {
    const r = hasard(23);
    const w = window.innerWidth, h = window.innerHeight;
    const X = (f: number) => (f * w).toFixed(0), Y = (f: number) => (f * h).toFixed(0);
    return {
      pollen: Array.from({ length: 14 }, () => ({ x: 10 + r() * 84, y: 12 + r() * 58, t: 3 + r() * 2.5, dur: 6 + r() * 4, del: -r() * 10, dx: (r() - 0.3) * 50 })),
      pluie: Array.from({ length: 44 }, () => ({ x: r() * 112, haut: -30 - r() * 60, l: 12 + r() * 10, dur: 0.8 + r() * 0.4, del: -r() * 1.2 })),
      chemins: [
        `M -30 ${Y(0.39)} C ${X(0.17)} ${Y(0.29)}, ${X(0.33)} ${Y(0.5)}, ${X(0.53)} ${Y(0.37)} S ${X(0.83)} ${Y(0.26)}, ${w + 40} ${Y(0.34)}`,
        `M ${w + 40} ${Y(0.24)} C ${X(0.83)} ${Y(0.34)}, ${X(0.69)} ${Y(0.16)}, ${X(0.47)} ${Y(0.26)} S ${X(0.17)} ${Y(0.39)}, -30 ${Y(0.28)}`,
      ],
    };
  }, []);
  return (
    <span className="fa-j" style={{ '--decal-j': `${-DECAL_J}s` } as Css}>
      <i className="fa-j-gris" />
      <i className="fa-j-soleil" />
      {NUAGES_J.map(([x, y, l], i) => (
        <span key={i} className="fa-j-nuage" style={{ left: `${x}%`, top: `${y}%`, width: l, height: l * 0.42 }}><i /><i /><i /></span>
      ))}
      <span className="fa-j-beau">
        {pollen.map((p, i) => (
          <i key={i} className="fa-j-pollen" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.t, height: p.t, '--dx': `${p.dx}px`, animationDuration: `${p.dur}s`, animationDelay: `${p.del}s` } as Css} />
        ))}
        <Papillon couleurs={MONARQUE} chemin={chemins[0]} dur={13} del={-2} />
        <Papillon couleurs={AZURE} chemin={chemins[1]} dur={17} del={-9} />
      </span>
      <span className="fa-j-pluie">
        {pluie.map((g, i) => (
          <i key={i} className="fa-j-goutte" style={{ left: `${g.x}%`, top: g.haut, height: g.l, animationDuration: `${g.dur}s`, animationDelay: `${g.del}s` }} />
        ))}
      </span>
      <FleursJardin t0={t0} />
    </span>
  );
}
const PETALES = [0, 60, 120, 180, 240, 300];
function CoupsJardin() {
  const coups = useCoups(1500, (x, y) => ({ x, y, c: auHasard(['#f28b82', '#ffd966', '#b4a7d6', '#f6b26b', '#8ecae6', '#ffffff']) }));
  if (!coups.length) return null;
  return (
    <div className="fa-eclats" aria-hidden="true">
      {coups.map((k) => (
        <span key={k.id} className="fa-eclot" style={{ left: k.x - 22, top: k.y - 22, '--c': k.c, '--coeur': coeurDe(k.c) } as Css}>
          {PETALES.map((a) => <i key={a} style={{ transform: `rotate(${a}deg)` }} />)}
          <b />
        </span>
      ))}
    </div>
  );
}

/* ---------- CHANTIER 196 — Parquet : la salle et le match ---------- */
const PROJOS: Array<{ x: number; a: number; b: number; dur: number; del: number; c: string }> = [
  { x: 14, a: -26, b: 8, dur: 11, del: -3, c: '255,244,214' },
  { x: 50, a: 20, b: -20, dur: 8.5, del: -6, c: '255,206,150' },
  { x: 86, a: -6, b: 28, dur: 13, del: -1, c: '214,228,255' },
];
type Flash = { id: number; x: number; y: number; d: number; t: number };
function Salle() {
  const [salve, setSalve] = useState<{ id: number; flashs: Flash[] } | null>(null);
  useCadence(1500, 3000, 4000, () => {
    const id = Date.now();
    const n = 2 + Math.floor(Math.random() * 3);
    setSalve({ id, flashs: Array.from({ length: n }, (_, i) => ({ id: id + i, x: 5 + Math.random() * 90, y: 2 + Math.random() * 11, d: i * (60 + Math.random() * 120), t: 10 + Math.random() * 8 })) });
  });
  return (
    <>
      <i className="fa-p-nuit" />
      {PROJOS.map((p, i) => (
        <span key={i} className="fa-projo" style={{ left: `${p.x}%`, '--a': `${p.a}deg`, '--b': `${p.b}deg`, '--c': p.c, animationDuration: `${p.dur}s`, animationDelay: `${p.del}s` } as Css}>
          <span className="fa-faisceau" style={{ animationDuration: `${2.6 + i * 0.7}s` }}><i /></span>
          <i className="fa-flaque" />
          <i className="fa-lampe" />
        </span>
      ))}
      {salve && (
        <span key={salve.id} className="fa-salve">
          <i className="fa-salve-ecran" />
          {salve.flashs.map((f) => (
            <span key={f.id} className="fa-flash" style={{ left: `${f.x}%`, top: `${f.y}%`, '--t': `${f.t}px`, animationDelay: `${f.d}ms` } as Css}><i /><i /><i /></span>
          ))}
        </span>
      )}
      <Tableau />
    </>
  );
}
/* Le tableau d'affichage : visible seulement sur « Aujourd'hui » (anime.css). */
function Tableau() {
  const [m, setM] = useState({ chrono: 24, dom: 42, vis: 38, sirene: 0, marque: 0 });
  useEffect(() => {
    if (calme()) return;
    const h = window.setInterval(() => {
      if (enRevision() || document.visibilityState !== 'visible') return;
      setM((s) => {
        if (s.chrono > 1) return { ...s, chrono: s.chrono - 1 };
        const dom = Math.random() > 0.4;
        return { chrono: 24, dom: s.dom + (dom ? 2 : 0), vis: s.vis + (dom ? 0 : 2), sirene: Date.now(), marque: dom ? 0 : 1 };
      });
    }, 1000);
    return () => window.clearInterval(h);
  }, []);
  return (
    <span className="fa-tableau">
      {m.sirene > 0 && <i key={`s${m.sirene}`} className="fa-sirene" />}
      <span className="fa-equipe"><small>DOM</small><b>{m.dom}</b></span>
      <span className={`fa-chrono${m.chrono <= 5 ? ' fin' : ''}`}><b>{String(m.chrono).padStart(2, '0')}</b></span>
      <span className="fa-equipe"><small>VIS</small><b>{m.vis}</b></span>
      {m.sirene > 0 && <b key={`p${m.sirene}`} className={`fa-plus2${m.marque ? ' vis' : ''}`}>+2</b>}
    </span>
  );
}

/* ---------- CHANTIER 197 — Pelouse : le stade de nuit et la tribune ---------- */
/* [gauche, haut, rotation, longueur du cône] — gauche en %, haut et longueur en fraction de hauteur ; null = sous la tribune. */
const PYLONES: Array<{ x: string; y: string; r: number; l: string }> = [
  { x: '14px', y: 'calc(env(safe-area-inset-top) + 46px)', r: -32, l: '74vh' },
  { x: 'calc(100% - 14px)', y: 'calc(env(safe-area-inset-top) + 46px)', r: 32, l: '74vh' },
  { x: '-6px', y: '43vh', r: -78, l: '44vh' },
  { x: 'calc(100% + 6px)', y: '43vh', r: 78, l: '44vh' },
];
type Joueur = { id: number; d: string; dur: number };
function joueurAuHasard(): Joueur {
  const w = window.innerWidth, h = window.innerHeight;
  const bord = (sauf: number) => {
    let k: number;
    do { k = Math.floor(Math.random() * 4); } while (k === sauf);
    const p = k === 0 ? [-50, h * (0.16 + Math.random() * 0.74)] : k === 1 ? [w + 50, h * (0.16 + Math.random() * 0.74)] : k === 2 ? [Math.random() * w, h * 0.1] : [Math.random() * w, h + 30];
    return { k, p };
  };
  const a = bord(-1), b = bord(a.k);
  const cx = () => (w * (0.1 + Math.random() * 0.8)).toFixed(0), cy = () => (h * (0.24 + Math.random() * 0.58)).toFixed(0);
  const f = (n: number) => n.toFixed(0);
  const lg = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1]);
  return { id: Date.now() + Math.random(), d: `M ${f(a.p[0])} ${f(a.p[1])} C ${cx()} ${cy()}, ${cx()} ${cy()}, ${f(b.p[0])} ${f(b.p[1])}`, dur: Math.max(2.6, lg / (110 + Math.random() * 60)) };
}
const OMBRES = [-150, 150, -35, 35];
function Stade() {
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  useCadence(800, 1200, 3000, () => {
    setJoueurs((l) => {
      if (l.length >= 3) return l;
      const j = joueurAuHasard();
      window.setTimeout(() => setJoueurs((x) => x.filter((y) => y.id !== j.id)), j.dur * 1000 + 100);
      return [...l, j];
    });
  });
  return (
    <span className="fa-stade">
      <i className="fa-s-nuit" />
      {PYLONES.map((p, i) => (
        <span key={i} className="fa-pylone" style={{ left: p.x, top: p.y, transform: `rotate(${p.r}deg)` }}>
          <span className="fa-cone" style={{ height: p.l, animationDuration: `${5 + i * 1.3}s` }}><i /></span>
          <i className="fa-c-flaque" style={{ top: `calc(${p.l} - 60px)` }} />
        </span>
      ))}
      {PYLONES.slice(2).map((p, i) => <i key={`m${i}`} className="fa-mat" style={{ left: p.x, top: p.y }} />)}
      {joueurs.map((j) => (
        <span key={j.id} className="fa-joueur" style={{ offsetPath: `path("${j.d}")`, animationDuration: `${j.dur}s` }}>
          {OMBRES.map((r, i) => <i key={i} style={{ '--r': `${r}deg`, animationDelay: `${-i * 0.08}s` } as Css} />)}
          <b />
        </span>
      ))}
      <Tribune />
    </span>
  );
}
const COUL_FOULE = ['#ffd400', '#ffffff', '#2ea85a', '#d93636', '#2f6fd6', '#ffd400', '#ffffff'];
type Fete = { id: number; sorte: 'fumee' | 'confettis'; g: boolean; confettis: Array<{ x: number; y: number; c: string; dx: number; rt: number; dur: number; del: number }> };
function Tribune() {
  const foule = useMemo(() => {
    const r = hasard(31);
    const cols = Math.max(20, Math.floor((window.innerWidth - 60) / 7.5));
    return Array.from({ length: cols * 3 }, (_, i) => ({ col: i % cols, rang: Math.floor(i / cols), c: COUL_FOULE[Math.floor(r() * COUL_FOULE.length)] }));
  }, []);
  const [ola, setOla] = useState(0);
  const [fete, setFete] = useState<Fete | null>(null);
  useCadence(2000, 8000, 4000, () => {
    const id = Date.now();
    setOla(id);
    const r = Math.random();
    const w = window.innerWidth;
    setFete(r < 0.25 ? { id, sorte: 'fumee', g: Math.random() > 0.5, confettis: [] }
      : r < 0.5 ? { id, sorte: 'confettis', g: false, confettis: Array.from({ length: 30 }, () => ({ x: Math.random() * w, y: 30 + Math.random() * 40, c: auHasard(['#ffd400', '#2ea85a', '#ffffff']), dx: (Math.random() - 0.5) * 80, rt: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540), dur: 2.4 + Math.random() * 1.4, del: Math.random() * 0.6 })) }
      : null);
  });
  return (
    <>
      <span className="fa-tribune">
        {foule.map((p, i) => (
          <i key={`${ola}-${i}`} className={ola ? 'ola' : ''} style={{ left: 30 + p.col * 7.5, top: `calc(env(safe-area-inset-top) + ${26 + p.rang * 11}px)`, background: p.c, opacity: 0.55 + p.rang * 0.12, animationDelay: `${p.col * 0.045 + p.rang * 0.02}s` }} />
        ))}
        {PYLONES.slice(0, 2).map((p, i) => <i key={`m${i}`} className="fa-mat" style={{ left: p.x, top: p.y }} />)}
      </span>
      {fete?.sorte === 'fumee' && (
        <span key={fete.id} className="fa-fumee" style={{ left: fete.g ? 24 : 'calc(100% - 60px)' }}>
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ background: i % 2 ? 'rgba(255, 212, 0, 0.7)' : 'rgba(46, 168, 90, 0.7)', '--dx': `${(fete.g ? 1 : -1) * (10 + i * 6)}px`, animationDelay: `${i * 0.22}s` } as Css} />
          ))}
        </span>
      )}
      {fete?.sorte === 'confettis' && (
        <span key={fete.id} className="fa-confettis">
          {fete.confettis.map((k, i) => (
            <i key={i} style={{ left: k.x, top: k.y, background: k.c, '--dx': `${k.dx}px`, '--rt': `${k.rt}deg`, animationDuration: `${k.dur}s`, animationDelay: `${k.del}s` } as Css} />
          ))}
        </span>
      )}
    </>
  );
}

/* ---------- CHANTIER 198 — Mêlée : la pluie et la mêlée ---------- */
const RANGS_M: Array<[number, number]> = [[0, -14], [0, 0], [0, 14], [-14, -21], [-14, -7], [-14, 7], [-14, 21], [-28, 0]];
type Melee = { id: number; x: number; y: number; r: number };
function JoueurM({ x, y, i, peau }: { x: number; y: number; i: number; peau: string }) {
  return (
    <span className="fa-m-j" style={{ left: x, top: y }}>
      <i className="fa-m-trou" style={{ animationDelay: `${4.25 + i * 0.07}s` }} />
      <span className="fa-m-debout">
        <span className="fa-m-plouf" style={{ animationDelay: `${4.3 + i * 0.07}s` }}>
          <i className="fa-m-dos" style={{ animationDelay: `${i * 0.02}s` }} />
          <i className="fa-m-tete" style={{ background: peau }} />
        </span>
      </span>
    </span>
  );
}
function Rugby() {
  const { pluie, flaques } = useMemo(() => {
    const r = hasard(59);
    return {
      pluie: Array.from({ length: 50 }, () => ({ x: r() * 140, haut: -40 - r() * 60, l: 14 + r() * 12, dur: 0.7 + r() * 0.4, del: -r() * 1.1 })),
      flaques: [[11, 55, 90], [61, 43, 70], [69, 80, 100], [19, 87, 60], [42, 68, 54]].map(([x, y, w]) => ({ x, y, w, ronds: [0, 1, 2].map(() => ({ x: 20 + r() * 60, y: 25 + r() * 50, dur: 1.1 + r() * 0.8, del: -r() * 2 })) })),
    };
  }, []);
  const [melee, setMelee] = useState<Melee | null>(null);
  useCadence(1500, 7000, 4000, () => {
    const w = window.innerWidth, h = window.innerHeight;
    setMelee({ id: Date.now(), x: w * (0.19 + Math.random() * 0.62), y: h * (0.33 + Math.random() * 0.5), r: (Math.random() - 0.5) * 50 });
  });
  return (
    <span className="fa-rugby">
      <i className="fa-r-ciel" />
      {melee && (
        <span key={melee.id} className="fa-melee" style={{ left: melee.x, top: melee.y, transform: `rotate(${melee.r}deg)` }}>
          <span className="fa-m-groupe">
            <i className="fa-m-ombre" />
            <span className="fa-m-pousse">
              <span className="fa-m-pack a">{RANGS_M.map(([x, y], i) => <JoueurM key={i} x={-8 + x} y={y} i={i} peau={i % 3 ? '#e0b48a' : '#8d5a3b'} />)}</span>
              <span className="fa-m-pack b">{RANGS_M.map(([x, y], i) => <JoueurM key={i} x={8 - x} y={y} i={i + 0.5} peau={i % 3 === 1 ? '#8d5a3b' : '#e0b48a'} />)}</span>
            </span>
            <b className="fa-m-plop" style={{ transform: `rotate(${-melee.r}deg)` }}>plop !</b>
          </span>
        </span>
      )}
      {flaques.map((f, i) => (
        <span key={i} className="fa-flaque" style={{ left: `${f.x}%`, top: `${f.y}%`, width: f.w, height: f.w * 0.32 }}>
          {f.ronds.map((o, j) => <i key={j} style={{ left: `${o.x}%`, top: `${o.y}%`, animationDuration: `${o.dur}s`, animationDelay: `${o.del}s` }} />)}
        </span>
      ))}
      <i className="fa-brume" style={{ top: '40%', '--a': 0.16, animationDuration: '26s' } as Css} />
      <i className="fa-brume" style={{ top: '74%', '--a': 0.12, animationDuration: '34s', animationDelay: '-12s' } as Css} />
      {pluie.map((g, i) => (
        <i key={i} className="fa-r-goutte" style={{ left: `${g.x}%`, top: g.haut, height: g.l, animationDuration: `${g.dur}s`, animationDelay: `${g.del}s` }} />
      ))}
    </span>
  );
}
function CoupsRugby() {
  const coups = useCoups(1300, (x, y) => ({
    x, y,
    gouttes: Array.from({ length: 11 }, (_, i) => {
      const a = Math.PI + (Math.PI * i) / 10 + (Math.random() - 0.5) * 0.3, d = 26 + Math.random() * 40;
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.9 - 10, t: 4 + Math.random() * 7 };
    }),
    mottes: Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({ dx: (Math.random() - 0.5) * 110, dy: -60 - Math.random() * 40 })),
  }));
  if (!coups.length) return null;
  return (
    <div className="fa-eclats boue" aria-hidden="true">
      {coups.map((k) => (
        <span key={k.id} className="fa-boue" style={{ left: k.x, top: k.y }}>
          <i className="fa-tache" />
          {k.gouttes.map((g, i) => <i key={i} className="fa-boue-g" style={{ left: -g.t / 2, top: -g.t / 2, width: g.t, height: g.t, background: i % 3 ? '#5a3d22' : '#6b4a2b', '--dx': `${g.dx}px`, '--dy': `${g.dy}px` } as Css} />)}
          {k.mottes.map((m, i) => <i key={`m${i}`} className="fa-motte" style={{ '--dx': `${m.dx}px`, '--dy': `${m.dy}px` } as Css} />)}
        </span>
      ))}
    </div>
  );
}

/* ---------- CHANTIER 199 — Strass : la boule à facettes et ses reflets ---------- */
type Spot = { x0: number; y: number; v: number; r: number; o: number; f: number; p: number; or: boolean };
/* Un reflet tout prêt (cœur net, bord flou), dessiné une fois puis recopié. */
function spriteReflet(rgb: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const d = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.28, `rgba(${rgb},0.75)`); d.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = d; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#fff'; g.fillRect(26, 26, 12, 12);
  }
  return c;
}
const bruit = (i: number, j: number) => { const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return v - Math.floor(v); };
function dessineStrass(g: CanvasRenderingContext2D, w: number, h: number, t: number, CY: number, spots: Spot[], blanc: HTMLCanvasElement, or: HTMLCanvasElement) {
  /* CHANTIER 201 — au centre, plus grosse, en arrière-plan derrière la ligne du niveau. */
  const R = 50, CX = w / 2, VOILE = 0.5;
  g.clearRect(0, 0, w, h);
  /* Le halo. */
  const halo = g.createRadialGradient(CX, CY, R * 0.6, CX, CY, 190);
  halo.addColorStop(0, 'rgba(255,236,190,0.2)'); halo.addColorStop(1, 'rgba(255,236,190,0)');
  g.fillStyle = halo; g.fillRect(CX - 190, 0, 380, CY + 190);
  /* Les reflets : ils glissent tous dans le même sens et s'étirent en s'éloignant de la boule. */
  g.globalCompositeOperation = 'lighter';
  for (const s of spots) {
    const x = ((s.x0 + t * s.v) % (w + 80)) - 40;
    const bord = Math.max(0, Math.min(1, (x + 40) / 70, (w + 40 - x) / 70));
    const al = s.o * (0.55 + 0.45 * Math.sin(t * s.f + s.p)) * bord;
    if (al < 0.03) continue;
    const dx = x - CX, dy = s.y - CY, rr = s.r * 3.2;
    g.save();
    g.translate(x, s.y); g.rotate(Math.atan2(dy, dx)); g.scale(1 + Math.hypot(dx, dy) / 420, 1);
    g.globalAlpha = al;
    g.drawImage(s.or ? or : blanc, -rr, -rr, rr * 2, rr * 2);
    g.restore();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  /* Le fil, puis la boule : voilés, pour que le texte du niveau reste lisible par-dessus. */
  g.globalAlpha = VOILE;
  if (CY - R > 0) { g.strokeStyle = 'rgba(240,211,136,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(CX, 0); g.lineTo(CX, CY - R); g.stroke(); }
  /* La boule : des rangées de petits miroirs sur une sphère, vue un peu d'en dessous. */
  const rot = t * 0.32, ti = -0.35, ct = Math.cos(ti), st = Math.sin(ti);
  const Ln = Math.hypot(-0.5, 0.62, 0.6), L = [-0.5 / Ln, 0.62 / Ln, 0.6 / Ln];
  const P = (la: number, lo: number): [number, number, number] => {
    const x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
    return [x, y * ct - z * st, y * st + z * ct];
  };
  const S = (p: [number, number, number]): [number, number] => [CX + p[0] * R, CY - p[1] * R];
  g.save();
  g.beginPath(); g.arc(CX, CY, R, 0, Math.PI * 2); g.fillStyle = '#1b1820'; g.fill(); g.clip();
  const RANGS = 16, eclats: Array<[number, number, number]> = [];
  for (let i = 0; i < RANGS; i++) {
    const la0 = -Math.PI / 2 + (i * Math.PI) / RANGS, la1 = la0 + Math.PI / RANGS, lm = (la0 + la1) / 2;
    const M = Math.max(6, Math.round(34 * Math.cos(lm))), dl = (la1 - la0) * 0.09;
    for (let j = 0; j < M; j++) {
      const lo0 = (j * 2 * Math.PI) / M + rot + (i % 2) * (Math.PI / M), lo1 = lo0 + (2 * Math.PI) / M, dlo = (lo1 - lo0) * 0.09;
      const n = P(lm, (lo0 + lo1) / 2);
      if (n[2] <= 0.03) continue;
      const ndl = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
      const spec = Math.pow(Math.max(0, 2 * ndl * n[2] - L[2]), 26);
      const k = bruit(i, j), base = 52 + Math.max(0, ndl) * 120 + k * 46, chaud = k > 0.82 ? 1 : 0;
      const r = Math.min(255, base + spec * 190 + chaud * 34), v = Math.min(255, base + spec * 175 + chaud * 16), b = Math.min(255, base + 14 + spec * 120);
      const a = S(P(la0 + dl, lo0 + dlo)), bq = S(P(la0 + dl, lo1 - dlo)), cq = S(P(la1 - dl, lo1 - dlo)), d = S(P(la1 - dl, lo0 + dlo));
      g.fillStyle = `rgb(${r | 0},${v | 0},${b | 0})`;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(bq[0], bq[1]); g.lineTo(cq[0], cq[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
      if (spec > 0.5 && k > 0.45) eclats.push([...S(n), spec]);
    }
  }
  const ombre = g.createRadialGradient(CX - R * 0.35, CY - R * 0.3, R * 0.1, CX, CY, R);
  ombre.addColorStop(0, 'rgba(255,255,255,0.1)'); ombre.addColorStop(0.68, 'rgba(0,0,0,0)'); ombre.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = ombre; g.fillRect(CX - R, CY - R, R * 2, R * 2);
  g.restore();
  /* Les miroirs qui renvoient la lumière : un petit éclat en croix. */
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineWidth = 1;
  for (const [x, y, s] of eclats.slice(0, 4)) {
    const l = 4 + s * 7;
    g.strokeStyle = `rgba(255,250,235,${(0.5 + s * 0.5) * 0.7})`;
    g.beginPath(); g.moveTo(x - l, y); g.lineTo(x + l, y); g.moveTo(x, y - l); g.lineTo(x, y + l); g.stroke();
    const gl = g.createRadialGradient(x, y, 0, x, y, 5);
    gl.addColorStop(0, 'rgba(255,255,255,0.9)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fillRect(x - 5, y - 5, 10, 10);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}
/* CHANTIER 201 — la boule se centre sur la ligne du niveau et de la série (sous l'encoche, plus derrière la batterie). */
function hauteurBoule(): number {
  const el = document.querySelector<HTMLElement>('.today.ly .ly-niv');
  const r = el?.getBoundingClientRect();
  return r && r.height ? r.top + r.height / 2 : 87;
}
function Strass() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const blanc = spriteReflet('255,246,226'), or = spriteReflet('240,211,136');
    let w = 0, h = 0, cy = 87, spots: Spot[] = [];
    const taille = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(30, Math.min(90, Math.round((52 * w * h) / (360 * 760))));
      spots = Array.from({ length: n }, () => ({ x0: Math.random() * (w + 80), y: 72 + Math.random() * Math.max(100, h - 120), v: 16 + Math.random() * 9, r: 1.4 + Math.random() * 2.4, o: 0.3 + Math.random() * 0.6, f: 0.8 + Math.random() * 2.6, p: Math.random() * 6.28, or: Math.random() < 0.4 }));
    };
    taille();
    let t = Math.random() * 20, avant = performance.now(), dernier = 0, place = 0, raf = 0;
    const dessine = () => dessineStrass(g, w, h, t, cy, spots, blanc, or);
    const pas = (now: number) => {
      raf = requestAnimationFrame(pas);
      if (now - dernier < 33) return; // 30 images/s au plus
      const dt = Math.min(0.1, (now - avant) / 1000);
      avant = now; dernier = now;
      if (!c.getClientRects().length) return; // masquée : hors « Aujourd'hui »
      if (now - place > 1000) { cy = hauteurBoule(); place = now; }
      t += dt;
      dessine();
    };
    const surTaille = () => { taille(); cy = hauteurBoule(); dessine(); };
    window.addEventListener('resize', surTaille);
    if (calme()) {
      /* Réduire les animations : une seule image, immobile (redessinée si l'écran change de taille). */
      const attente = window.setTimeout(() => { cy = hauteurBoule(); dessine(); }, 300);
      return () => { window.clearTimeout(attente); window.removeEventListener('resize', surTaille); };
    }
    raf = requestAnimationFrame(pas);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', surTaille); };
  }, []);
  return <canvas ref={ref} className="fa-s-toile" />;
}
const BRILLANTS = '.today.ly .ly-flamme, .today.ly .eventail-carte.centre .eventail-dos, .today.ly .btn.ly-go, .today.ly .ly-niv';
const PAILLETTES = ['#f0d388', '#fff1c2', '#c9962f', '#ffffff'];
function EclatsStrass() {
  const [eclat, setEclat] = useState<{ id: number; x: number; y: number } | null>(null);
  useCadence(2000, 8000, 2000, () => {
    const el = auHasard(Array.from(document.querySelectorAll<HTMLElement>(BRILLANTS)));
    const r = el?.getBoundingClientRect();
    if (!el || !r || !r.width) return;
    const flamme = el.classList.contains('ly-flamme');
    setEclat({ id: Date.now(), x: flamme ? r.left + 21 : r.right - 10, y: flamme ? r.top + r.height / 2 : r.top + 10 });
  });
  const coups = useCoups(1300, (x, y) => ({
    x, y,
    parts: Array.from({ length: 16 }, () => {
      const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 52;
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - 24, t: 4 + Math.random() * 4, c: auHasard(PAILLETTES), f: 0.16 + Math.random() * 0.2 };
    }),
  }));
  if (!eclat && !coups.length) return null;
  return (
    <div className="fa-eclats strass" aria-hidden="true">
      {eclat && (
        <span key={eclat.id} className="fa-s-croix" style={{ left: eclat.x, top: eclat.y }} onAnimationEnd={() => setEclat(null)}><i /><i /><i /><i /><b /></span>
      )}
      {coups.map((k) => (
        <span key={k.id} className="fa-s-lieu" style={{ left: k.x, top: k.y }}>
          {k.parts.map((p, i) => (
            <span key={i} className="fa-paillette" style={{ left: -p.t / 2, top: -p.t / 2, width: p.t, height: p.t, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` } as Css}>
              <i style={{ '--c': p.c, animationDuration: `${p.f}s` } as Css} />
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

type Eclat = { id: number; x: number; y: number; parts: Array<{ dx: number; dy: number; t: number }> };

const COULEURS_PIXEL = ['#ff3ea5', '#29f0ff', '#ffe14d', '#3dff8b', '#ffffff'];

function Eclats({ forme }: { forme: 'bulle' | 'etincelle' | 'poussiere' | 'pixel' }) {
  const [eclats, setEclats] = useState<Eclat[]>([]);
  useEffect(() => {
    let n = 0;
    const toucher = (e: PointerEvent) => {
      if (calme() || enRevision()) return;
      const id = ++n;
      const nb = forme === 'pixel' ? 16 : 12;
      const parts = Array.from({ length: nb }, (_, i) => {
        const a = (Math.PI * 2 * i) / nb + Math.random() * 0.5;
        const d = 30 + Math.random() * 50;
        /* Borne arcade : des pixels carrés, posés sur une grille de 4 px. */
        if (forme === 'pixel') return { dx: Math.round((Math.cos(a) * d) / 4) * 4, dy: Math.round((Math.sin(a) * d) / 4) * 4, t: Math.random() > 0.5 ? 6 : 4 };
        return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - (forme === 'bulle' ? 40 : 0), t: 4 + Math.random() * 8 };
      });
      setEclats((l) => [...l.slice(-3), { id, x: e.clientX, y: e.clientY, parts }]);
      window.setTimeout(() => setEclats((l) => l.filter((b) => b.id !== id)), 1200);
    };
    document.addEventListener('pointerdown', toucher, { passive: true });
    return () => document.removeEventListener('pointerdown', toucher);
  }, [forme]);
  if (!eclats.length) return null;
  return (
    <div className="fa-eclats" aria-hidden="true">
      {eclats.flatMap((b) => b.parts.map((p, i) => {
        const c = forme === 'pixel' ? COULEURS_PIXEL[(b.id + i) % COULEURS_PIXEL.length] : undefined;
        return (
          <i key={`${b.id}-${i}`} className={`fa-eclat ${forme}`} style={{ left: b.x - p.t / 2, top: b.y - p.t / 2, width: p.t, height: p.t, '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, background: c, boxShadow: c ? `0 0 6px ${c}` : undefined } as Css} />
        );
      }))}
      {forme === 'pixel' && eclats.map((b) => (
        <b key={`${b.id}-plus`} className="fa-plusun" style={{ left: b.x - 14, top: b.y - 30 }}>+1</b>
      ))}
    </div>
  );
}

export function FondAnime() {
  const style = useStyle();
  if (style !== 'ocean' && style !== 'decollage' && style !== 'orbite' && style !== 'arcade' && style !== 'neon' && style !== 'voyage' && style !== 'manga' && style !== 'bd' && style !== 'jardin' && style !== 'foot' && style !== 'rugby' && style !== 'basket' && style !== 'strass') return null;
  const forme = style === 'ocean' ? 'bulle' : style === 'decollage' ? 'etincelle' : style === 'orbite' ? 'poussiere' : style === 'arcade' ? 'pixel' : null; // Néon et Carnet kraft : pas de gerbe
  return createPortal(
    <>
      <div className={`fond-anime ${style}`} aria-hidden="true">
        {style === 'ocean' && <Ocean />}
        {style === 'decollage' && <Ciel />}
        {style === 'orbite' && <Scintille />}
        {style === 'arcade' && <Arcade />}
        {style === 'neon' && <Neon />}
        {style === 'voyage' && <Carnet />}
        {style === 'manga' && <Manga />}
        {style === 'bd' && <BdPop />}
        {style === 'jardin' && <Jardin />}
        {style === 'foot' && <Stade />}
        {style === 'rugby' && <Rugby />}
        {style === 'basket' && <Salle />}
        {style === 'strass' && <Strass />}
      </div>
      {/* Néon : pas de gerbe au toucher, c'est l'enseigne qui vit. */}
      {forme && <Eclats forme={forme} />}
      {/* Carnet kraft : un coup de tampon à la place de la gerbe. */}
      {style === 'voyage' && <Tampons />}
      {style === 'manga' && <CoupsManga />}
      {style === 'bd' && <CoupsBd />}
      {style === 'jardin' && <CoupsJardin />}
      {style === 'rugby' && <CoupsRugby />}
      {style === 'strass' && <EclatsStrass />}
    </>,
    document.body,
  );
}
