/**
 * Écran de révision : une carte à la fois.
 *
 * Le visuel du paquet n'est plus une vignette au milieu de l'écran : il
 * occupe tout le fond, assombri, et le mot passe devant, en grand. Ce
 * qu'on vient lire, c'est le mot ; l'image n'est plus qu'un décor qui
 * situe le paquet. Conséquence : les réglages de marge du panneau de
 * texte (panelInsetX / panelInsetY) ne servent plus ici — ils restent
 * dans les réglages, sans effet sur cet écran, et pourront être retirés
 * lors du chantier « réglages ».
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Grade, Settings } from '../domain/types';
import type { SessionItem } from '../engine/session';
import { previewIntervals } from '../engine/scheduler';
import { speak } from './speech';
import { estLudique, useStyle } from './useStyle';

/* CHANTIER 165 — style Lycée : des notes courtes, et les couleurs rouge,
   orange, jaune, vert (voir lycee.css, classes g-again … g-easy). */
const COURTS: Record<Grade, string> = { again: 'Raté', hard: 'Dur', good: 'Bien', easy: 'Facile' };
/* CHANTIER 216 — Cinéma muet : les notes sont des claps de tournage. */
const CLAPS: Record<Grade, string> = { again: 'Coupez !', hard: 'Dur', good: 'Bien', easy: 'Bravo !' };

const GRADES: Array<{ key: Grade; label: string; className: string }> = [
  { key: 'again', label: 'À revoir', className: 'grade again' },
  { key: 'hard', label: 'Difficile', className: 'grade' },
  { key: 'good', label: 'Correct', className: 'grade' },
  { key: 'easy', label: 'Facile', className: 'grade easy' },
];

/* CHANTIER 208 — le mot et la réponse ne dépassent plus du cadre.
   CHANTIER 212 — un mot n'est plus jamais coupé. L'ancienne mesure (largeur du paragraphe)
   ne voyait pas toujours le débordement : la césure automatique et le chargement tardif de
   la police laissaient passer « BACKPA / CK ». On mesure maintenant chaque mot, seul et sur
   une ligne, et on réduit la police jusqu'à ce que le plus long tienne dans la largeur de la
   carte. Les mots peuvent toujours passer à la ligne ENTRE eux, jamais au milieu.
   Recalculé à chaque carte, quand la carte change de largeur et quand les polices arrivent.
   En tout dernier recours (sous 12 px), le mot se coupe.
   CHANTIER 236 — la réponse n'existe à l'écran qu'après le toucher. La mesure, déclenchée au
   changement de texte, tombait sur un paragraphe absent et ne se refaisait plus : la réponse
   n'était jamais ajustée (« AROUN / D », « em- / bassy »). On remesure aussi quand elle apparaît. */
const TAILLE_MIN = 12;

/* CHANTIER 244 — Strass, « Facile » : la pluie de strass (position, couleur, vitesse, rotation). */
const SV_TEINTES = ['#ffffff', '#bfe6ff', '#f0d388', '#ffd6e8'];
const SV_PLUIE = Array.from({ length: 18 }, (_, k) => ({
  left: `${(((k * 53) % 340) + 10) / 3.6}%`,
  background: `var(--gemme), ${SV_TEINTES[k % 4]}`,
  animationDuration: `${(1.3 + (k % 4) * 0.15).toFixed(2)}s`,
  animationDelay: `${(0.3 + (k % 6) * 0.09).toFixed(2)}s`,
  '--r': `${(k % 2 ? 1 : -1) * (200 + k * 20)}deg`,
}) as unknown as CSSProperties);

/* CHANTIER 248 — Station 1936 : le nuage de poudreuse (Raté), le vent (Dur), les embruns et les flocons dorés (Facile). */
const SK_POUDRE = [[-90, -60], [-40, -110], [20, -120], [80, -70], [-120, 0], [120, -10]].map(([dx, dy], k) => ({
  marginLeft: `${k * 6 - 15}px`,
  marginTop: `${(k % 2) * 10}px`,
  '--dx': `${dx}px`,
  '--dy': `${dy}px`,
}) as unknown as CSSProperties);
const SK_VENT = Array.from({ length: 5 }, (_, k) => ({
  top: `${18 + k * 12}%`,
  width: `${90 + (k % 3) * 30}px`,
  animationDelay: `${(0.1 + k * 0.12).toFixed(2)}s`,
}) as unknown as CSSProperties);
const SK_SOUFFLE = Array.from({ length: 5 }, (_, k) => ({
  top: `${15 + k * 14}%`,
  animationDelay: `${(0.15 + k * 0.1).toFixed(2)}s`,
  '--dy': `${((k % 3) - 1) * 30}px`,
}) as unknown as CSSProperties);
const SK_EMBRUN = [[30, -40], [50, -10], [14, -60], [44, -70]].map(([dx, dy], k) => ({
  marginLeft: `${(k % 2) * 6}px`,
  marginTop: `${k * 4}px`,
  '--dx': `${dx}px`,
  '--dy': `${dy}px`,
}) as unknown as CSSProperties);
const SK_OR = Array.from({ length: 16 }, (_, k) => ({
  left: `${(((k * 61) % 340) + 8) / 3.6}%`,
  width: `${k % 2 ? 6 : 8}px`,
  height: `${k % 2 ? 6 : 8}px`,
  animationDuration: `${(1.3 + (k % 4) * 0.15).toFixed(2)}s`,
  animationDelay: `${(0.9 + (k % 6) * 0.08).toFixed(2)}s`,
  '--dx': `${((k % 5) - 2) * 16}px`,
  '--r': `${(k % 2 ? 1 : -1) * 200}deg`,
}) as unknown as CSSProperties);

/* CHANTIER 250 — Fashion week : les flashs (Bien, Facile), les épingles (Dur) et les pétales de rose (Facile).
   Positions en % du cadre de la carte. */
const fsFlash = (x: number, y: number, z: number, d: number) => ({
  left: `${x}%`, top: `${y}%`, width: `${z}px`, height: `${z}px`, margin: `${-z / 2}px 0 0 ${-z / 2}px`, animationDelay: `${d.toFixed(2)}s`,
}) as CSSProperties;
const FS_FLASH_BIEN = [[13, 24], [89, 36], [10, 68], [90, 13], [16, 3], [86, 75]].map(([x, y], k) => fsFlash(x, y, [70, 64, 60, 54, 50, 58][k], 0.25 + k * 0.22));
const FS_FLASH_FACILE = Array.from({ length: 14 }, (_, k) => fsFlash(Math.round(((14 + ((k * 97) % 320)) / 348) * 100), Math.round(((-6 + ((k * 151) % 440)) / 430) * 100), 44 + (k % 4) * 12, 0.35 + k * 0.1));
const FS_EPINGLES = [[4.6, 7, 0], [88, 9.3, 90], [5.7, 86, -90], [86.2, 86.5, 180]].map(([x, y, r], k) => ({
  left: `${x}%`, top: `${y}%`, transform: `rotate(${r}deg)`, '--d': `${[0.43, 0.62, 0.81, 1.0][k]}s`,
}) as unknown as CSSProperties);
const FS_PETALES = Array.from({ length: 18 }, (_, k) => ({
  left: `${(((k * 53) % 340) + 8) / 3.6}%`,
  width: `${k % 2 ? 9 : 11}px`,
  height: `${k % 2 ? 13 : 15}px`,
  animationDuration: `${(1.4 + (k % 4) * 0.15).toFixed(2)}s`,
  animationDelay: `${(0.5 + (k % 6) * 0.1).toFixed(2)}s`,
  '--dx': `${((k % 5) - 2) * 18}px`,
  '--r': `${(k % 2 ? 1 : -1) * 260}deg`,
}) as unknown as CSSProperties);

/* CHANTIER 252 — Bibliothèque : la tache d'encre (Raté), ses éclaboussures et ses coulures (repère de 344 × 430,
   la taille de la carte) ; le rayon où le livre se range et ses étincelles (Facile, en % de la carte). */
const BI_TACHE = 'M172 168 C 200 166, 214 186, 232 184 C 252 182, 262 204, 248 220 C 238 232, 256 246, 246 262 C 234 282, 210 274, 196 290 C 182 306, 156 300, 146 284 C 136 270, 110 282, 100 264 C 90 246, 108 236, 102 220 C 96 202, 116 190, 132 194 C 148 198, 150 170, 172 168 Z';
const BI_GICLES = [[96, 172, 4], [258, 170, 3], [70, 260, 5], [276, 280, 3.5], [214, 150, 2.5], [120, 304, 3], [290, 236, 2], [60, 214, 2.5], [236, 310, 4]].map(([x, y, r], k) => ({
  x, y, r, style: { animationDelay: `${(0.64 + (k % 4) * 0.03).toFixed(2)}s` } as CSSProperties,
}));
const BI_COULURES: Array<[string, number, number]> = [['M150 292 C 151 310, 149 326, 150 352', 7, 0.95], ['M196 286 C 197 300, 195 318, 197 340', 5, 1.08], ['M232 268 C 233 280, 232 290, 233 304', 4, 1.2]];
const BI_DOS = ['#5a1e1e', '#1f3f2c', '#2b3d5a', '#3b2a5a', '#6b3a1a'];
const BI_RAYON = [
  ...[18, 15, 20, 16, 19, 14].map((w, k) => ({ w, h: [62, 56, 70, 58, 66, 54][k], c: BI_DOS[(k + 1) % 5] })),
  ...[16, 20, 14, 19, 15, 18].map((w, k) => ({ w, h: [58, 68, 54, 64, 60, 70][k], c: BI_DOS[(k + 4) % 5] })),
].map((d, k) => ({ left: `${(k < 6 ? 5 + k * 5.4 : 62 + (k - 6) * 5.4).toFixed(1)}%`, width: `${d.w}px`, height: `${d.h}px`, top: `${86 - d.h}px`, background: `linear-gradient(90deg, rgba(0, 0, 0, 0.35), transparent 30%, transparent 70%, rgba(0, 0, 0, 0.35)), ${d.c}` }) as CSSProperties);
const BI_ETOILES = [[36, 30], [60, 28], [33, 54], [63, 52], [48, 16], [49, 74]].map(([x, y], k) => ({
  left: `${x}%`, top: `${y}px`, fontSize: `${12 + (k % 3) * 4}px`, animationDelay: `${(2.0 + (k % 3) * 0.08).toFixed(2)}s`,
}) as CSSProperties);

/* CHANTIER 253 — Salon de thé : les gouttes de thé (Raté), les sucres et les ronds (Dur), le sucre glace (Bien),
   le présentoir à trois étages et les pétales (Facile, positions en px depuis le haut de la carte). */
