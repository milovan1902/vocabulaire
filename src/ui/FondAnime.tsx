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
 * Posé à la racine du document, DERRIÈRE tout (z-index -1, anime.css) : il
 * ne gêne aucun toucher et ne connaît aucun écran. Rien n'est stocké.
 *
 * Sobriété : si le téléphone demande de réduire les animations, tout est
 * figé et il n'y a ni étoile filante ni gerbe. En Révision, le fond est
 * atténué, sans étoile filante ni gerbe : on y lit et on réfléchit.
 */
import { useEffect, useMemo, useState } from 'react';
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
  if (style !== 'ocean' && style !== 'decollage' && style !== 'orbite' && style !== 'arcade' && style !== 'neon') return null;
  const forme = style === 'ocean' ? 'bulle' : style === 'decollage' ? 'etincelle' : style === 'orbite' ? 'poussiere' : style === 'arcade' ? 'pixel' : null;
  return createPortal(
    <>
      <div className={`fond-anime ${style}`} aria-hidden="true">
        {style === 'ocean' && <Ocean />}
        {style === 'decollage' && <Ciel />}
        {style === 'orbite' && <Scintille />}
        {style === 'arcade' && <Arcade />}
        {style === 'neon' && <Neon />}
      </div>
      {/* Néon : pas de gerbe au toucher, c'est l'enseigne qui vit. */}
      {forme && <Eclats forme={forme} />}
    </>,
    document.body,
  );
}
