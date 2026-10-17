/**
 * CHANTIER 269 — « Atelier d'horloger » (maquette « Apparence Horloger v3 »).
 *
 * Tout ce qui est propre à l'apparence vit ici, pour ne pas alourdir
 * Today.tsx et Study.tsx :
 *  — AujourdhuiHorloger : l'écran « Aujourd'hui ». Les paquets sont des
 *    rouages de laiton ; « Cette semaine » ajoute un rouage par jour (à 6 / 5
 *    le balancier se met en marche, à 7 / 5 des rayons de lumière inondent
 *    l'écran).
 *  — le LANCEMENT : au toucher de « Remonter », chaque encart se transforme
 *    en disque de laiton, ses dents poussent, les rouages s'engrènent et
 *    tournent chacun sur son axe, puis l'écran plonge au centre du rouage du
 *    paquet avant d'ouvrir la révision.
 *  — MontreHorloger : la carte de révision, une montre de gousset qui
 *    s'ouvre sur la traduction ; chaque note a son animation et son son.
 *  — IconeHorloger : les cinq icônes de la barre d'onglets.
 *
 * Les couleurs et les formes fixes sont dans horloger.css ; ici, seulement
 * ce qui se calcule (positions, angles, phases).
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Grade } from '../domain/types';
import type { DeckSummary } from './deckSummary';
import { DeckFace } from './components';
import type { DeckControle } from '../engine/controle';
import { masteryLabel } from '../engine/mastery';
import logoGrave from '../assets/horloger-logo-grave.png';

/* ------------------------------------------------------------------
   Géométrie des rouages
   ------------------------------------------------------------------ */
const TOUR = Math.PI * 2;
const n2 = (v: number) => v.toFixed(2);

/** Une roue dentée simple (dents trapézoïdales), pour le décor et les icônes. */
function dents(r: number, n: number, h: number): string {
  const t = TOUR / n;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * t;
    for (const [b, rr] of [[a, r - h], [a + 0.2 * t, r], [a + 0.48 * t, r], [a + 0.68 * t, r - h]]) {
      pts.push(`${n2(rr * Math.cos(b))} ${n2(rr * Math.sin(b))}`);
    }
  }
  return `M${pts.join(' L')} Z`;
}

/**
 * Une roue au MODULE m : rayon primitif r = m·n / 2, dent centrée sur
 * l'angle i·(2π/n). Deux roues de même module, écartées de r1 + r2,
 * s'engrènent.
 */
function dentsM(r: number, n: number, m: number): string {
  const t = TOUR / n;
  const rO = r + m * 0.95;
  const rR = r - m * 1.15;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = i * t;
    for (const [q, rr] of [[c - 0.29 * t, rR], [c - 0.12 * t, rO], [c + 0.12 * t, rO], [c + 0.29 * t, rR]]) {
      pts.push(`${n2(rr * Math.cos(q))} ${n2(rr * Math.sin(q))}`);
    }
  }
  return `M${pts.join(' L')} Z`;
}

function trous(n: number, R: number, r: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i * TOUR) / n + Math.PI / n;
    const x = R * Math.cos(a);
    const y = R * Math.sin(a);
    d += `M${n2(x + r)} ${n2(y)} a${n2(r)} ${n2(r)} 0 1 0 ${n2(-2 * r)} 0 a${n2(r)} ${n2(r)} 0 1 0 ${n2(2 * r)} 0 `;
  }
  return d;
}

function traits(n: number, r1: number, r2: number, cy = 0, sauf?: (i: number) => boolean): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    if (sauf?.(i)) continue;
    const a = (i * TOUR) / n;
    d += `M${n2(r1 * Math.sin(a))} ${n2(cy - r1 * Math.cos(a))} L${n2(r2 * Math.sin(a))} ${n2(cy - r2 * Math.cos(a))} `;
  }
  return d;
}

function reduit(): boolean {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Le dégradé de laiton, à poser dans les <defs> de chaque dessin. */
function Laiton({ id, clair = '#f8e6b0', fonce = '#5e4418' }: { id: string; clair?: string; fonce?: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={clair} />
      <stop offset="0.42" stopColor="#c9a24a" />
      <stop offset="1" stopColor={fonce} />
    </linearGradient>
  );
}

/* ------------------------------------------------------------------
   Le son : synthétisé, rien à télécharger
   ------------------------------------------------------------------ */
let contexte: AudioContext | null = null;

export function sonHorloger(type: 'ouvre' | Grade) {
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    contexte = contexte ?? new C();
    const ac = contexte;
    if (ac.state === 'suspended') void ac.resume();
    const t0 = ac.currentTime + 0.01;
    const clic = (t: number, fq: number, g = 0.25, d = 0.035) => {
      const o = ac.createOscillator();
      const v = ac.createGain();
      const bp = ac.createBiquadFilter();
      o.type = 'square';
      o.frequency.value = fq;
      bp.type = 'bandpass';
      bp.frequency.value = fq;
      bp.Q.value = 6;
      v.gain.setValueAtTime(g, t0 + t);
      v.gain.exponentialRampToValueAtTime(0.0001, t0 + t + d);
      o.connect(bp).connect(v).connect(ac.destination);
      o.start(t0 + t);
      o.stop(t0 + t + d + 0.02);
    };
    const cloche = (t: number, fq: number, g = 0.12, d = 1.4) => {
      [1, 2.76].forEach((k, i) => {
        const o = ac.createOscillator();
        const v = ac.createGain();
        o.type = 'sine';
        o.frequency.value = fq * k;
        v.gain.setValueAtTime(0.0001, t0 + t);
        v.gain.exponentialRampToValueAtTime(g / (i ? 4 : 1), t0 + t + 0.01);
        v.gain.exponentialRampToValueAtTime(0.0001, t0 + t + d / (i ? 2 : 1));
        o.connect(v).connect(ac.destination);
        o.start(t0 + t);
        o.stop(t0 + t + d);
      });
    };
    const frottement = (t: number, d: number) => {
      const b = ac.createBuffer(1, Math.floor(ac.sampleRate * d), ac.sampleRate);
      const x = b.getChannelData(0);
      for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length);
      const s = ac.createBufferSource();
      const f = ac.createBiquadFilter();
      const v = ac.createGain();
      s.buffer = b;
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 3;
      v.gain.value = 0.2;
      s.connect(f).connect(v).connect(ac.destination);
      s.start(t0 + t);
    };
    if (type === 'ouvre') clic(0, 2400, 0.15);
    /* À revoir : six tics qui descendent, les aiguilles reculent. */
    if (type === 'again') [0, 0.11, 0.22, 0.33, 0.44, 0.55].forEach((t, i) => clic(t, 2600 - i * 180, 0.18));
    /* Difficile : un clic, un frottement, un clic de recul. */
    if (type === 'hard') { clic(0, 1300, 0.28); frottement(0.04, 0.22); clic(0.33, 900, 0.22); }
    /* Bien : un tic net. */
    if (type === 'good') { clic(0, 3300, 0.3, 0.03); clic(0.06, 1900, 0.12); }
    /* Facile : le tic-tac du mouvement et un carillon à deux notes. */
    if (type === 'easy') { [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84].forEach((t) => clic(t, 2800, 0.1)); cloche(0.05, 1318); cloche(0.25, 1760); }
  } catch {
    /* Pas de son sur cet appareil : l'animation suffit. */
  }
}