const PT_GOUTTES = [[60, -50], [90, -30], [110, 10], [40, -70], [130, -10], [76, 20]].map(([dx, dy], k) => ({
  width: `${6 + (k % 3) * 3}px`, height: `${6 + (k % 3) * 3}px`, '--dx': `${dx}px`, '--dy': `${dy}px`, animationDelay: `${(0.62 + (k % 3) * 0.04).toFixed(2)}s`,
}) as unknown as CSSProperties);
const PT_SUCRES = [[34, 6, -40, 22, 0.1], [62, 9, 50, -16, 0.3]].map(([x, y, x0, r, d]) => ({
  left: `${x}px`, top: `${y}px`, '--x0': `${x0}px`, '--r': `${r}deg`, animationDelay: `${d}s`,
}) as unknown as CSSProperties);
const PT_RONDS = [0.85, 1.05, 1.25, 1.45].map((d) => ({ animationDelay: `${d}s` }) as CSSProperties);
const PT_MIETTES = Array.from({ length: 12 }, (_, k) => ({
  width: `${k % 2 ? 4 : 6}px`, height: `${k % 2 ? 4 : 6}px`, '--dx': `${((k % 6) - 2.5) * 24}px`, '--dy': `${-(30 + (k % 4) * 16)}px`, animationDelay: `${(0.5 + (k % 3) * 0.04).toFixed(2)}s`,
}) as unknown as CSSProperties);
const PT_MACARONS: Record<string, string[]> = { rose: ['#d9567a', '#ef9fb5', '#a8344f', '#f6c1cf'], pistache: ['#9cc47e', '#cfe3b9', '#6f9654', '#eef5df'], violette: ['#a58bd0', '#d2c3ea', '#7a5fa8', '#e9e0f5'], caramel: ['#d9924a', '#f0c08a', '#a8662a', '#f3d6a6'], citron: ['#f1d38a', '#fbe9bd', '#c9a54a', '#fff3d6'] };
const PT_ETAGES = [
  { top: 144, w: 120, items: ['rose', 'chou'] },
  { top: 244, w: 180, items: ['pistache', 'violette', 'tarte'] },
  { top: 344, w: 240, items: ['caramel', 'citron', 'rose', 'pistache'] },
];
const PT_RETARDS = [0, 0.1, 0.25, 0.35, 0.45, 0.6, 0.7, 0.8, 0.9];
const PT_PETALES = Array.from({ length: 18 }, (_, k) => ({
  left: `${(((k * 53) % 340) + 8) / 3.6}%`, width: `${k % 2 ? 9 : 11}px`, height: `${k % 2 ? 12 : 14}px`,
  background: `linear-gradient(135deg, #fff, ${k % 3 ? '#f3b7c6' : '#eea3b6'} 60%)`,
  '--dx': `${((k % 5) - 2) * 18}px`, '--r': `${(k % 2 ? 1 : -1) * 300}deg`,
  animationDuration: `${(1.4 + (k % 4) * 0.15).toFixed(2)}s`, animationDelay: `${(1.1 + (k % 6) * 0.1).toFixed(2)}s`,
}) as unknown as CSSProperties);
function ptGourmandise(nom: string, k: number) {
  const st = { animationDelay: `${(0.95 + PT_RETARDS[k]).toFixed(2)}s` } as CSSProperties;
  if (nom === 'chou') return <span key={k} className="pop" style={st}><i className="chou" /></span>;
  if (nom === 'tarte') return <span key={k} className="pop" style={st}><i className="tarte" /></span>;
  const [c, cl, f, g] = PT_MACARONS[nom];
  return <span key={k} className="pop" style={st}><span className="macaron" style={{ '--c': c, '--clair': cl, '--fonce': f, '--ganache': g } as unknown as CSSProperties}><i /><i /><i /></span></span>;
}

/* CHANTIER 254 — Cabinet 1900 : le ballon (bulles, mousse, éclats, fumée verte), la fiole (gouttes, bulles),
   les étincelles de la médaille. Positions en px dans chaque objet. */
const CX_BULLES = Array.from({ length: 8 }, (_, k) => ({
  left: `${24 + ((k * 9) % 42)}px`, top: `${74 + (k % 3) * 6}px`, width: `${4 + (k % 3)}px`, height: `${4 + (k % 3)}px`, animationDelay: `${(0.05 + k * 0.08).toFixed(2)}s`,
}) as CSSProperties);
const CX_MOUSSE = [[34, -8, 18], [46, -14, 22], [56, -6, 16], [40, -22, 14], [28, 4, 12], [60, 8, 12]].map(([x, y, z]) => ({
  left: `${x}px`, top: `${y}px`, width: `${z}px`, height: `${z}px`,
}) as CSSProperties);
const CX_ECLATS = [[-110, -80, 220], [-60, -130, -180], [40, -140, 260], [110, -70, -240], [-130, 20, 160], [130, 30, -200], [-40, 60, 300], [70, 70, -280]].map(([dx, dy, r], k) => ({
  width: `${10 + (k % 3) * 4}px`, height: `${8 + (k % 2) * 6}px`, '--dx': `${dx}px`, '--dy': `${dy}px`, '--r': `${r}deg`,
}) as unknown as CSSProperties);
const CX_FUMEES = [[-70, -70, 4], [0, -110, 5], [70, -60, 4.5], [-40, -20, 3.5], [50, -10, 3.5], [0, -50, 6]].map(([dx, dy, s]) => ({
  '--dx': `${dx}px`, '--dy': `${dy}px`, '--s': s,
}) as unknown as CSSProperties);
const CX_GOUTTES = Array.from({ length: 6 }, (_, k) => ({ animationDelay: `${(0.15 + Math.floor(k / 2) * 0.22 + (k % 2) * 0.1).toFixed(2)}s` }) as CSSProperties);
const CX_BULLES_F = Array.from({ length: 8 }, (_, k) => ({
  left: `${24 + ((k * 7) % 34)}px`, bottom: `${6 + (k % 3) * 6}px`, width: `${4 + (k % 2) * 2}px`, height: `${4 + (k % 2) * 2}px`, animationDelay: `${(0.95 + k * 0.09).toFixed(2)}s`,
}) as CSSProperties);
const CX_ETINCELLES = Array.from({ length: 14 }, (_, k) => {
  const a = (k / 14) * Math.PI * 2, r = 90 + (k % 3) * 30;
  return { width: `${k % 2 ? 5 : 7}px`, height: `${k % 2 ? 5 : 7}px`, '--dx': `${Math.round(Math.cos(a) * r)}px`, '--dy': `${Math.round(Math.sin(a) * r)}px`, animationDelay: `${(1.55 + (k % 4) * 0.05).toFixed(2)}s` } as unknown as CSSProperties;
});

/* CHANTIER 255 — Japon zen : les ondes du gong (Bien), les fleurs des branches et les pétales (Bien, Facile). */
const JZ_ONDES = [0.55, 0.75, 0.95, 1.15].map((d) => ({ animationDelay: `${d}s` }) as CSSProperties);
const JZ_FLEURS = [[-6, 50, 40], [30, 66, 46], [70, 80, 38], [110, 96, 34], [10, 96, 30], [300, 96, 40], [262, 112, 44], [226, 130, 36], [330, 70, 30], [190, 146, 30]].map(([x, y, w], k) => ({
  [x > 180 ? 'right' : 'left']: `${x > 180 ? 360 - x - w : x}px`, top: `${y}px`, width: `${w}px`, height: `${Math.round(w * 0.82)}px`, animationDelay: `${(0.3 + k * 0.06).toFixed(2)}s`,
}) as CSSProperties);
const jzPetales = (n: number, debut: number) => Array.from({ length: n }, (_, k) => ({
  left: `${(((k * 53) % 340) + 8) / 3.6}%`, width: `${k % 2 ? 8 : 10}px`, height: `${k % 2 ? 10 : 12}px`,
  background: `linear-gradient(135deg, #fff, ${k % 3 ? '#f6a9c0' : '#f39ab4'} 60%)`,
  '--dx': `${((k % 5) - 2) * 22 + 40}px`, '--r': `${(k % 2 ? 1 : -1) * 320}deg`,
  animationDuration: `${(1.5 + (k % 4) * 0.2).toFixed(1)}s`, animationDelay: `${(debut + (k % 6) * 0.12).toFixed(2)}s`,
}) as unknown as CSSProperties);
const JZ_PETALES_BIEN = jzPetales(7, 0.7);
const JZ_PETALES_FACILE = jzPetales(22, 0.6);

/* CHANTIER 256 — Cotton Club : les notes qui tombent et se brisent (Raté), les ondes de la cymbale (Dur),
   la spirale de notes (Bien), les notes du saxophoniste et les confettis (Facile). */
const CC_TOMBENT = [[11, '♪', 0.6, 300, -30], [29, '♫', 0.7, 270, 20], [49, '♪', 0.8, 320, -16], [66, '♬', 0.75, 290, 28], [83, '♫', 0.9, 310, -24]].map(([x, c, d, dy, r]) => ({
  c: c as string, style: { left: `${x}%`, '--dy': `${dy}px`, '--r': `${r}deg`, '--d': `${d}s` } as unknown as CSSProperties,
}));
const CC_CHOCS = [1.22, 1.34, 1.46].map((d) => ({ animationDelay: `${d}s` }) as CSSProperties);
const CC_SPIRALE = (['♪', '♫', '♪', '♬', '♫', '♪'] as const).map((c, k) => ({
  c, style: { left: `${22 + (k % 3) * 9}px`, top: `calc(70% - ${(k % 2) * 8}px)`, fontSize: `${22 + (k % 3) * 4}px`, animationDelay: `${(0.35 + k * 0.15).toFixed(2)}s` } as CSSProperties,
}));
const CC_JNOTES = (['♪', '♫', '♪'] as const).map((c, k) => ({
  c, style: { fontSize: `${26 + k * 4}px`, '--nx': `${40 + k * 22}px`, '--ny': `${-(70 + k * 24)}px`, animationDelay: `${(1.0 + k * 0.35).toFixed(2)}s` } as unknown as CSSProperties,
}));
const CC_CONFETTIS = Array.from({ length: 22 }, (_, k) => ({
  left: `${(((k * 61) % 340) + 8) / 3.6}%`, width: `${k % 2 ? 6 : 9}px`, height: `${k % 2 ? 10 : 5}px`, background: ['#e8b04a', '#f6dc9a', '#fff2c0', '#c8963a'][k % 4],
  '--dx': `${((k % 5) - 2) * 20}px`, '--r': `${(k % 2 ? 1 : -1) * (300 + k * 20)}deg`,
  animationDuration: `${(1.3 + (k % 4) * 0.15).toFixed(2)}s`, animationDelay: `${(0.8 + (k % 6) * 0.1).toFixed(2)}s`,
}) as unknown as CSSProperties);

/* CHANTIER 257 — Château : les éclats de la flèche (Raté), la poussière du bélier (Dur), la pluie d'or (Bien) et de pétales (Facile). */
const CS_ECLATS = [[-20, -16], [-24, 10], [-12, 22], [-28, -2]].map(([dx, dy]) => ({ '--dx': `${dx}px`, '--dy': `${dy}px` }) as unknown as CSSProperties);
const CS_POUSSIERE = Array.from({ length: 12 }, (_, k) => ({
  left: `${10 + ((k * 29) % 80)}%`, width: `${2 + (k % 3)}px`, height: `${2 + (k % 3)}px`, '--dx': `${((k % 5) - 2) * 6}px`,
  animationDelay: `${([0.28, 0.72, 1.16][k % 3] + (k % 4) * 0.04).toFixed(2)}s`,
}) as unknown as CSSProperties);
const csPluie = (n: number, petale: boolean, debut: number) => Array.from({ length: n }, (_, k) => ({
  left: `${(((k * 53) % 340) + 8) / 3.6}%`, width: `${petale ? (k % 2 ? 9 : 11) : (k % 2 ? 5 : 7)}px`, height: `${petale ? (k % 2 ? 11 : 13) : (k % 2 ? 5 : 7)}px`,
  background: petale ? `linear-gradient(135deg, #fff, ${k % 3 ? '#f3b7c6' : '#eea3b6'} 60%)` : ['#f6dc7a', '#e8c547', '#fff2c0'][k % 3],
  '--dx': `${((k % 5) - 2) * 18}px`, '--r': `${(k % 2 ? 1 : -1) * 300}deg`,
  animationDuration: `${(1.3 + (k % 4) * 0.15).toFixed(2)}s`, animationDelay: `${(debut + (k % 6) * 0.09).toFixed(2)}s`,
}) as unknown as CSSProperties);
const CS_OR = csPluie(16, false, 1.0);
const CS_PETALES = csPluie(20, true, 1.3);

/* CHANTIER 258 — Plage : les bulles (Raté), les mouettes et l'écume dorée (Facile). */
const PG_BULLES = Array.from({ length: 12 }, (_, k) => ({
  left: `${8 + ((k * 37) % 84)}%`, width: `${6 + (k % 3) * 4}px`, height: `${6 + (k % 3) * 4}px`, '--dx': `${((k % 5) - 2) * 8}px`, animationDelay: `${((k % 4) * 0.08).toFixed(2)}s`,
}) as unknown as CSSProperties);
const PG_MOUETTES = [[-30, 16, 0.2], [-60, 21, 0.4], [-20, 26, 0.7]].map(([x, y, d]) => ({ left: `${x}px`, top: `${y}%`, animationDelay: `${d}s` }) as CSSProperties);
const PG_ECUME = Array.from({ length: 14 }, (_, k) => ({
  left: `${10 + ((k * 23) % 80)}%`, top: `${40 + ((k * 17) % 60)}px`, width: `${k % 2 ? 5 : 7}px`, height: `${k % 2 ? 5 : 7}px`,
  '--dx': `${((k % 5) - 2) * 16}px`, '--dy': `${20 + (k % 3) * 20}px`,
}) as unknown as CSSProperties);

/* CHANTIER 259 — Pacific Express : étincelles (Raté, Dur), poussière (Raté), confettis et fumée (Bien), éclats de l'étoile (Facile). */
const PX_ETINCELLES = Array.from({ length: 12 }, (_, k) => ({
  [k % 2 ? 'left' : 'right']: `${10 + (k % 3) * 8}px`, '--dx': `${(k % 2 ? 1 : -1) * (20 + (k % 4) * 14)}px`, '--dy': `${-(20 + (k % 5) * 12)}px`, animationDelay: `${((k % 4) * 0.05).toFixed(2)}s`,
}) as unknown as CSSProperties);
const PX_POUSSIERE = Array.from({ length: 7 }, (_, k) => ({ left: `${8 + k * 13}%`, '--dx': `${((k % 3) - 1) * 20}px`, '--s': `${2 + (k % 3) * 0.5}`, animationDelay: `${(k * 0.04).toFixed(2)}s` }) as unknown as CSSProperties);
const PX_CONFETTIS = Array.from({ length: 6 }, (_, k) => ({ right: `${74 + (k % 3) * 4}px`, '--dx': `${((k % 3) - 1) * 14}px`, '--r': `${k % 2 ? 300 : -260}deg` }) as unknown as CSSProperties);
const PX_FUMEES = Array.from({ length: 6 }, (_, k) => ({ top: `${8 + (k % 3) * 18}px`, animationDelay: `${(k * 0.06).toFixed(2)}s` }) as CSSProperties);
const PX_ECLATS = Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * Math.PI * 2; return { '--dx': `${Math.round(Math.cos(a) * 90)}px`, '--dy': `${Math.round(Math.sin(a) * 90)}px` } as unknown as CSSProperties; });

/* CHANTIER 260 — Jungle : bulles (Raté), rigoles (Dur), pièces et papillons (Facile). */
const JU_BULLES = [[20, 0.5], [46, 0.75], [70, 0.62], [32, 1.0], [60, 1.15]].map(([x, d]) => ({ left: `${x}%`, animationDelay: `${(d - 0.6).toFixed(2)}s` }) as CSSProperties);
const JU_RIGOLES = [12, 34, 58, 80].map((x, j) => ({ left: `${x}%`, animationDelay: `${(j * 0.08).toFixed(2)}s` }) as CSSProperties);
const JU_PIECES = Array.from({ length: 12 }, (_, j) => ({ '--dx': `${((j % 6) - 2.5) * 40}px`, '--hy': `${-(150 + (j % 4) * 40)}px`, animationDelay: `${((j % 5) * 0.05).toFixed(2)}s` }) as unknown as CSSProperties);
const JU_PAPILLONS = [['#e8743b', -90, 0.1], ['#2e78d0', 20, 0.25], ['#f2c14e', 110, 0.4], ['#c0392b', -30, 0.55]].map(([c, dx, d]) => ({ '--c': c, '--dx': `${dx}px`, animationDelay: `${d}s` }) as unknown as CSSProperties);

/* CHANTIER 251 — Cinéma muet, Facile : le public qui applaudit et les « Clap ! » (positions sur un écran de 360 × 760). */
const CI_TETES = Array.from({ length: 9 }, (_, k) => ({
  left: `${(((-14 + k * 42) / 360) * 100).toFixed(1)}%`,
  bottom: `${k % 2 ? 0 : 10}px`,
  '--d': `${(1.4 + (k % 3) * 0.07).toFixed(2)}s`,
}) as unknown as CSSProperties);
const CI_MOTS = [[40, 250, -12], [230, 200, 10], [120, 330, 6], [250, 390, -8], [30, 430, 8], [150, 160, -6], [210, 470, 12]].map(([x, y, r], k) => ({
  left: `${((x / 360) * 100).toFixed(1)}%`,
  top: `${((y / 760) * 100).toFixed(1)}%`,
  fontSize: `${22 + (k % 3) * 4}px`,
  animationDelay: `${(1.45 + k * 0.15).toFixed(2)}s`,
  '--r': `${r}deg`,
}) as unknown as CSSProperties);

/* CHANTIER 247 — TV : les confettis des applaudissements (Facile). */
const TL_COULEURS = ['#2a9d8f', '#e9b44c', '#e76f51', '#b5452a', '#2f6f9e'];
const TL_CONFETTIS = Array.from({ length: 18 }, (_, k) => ({
  left: `${(((k * 61) % 340) + 8) / 3.6}%`,
  width: `${k % 2 ? 6 : 9}px`,
  height: `${k % 2 ? 10 : 6}px`,
  background: TL_COULEURS[k % 5],
  animationDuration: `${(1.2 + (k % 4) * 0.15).toFixed(2)}s`,
  animationDelay: `${(0.1 + (k % 6) * 0.1).toFixed(2)}s`,
  '--dx': `${((k % 5) - 2) * 18}px`,
  '--r': `${(k % 2 ? 1 : -1) * (300 + k * 20)}deg`,
}) as unknown as CSSProperties);

/* CHANTIER 246 — Diner : les éclats de l'assiette (Raté) et les notes du juke-box (Facile). */
const DN_ECLATS = [[-120, 120, -300], [-60, 220, 220], [40, 190, -260], [120, 140, 300], [-150, 40, 180], [150, 60, -200], [-30, 280, 400], [70, 250, -380]].map(([dx, dy, r], k) => ({
  marginLeft: `${(k % 4) * 8 - 12}px`,
  marginTop: `${(k % 3) * 8}px`,
  width: `${14 + (k % 3) * 4}px`,
  height: `${12 + (k % 2) * 6}px`,
  '--dx': `${dx}px`,
  '--dy': `${dy}px`,
  '--r': `${r}deg`,
}) as unknown as CSSProperties);
const DN_COULEURS = ['#d7263d', '#2f6fbf', '#23854a', '#f08c1a', '#b51d31'];
const DN_MUSIQUE = Array.from({ length: 12 }, (_, k) => ({
  left: `${(30 + ((k * 53) % 290)) / 3.6}%`,
  top: `${28 + ((k * 71) % 240) / 7.6}%`,
  color: DN_COULEURS[k % 5],
  fontSize: `${22 + (k % 3) * 4}px`,
  animationDelay: `${(0.15 + (k % 6) * 0.12).toFixed(2)}s`,
  '--dx': `${((k % 3) - 1) * 30}px`,
  '--r': `${k % 2 ? 20 : -20}deg`,
}) as unknown as CSSProperties);

/* CHANTIER 245 — Grille de départ : la fumée du tête-à-queue (Raté) et les confettis à damier (Facile). */
const GC_FUMEES = [[-60, -40], [-20, -70], [34, -52], [-96, 6]].map(([dx, dy], k) => ({
  marginLeft: `${k * 6}px`,
  marginTop: `${k * 8}px`,
  animationDelay: `${(k * 0.06).toFixed(2)}s`,
  '--dx': `${dx}px`,
  '--dy': `${dy}px`,
}) as unknown as CSSProperties);
const GC_CONFETTIS = Array.from({ length: 16 }, (_, k) => ({
  left: `${(((k * 61) % 340) + 8) / 3.6}%`,
  animationDuration: `${(1.2 + (k % 4) * 0.15).toFixed(2)}s`,
  animationDelay: `${(0.8 + (k % 6) * 0.08).toFixed(2)}s`,
  '--dx': `${((k % 5) - 2) * 18}px`,
  '--r': `${(k % 2 ? 1 : -1) * (300 + k * 20)}deg`,
}) as unknown as CSSProperties);

function useAjuste(texte: string, visible = true) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [passe, setPasse] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let derniere = -1;
    const cible = el.parentElement ?? el;
    const ro = new ResizeObserver(() => {
      const l = cible.clientWidth;
      if (l !== derniere) { derniere = l; setPasse((p) => p + 1); }
    });
    ro.observe(cible);
    let actif = true;
    const relance = () => { if (actif) setPasse((p) => p + 1); };
    document.fonts?.ready.then(relance);
    /* CHANTIER 218 — la police d'un mot ne se charge qu'au moment où il s'affiche (la réponse,
       souvent en italique très gras, n'apparaît qu'au toucher). « ready » était déjà résolu :
       la mesure se faisait avec la police de secours, plus étroite, puis la vraie police
       arrivait et le mot se coupait (« coun- / tryside »). On remesure quand une police finit
       de se charger, et deux fois encore par sécurité. */
    document.fonts?.addEventListener?.('loadingdone', relance);
    const t1 = window.setTimeout(relance, 300);
    const t2 = window.setTimeout(relance, 1200);
    return () => {
      actif = false; ro.disconnect();
      document.fonts?.removeEventListener?.('loadingdone', relance);
      window.clearTimeout(t1); window.clearTimeout(t2);
    };
  }, [texte, visible]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = '';
    el.style.hyphens = 'manual';
    el.style.overflowWrap = 'normal';
    el.style.wordBreak = 'normal';
    const cs = getComputedStyle(el);
    /* CHANTIER 218 — 6 % de marge : l'italique très gras déborde de sa propre chasse (le « y », le « e »). */
    const dispo = (el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)) * 0.94 - 2;
    if (dispo <= 0) return;
    const mots = texte.split(/\s+/).filter(Boolean);
    if (!mots.length) return;
    /* La sonde hérite de toute la typo du paragraphe (police, graisse, capitales, espacement). */
    const sonde = document.createElement('span');
    Object.assign(sonde.style, { position: 'absolute', left: '-9999px', top: '0', visibility: 'hidden', whiteSpace: 'nowrap' });
    el.appendChild(sonde);
    const plusLong = () => Math.max(...mots.map((m) => { sonde.textContent = m; return sonde.offsetWidth; }));
    let fs = parseFloat(cs.fontSize) || 32;
    let l = plusLong();
    if (l > dispo) {
      fs = Math.max(TAILLE_MIN, Math.floor((fs * dispo) / l));
      el.style.fontSize = `${fs}px`;
      l = plusLong();
      while (l > dispo && fs > TAILLE_MIN) {
        fs -= 1;
        el.style.fontSize = `${fs}px`;
        l = plusLong();
      }
    }
    sonde.remove();
    if (l > dispo) el.style.overflowWrap = 'anywhere';
  }, [texte, passe, visible]);
  return ref;
}