/* ------------------------------------------------------------------
   Le décor de l'atelier
   ------------------------------------------------------------------ */
function RouageDecor({ x, y, r, n, duree, sens, op, flou, id }: { x: number | string; y: number | string; r: number; n: number; duree: number; sens: 1 | -1; op: number; flou?: number; id: string }) {
  const s = r + 6;
  return (
    <svg
      className="hz-rouage-decor"
      width={s * 2}
      height={s * 2}
      viewBox={`${-s} ${-s} ${s * 2} ${s * 2}`}
      style={{ left: `calc(${typeof x === 'number' ? `${x}px` : x} - ${s}px)`, top: `calc(${typeof y === 'number' ? `${y}px` : y} - ${s}px)`, opacity: op, filter: flou ? `blur(${flou}px)` : undefined }}
    >
      <defs><Laiton id={id} clair="#f1dba0" fonce="#4e3a18" /></defs>
      <g style={{ transformBox: 'view-box', transformOrigin: '0px 0px', animation: `${sens > 0 ? 'hz-tourne' : 'hz-inverse'} ${duree}s linear infinite` }}>
        <path d={dents(r, n, Math.max(6, r * 0.11))} fill={`url(#${id})`} fillOpacity={0.22} stroke={`url(#${id})`} strokeWidth={1.4} />
        <circle r={r - 12} fill="none" stroke="#c9a24a" strokeOpacity={0.6} strokeWidth={1} />
        <g stroke="#c9a24a" strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round">
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i * TOUR) / 5;
            return <line key={i} x1={n2(12 * Math.cos(a))} y1={n2(12 * Math.sin(a))} x2={n2((r - 16) * Math.cos(a))} y2={n2((r - 16) * Math.sin(a))} />;
          })}
        </g>
        <circle r={9} fill="#15100c" stroke={`url(#${id})`} strokeWidth={2} />
      </g>
    </svg>
  );
}

function Poussieres({ n, graine }: { n: number; graine: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="hz-poussiere"
          style={{
            left: `${6 + ((i * 53 + graine * 31) % 88)}%`,
            top: `${10 + ((i * 97 + graine * 17) % 55)}%`,
            width: i % 3 ? 2 : 3,
            height: i % 3 ? 2 : 3,
            animationDuration: `${7 + (i % 5) * 1.7}s`,
            animationDelay: `${-(i * 1.3)}s`,
          }}
        />
      ))}
    </>
  );
}

/** Le mécanisme de « Cette semaine » : un rouage par jour, le balancier à 6 / 5. */
function Mecanisme({ jours }: { jours: number }) {
  const marche = jours >= 6;
  const lumiere = jours >= 7;
  const G: Array<[number, number, number]> = [[15, 34, 13], [35, 22, 9], [55, 35, 13], [76, 23, 9], [96, 36, 13]];
  const centre: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };
  return (
    <svg className={`hz-mecanisme${lumiere ? ' rayonne' : ''}`} viewBox="0 0 140 56" aria-hidden="true">
      <defs><Laiton id="hz-mg" clair="#fbe9b8" /></defs>
      {G.map(([x, y, r], i) => {
        const on = i < jours;
        const sens = i % 2 ? -1 : 1;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r={r - 1} fill="none" stroke="rgba(201,162,74,0.35)" strokeWidth={0.8} strokeDasharray="2 2" />
            <g style={{ ...centre, transform: `scale(${on ? 1 : 0})`, transition: 'transform .7s cubic-bezier(.3,1.7,.5,1)' }}>
              <g style={{ ...centre, animation: marche ? `${sens > 0 ? 'hz-tourne' : 'hz-inverse'} ${(r * 0.55).toFixed(1)}s linear infinite` : 'none' }}>
                <path d={dents(r, Math.round(r * 1.05), 2.6)} fill="url(#hz-mg)" stroke="#3e2c10" strokeWidth={0.5} />
                <circle r={r * 0.55} fill="#1d150e" stroke="url(#hz-mg)" strokeWidth={1.2} />
                <path d={`M0 ${-r * 0.5} V${r * 0.5} M${-r * 0.5} 0 H${r * 0.5}`} stroke="url(#hz-mg)" strokeWidth={1.2} />
                <circle r={1.6} fill="#c4293f" />
              </g>
            </g>
          </g>
        );
      })}
      <g transform="translate(124 24)">
        <circle r={11} fill="none" stroke="rgba(201,162,74,0.35)" strokeWidth={0.8} strokeDasharray="2 2" />
        <g style={{ ...centre, transform: `scale(${marche ? 1 : 0})`, transition: 'transform .7s cubic-bezier(.3,1.7,.5,1)' }}>
          <g style={{ ...centre, animation: marche ? 'hz-balancier 1.1s ease-in-out infinite' : 'none' }}>
            <circle r={10.5} fill="none" stroke="url(#hz-mg)" strokeWidth={2} />
            <path d="M-10 0 H10 M0 -10 V10" stroke="url(#hz-mg)" strokeWidth={1.2} />
            <path d="M0 0 m3 0 a3 3 0 1 1 -3 -3 a5 5 0 1 1 -5 5 a7 7 0 1 1 7 -7" fill="none" stroke="#9fb7e0" strokeWidth={0.6} />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Une nappe de rayons, d'épaisseurs irrégulières, en dégradé conique. */
function rayons(graine: number, nb: number, alpha: number): string {
  const pas = 360 / nb;
  const s: string[] = [];
  for (let i = 0; i < nb; i++) {
    const a = i * pas + (((i * 29 + graine * 7) % 10) / 10) * pas * 0.5;
    const w = 1.4 + ((i * 37 + graine * 11) % 7) * 0.7;
    const k = alpha * (0.45 + ((i * 13 + graine) % 6) / 9);
    s.push(`rgba(255,226,170,0) ${n2(a)}deg`, `rgba(255,230,180,${k.toFixed(3)}) ${n2(a + w / 2)}deg`, `rgba(255,226,170,0) ${n2(a + w)}deg`);
  }
  return `conic-gradient(from 0deg, ${s.join(', ')})`;
}