export function Study({
  queue, image, settings, onGrade, onQuit, onDone,
}: {
  queue: SessionItem[];
  image: string | null;
  settings: Settings;
  onGrade: (item: SessionItem, grade: Grade) => Promise<void>;
  onQuit: () => void;
  onDone: (reviewed: number) => void;
}) {
  const [items, setItems] = useState<SessionItem[]>(queue);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const style = useStyle();
  /* Bonnes réponses d'affilée dans la séance. « Raté » remet à zéro. */
  const [combo, setCombo] = useState(0);
  /* CHANTIER 221 — Cinéma muet et Bibliothèque : la note se « frappe » d'abord (le clap claque,
     le sceau s'écrase), la carte suivante arrive 0,28 s plus tard. */
  const [frappe, setFrappe] = useState<Grade | null>(null);
  /* CHANTIER 244 — Strass : la place de l'invitation au moment du toucher. L'enveloppe, le tapis
     rouge et la moitié droite de la carte déchirée se posent dessus (.sv-scene). */
  const [cadre, setCadre] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const refStage = useRef<HTMLDivElement>(null);
  const refScene = useRef<HTMLDivElement>(null);
  /* Raté : la moitié droite est une copie exacte de la carte (mêmes mots, mêmes tailles de police). */
  useLayoutEffect(() => {
    if (style !== 'strass' || frappe !== 'again') return;
    const carte = refStage.current;
    const scene = refScene.current;
    if (!carte || !scene) return;
    const copie = carte.cloneNode(true) as HTMLElement;
    copie.classList.remove('n-again');
    scene.appendChild(copie);
    return () => { copie.remove(); };
  }, [frappe, style]);

  const total = queue.length;
  const current = items[index];

  const intervals = useMemo(
    () => (current ? previewIntervals(current.progress) : null),
    [current],
  );

  const front = current ? (settings.reversed ? current.card.en : current.card.fr) : '';
  const back = current ? (settings.reversed ? current.card.fr : current.card.en) : '';
  const langFront = settings.reversed ? 'en' : 'fr';
  const langBack = settings.reversed ? 'fr' : 'en';
  const refWord = useAjuste(front, !revealed);
  const refAnswer = useAjuste(back, revealed);

  /*
   * CHANTIER 50 — LA VOIX SUIT L'ANGLAIS, PAS LA RÉPONSE.
   *
   * La synthèse dit toujours `card.en` : c'est l'anglais qu'on apprend à
   * entendre, dans un sens comme dans l'autre. Ce qui changeait, c'était
   * le MOMENT — fixé à la révélation, quel que soit le sens.
   *
   * À l'endroit (FR → EN), la révélation est bien l'instant où l'anglais
   * apparaît : rien à changer.
   *
   * À l'envers (EN → FR), l'anglais est la QUESTION. La voix arrivait
   * donc un temps trop tard : l'application prononçait « the
   * headquarters » au moment précis où l'on avait « le siège central »
   * sous les yeux, et le mot anglais, lui, était resté muet pendant tout
   * le temps où on le lisait. Or entendre et lire le mot ensemble est
   * justement ce qu'on vient chercher en révisant dans ce sens.
   *
   * L'anglais se dit maintenant au moment où il s'affiche, et une seule
   * fois par carte.
   */
  const anglaisEnQuestion = settings.reversed;

  const pronounce = useCallback(() => {
    if (current) speak(current.card.en, settings.speechRate);
  }, [current, settings.speechRate]);

  /*
   * À l'envers : la carte se présente, l'anglais se dit. La dépendance
   * porte sur l'identifiant ET sur la position : « À revoir » réinsère
   * la même carte plus loin dans la session, et elle doit alors se dire
   * de nouveau.
   */
  const carteId = current?.card.id;
  const motAnglais = current?.card.en;
  useEffect(() => {
    if (!anglaisEnQuestion || !settings.autoSpeak || !motAnglais) return;
    speak(motAnglais, settings.speechRate);
  }, [carteId, index, motAnglais, anglaisEnQuestion, settings.autoSpeak, settings.speechRate]);

  const reveal = useCallback(() => {
    setRevealed(true);
    /* À l'envers, l'anglais a déjà été dit à la présentation : le répéter
       ici le collerait à la réponse française, qui n'est pas ce qu'on
       écoute. Le bouton « Écouter » reste là pour le redemander. */
    if (settings.autoSpeak && !anglaisEnQuestion) pronounce();
  }, [settings.autoSpeak, anglaisEnQuestion, pronounce]);

  const grade = useCallback(
    async (g: Grade) => {
      if (!current) return;
      await onGrade(current, g);
      setReviewed((n) => n + 1);
      setCombo((c) => (g === 'again' ? 0 : c + 1));

      const rest = [...items];
      // « À revoir » remet la carte un peu plus loin dans la même session.
      if (g === 'again') {
        rest.splice(Math.min(index + 4, rest.length), 0, current);
      }
      const nextIndex = index + 1;
      setItems(rest);
      setRevealed(false);
      if (nextIndex >= rest.length) onDone(reviewed + 1);
      else setIndex(nextIndex);
    },
    [current, index, items, onGrade, onDone, reviewed],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ') { e.preventDefault(); if (!revealed) reveal(); return; }
      if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        void grade(GRADES[Number(e.key) - 1].key);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, reveal, grade]);

  if (!current) return null;

  return (
    <>
      {/*
       * Fond plein cadre. En position fixe : il couvre aussi la barre du
       * haut et les marges de la coquille centrée, sans quoi la révision
       * aurait l'air posée dans une fenêtre.
       */}
      <div
        className="studybg"
        aria-hidden="true"
        style={image ? { backgroundImage: `url("${image}")` } : undefined}
      />

      <div className="studytop">
        <div className="progressbar">
          <i style={{ width: `${(100 * index) / Math.max(total, 1)}%` }} />
        </div>
        {estLudique(style) && combo >= 2 && (
          <span className="ly-combo" aria-label={`${combo} bonnes réponses d’affilée`}>×{combo}</span>
        )}
        <span className="pos">
          {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
        </span>
        <button className="stop" onClick={onQuit} aria-label="Arrêter la session">
          ✕
        </button>
      </div>

      {/*
       * Toute la zone du mot révèle la réponse : sur téléphone, la cible
       * est bien plus large que le bouton, et le geste devient naturel.
       */}
      <div
        ref={refStage}
        className={`studystage t${index % 2}${(style === 'strass' || style === 'circuit' || style === 'diner' || style === 'tv' || style === 'station' || style === 'fashion' || style === 'cinema' || style === 'biblio' || style === 'patisserie' || style === 'cabinet' || style === 'japon' || style === 'jazz' || style === 'chateau' || style === 'plage' || style === 'western' || style === 'jungle' || style === 'jardin') && frappe ? ` n-${frappe}` : ''}`}
        onClick={() => { if (!revealed) reveal(); }}
      >
        <span className="tag">{current.card.theme}</span>

        {!revealed ? (
          <>
            <p className="ask">{settings.reversed ? 'En français ?' : 'En anglais ?'}</p>
            <p className="word" lang={langFront} ref={refWord}>{front}</p>
            {/*
              * Le mot affiché est l'anglais : on peut le réécouter avant de
              * répondre, autant de fois qu'on veut. `stopPropagation` est
              * indispensable — toute la zone du mot révèle la réponse, et
              * demander à entendre n'est pas demander à voir.
              */}
            {anglaisEnQuestion && (
              <button
                className="speak"
                onClick={(e) => { e.stopPropagation(); pronounce(); }}
              >
                Écouter
              </button>
            )}
          </>
        ) : (
          <>
            <p className="wordsmall" lang={langFront}>{front}</p>
            <span className="ruleline" aria-hidden="true" />
            <p className="answer" lang={langBack} ref={refAnswer}>{back}</p>
            {current.card.example && <p className="example">{current.card.example}</p>}
            <button
              className="speak"
              onClick={(e) => { e.stopPropagation(); pronounce(); }}
            >
              Écouter
            </button>
          </>
        )}
        {/* CHANTIER 247 — TV : ce qui passe à l'écran pendant la note (neige, incident, zapping, « Fin »). */}
        {style === 'tv' && frappe && (
          <span className="tl-ecran" aria-hidden="true">
            {frappe === 'again' && <><i className="neige" /><i className="noir" /><i className="trait" /></>}
            {frappe === 'hard' && <><i className="barres" /><span className="incident"><b>Incident technique</b><small>Veuillez nous excuser…</small></span></>}
            {frappe === 'good' && <><i className="flash" /><b className="chaine"><small>CH</small>2</b></>}
            {frappe === 'easy' && <><i className="spot" /><b className="fin">Fin</b></>}
          </span>
        )}
        {/* CHANTIER 259 — Pacific Express : le déraillement (Raté), le drapeau rouge et « RETARD » (Dur), le poinçon (Bien), l'étoile du shérif (Facile). */}
        {style === 'western' && (frappe === 'again' || frappe === 'hard') && PX_ETINCELLES.map((st, k) => <i key={k} className={`px-etincelle${frappe === 'hard' ? ' tard' : ''}`} aria-hidden="true" style={st} />)}
        {style === 'western' && frappe === 'again' && (
          <>
            {PX_POUSSIERE.map((st, k) => <i key={k} className="px-poussiere" aria-hidden="true" style={st} />)}
            <i className="px-buisson" aria-hidden="true" />
          </>
        )}
        {style === 'western' && frappe === 'hard' && (
          <>
            <span className="px-drapeau" aria-hidden="true"><i /><i /></span>
            <span className="px-retard" aria-hidden="true">RETARD</span>
          </>
        )}
        {style === 'western' && frappe === 'good' && (
          <>
            <span className="px-pince" aria-hidden="true"><i /><i /><i /></span>
            <i className="px-trou" aria-hidden="true" />
            {PX_CONFETTIS.map((st, k) => <i key={k} className="px-confetti" aria-hidden="true" style={st} />)}
            {PX_FUMEES.map((st, k) => <i key={k} className="px-fumee" aria-hidden="true" style={st} />)}
          </>
        )}
        {style === 'western' && frappe === 'easy' && (
          <>
            <span className="px-chapeau" aria-hidden="true"><i /><i /></span>
            <span className="px-etoile" aria-hidden="true"><i /><i /><b>SHÉRIF</b></span>
            {PX_ECLATS.map((st, k) => <i key={k} className="px-eclat" aria-hidden="true" style={st} />)}
          </>
        )}
        {/* CHANTIER 260 — Jungle : les sables mouvants (Raté), l'averse (Dur), le perroquet (Bien), le trésor (Facile). */}
        {style === 'jungle' && frappe === 'again' && (
          <span className="ju-sable" aria-hidden="true"><i className="surface" />{JU_BULLES.map((st, k) => <i key={k} className="bulle" style={st} />)}</span>
        )}
        {style === 'jungle' && frappe === 'hard' && (
          <>
            <span className="ju-pluie" aria-hidden="true"><i /></span>
            {JU_RIGOLES.map((st, k) => <i key={k} className="ju-rigole" aria-hidden="true" style={st} />)}
          </>
        )}
        {/* CHANTIER 261 — le perroquet (Bien) passe au premier plan : il est dessiné plus bas, dans .ju-scene.haut. */}
        {style === 'jungle' && frappe === 'easy' && (
          <>
            <span className="ju-coffre" aria-hidden="true"><i className="rayons" /><i className="caisse" /><i className="couvercle" /><i className="serrure" /></span>
            {JU_PIECES.map((st, k) => <i key={k} className="ju-piece" aria-hidden="true" style={st} />)}
            {JU_PAPILLONS.map((st, k) => <span key={k} className="ju-papillon" aria-hidden="true" style={st}><i /><i /><i /></span>)}
          </>
        )}
        {/* CHANTIER 258 — Plage : la vague qui fait chavirer (Raté), le maître-nageur (Dur), le surfeur et le dauphin (Bien), le tube (Facile). */}
        {style === 'plage' && frappe === 'again' && (
          <>
            <span className="pg-deferle" aria-hidden="true"><i /><i /></span>
            {PG_BULLES.map((st, k) => <i key={k} className="pg-bulle" aria-hidden="true" style={st} />)}
          </>
        )}
        {style === 'plage' && frappe === 'hard' && (
          <>
            <span className="pg-drapeau" aria-hidden="true"><i /><i /><i /></span>
            <span className="pg-sifflet" aria-hidden="true"><i /><i /><i /><b>Tuut !</b></span>
          </>
        )}
        {style === 'plage' && frappe === 'good' && (
          <>
            <span className="pg-dauphin" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            <span className="pg-crete" aria-hidden="true"><i className="vague" /><span className="surfeur"><i /><i /><i /><i /></span></span>
          </>
        )}
        {style === 'plage' && frappe === 'easy' && (
          <>
            <span className="pg-tube" aria-hidden="true"><i className="rouleau" /><i className="ecume" /><span className="surfeur"><i /><i /><i /><i /></span></span>
            {PG_ECUME.map((st, k) => <i key={k} className="pg-ecume" aria-hidden="true" style={st} />)}
          </>
        )}
        {/* CHANTIER 257 — Château : la flèche (Raté), le bélier et le sceau (Dur), l'épée (Bien), les trompettes, les bannières et la couronne (Facile). */}
        {style === 'chateau' && frappe === 'again' && (
          <>
            <span className="cs-fleche" aria-hidden="true"><i className="pointe" /><span className="queue"><i className="tige" /><i className="plume h" /><i className="plume b" /></span></span>
            {CS_ECLATS.map((st, k) => <i key={k} className="cs-eclat" aria-hidden="true" style={st} />)}
          </>
        )}
        {style === 'chateau' && frappe === 'hard' && (
          <>
            <span className="cs-belier" aria-hidden="true"><i className="tronc" /><i className="cercle a" /><i className="cercle b" /><i className="tete" /></span>
            {CS_POUSSIERE.map((st, k) => <i key={k} className="cs-poussiere" aria-hidden="true" style={st} />)}
            <span className="cs-sceau" aria-hidden="true"><small>À</small><b>Reprendre</b><small>⚜</small></span>
          </>
        )}
        {style === 'chateau' && frappe === 'good' && (
          <>
            <span className="cs-epee" aria-hidden="true"><i className="lame" /><i className="fil" /><i className="garde" /><i className="poignee" /><i className="pommeau" /></span>
            <i className="cs-touche g" aria-hidden="true" /><i className="cs-touche d" aria-hidden="true" />
          </>
        )}
        {style === 'chateau' && frappe === 'easy' && (
          <>
            <span className="cs-banniere g" aria-hidden="true"><i /><i /></span><span className="cs-banniere d" aria-hidden="true"><i /><i /></span>
            <span className="cs-couronne" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            <span className="cs-trompette g" aria-hidden="true"><i /><i /><i /></span><span className="cs-trompette d" aria-hidden="true"><i /><i /><i /></span>
            <span className="cs-notes" aria-hidden="true"><b>♪</b><b>♪</b><b>♪</b><b>♪</b></span>
          </>
        )}
        {/* CHANTIER 256 — Cotton Club : la corde de contrebasse et les notes qui se brisent (Raté), la batterie (Dur), le saxophone (Bien). */}
        {style === 'jazz' && frappe === 'again' && (
          <>
            <span className="cc-corde" aria-hidden="true"><i className="haut" /><i className="bas" /><i className="casse" /></span>
            {CC_TOMBENT.map((o, k) => <span key={k} className="cc-tombe" aria-hidden="true" style={o.style}><b>{o.c}</b><i /><i /><i /></span>)}
          </>
        )}
        {style === 'jazz' && frappe === 'hard' && (
          <span className="cc-batterie" aria-hidden="true">
            <span className="cymbale"><i className="pied" /><span className="plateau"><i /></span>{CC_CHOCS.map((st, k) => <i key={k} className="choc" style={st} />)}</span>
            <i className="fut" /><i className="peau" /><i className="fond" />
            <span className="baguette g"><i /></span><span className="baguette d"><i /></span>
          </span>
        )}
        {style === 'jazz' && frappe === 'good' && (
          <>
            <svg className="cc-sax" viewBox="0 0 90 170" aria-hidden="true">
              <defs>
                <linearGradient id="cc-laiton" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a5e1c" /><stop offset="0.35" stopColor="#f8e2a2" /><stop offset="0.55" stopColor="#e8b04a" /><stop offset="1" stopColor="#7a5218" /></linearGradient>
                <radialGradient id="cc-pavillon" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stopColor="#2a1608" /><stop offset="0.55" stopColor="#5a3a12" /><stop offset="0.75" stopColor="#e8b04a" /><stop offset="1" stopColor="#8a5e1c" /></radialGradient>
              </defs>
              <path d="M30 4 L42 1 L44 9 L33 13 Z" fill="#14100c" />
              <path d="M40 8 C 52 10, 60 18, 60 32" fill="none" stroke="url(#cc-laiton)" strokeWidth={6} strokeLinecap="round" />
              <path d="M54 30 L66 30 L68 116 C 68 150, 32 158, 20 136 L12 114 L28 106 L34 124 C 37 134, 52 132, 54 118 Z" fill="url(#cc-laiton)" />
              <path d="M59 34 L61 116 C 61 140, 40 146, 30 132" fill="none" stroke="rgba(255,248,220,0.55)" strokeWidth={1.6} strokeLinecap="round" />
              <ellipse cx="19" cy="110" rx="17" ry="9" transform="rotate(-28 19 110)" fill="url(#cc-pavillon)" stroke="#f6cf72" strokeWidth={1.5} />
              <g fill="#fff2c0" stroke="#8a5e1c" strokeWidth={1}><circle cx="60" cy="46" r="3.6" /><circle cx="61" cy="58" r="3.8" /><circle cx="61" cy="70" r="3.8" /><circle cx="62" cy="84" r="4" /><circle cx="62" cy="96" r="4" /><circle cx="62" cy="108" r="3.6" /></g>
              <g fill="none" stroke="#c8963a" strokeWidth={1.2}><path d="M66 46 L72 46 L72 108 L66 108" /><path d="M54 52 L50 52 L50 100 L55 100" /></g>
              <circle cx="48" cy="130" r="3" fill="#fff2c0" stroke="#8a5e1c" strokeWidth={1} />
            </svg>
            {CC_SPIRALE.map((o, k) => <b key={k} className="cc-spirale" aria-hidden="true" style={o.style}>{o.c}</b>)}
            <i className="cc-fumee" aria-hidden="true" />
          </>
        )}
        {/* CHANTIER 255 — Japon zen : l'encre sumi et le trait rouge (Raté), le sceau 「難」 (Dur), le gong (Bien). */}
        {style === 'japon' && frappe === 'again' && (
          <svg className="jz-encre" viewBox="0 0 340 426" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="jz-sumi" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={3} seed={5} /><feDisplacementMap in="SourceGraphic" scale={20} /><feGaussianBlur stdDeviation={0.6} /></filter>
              <filter id="jz-poil" x="-10%" y="-60%" width="120%" height="220%"><feTurbulence type="fractalNoise" baseFrequency="0.6 0.05" numOctaves={2} seed={9} /><feDisplacementMap in="SourceGraphic" scale={6} /></filter>
            </defs>
            <ellipse className="goutte" cx="172" cy="0" rx="6" ry="8" />
            <path className="tache" filter="url(#jz-sumi)" d="M172 172 C 200 170, 214 188, 232 186 C 250 184, 258 204, 244 220 C 232 234, 248 246, 236 262 C 222 280, 200 270, 186 284 C 170 298, 150 290, 142 276 C 134 262, 110 270, 104 252 C 98 234, 114 226, 110 210 C 106 194, 124 184, 140 188 C 154 192, 152 174, 172 172 Z" />
            <path className="trait fort" filter="url(#jz-poil)" d="M30 268 C 90 236, 170 214, 300 150" pathLength={100} />
            <path className="trait fin" filter="url(#jz-poil)" d="M40 266 C 100 238, 176 218, 296 156" pathLength={100} />
          </svg>
        )}
        {style === 'japon' && frappe === 'hard' && <span className="jz-sceau" aria-hidden="true">難</span>}
        {style === 'japon' && frappe === 'good' && (
          <span className="jz-gong" aria-hidden="true">
            <i className="traverse" /><i className="montant g" /><i className="montant d" /><i className="corde g" /><i className="corde d" />
            <span className="disque" />
            {JZ_ONDES.map((st, k) => <i key={k} className="onde" style={st} />)}
            <span className="maillet"><i /><i /></span>
          </span>
        )}
        {/* CHANTIER 254 — Cabinet 1900 : le ballon qui explose (Raté), le microscope et la loupe (Dur), la fiole (Bien), les électrodes et la médaille (Facile). */}
        {style === 'cabinet' && frappe === 'again' && (
          <span className="cx-ballon" aria-hidden="true">
            <i className="bec" /><i className="flamme" />
            <span className="verre">
              <i className="col" /><i className="panse" />
              {CX_BULLES.map((st, k) => <i key={k} className="bulle" style={st} />)}
              {CX_MOUSSE.map((st, k) => <i key={k} className="mousse" style={st} />)}
            </span>
            <i className="flash" />
            {CX_ECLATS.map((st, k) => <i key={k} className="eclat" style={st} />)}
            {CX_FUMEES.map((st, k) => <i key={k} className="fumee" style={st} />)}
          </span>
        )}
        {style === 'cabinet' && frappe === 'hard' && (
          <>
            <span className="cx-micro" aria-hidden="true"><i className="tube" /><i className="tourelle" /><i className="objectif" /><i className="lentille" /><i className="molette" /></span>
            <span className="cx-loupe" aria-hidden="true"><span>{back}</span></span>
          </>
        )}
        {style === 'cabinet' && frappe === 'good' && (
          <span className="cx-fiole" aria-hidden="true">
            <i className="pipette g" /><i className="pipette d" />
            {CX_GOUTTES.map((st, k) => <i key={k} className={`goutte ${k % 2 ? 'd' : 'g'}`} style={st} />)}
            <span className="cone"><i className="liquide" />{CX_BULLES_F.map((st, k) => <i key={k} className="bulle" style={st} />)}</span>
            <svg className="contour" viewBox="0 0 80 96"><polygon points="30.4,0 49.6,0 49.6,32.6 80,96 0,96 30.4,32.6" /></svg>
            <i className="halo" />
          </span>
        )}
        {style === 'cabinet' && frappe === 'easy' && (
          <>
            <svg className="cx-eclair" viewBox="0 0 348 80" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="52,40 74,30 88,46 110,28 128,48 150,30 170,50 192,28 212,46 232,30 250,48 272,30 296,40" />
              <polyline points="52,40 70,48 92,30 112,50 134,32 152,52 176,30 198,50 218,32 240,50 262,34 280,46 296,40" />
            </svg>
            <span className="cx-electrode g" aria-hidden="true"><i /><i /></span>
            <span className="cx-electrode d" aria-hidden="true"><i /><i /></span>
            <span className="cx-medaille" aria-hidden="true">
              <i className="ruban g" /><i className="ruban d" />
              <span className="disque"><small>Académie</small><small>des sciences</small><span>1900</span><small>✦ ✦ ✦</small></span>
              <i className="reflet"><i /></i>
            </span>
            {CX_ETINCELLES.map((st, k) => <i key={k} className="cx-etincelle" aria-hidden="true" style={st} />)}
          </>
        )}
        {/* CHANTIER 253 — Salon de thé : la tasse (Raté : elle se renverse ; Dur : le sucre), la flaque, le macaron sur sa soucoupe (Bien). */}
        {style === 'patisserie' && frappe === 'again' && <i className="pt-flaque" aria-hidden="true" />}
        {style === 'patisserie' && (frappe === 'again' || frappe === 'hard') && (
          <span className="pt-tasse" aria-hidden="true">
            <i className="soucoupe" />
            <span className="bascule">
              <i className="anse" /><i className="corps" /><i className="bord" /><i className="surface" />
              {frappe === 'hard' && (
                <>
                  {PT_RONDS.map((st, k) => <i key={k} className="rond" style={st} />)}
                  {PT_SUCRES.map((st, k) => <i key={k} className="sucre" style={st} />)}
                  <span className="cuillere"><i /><i /></span>
                </>
              )}
            </span>
            {frappe === 'again' && PT_GOUTTES.map((st, k) => <i key={k} className="goutte" style={st} />)}
          </span>
        )}
        {style === 'patisserie' && frappe === 'good' && (
          <span className="pt-soucoupe" aria-hidden="true">
            <i className="assiette" />
            <span className="tombe"><span className="macaron"><i /><i /><i /></span></span>
            {PT_MIETTES.map((st, k) => <i key={k} className="miette" style={st} />)}
          </span>
        )}
        {/* CHANTIER 252 — Bibliothèque : ce qui s'écrit, se plie ou se colle sur la page pendant la note. */}
        {style === 'biblio' && frappe === 'again' && (
          <svg className="bi-encre" viewBox="0 0 344 430" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="bi-plume" x="-10%" y="-40%" width="120%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={3} /><feDisplacementMap in="SourceGraphic" scale={2.5} /></filter>
              <filter id="bi-buvard" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves={3} seed={8} /><feDisplacementMap in="SourceGraphic" scale={22} /><feGaussianBlur stdDeviation={0.5} /></filter>
              <filter id="bi-bord" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={3} seed={2} /><feDisplacementMap in="SourceGraphic" scale={26} /><feGaussianBlur stdDeviation={2.2} /></filter>
            </defs>
            <g filter="url(#bi-plume)">
              <path className="trait t1 fort" d="M42 200 C 70 194, 96 196, 128 190 C 168 183, 204 188, 236 178 C 262 171, 284 170, 302 176" pathLength={100} />
              <path className="trait t1 fin" d="M44 203 C 80 199, 120 197, 160 190 C 200 186, 240 182, 298 179" pathLength={100} />
              <path className="trait t2 fort" d="M306 206 C 282 214, 246 210, 214 222 C 180 234, 146 226, 112 236 C 88 243, 64 246, 46 240 C 40 238, 38 234, 42 232" pathLength={100} />
              <path className="trait t2 fin" d="M302 210 C 260 220, 210 226, 160 232 C 120 238, 80 244, 50 238" pathLength={100} />
            </g>
            <path className="halo" d={BI_TACHE} filter="url(#bi-bord)" />
            <path className="tache" d={BI_TACHE} filter="url(#bi-buvard)" />
            <ellipse className="tache lustre" cx="160" cy="214" rx="26" ry="12" />
            {BI_GICLES.map((o, k) => <circle key={k} className="gicle" cx={o.x} cy={o.y} r={o.r} style={o.style} filter="url(#bi-plume)" />)}
            <g filter="url(#bi-plume)">
              {BI_COULURES.map(([d, w, dl], k) => <path key={k} className="coulure" d={d} pathLength={100} style={{ strokeWidth: w, animationDelay: `${dl}s` }} />)}
            </g>
          </svg>
        )}
        {style === 'biblio' && frappe === 'hard' && (
          <>
            <span className="bi-corne" aria-hidden="true"><i /><i /></span>
            <i className="bi-crochet" aria-hidden="true" />
            <span className="bi-relire" aria-hidden="true">À relire<i /></span>
          </>
        )}
        {style === 'biblio' && frappe === 'good' && (
          <span className="bi-tampon" aria-hidden="true"><small>Lexique</small><span>Lu</span><small>Bon à ranger</small></span>
        )}
        {style === 'biblio' && frappe === 'easy' && (
          <>
            <span className="bi-exlibris" aria-hidden="true"><em>Ex-libris</em><span>Lexique</span><span className="fleuron">❦</span><i /></span>
            <span className="bi-couv" aria-hidden="true"><span className="fleuron">❦</span><span>Lexique</span><i /><small>Tome {index + 1}</small></span>
          </>
        )}
        {/* CHANTIER 251 — Cinéma muet : le carton « Coupez ! » ou « Deuxième prise » (Coupez !, Dur), le carton « Fin » (Facile). */}
        {style === 'cinema' && (frappe === 'again' || frappe === 'hard') && (
          <span className="ci-carton" aria-hidden="true">
            <small>Scène {index + 1} · prise 1</small>
            <b>{frappe === 'hard' ? 'Deuxième prise' : 'Coupez !'}</b>
            <i />
            <em>On la refait</em>
          </span>
        )}
        {style === 'cinema' && frappe === 'easy' && (
          <span className="ci-carton fin" aria-hidden="true">
            <span className="orne"><i /><i /><i /></span>
            <b>Fin</b>
            <span className="orne"><i /><i /><i /></span>
          </span>
        )}
        {/* CHANTIER 244 — Strass : les tampons « Liste d'attente » (Dur) et « Admis » (Bien). */}
        {style === 'strass' && (
          <span className="sv-tampons" aria-hidden="true"><b className="t-attente">Liste d’attente</b><b className="t-admis">Admis</b></span>
        )}
      </div>

      {/* CHANTIER 244 — Strass : ce qui se pose sur l'invitation pendant la note. */}
      {style === 'strass' && frappe && cadre && (
        <div className="sv-scene" ref={refScene} aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          {frappe === 'good' && (
            <>
              <i className="env-fond" />
              <i className="env-poche" />
              <span className="env-rabat"><i /><b>◆</b></span>
            </>
          )}
          {frappe === 'easy' && (
            <>
              <i className="tapis" />
              <i className="rouleau" />
              <span className="pluie">{SV_PLUIE.map((st, k) => <s key={k} style={st} />)}</span>
              <b className="vip">Entrée VIP</b>
            </>
          )}
        </div>
      )}

      {/* CHANTIER 245 — Grille de départ : ce qui se pose sur le panneau pendant la note. */}
      {style === 'circuit' && frappe && cadre && (
        <div className="gc-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          {frappe === 'again' && (
            <>
              <i className="trace" />
              {GC_FUMEES.map((st, k) => <i key={k} className="fumee" style={st} />)}
            </>
          )}
          {frappe === 'hard' && (
            <>
              <i className="frein g" />
              <i className="frein d" />
              <span className="drap"><i /></span>
              <b className="pancarte">Drapeau jaune</b>
            </>
          )}
          {frappe === 'good' && (
            <>
              <i className="roue hg" />
              <i className="roue hd" />
              <i className="roue bg" />
              <i className="roue bd" />
              <b className="chrono">Pit stop · 2,1 s</b>
              <span className="vitesse"><i /><i /><i /><i /><i /><i /></span>
            </>
          )}
          {frappe === 'easy' && (
            <>
              <i className="arrivee" />
              <i className="balaie" />
              <b className="mt">Meilleur tour</b>
              <span className="damiers">{GC_CONFETTIS.map((st, k) => <s key={k} style={st} />)}</span>
            </>
          )}
        </div>
      )}

      {/* CHANTIER 248 — Station 1936 : ce qui se pose autour de la carte pendant la note. */}
      {style === 'station' && frappe && cadre && (
        <div className="sk-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          {frappe === 'again' && (
            <>
              <i className="congere" />
              {SK_POUDRE.map((st, k) => <i key={k} className="poudre" style={st} />)}
              <i className="ski g" />
              <i className="ski d" />
            </>
          )}
          {frappe === 'hard' && (
            <>
              <span className="vent">{SK_VENT.map((st, k) => <i key={k} style={st} />)}{SK_SOUFFLE.map((st, k) => <s key={k} style={st} />)}</span>
              <span className="panneau"><i /><b>Piste<br />fermée</b></span>
            </>
          )}
          {frappe === 'good' && (
            <svg className="traces" viewBox="0 0 360 760" aria-hidden="true">
              <path d="M170 300 C 230 330, 236 380, 200 420 S 110 490, 130 540 S 236 610, 216 660 S 140 720, 150 800" pathLength="100" />
              <path d="M190 300 C 250 330, 256 380, 220 420 S 130 490, 150 540 S 256 610, 236 660 S 160 720, 170 800" pathLength="100" />
            </svg>
          )}
          {frappe === 'easy' && (
            <>
              <svg className="tremplin" viewBox="0 0 310 170" aria-hidden="true">
                <path className="bois" d="M70 92 L70 168 M130 112 L130 168 M190 110 L190 168 M250 86 L250 168 M286 62 L286 168" />
                <path className="contour" d="M70 92 L70 168 M130 112 L130 168 M190 110 L190 168 M250 86 L250 168 M286 62 L286 168" />
                <path className="croix" d="M70 130 L130 150 M130 140 L190 130 M190 150 L250 120 M250 140 L286 100 M70 150 L130 128 M190 128 L250 148" />
                <path className="planche" d="M0 20 C 60 112, 160 132, 236 96 C 262 84, 282 68, 300 54 L300 66 C 280 82, 262 98, 236 110 C 160 146, 60 128, 0 36 Z" />
                <path className="neige" d="M0 10 C 60 102, 160 122, 236 86 C 262 74, 282 58, 300 44 L300 56 C 282 70, 262 86, 236 98 C 160 134, 60 116, 0 24 Z" />
                <path className="ombre" d="M20 30 C 80 104, 170 114, 236 90" />
                <path className="mat" d="M300 44 L300 8 M300 56 L300 66" />
                <path className="fanion" d="M301 9 L322 16 L301 23 Z" />
              </svg>
              {SK_EMBRUN.map((st, k) => <i key={k} className="embrun" style={st} />)}
              <b className="record">Record !</b>
              <span className="or">{SK_OR.map((st, k) => <s key={k} style={st} />)}</span>
            </>
          )}
        </div>
      )}

      {/* CHANTIER 250 — Fashion week : ce qui se pose autour de la carte pendant la note. */}
      {style === 'fashion' && frappe && cadre && (
        <div className="fs-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          {frappe === 'again' && (
            <>
              <i className="penombre" />
              <i className="talon" />
              <b className="tampon">Faux pas</b>
            </>
          )}
          {frappe === 'hard' && (
            <span className="atelier">
              <span className="metre"><i /><i /></span>
              {FS_EPINGLES.map((st, k) => <span key={k} className="epingle" style={st}><i /></span>)}
              <b className="retouche">Retouche</b>
            </span>
          )}
          {frappe === 'good' && (
            <>
              <i className="podium" />
              {FS_FLASH_BIEN.map((st, k) => <i key={k} className="flash" style={st} />)}
            </>
          )}
          {frappe === 'easy' && (
            <>
              <span className="couv"><b className="titre">Lexique</b><span className="pastille"><small>Le mot</small><b>du jour</b></span><small className="numero">Numéro spécial</small></span>
              {FS_FLASH_FACILE.map((st, k) => <i key={k} className="flash" style={st} />)}
              <span className="petales">{FS_PETALES.map((st, k) => <s key={k} style={st} />)}</span>
            </>
          )}
        </div>
      )}

      {/* CHANTIER 260 — Jungle, Dur : la jungle s'assombrit, deux éclairs. */}
      {style === 'jungle' && frappe === 'hard' && cadre && (
        <div className="ju-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          <i className="nuit" /><i className="eclair g" /><i className="eclair d" />
        </div>
      )}
      {/* CHANTIER 261 — Jungle, Bien : le perroquet et « Bravo ! », au premier plan (au-dessus des notes et de la barre du haut). */}
      {style === 'jungle' && frappe === 'good' && cadre && (
        <div className="ju-scene haut" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          <span className="ju-perroquet"><i className="corps" /><i className="tete" /><i className="bec" /><i className="oeil" /><span className="aile"><i /></span><i className="queue" /><i className="pattes" /></span>
          <b className="ju-bravo">Bravo !</b>
        </div>
      )}
      {/* CHANTIER 261 — Jardin : le coup de vent (Dur), le soleil qui pulse derrière la carte (Facile). */}
      {style === 'jardin' && frappe === 'hard' && <div className="jd-vent" aria-hidden="true"><i /><i /><i /><i /><i /></div>}
      {style === 'jardin' && frappe === 'easy' && <div className="jd-ciel" aria-hidden="true"><i className="soleil" /><i className="rayons" /></div>}

      {/* CHANTIER 259 — Pacific Express, Facile : le soleil couchant, le train en ombre sur l'horizon. */}
      {style === 'western' && frappe === 'easy' && cadre && (
        <div className="px-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          <span className="couchant"><i className="ciel" /><i className="soleil" /><span className="ombre"><span className="px-loco"><i /><i /><i /><i /><i /><i /><i /><i /><i /></span><span className="px-wagon w1"><i /><i /><i /><i /><i /><i /></span><span className="px-wagon w2"><i /><i /><i /><i /><i /><i /></span></span><i className="horizon" /></span>
        </div>
      )}

      {/* CHANTIER 258 — Plage, Facile : le coucher de soleil derrière la carte, les mouettes. */}
      {style === 'plage' && frappe === 'easy' && cadre && (
        <div className="pg-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          <span className="coucher"><i className="ciel" /><i className="soleil" /><i className="mer" />{PG_MOUETTES.map((st, k) => <span key={k} className="mouette" style={st}><i /><i /></span>)}</span>
        </div>
      )}

      {/* CHANTIER 257 — Château : la pluie d'or (Bien) et de pétales (Facile). */}
      {style === 'chateau' && (frappe === 'good' || frappe === 'easy') && cadre && (
        <div className="cs-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          <span className={`pluie${frappe === 'easy' ? ' petales' : ''}`}>{(frappe === 'easy' ? CS_PETALES : CS_OR).map((st, k) => <s key={k} style={st} />)}</span>
        </div>
      )}

      {/* CHANTIER 256 — Cotton Club, Facile : la salle s'éclaire, le projecteur sur le saxophoniste, ses trois notes, « Encore ! », les confettis. */}
      {style === 'jazz' && frappe === 'easy' && cadre && (
        <div className="cc-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          <i className="salle" />
          <span className="plateau">
            <i className="cone" /><i className="halo" />
            <svg className="jazzman" viewBox="0 0 140 220">
                <defs><linearGradient id="cc-laiton2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a5e1c" /><stop offset="0.4" stopColor="#f8e2a2" /><stop offset="0.6" stopColor="#e8b04a" /><stop offset="1" stopColor="#7a5218" /></linearGradient></defs>
                <g fill="#0b0504">
                  <path d="M51 21 C 51 14, 55 10.5, 60.5 10.5 C 63 10.5, 64 12, 65 12 C 66 12, 67 10.5, 68.5 11 C 70 12.5, 70.5 16, 70 21 L 69.5 24 L 51.5 24 Z" />
                  <path d="M44.5 25 C 51 22, 68 21.8, 78 27.5 C 71 28, 54 27, 44.5 25 Z" />
                  <path d="M53 25 C 51 32, 52 39, 56 43 C 58 45, 61 46, 63 45 L 64 43 L 67 42.5 L 66 40.5 L 69 38.5 L 66.5 37 L 67 33 C 67 28, 65 25.5, 62 25.5 Z" />
                  <path d="M55 43 L 61 44 L 60 51 L 54 51 Z" />
                  <path d="M50 51 C 44 62, 41 82, 42 104 L 44 120 L 64 120 C 66 100, 68 78, 66 58 C 63 52, 56 50, 50 51 Z" />
                  <path d="M44 118 L 41 198 L 51 198 L 54 136 L 57 136 L 60 198 L 70 198 L 64 118 Z" />
                  <path d="M37 196 L 52 196 L 53 203 L 34 203 Z" />
                  <path d="M58 196 L 73 196 L 77 203 L 58 203 Z" />
                  <path d="M58 55 C 64 60, 68 68, 70 76 L 75 73 L 77 76 L 72 82 C 68 84, 64 80, 62 74 C 60 68, 57 62, 55 58 Z" />
                  <path d="M48 62 C 50 78, 58 92, 71 97 L 74 95 L 76 99 L 72 103 C 60 102, 48 88, 44 70 Z" />
                </g>
                <path d="M52 22.6 L 69.6 22.6 L 69.6 24.2 L 52 24.2 Z" fill="#3a2410" />
                <path d="M64 40 L 70 41 L 69.5 43 L 64 42.5 Z" fill="#14100c" />
                <path d="M69 41.6 C 74 42, 77 45, 77 51" fill="none" stroke="url(#cc-laiton2)" strokeWidth={2.6} strokeLinecap="round" />
                <path d="M74 51 L 80 51 L 79 112 C 79 122, 89 124, 91 115 L 93 106 L 100 100 L 98 113 C 95 130, 73 131, 73 113 Z" fill="url(#cc-laiton2)" />
                <path d="M78 54 L 77.4 112 C 77.4 120, 84 122, 88 117" fill="none" stroke="rgba(255,248,220,0.6)" strokeWidth={0.9} strokeLinecap="round" />
                <ellipse cx="97.5" cy="101.5" rx="7" ry="3.6" transform="rotate(-38 97.5 101.5)" fill="#3a2410" stroke="#f6cf72" strokeWidth={1.1} />
                <g fill="#fff2c0"><circle cx="77" cy="62" r="1.3" /><circle cx="77" cy="70" r="1.3" /><circle cx="77" cy="86" r="1.3" /><circle cx="77" cy="94" r="1.3" /><circle cx="77" cy="104" r="1.3" /></g>
                <path d="M80.5 60 L 83 60 L 83 104 L 80.5 104" fill="none" stroke="#c8963a" strokeWidth={0.8} />
                <g fill="#0b0504"><ellipse cx="77" cy="75" rx="3.4" ry="2.6" /><ellipse cx="76" cy="99" rx="3.4" ry="2.6" /></g>
              </svg>
            {CC_JNOTES.map((o, k) => <b key={k} className="jnote" style={o.style}>{o.c}</b>)}
          </span>
          <b className="encore">Encore !</b>
          <span className="confettis">{CC_CONFETTIS.map((st, k) => <s key={k} style={st} />)}</span>
        </div>
      )}

      {/* CHANTIER 255 — Japon zen : le Fuji et le soleil levant derrière l'ema (Facile) ; le jardin zen (Dur), les branches en fleurs et les pétales devant. */}
      {style === 'japon' && frappe === 'easy' && cadre && (
        <div className="jz-scene fond" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          <span className="aube"><i className="soleil" /><i className="fuji" /></span>
        </div>
      )}
      {style === 'japon' && (frappe === 'hard' || frappe === 'good' || frappe === 'easy') && cadre && (
        <div className="jz-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          {frappe === 'hard' && (
            <span className="jardin">
              <i className="sable" />
              <svg viewBox="0 0 312 122" preserveAspectRatio="none">
                <ellipse className="s1" cx="156" cy="64" rx="40" ry="20" pathLength={100} />
                <ellipse className="s2" cx="156" cy="64" rx="58" ry="30" pathLength={100} />
                <ellipse className="s3" cx="156" cy="64" rx="76" ry="40" pathLength={100} />
                <path className="s4" d="M14 22 L 70 22 M14 34 L 62 34 M14 96 L 66 96 M14 108 L 74 108 M298 22 L 242 22 M298 34 L 250 34 M298 96 L 246 96 M298 108 L 238 108" pathLength={100} />
              </svg>
              <i className="pierre" />
              <span className="rateau"><i /><i /></span>
            </span>
          )}
          {frappe === 'easy' && (
            <span className="branches"><i className="b g" /><i className="b d" />{JZ_FLEURS.map((st, k) => <i key={k} className="fleur" style={st} />)}</span>
          )}
          {(frappe === 'good' || frappe === 'easy') && (
            <span className="petales">{(frappe === 'easy' ? JZ_PETALES_FACILE : JZ_PETALES_BIEN).map((st, k) => <s key={k} style={st} />)}</span>
          )}
        </div>
      )}

      {/* CHANTIER 253 — Salon de thé, Facile : le présentoir monte devant l'étiquette, les gourmandises s'y posent, les pétales tombent. */}
      {style === 'patisserie' && frappe === 'easy' && cadre && (
        <div className="pt-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          <span className="presentoir">
            <i className="tige" /><i className="pommeau" /><i className="pied" />
            {PT_ETAGES.map((e, j) => (
              <span key={j} className="etage" style={{ top: e.top, width: e.w, marginLeft: -e.w / 2 }}>
                <i className="plateau" />
                <span className="rang">{e.items.map((nom, k) => ptGourmandise(nom, [0, 2, 5][j] + k))}</span>
              </span>
            ))}
          </span>
          <span className="petales">{PT_PETALES.map((st, k) => <s key={k} style={st} />)}</span>
        </div>
      )}

      {/* CHANTIER 252 — Bibliothèque, Facile : le rayon où le livre va se ranger, et ses étincelles. */}
      {style === 'biblio' && frappe === 'easy' && cadre && (
        <div className="bi-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          <span className="rayon">{BI_RAYON.map((st, k) => <i key={k} style={st} />)}<b /></span>
          {BI_ETOILES.map((st, k) => <i key={k} className="etoile" style={st}>★</i>)}
        </div>
      )}

      {/* CHANTIER 251 — Cinéma muet : le grand clap (Coupez !, Dur), l'iris (Bien), les rideaux et le public (Facile). */}
      {style === 'cinema' && frappe && cadre && (
        <div className="ci-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          {(frappe === 'again' || frappe === 'hard') && (
            <span className="clap-d">
              <span className="ardoise">
                <span><span>Prod.</span><b>Lexique</b></span>
                <span><span>Scène</span><b>{index + 1}</b></span>
                <span><span>Prise</span><b>1</b></span>
              </span>
              <i className="bas" /><i className="barre" />
            </span>
          )}
          {frappe === 'good' && <i className="iris" />}
          {frappe === 'easy' && (
            <span className="salle-fin">
              <i className="rideau g" /><i className="rideau d" />
              <span className="lambrequin"><i /><i /><i /></span>
              <span className="public">{CI_TETES.map((st, k) => <span key={k} style={st}><i /></span>)}</span>
              {CI_MOTS.map((st, k) => <b key={k} className="mot" style={st}>Clap !</b>)}
            </span>
          )}
        </div>
      )}

      {/* CHANTIER 247 — TV, Facile : « APPLAUSE » au-dessus du poste et les confettis. */}
      {style === 'tv' && frappe === 'easy' && cadre && (
        <div className="tl-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          <b className="applause">APPLAUSE</b>
          <span className="confettis">{TL_CONFETTIS.map((st, k) => <s key={k} style={st} />)}</span>
        </div>
      )}

      {/* CHANTIER 246 — Diner : ce qui se pose sur le juke-box pendant la note. */}
      {style === 'diner' && frappe && cadre && (
        <div className="dn-scene" aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          {frappe === 'again' && (
            <>
              <i className="assiette" />
              {DN_ECLATS.map((st, k) => <i key={k} className="eclat" style={st} />)}
            </>
          )}
          {frappe === 'hard' && (
            <>
              <i className="pique" />
              <span className="ticket"><b>N° 12</b><i /><small>1 milk-shake</small><b className="tampon">En cuisine</b></span>
              <i className="pointe" />
            </>
          )}
          {frappe === 'good' && (
            <>
              <i className="onde" />
              <i className="onde" />
              <span className="cloche"><i /><i /><i /></span>
              <b className="order">Order up !</b>
              <span className="traits"><i /><i /><i /><i /><i /></span>
            </>
          )}
          {frappe === 'easy' && (
            <>
              <span className="musique">{DN_MUSIQUE.map((st, k) => <b key={k} style={st}>{k % 2 ? '♫' : '♪'}</b>)}</span>
              <b className="tip">Tip !</b>
            </>
          )}
        </div>
      )}

      {!revealed ? (
        <>
          <button className="reveal" onClick={reveal}>Afficher la réponse</button>
          <p className="tap-hint">Touche le mot, ou appuie sur espace au clavier.</p>
        </>
      ) : (
        <div className="grades">
          {GRADES.map((g) => (
            <button
              key={g.key}
              className={`${g.className} g-${g.key}${frappe === g.key ? ' frappe' : ''}`}
              onClick={() => {
                if (frappe) return;
                /* CHANTIER 224 — Salon de thé : le macaron s'écrase (0,65 s) ; Cabinet 1900 : la case réagit (0,45 s). */
                /* CHANTIER 251 — Cinéma muet : « Coupez ! » et Dur (le carton, la bobine), Bien (l'iris), Facile (« Fin », les rideaux). */
                const attente = style === 'cinema' ? (g.key === 'easy' ? 2700 : 2000) /* CHANTIER 252 — Bibliothèque : la rature, « À relire », le tampon « Lu », l'ex-libris. */
                  : style === 'biblio' ? (g.key === 'again' ? 1800 : g.key === 'easy' ? 2400 : 1900) : style === 'patisserie' ? (g.key === 'again' ? 1800 : g.key === 'hard' ? 2000 : g.key === 'good' ? 1700 : 2600) : style === 'cabinet' ? (g.key === 'hard' ? 2000 : g.key === 'easy' ? 2600 : 1900) : style === 'japon' ? (g.key === 'hard' ? 2200 : g.key === 'easy' ? 2800 : 1900) : style === 'jazz' ? (g.key === 'hard' ? 2000 : g.key === 'easy' ? 2600 : 1900)
                  /* CHANTIER 235 — Plage : la bouée (Raté : elle se perce et s'envole) ; Château : l'écu vibre. */
                  : style === 'plage' ? (g.key === 'easy' ? 2600 : 1900) : style === 'chateau' ? (g.key === 'again' ? 1900 : g.key === 'hard' ? 2200 : g.key === 'good' ? 2000 : 2600)
                  /* CHANTIER 237 — Jungle : le panneau penche (Raté) ou pivote ; Pacific Express : le signal s'allume. */
                  : style === 'jardin' ? (g.key === 'easy' ? 2600 : 1900) /* CHANTIER 261 — Jardin : la fleur fane, le coup de vent, l'abeille, l'éclosion. */
                  : style === 'jungle' ? (g.key === 'easy' ? 2600 : 1900) /* CHANTIER 260 — Jungle : sables mouvants, orage, perroquet, trésor. */ : style === 'western' ? (g.key === 'easy' ? 2600 : 1900)
                  /* CHANTIER 238 — Parquet : le tir (planche, cercle, ou panier). */
                  : style === 'basket' ? 1250
                  /* CHANTIER 239 — Pelouse : le ballon touché part (roule, à côté, poteau, lucarne). */
                  : style === 'foot' ? 1250
                  /* CHANTIER 240 — Mêlée : le ballon touché part (en avant, à côté, poteau, entre les poteaux). */
                  : style === 'rugby' ? 1350
                  /* CHANTIER 241 — Tapis vert : le jeton touché part au pot (se coucher, suivre, relancer, tapis). */
                  : style === 'tapis' ? 1350
                  /* CHANTIER 242 — Salon privé : la carte touchée est abattue (Facile : toute la main, en éventail). */
                  : style === 'salon' ? (g.key === 'easy' ? 1600 : 1400)
                  /* CHANTIER 244 — Strass : l'invitation (déchirée, chassée, mise sous enveloppe, tapis rouge). */
                  : style === 'strass' ? (g.key === 'again' ? 1300 : g.key === 'hard' ? 1400 : g.key === 'good' ? 1800 : 2000)
                  /* CHANTIER 245 — Grille de départ : le panneau (tête-à-queue, drapeau jaune, arrêt au stand, ligne d'arrivée). */
                  : style === 'circuit' ? (g.key === 'again' ? 1500 : g.key === 'hard' ? 1600 : g.key === 'good' ? 1900 : 2100)
                  /* CHANTIER 246 — Diner : le juke-box (assiette cassée, en cuisine, « Order up ! », « Tip ! »). */
                  : style === 'diner' ? (g.key === 'again' ? 1600 : g.key === 'hard' ? 1700 : g.key === 'good' ? 1900 : 2100)
                  /* CHANTIER 247 — TV : l'écran (neige, incident technique, zapping, « Fin »). */
                  : style === 'tv' ? (g.key === 'again' ? 1600 : g.key === 'hard' ? 1700 : g.key === 'good' ? 1900 : 2100)
                  /* CHANTIER 248 — Station 1936 : la chute, la bourrasque, la godille, le saut. */
                  : style === 'station' ? (g.key === 'again' ? 1600 : g.key === 'hard' ? 1700 : g.key === 'good' ? 1900 : 2100)
                  /* CHANTIER 250 — Fashion week : faux pas, retouche, tour de piste, en couverture. */
                  : style === 'fashion' ? (g.key === 'again' ? 1700 : g.key === 'hard' ? 1900 : g.key === 'good' ? 1900 : 2400) : 0;
                if (attente && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
                  if (style === 'strass' || style === 'circuit' || style === 'diner' || style === 'tv' || style === 'station' || style === 'fashion' || style === 'cinema' || style === 'biblio' || style === 'patisserie' || style === 'japon' || style === 'jazz' || style === 'chateau' || style === 'plage' || style === 'western' || style === 'jungle') {
                    const el = refStage.current;
                    if (el) setCadre({ top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight });
                  }
                  setFrappe(g.key);
                  window.setTimeout(() => { setFrappe(null); void grade(g.key); }, attente);
                } else void grade(g.key);
              }}
            >
              {style === 'cinema' ? CLAPS[g.key] : estLudique(style) ? COURTS[g.key] : g.label}
              <small>{intervals?.[g.key]}</small>
              {(style === 'plage' || style === 'chateau' || style === 'basket' || style === 'foot' || style === 'rugby' || style === 'tapis' || style === 'salon' || style === 'strass' || style === 'circuit' || style === 'station') && (
                /* CHANTIER 241 — Tapis vert : dix morceaux (cartes jetées, jetons de la mise, jetons qui rebondissent). */
                /* CHANTIER 242 — Salon privé : deux calques sur la carte (les plis, le dos). */
                /* CHANTIER 244 — Strass : aucun morceau, le calque est l'étoile qui scintille sur la pierre. */
                /* CHANTIER 245 — Grille de départ : le calque est la bouffée d'air du pneu crèvé. */
                /* CHANTIER 248 — Station 1936 : le calque est le panneau (poteau en bois, tas de neige). */
                <i className="g-fx" aria-hidden="true">{Array.from({ length: style === 'tapis' ? 10 : style === 'salon' ? 2 : style === 'strass' || style === 'circuit' || style === 'station' ? 0 : 5 }, (_, k) => <i key={k} />)}</i>
              )}
              {/* CHANTIER 261 — Jardin : pétales qui tombent (Raté) ou s'envolent (Dur), l'abeille et son pollen (Bien), les graines de pissenlit (Facile). */}
              {style === 'jardin' && frappe === g.key && (
                <span className="jd-fx" aria-hidden="true">
                  {g.key === 'good' && <span className="abeille"><i /><i /><i /><i /></span>}
                  {Array.from({ length: g.key === 'again' ? 2 : g.key === 'hard' ? 5 : g.key === 'good' ? 4 : 9 }, (_, k) => <i key={k} className={g.key === 'easy' ? 'graine' : g.key === 'good' ? 'pollen' : 'petale'} />)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