/** 7 / 5 : la lumière qui part de « Cette semaine ». */
function Rayonnement({ x, y }: { x: number; y: number }) {
  const T = 1500;
  const long = 'radial-gradient(circle, #000 0, rgba(0,0,0,0.75) 14%, rgba(0,0,0,0.3) 34%, transparent 56%)';
  const court = 'radial-gradient(circle, #000 0, rgba(0,0,0,0.6) 10%, rgba(0,0,0,0.15) 26%, transparent 40%)';
  const couche = (key: string, fond: string, masque: string, anim: string, flou: number) => (
    <div key={key} className="hz-nappe" style={{ left: x - T / 2, top: y - T / 2, width: T, height: T, WebkitMaskImage: masque, maskImage: masque }}>
      <div style={{ background: fond, filter: flou ? `blur(${flou}px)` : undefined, animation: anim }} />
    </div>
  );
  return (
    <div className="hz-lumiere" aria-hidden="true">
      <div className="hz-halo" style={{ background: `radial-gradient(520px 460px at ${x}px ${y}px, rgba(255,222,160,0.40) 0%, rgba(255,200,120,0.12) 45%, rgba(255,200,120,0) 75%)` }} />
      {couche('larges', rayons(1, 16, 0.34), long, 'hz-tourne 160s linear infinite, hz-respire 6.5s ease-in-out infinite', 5)}
      {couche('fins', rayons(4, 38, 0.3), long, 'hz-inverse 240s linear infinite, hz-respire 4.2s ease-in-out -2s infinite', 0.6)}
      {couche('courts', rayons(7, 24, 0.5), court, 'hz-tourne 90s linear infinite, hz-respire 3.1s ease-in-out -1s infinite', 1.5)}
      {couche('reflet', 'conic-gradient(from 0deg, rgba(255,240,205,0) 0deg 24deg, rgba(255,244,215,0.4) 28deg, rgba(255,240,205,0) 33deg 200deg, rgba(255,244,215,0.28) 205deg, rgba(255,240,205,0) 209deg)', long, 'hz-tourne 28s linear infinite', 2)}
      <div className="hz-coeur" style={{ left: x - 70, top: y - 70 }} />
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="hz-derive"
          style={{
            left: x - 30 + ((i * 47) % 200),
            top: y - 40 - ((i * 71) % 260),
            width: i % 4 ? 2 : 3,
            height: i % 4 ? 2 : 3,
            animationDuration: `${5 + (i % 5) * 1.3}s`,
            animationDelay: `${-(i * 0.9)}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
   Le lancement : les encarts deviennent des rouages
   ------------------------------------------------------------------ */
type Phase = 'pre' | 'morph' | 'dents' | 'tourne' | 'zoom' | 'fin';
interface Cadre { x: number; y: number; w: number; h: number; rad: number }

/** [clé, dents, parent, angle depuis le parent (°), peau de départ] */
const TRAIN: Array<[string, number, string | null, number, 'ivoire' | 'sombre' | 'or' | 'laiton']> = [
  ['paq', 28, null, 0, 'laiton'], ['mouv', 18, 'paq', -90, 'ivoire'], ['sem', 16, 'paq', 140, 'sombre'], ['par', 16, 'paq', 40, 'sombre'], ['btn', 12, 'paq', 90, 'or'],
  ['niv', 9, 'mouv', -150, 'ivoire'], ['fla', 8, 'mouv', -30, 'sombre'],
  ['nav0', 6, 'sem', 115, 'laiton'], ['nav1', 6, 'sem', 65, 'laiton'], ['nav2', 6, 'btn', 90, 'laiton'], ['nav3', 6, 'par', 115, 'laiton'], ['nav4', 6, 'par', 65, 'laiton'],
];

function Lancement({ phase, tuiles, nom, dues }: { phase: Phase; tuiles: Record<string, Cadre>; nom: string; dues: number }) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const k = Math.min(1, W / 390);
  const M = 7 * k;
  const K = 0.17;
  const C = { x: W / 2, y: H * 0.47 };

  type Roue = { k: string; n: number; r: number; t: number; x: number; y: number; phi: number; sens: 1 | -1; peau: string; i: number };
  const G: Record<string, Roue> = {};
  TRAIN.forEach(([cle, n, p, ang, peau], i) => {
    const r = (M * n) / 2;
    const t = TOUR / n;
    if (!p) { G[cle] = { k: cle, n, r, t, x: C.x, y: C.y, phi: 0, sens: 1, peau, i }; return; }
    const P = G[p];
    const th = (ang * Math.PI) / 180;
    const d = P.r + r;
    /* La dent du parent qui pointe vers l'enfant tombe en face d'un creux de l'enfant. */
    const phi = th + Math.PI - t * (0.5 - (th - P.phi) / P.t);
    G[cle] = { k: cle, n, r, t, x: P.x + d * Math.cos(th), y: P.y + d * Math.sin(th), phi, sens: P.sens > 0 ? -1 : 1, peau, i };
  });

  const pre = phase === 'pre';
  const dente = phase !== 'pre' && phase !== 'morph';
  const tourne = phase === 'tourne' || phase === 'zoom' || phase === 'fin';
  const zoom = phase === 'zoom' || phase === 'fin';
  const hubR = G.paq.r * 0.36;
  const S = (Math.hypot(W, H) / 2 / hubR) * 1.1;

  const roues = Object.values(G).map((g) => {
    const ctr = g.k === 'paq';
    const rO = g.r + M * 0.95;
    const rR = g.r - M * 1.15;
    const s = rO + 4;
    const id = `hz-l${g.i}`;
    const d0 = (g.i % 6) * 0.035;
    const t0 = tuiles[g.k] ?? { x: g.x, y: g.y, w: 2 * rR, h: 2 * rR, rad: rR };
    const x = pre ? t0.x : g.x;
    const y = pre ? t0.y : g.y;
    const D = 2 * rR;
    const w = pre ? t0.w : D;
    const h = pre ? t0.h : D;
    const rad = pre ? t0.rad : D / 2;
    const forme = pre ? 'none' : ['width', 'height', 'left', 'top', 'border-radius'].map((q) => `${q} 0.7s cubic-bezier(.65,0,.25,1) ${d0}s`).join(', ');
    const hD = rO - rR;
    const pt = (q: number, rr: number) => `${n2(rr * Math.cos(q))} ${n2(rr * Math.sin(q))}`;
    const dent = `M${[pt(-0.29 * g.t, rR - 2), pt(-0.12 * g.t, rO), pt(0.12 * g.t, rO), pt(0.29 * g.t, rR - 2)].join(' L')} Z`;
    return (
      <div key={g.k} className="hz-l-roue" style={{ transform: `translate(${n2(x)}px, ${n2(y)}px)`, transition: pre ? 'none' : `transform 0.7s cubic-bezier(.65,0,.25,1) ${d0}s` }}>
        <div className="hz-l-fantome" style={{ left: -w / 2, top: -h / 2, width: w, height: h, borderRadius: rad, opacity: dente ? 0 : 1, transition: pre ? 'none' : `${forme}, opacity .2s ease .1s` }}>
          <i className={`peau ${g.peau}`} style={{ opacity: pre ? 0 : 1, transition: pre ? 'none' : 'opacity .18s ease' }} />
          <i className="peau laiton disque" style={{ opacity: pre ? 0 : 1, transition: pre ? 'none' : `opacity .4s ease ${0.28 + d0}s` }} />
        </div>
        <svg className="hz-l-svg" width={2 * s} height={2 * s} viewBox={`${-s} ${-s} ${2 * s} ${2 * s}`} style={{ left: -s, top: -s, opacity: dente ? 1 : 0, transition: pre ? 'none' : 'opacity .15s ease' }}>
          <defs><Laiton id={id} /></defs>
          <g style={{ transformBox: 'view-box', transformOrigin: '0px 0px', animation: tourne ? `${g.sens > 0 ? 'hz-tourne' : 'hz-inverse'} ${(g.n * K).toFixed(3)}s linear infinite` : 'none' }}>
            <g transform={`rotate(${n2((g.phi * 180) / Math.PI)})`}>
              <g style={{ opacity: dente ? 1 : 0 }}>
                {Array.from({ length: g.n }, (_, j) => (
                  <g key={j} transform={`rotate(${n2((j * 360) / g.n)})`}>
                    <path
                      d={dent}
                      fill={`url(#${id})`}
                      stroke="#3e2c10"
                      strokeWidth={0.9}
                      style={{ transform: `translateX(${dente ? 0 : n2(-hD - 1)}px)`, transition: pre ? 'none' : `transform .32s cubic-bezier(.3,1.7,.5,1) ${(d0 + (j / g.n) * 0.5).toFixed(3)}s` }}
                    />
                  </g>
                ))}
              </g>
              <circle r={rR} fill={`url(#${id})`} stroke="#3e2c10" strokeWidth={0.6} />
              <circle r={rR - 4 * k} fill="none" stroke="rgba(62,44,16,0.55)" strokeWidth={1.1} />
              {g.r > 25 && <path d={trous(6, g.r * 0.58, g.r * 0.12)} fill="#120d09" />}
              <circle r={g.r * (ctr ? 0.36 : 0.32)} fill="#1d150e" stroke={`url(#${id})`} strokeWidth={Math.max(1.4, g.r * 0.04)} />
              {ctr
                ? <path d={traits(60, 30 * k, 32 * k)} stroke="rgba(230,201,135,0.55)" strokeWidth={0.4} />
                : <circle r={Math.max(1.6, g.r * 0.09)} fill="#c4293f" />}
            </g>
          </g>
          {ctr && (
            <g style={{ opacity: dente && !zoom ? 1 : 0, transition: 'opacity .35s ease' }}>
              <text y={-6 * k} textAnchor="middle" fontSize={3.4 * k} letterSpacing={0.9 * k} fill="#b8a98c" fontFamily="var(--sans)">PAQUET</text>
              <text y={3 * k} textAnchor="middle" fontSize={7.5 * k} fill="#efe6d2" fontFamily="'Marcellus', serif">{nom.length > 16 ? `${nom.slice(0, 15)}…` : nom}</text>
              <text y={11 * k} textAnchor="middle" fontSize={3.6 * k} fill="#e6c987" fontFamily="var(--sans)">{dues} cartes</text>
            </g>
          )}
        </svg>
      </div>
    );
  });

  return (
    <div className="hz-lancement" aria-hidden="true">
      <div
        className="hz-l-camera"
        style={{
          transformOrigin: `${n2(C.x)}px ${n2(C.y)}px`,
          transform: zoom ? `translate(0px, ${n2(H / 2 - C.y)}px) scale(${n2(S)})` : 'none',
          opacity: phase === 'fin' ? 0 : 1,
        }}
      >
        <div className="hz-l-halo" style={{ left: C.x - 230, top: C.y - 230, opacity: pre ? 0 : 1 }} />
        {roues}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   « Aujourd'hui »
   ------------------------------------------------------------------ */
export function AujourdhuiHorloger(p: {
  paquets: DeckSummary[];
  centre: number;
  onCentre: (i: number) => void;
  onOuvrir: (i: number) => void;
  onLancer: (id: string) => void;
  niveau: number;
  dansNiveau: number;
  pourNiveau: number;
  xp: number;
  flamme: number;
  gainXp: number;
  gainValide: boolean;
  total: number;
  minutes: number;
  cartesAuj: number;
  cartesParJour: number;
  faits: number;
  objectif: number;
  parlerN: string;
  parlerSous: string;
  parSession: number;
  onXp: () => void;
  onCalendrier: () => void;
  onParler: () => void;
}) {
  const racine = useRef<HTMLDivElement>(null);
  const refSem = useRef<HTMLButtonElement>(null);
  const [ancre, setAncre] = useState<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [tuiles, setTuiles] = useState<Record<string, Cadre>>({});
  const minuteries = useRef<number[]>([]);
  const { paquets, centre } = p;
  const pc = paquets[centre];
  const fr = (v: number) => v.toLocaleString('fr-FR');
  const lumiere = p.faits >= 7;

  /* L'origine des rayons : le centre de la tuile « Cette semaine ». */
  useLayoutEffect(() => {
    if (!lumiere) return;
    const mesure = () => {
      const el = refSem.current;
      if (el) setAncre({ x: el.offsetLeft + el.offsetWidth * 0.32, y: el.offsetTop + el.offsetHeight * 0.62 });
    };
    mesure();
    window.addEventListener('resize', mesure);
    return () => window.removeEventListener('resize', mesure);
  }, [lumiere]);

  useEffect(() => () => {
    minuteries.current.forEach((m) => clearTimeout(m));
    document.documentElement.classList.remove('hz-lance');
  }, []);

  function mesurer(): Record<string, Cadre> {
    const out: Record<string, Cadre> = {};
    const prendre = (el: Element, cle: string) => {
      const r = el.getBoundingClientRect();
      const br = getComputedStyle(el).borderTopLeftRadius;
      const brut = br.includes('%') ? 9999 : parseFloat(br) || 0;
      out[cle] = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, rad: Math.min(brut, Math.min(r.width, r.height) / 2) };
    };
    racine.current?.querySelectorAll('[data-hz]').forEach((el) => prendre(el, el.getAttribute('data-hz') ?? ''));
    document.querySelectorAll('.tabbar button svg').forEach((el, i) => { if (i < 5) prendre(el, `nav${i}`); });
    if (out.paq) out.paq = { ...out.paq, rad: Math.min(out.paq.w, out.paq.h) / 2 };
    return out;
  }

  function lancer() {
    if (phase || !pc) return;
    const id = pc.deck.id;
    if (reduit()) { p.onLancer(id); return; }
    setTuiles(mesurer());
    setPhase('pre');
    document.documentElement.classList.add('hz-lance');
    const at = (ms: number, f: () => void) => { minuteries.current.push(window.setTimeout(f, ms)); };
    at(50, () => setPhase('morph'));
    at(850, () => setPhase('dents'));
    at(1750, () => setPhase('tourne'));
    at(2800, () => setPhase('zoom'));
    at(3900, () => setPhase('fin'));
    at(4250, () => { document.documentElement.classList.remove('hz-lance'); p.onLancer(id); });
  }

  const cache = phase !== null && phase !== 'pre';
  const flecheStyle = (ok: boolean): CSSProperties => ({ opacity: ok ? 1 : 0.3 });

  return (
    <div className="today hz" ref={racine}>
      <div className="hz-decor" aria-hidden="true">
        <RouageDecor id="hz-d0" x="96%" y={300} r={118} n={30} duree={140} sens={1} op={0.32} />
        <RouageDecor id="hz-d1" x="-2%" y={640} r={90} n={22} duree={110} sens={1} op={0.14} flou={1.5} />
        <span className="hz-lampe" />
        <Poussieres n={9} graine={1} />
      </div>

      <div className={`hz-contenu${cache ? ' cache' : ''}`}>
        <div className="hz-haut">
          <button className="hz-niv" data-hz="niv" onClick={p.onXp} aria-label={`Niveau ${p.niveau}, ${fr(p.xp)} XP : voir le détail`}>
            <small>NIV.</small><b>{p.niveau}</b>
          </button>
          <button className="hz-xp" onClick={p.onXp} tabIndex={-1} aria-hidden="true">
            <span className="hz-xp-txt"><b>Niveau {p.niveau}</b><span>{fr(p.dansNiveau)} / {fr(p.pourNiveau)} XP</span></span>
            <span className="hz-barre"><i style={{ width: `${Math.round((100 * p.dansNiveau) / Math.max(1, p.pourNiveau))}%` }}><s /></i></span>
          </button>
          <span className="hz-flamme" data-hz="fla" aria-label={`Série : ${p.flamme} jour${p.flamme > 1 ? 's' : ''} à ${p.cartesParJour} cartes`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
            <b>{p.flamme}</b>
          </span>
        </div>

        <div className="hz-defi" data-hz="mouv">
          <div className="hz-defi-haut">
            <span>LE MOUVEMENT DU JOUR</span>
            <span className="hz-gain">{p.gainValide ? `+${p.gainXp} XP ✓` : `+${p.gainXp} XP`}</span>
          </div>
          <b className="hz-defi-n">{p.total} carte{p.total > 1 ? 's' : ''}</b>
          <span className="hz-defi-sous">Environ {p.minutes} min · {paquets.length} paquet{paquets.length > 1 ? 's' : ''}</span>
          <span className="hz-jour">
            <span className="hz-jour-barre">
              <i style={{ width: `${Math.min(100, (100 * p.cartesAuj) / p.cartesParJour)}%` }} />
              <em style={{ left: `${Math.min(100, (100 * p.cartesAuj) / p.cartesParJour)}%` }} />
            </span>
            <span>{p.gainValide ? 'Journée validée' : `${p.cartesAuj} / ${p.cartesParJour} cartes pour gagner tes XP`}</span>
          </span>
        </div>

        <div className="hz-roues">
          {paquets.map((r, i) => {
            const k = i - centre;
            const a = Math.abs(k);
            if (a > 2) return null;
            const s = a === 0 ? 0.98 : a === 1 ? 0.64 : 0.44;
            const dx = Math.sign(k) * (a === 0 ? 0 : a === 1 ? 152 : 258);
            const y = 112 + (a === 0 ? 0 : a === 1 ? 18 : 30);
            const angle = centre * 42 * (i % 2 ? -1 : 1) + i * 7.5;
            return (
              <button
                key={r.deck.id}
                className={`hz-roue${a === 0 ? ' centre' : ''}`}
                data-hz={a === 0 ? 'paq' : undefined}
                aria-label={a === 0 ? `${r.deck.name} : ouvrir le paquet` : r.deck.name}
                onClick={() => (a === 0 ? p.onOuvrir(i) : p.onCentre(i))}
                style={{ transform: `translate(${dx}px, ${y - 100}px) scale(${s})`, opacity: a > 1 ? 0 : 1, zIndex: 10 - a, pointerEvents: a > 1 ? 'none' : undefined }}
              >
                <svg viewBox="-106 -106 212 212" aria-hidden="true">
                  <defs><Laiton id={`hz-g${i}`} /></defs>
                  <g style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `rotate(${angle.toFixed(1)}deg)`, transition: 'transform .95s cubic-bezier(.3,1.25,.4,1)' }}>
                    <path d={DENTS_PAQUET} fill={`url(#hz-g${i})`} stroke="#3e2c10" strokeWidth={1.2} />
                    <circle r={86} fill="none" stroke="rgba(62,44,16,0.55)" strokeWidth={2} />
                    <path d={TROUS_PAQUET} fill="#120d09" stroke="rgba(255,230,170,0.25)" strokeWidth={1} />
                    <circle r={64} fill="#1d150e" stroke={`url(#hz-g${i})`} strokeWidth={4} />
                  </g>
                </svg>
                <span className="hz-moyeu">
                  <span className="hz-dos"><DeckFace id={r.deck.id} name={r.deck.name} image={r.image} categoryId={r.deck.categoryId} papier={(r.deck as DeckControle).papier} /></span>
                  <i />
                </span>
                {a === 0 && <span className="hz-dues">{r.due}</span>}
              </button>
            );
          })}
          {paquets.length > 1 && (
            <>
              <button className="hz-fleche prec" aria-label="Paquet précédent" disabled={centre === 0} style={flecheStyle(centre > 0)} onClick={() => p.onCentre(centre - 1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button className="hz-fleche suiv" aria-label="Paquet suivant" disabled={centre === paquets.length - 1} style={flecheStyle(centre < paquets.length - 1)} onClick={() => p.onCentre(centre + 1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </>
          )}
        </div>

        <div className="hz-sous-roues">
          <div className="hz-points" aria-hidden="true">{paquets.map((r, i) => <i key={r.deck.id} className={i === centre ? 'on' : ''} />)}</div>
          <span className="hz-plaque"><b>{pc.deck.name}</b><small>· {masteryLabel(pc.mastery.percent)}</small></span>
        </div>

        <button className="hz-go" data-hz="btn" onClick={lancer}>
          <span className="hz-reflet" aria-hidden="true" />
          <span>{phase ? 'Engrenage…' : `Remonter · ${Math.min(pc.due, p.parSession)} cartes`}</span>
        </button>

        <div className="hz-bas">
          <button className={`hz-tuile${lumiere ? ' rayonne' : ''}`} data-hz="sem" ref={refSem} onClick={p.onCalendrier}>
            <span className="hz-tuile-haut">CETTE SEMAINE</span>
            <b>{p.faits <= p.objectif ? `${p.faits} / ${p.objectif} jours` : `${p.faits} / ${p.objectif}`}</b>
            <span className="hz-meca"><Mecanisme jours={p.faits} /></span>
            <small>{p.faits < p.objectif ? 'Chaque jour ajoute un rouage.' : p.faits === p.objectif ? 'Mécanisme complet.' : p.faits === 6 ? 'Le balancier le met en marche.' : 'Semaine parfaite : il rayonne.'}</small>
          </button>
          <button className="hz-tuile" data-hz="par" onClick={p.onParler}>
            <span className="hz-tuile-haut">PARLER
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
            </span>
            <b>{p.parlerN}</b>
            <small className="filet">{p.parlerSous}</small>
          </button>
        </div>
      </div>

      {lumiere && ancre && <Rayonnement x={ancre.x} y={ancre.y} />}
      {phase && createPortal(<Lancement phase={phase} tuiles={tuiles} nom={pc.deck.name} dues={Math.min(pc.due, p.parSession)} />, document.body)}
    </div>
  );
}

const DENTS_PAQUET = dents(100, 24, 11);
const TROUS_PAQUET = trous(8, 75, 7.5);

/* ------------------------------------------------------------------
   La révision : la montre de gousset
   ------------------------------------------------------------------ */
const ROMAINS = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const MINUTES = [60, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const TICKS_FINS = traits(60, 104, 112, 0, (i) => i % 5 === 0);
const TICKS_FORTS = traits(12, 101, 112);
const TICKS_SOUS = traits(60, 24, 27, 58, (i) => i % 5 !== 0) + traits(60, 25.5, 27, 58, (i) => i % 5 === 0);

/** Les délais de chaque note : [le couvercle se rabat, la montre s'en va]. Study attend la fin. */
const TEMPS: Record<Grade, [number, number]> = { again: [850, 1500], hard: [800, 1400], good: [600, 1150], easy: [1750, 2300] };
/** Ce que Study attend avant de passer à la carte suivante. */
export const ATTENTE_HORLOGER: Record<Grade, number> = { again: 1950, hard: 1850, good: 1600, easy: 2750 };

function taille(txt: string): number {
  const n = txt.length;
  return n > 18 ? 21 : n > 14 ? 25 : n > 11 ? 29 : n > 8 ? 33 : 36;
}

/** Facile : le cadran s'ouvre en iris sur le mouvement, fond d'inox brossé, logo gravé. */
function Mouvement({ visible }: { visible: boolean }) {
  const M = 5;
  type R = { n: number; r: number; t: number; x: number; y: number; phi: number; sens: 1 | -1 };
  const L: Array<[number, number | null, number, number?, number?]> = [[18, null, 0, -25, 15], [10, 0, -35], [14, 0, 160], [8, 1, 40]];
  const G: R[] = [];
  L.forEach(([n, parent, ang, x0 = 0, y0 = 0]) => {
    const r = (M * n) / 2;
    const t = TOUR / n;
    if (parent === null) { G.push({ n, r, t, x: x0, y: y0, phi: 0, sens: 1 }); return; }
    const P = G[parent];
    const th = (ang * Math.PI) / 180;
    const d = P.r + r;
    G.push({ n, r, t, x: P.x + d * Math.cos(th), y: P.y + d * Math.sin(th), phi: th + Math.PI - t * (0.5 - (th - P.phi) / P.t), sens: P.sens > 0 ? -1 : 1 });
  });
  return (
    <div className={`hz-mouvement${visible ? ' ouvert' : ''}`} aria-hidden="true">
      <span className="hz-gravure" style={{ WebkitMaskImage: `url(${logoGrave})`, maskImage: `url(${logoGrave})` }} />
      <span className="hz-gravure creux" style={{ WebkitMaskImage: `url(${logoGrave})`, maskImage: `url(${logoGrave})` }} />
      <svg viewBox="-128 -128 256 256">
        <defs><Laiton id="hz-mv" clair="#fbe9b8" fonce="#6e5222" /></defs>
        {G.map((g, i) => (
          <g key={i} transform={`translate(${n2(g.x)} ${n2(g.y)})`}>
            <g style={{ transformBox: 'view-box', transformOrigin: '0px 0px', animation: `${g.sens > 0 ? 'hz-tourne' : 'hz-inverse'} ${(g.n * 0.22).toFixed(2)}s linear infinite` }}>
              <g transform={`rotate(${n2((g.phi * 180) / Math.PI)})`}>
                <path d={dentsM(g.r, g.n, M)} fill="url(#hz-mv)" stroke="#3e2c10" strokeWidth={0.7} />
                <path d={trous(5, g.r * 0.55, g.r * 0.14)} fill="#6b727c" />
                <circle r={g.r * 0.22} fill="#4a5059" stroke="#e6c987" strokeWidth={1} />
              </g>
            </g>
            <circle r={3} fill="#c4293f" stroke="#6d1220" strokeWidth={0.6} />
          </g>
        ))}
        <g transform="translate(48 62)">
          <g style={{ transformBox: 'view-box', transformOrigin: '0px 0px', animation: 'hz-balancier 0.9s ease-in-out infinite' }}>
            <circle r={26} fill="none" stroke="url(#hz-mv)" strokeWidth={3.5} />
            <path d="M-26 0 H26 M0 -26 V26" stroke="url(#hz-mv)" strokeWidth={2} />
            <path d="M0 0 m4 0 a4 4 0 1 1 -4 -4 a7 7 0 1 1 -7 7 a10 10 0 1 1 10 -10 a13 13 0 1 1 -13 13" fill="none" stroke="#9fb7e0" strokeWidth={0.7} />
          </g>
          <circle r={3} fill="#c4293f" />
        </g>
      </svg>
    </div>
  );
}

export function MontreHorloger({
  theme, front, back, langFront, langBack, example, ouvert, frappe, progression, premier, onOuvrir, onEcouter,
}: {
  theme: string;
  front: string;
  back: string;
  langFront: string;
  langBack: string;
  example?: string;
  ouvert: boolean;
  frappe: Grade | null;
  /** 0 à 1 : l'aiguille des minutes suit la session. */
  progression: number;
  /** La première carte arrive du fond du rouage (après le lancement). */
  premier: boolean;
  onOuvrir: () => void;
  onEcouter: () => void;
}) {
  const [tours, setTours] = useState(0);
  const [mouvement, setMouvement] = useState(false);
  const [referme, setReferme] = useState(false);
  const [sortie, setSortie] = useState<'' | 'haut' | 'bas'>('');
  const [eclat, setEclat] = useState(0);
  const [presse, setPresse] = useState(false);
  const sonne = useRef(false);

  useEffect(() => {
    if (ouvert && !sonne.current) { sonne.current = true; sonHorloger('ouvre'); }
  }, [ouvert]);

  useEffect(() => {
    if (!frappe) return;
    sonHorloger(frappe);
    const ids: number[] = [];
    const at = (ms: number, f: () => void) => { ids.push(window.setTimeout(f, ms)); };
    if (frappe === 'again') setTours((t) => t - 360);
    if (frappe === 'hard') { setTours((t) => t + 4); at(260, () => setTours((t) => t - 14)); }
    if (frappe === 'good') { setTours((t) => t + 20); setEclat((e) => e + 1); }
    if (frappe === 'easy') { setMouvement(true); at(1350, () => setMouvement(false)); }
    at(TEMPS[frappe][0], () => setReferme(true));
    at(TEMPS[frappe][1], () => setSortie(frappe === 'again' ? 'bas' : 'haut'));
    return () => ids.forEach((m) => clearTimeout(m));
  }, [frappe]);

  const ouverte = ouvert && !referme;
  const couronne = (e: MouseEvent) => {
    e.stopPropagation();
    if (ouvert) return;
    setPresse(true);
    window.setTimeout(() => { setPresse(false); onOuvrir(); }, 160);
  };
  const aiguille = progression * 360 + tours;

  return (
    <div className={`hz-montre-bloc ${premier ? 'arrive' : 'entre'}${sortie ? ` part-${sortie}` : ''}`}>
      <div className="hz-montre">
        <span className="hz-anneau" aria-hidden="true" />
        <button className={`hz-couronne${presse ? ' presse' : ''}`} onClick={couronne} aria-label="Ouvrir la montre" />
        <span className="hz-col" aria-hidden="true" />
        <div className="hz-boitier">
          <span className="hz-carrure" aria-hidden="true" />
          <span className="hz-guilloche" aria-hidden="true" />
          <div className="hz-cadran">
            <svg viewBox="-128 -128 256 256" className="hz-graduations" style={{ opacity: ouverte ? 0.28 : 1 }} aria-hidden="true">
              <circle r={112} fill="none" stroke="#1d1a17" strokeWidth={0.6} />
              <circle r={104} fill="none" stroke="#1d1a17" strokeWidth={0.6} />
              <path d={TICKS_FINS} stroke="#1d1a17" strokeWidth={0.7} />
              <path d={TICKS_FORTS} stroke="#1d1a17" strokeWidth={1.6} />
              <circle cy={58} r={27} fill="#faf8f3" stroke="#1d1a17" strokeWidth={0.6} />
              <circle cy={58} r={22} fill="none" stroke="#1d1a17" strokeWidth={0.4} />
              <path d={TICKS_SOUS} stroke="#1d1a17" strokeWidth={0.5} />
            </svg>
            <div className="hz-chiffres" style={{ opacity: ouverte ? 0.28 : 1 }} aria-hidden="true">
              {ROMAINS.map((t, i) => (i === 6 ? null : <span key={t} className="romain" style={{ transform: `translate(-50%,-50%) rotate(${i * 30}deg) translateY(-87px)` }}>{t}</span>))}
              {MINUTES.map((t, i) => <span key={t} className="minute" style={{ transform: `translate(-50%,-50%) rotate(${i * 30}deg) translateY(-118px)` }}>{t}</span>)}
            </div>
            <div className="hz-plaque-mots" style={{ opacity: ouverte ? 1 : 0 }}>
              <i lang={langFront}>{front}</i>
              <span aria-hidden="true" />
              <b lang={langBack} style={{ fontSize: taille(back) }}>{back}</b>
            </div>
            <span className="hz-aiguille heures" aria-hidden="true" />
            <span className="hz-aiguille minutes" aria-hidden="true" style={{ transform: `rotate(${aiguille.toFixed(1)}deg)` }} />
            <span className="hz-axe" aria-hidden="true" />
            <span className="hz-trotteuse" aria-hidden="true" />
            <Mouvement visible={mouvement} />
          </div>
          {eclat > 0 && <span key={eclat} className="hz-eclat-lunette" aria-hidden="true" />}
          <div className="hz-couvercle" style={{ transform: ouverte ? 'rotateY(-118deg)' : 'rotateY(0deg)' }}>
            <div className="face">
              <span className="cartouche">
                <small>{theme.toUpperCase()}</small>
                <b lang={langFront} style={{ fontSize: taille(front) }}>{front}</b>
              </span>
            </div>
            <div className="dos" />
          </div>
        </div>
      </div>
      <div className="hz-sous-montre">
        {ouverte ? (
          <>
            {example && <i className="hz-exemple">« {example} »</i>}
            <button className="hz-ecouter" onClick={(e) => { e.stopPropagation(); onEcouter(); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><path d="M16 9a5 5 0 0 1 0 6" /></svg>
              Écouter
            </button>
          </>
        ) : !ouvert ? (
          <span className="hz-consigne">{langFront === 'fr' ? 'Comment dit-on en anglais ?' : 'Comment dit-on en français ?'}</span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   La barre d'onglets : montre, rouage, cloche, chronographe, loupe
   ------------------------------------------------------------------ */
export type OngletHorloger = 'aujourdhui' | 'paquets' | 'parler' | 'progres' | 'reglages';

export function IconeHorloger({ n }: { n: OngletHorloger }) {
  const id = `hz-t-${n}`;
  const defs = <Laiton id={id} clair="#fbe9b8" />;
  if (n === 'aujourdhui') return (
    <svg className="tabsvg hz-ico" viewBox="0 0 32 32" aria-hidden="true">
      <defs>{defs}<radialGradient id={`${id}e`} cx="0.4" cy="0.35" r="0.7"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e3dccd" /></radialGradient></defs>
      <circle cx="16" cy="3.6" r="2.4" fill="none" stroke={`url(#${id})`} strokeWidth="1.4" /><rect x="14" y="5.4" width="4" height="3" rx="0.8" fill={`url(#${id})`} />
      <circle cx="16" cy="19" r="11" fill={`url(#${id})`} stroke="#3e2c10" strokeWidth="0.6" /><circle cx="16" cy="19" r="8.6" fill={`url(#${id}e)`} />
      <path d="M16 11.4v1.4M16 25.2v1.4M8.4 19h1.4M22.2 19h1.4" stroke="#2a2018" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M16 19l-3.4-3.2M16 19l4.6-2.2" stroke="#1f3a6e" strokeWidth="1.2" strokeLinecap="round" /><circle cx="16" cy="19" r="1.1" fill={`url(#${id})`} />
    </svg>
  );
  if (n === 'paquets') return (
    <svg className="tabsvg hz-ico" viewBox="0 0 32 32" aria-hidden="true">
      <defs>{defs}</defs>
      <path d={DENTS_ICONE} transform="translate(16 16)" fill={`url(#${id})`} stroke="#3e2c10" strokeWidth="0.5" />
      <circle cx="16" cy="16" r="8.6" fill="none" stroke="rgba(62,44,16,0.6)" strokeWidth="0.8" />
      <path d={TROUS_ICONE} transform="translate(16 16)" fill="#120d09" />
      <circle cx="16" cy="16" r="3.2" fill="#120d09" stroke={`url(#${id})`} strokeWidth="1" /><circle cx="16" cy="16" r="1.4" fill="#c4293f" />
    </svg>
  );
  if (n === 'parler') return (
    <svg className="tabsvg hz-ico" viewBox="0 0 32 32" aria-hidden="true">
      <defs>{defs}</defs>
      <path d="M16 4.5c-.9 0-1.6.6-1.6 1.4v.6c-3.9.8-6.4 4.1-6.4 8.4v4.8L5.8 23h20.4L24 19.7v-4.8c0-4.3-2.5-7.6-6.4-8.4v-.6c0-.8-.7-1.4-1.6-1.4z" fill={`url(#${id})`} stroke="#3e2c10" strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M9.8 14.6c.3-2.6 1.8-4.6 4-5.4" fill="none" stroke="rgba(255,248,225,0.7)" strokeWidth="0.9" strokeLinecap="round" />
      <rect x="5.4" y="22.6" width="21.2" height="1.6" rx="0.8" fill="#8a6a2a" /><circle cx="16" cy="26.4" r="2" fill={`url(#${id})`} stroke="#3e2c10" strokeWidth="0.5" />
      <path d="M27.4 10.5c1 1.4 1.4 2.8 1.4 4.3M4.6 10.5c-1 1.4-1.4 2.8-1.4 4.3" fill="none" stroke="#c9a24a" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
  if (n === 'progres') return (
    <svg className="tabsvg hz-ico" viewBox="0 0 32 32" aria-hidden="true">
      <defs>{defs}<radialGradient id={`${id}e`} cx="0.4" cy="0.35" r="0.7"><stop offset="0" stopColor="#20304f" /><stop offset="1" stopColor="#0d1526" /></radialGradient></defs>
      <rect x="14.3" y="2.6" width="3.4" height="3.4" rx="0.8" fill={`url(#${id})`} />
      <rect x="5.6" y="5.6" width="3" height="2.6" rx="0.6" transform="rotate(-45 7.1 6.9)" fill={`url(#${id})`} /><rect x="23.4" y="5.6" width="3" height="2.6" rx="0.6" transform="rotate(45 24.9 6.9)" fill={`url(#${id})`} />
      <circle cx="16" cy="17.5" r="11.4" fill={`url(#${id})`} stroke="#3e2c10" strokeWidth="0.6" /><circle cx="16" cy="17.5" r="9" fill={`url(#${id}e)`} />
      <circle cx="12" cy="17.5" r="2.6" fill="none" stroke="#e6c987" strokeWidth="0.7" /><circle cx="20" cy="17.5" r="2.6" fill="none" stroke="#e6c987" strokeWidth="0.7" />
      <path d="M12 17.5l1.2-1.6M20 17.5l-.6 1.9" stroke="#e6c987" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M16 17.5l3.6-6.4" stroke="#ff6b7d" strokeWidth="1" strokeLinecap="round" /><circle cx="16" cy="17.5" r="1.1" fill={`url(#${id})`} />
    </svg>
  );
  return (
    <svg className="tabsvg hz-ico" viewBox="0 0 32 32" aria-hidden="true">
      <defs>{defs}<radialGradient id={`${id}v`} cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#e8f3ff" /><stop offset="0.55" stopColor="#7fa3cf" /><stop offset="1" stopColor="#2b4566" /></radialGradient></defs>
      <path d="M9 7.5h14l-2.6 15.2h-8.8z" fill={`url(#${id})`} stroke="#3e2c10" strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M10.6 11h10.8M11.2 14.4h9.6M11.8 17.8h8.4" stroke="rgba(62,44,16,0.45)" strokeWidth="0.6" />
      <ellipse cx="16" cy="7.5" rx="7" ry="2.4" fill={`url(#${id})`} stroke="#3e2c10" strokeWidth="0.6" />
      <ellipse cx="16" cy="23.6" rx="5.6" ry="2.9" fill={`url(#${id}v)`} stroke={`url(#${id})`} strokeWidth="1.4" />
      <ellipse cx="14.4" cy="22.8" rx="1.6" ry="0.7" fill="rgba(255,255,255,0.8)" />
    </svg>
  );
}

const DENTS_ICONE = dents(13.5, 12, 2.6);
const TROUS_ICONE = trous(6, 6, 1.4);
