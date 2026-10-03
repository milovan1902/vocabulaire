/**
 * Les icônes des onglets.
 *
 * CHANTIER 161 — UNE SEULE FAMILLE, AU TRAIT.
 *
 * Les cinq images de `public/` venaient de cinq séries différentes (clipart,
 * relief, silhouette…) et ne pouvaient pas prendre la couleur de l'onglet
 * actif : seule l'opacité disait où l'on était. Elles sont remplacées par des
 * tracés au trait (famille Lucide), qui suivent `currentColor` — gris au
 * repos, or quand l'onglet est actif, et la couleur de chaque thème sans
 * rien ajouter.
 *
 * La classe `tabsvg` (et non `tabicon`) est voulue : l'ancienne règle
 * `.tabicon` baissait l'opacité au repos, ce qui rendrait un trait gris
 * presque invisible. Voir `apparence.css`.
 *
 * Les fichiers PNG restent dans `public/` : « Mes progrès » s'en sert encore.
 */

import { useStyle } from './useStyle';

/*
 * CHANTIER 171 — deux autres familles d'icônes, selon l'apparence :
 *   — Décollage : fusée, satellite, antenne, orbite, télescope (Lucide) ;
 *   — Orbite : cinq planètes, une par onglet ;
 *   — Tableau (CHANTIER 173) : cartable, livre, casque du labo de langues,
 *     règle, toque de diplômé ;
 *   — Borne arcade et Néon (CHANTIER 174) : manette, pile de cartes, micro,
 *     joystick, coupe ;
 *   — Grand bleu (CHANTIER 176) : ancre, coquillage, poisson, boussole, voilier ;
 *   — Carnet kraft (CHANTIER 178) : carte, valise, avion, boussole, drapeau ;
 *   — Manga et BD pop (CHANTIER 178) : livre, pile, bulle, curseurs, étoile / éclair ;
 *   — Jardin (CHANTIER 180) : soleil, pousse, bulle, pelle, fleur.
 * Toujours au trait, en currentColor : l'onglet actif garde sa couleur.
 */
const TRAIT = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'tabsvg',
  'aria-hidden': true,
} as const;

/** Le calendrier : ce qu'il y a à faire aujourd'hui. */
export function IconAujourdhui() {
  const style = useStyle();
  if (style === 'jardin') return <svg {...TRAIT}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>;
  if (style === 'voyage') return <svg {...TRAIT}><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M15 5.764v15" /><path d="M9 3.236v15" /></svg>;
  if (style === 'manga' || style === 'bd') return <svg {...TRAIT}><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>;
  if (style === 'ocean') return <svg {...TRAIT}><path d="M12 22V8" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /><circle cx="12" cy="5" r="3" /></svg>;
  if (style === 'arcade' || style === 'neon') return <svg {...TRAIT}><line x1="6" x2="10" y1="11" y2="11" /><line x1="8" x2="8" y1="9" y2="13" /><line x1="15" x2="15.01" y1="12" y2="12" /><line x1="18" x2="18.01" y1="10" y2="10" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" /></svg>;
  if (style === 'tableau') return <svg {...TRAIT}><path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M8 10h8" /><path d="M8 18h8" /><path d="M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>;
  if (style === 'decollage') return <svg {...TRAIT}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="11" cy="13" r="7" /><path d="M7.5 11.5a4 4 0 0 1 3-3" /><path d="M19.5 2.5v5M17 5h5" /></svg>;
  return (
    <svg {...TRAIT}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/** Les cartes empilées : la collection. */
export function IconPaquets() {
  const style = useStyle();
  if (style === 'jardin') return <svg {...TRAIT}><path d="M7 20h10" /><path d="M10 20c5.5-2.5.8-6.4 3-10" /><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" /><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" /></svg>;
  if (style === 'voyage') return <svg {...TRAIT}><path d="M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2" /><path d="M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" /><path d="M10 20h4" /><circle cx="16" cy="20" r="2" /><circle cx="8" cy="20" r="2" /></svg>;
  if (style === 'manga' || style === 'bd') return <svg {...TRAIT}><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>;
  if (style === 'ocean') return <svg {...TRAIT}><path d="M14 11a2 2 0 1 1-4 0 4 4 0 0 1 8 0 6 6 0 0 1-12 0 8 8 0 0 1 16 0 10 10 0 1 1-20 0 11.93 11.93 0 0 1 2.42-7.22 2 2 0 1 1 3.16 2.44" /></svg>;
  if (style === 'arcade' || style === 'neon') return <svg {...TRAIT}><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m2 12 8.58 3.91a2 2 0 0 0 1.66 0L22 12" /><path d="m2 17 8.58 3.91a2 2 0 0 0 1.66 0L22 17" /></svg>;
  if (style === 'tableau') return <svg {...TRAIT}><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>;
  if (style === 'decollage') return <svg {...TRAIT}><path d="M13 7 9 3 5 7l4 4" /><path d="m17 11 4 4-4 4-4-4" /><path d="m8 12 4 4 6-6-4-4Z" /><path d="m16 8 3-3" /><path d="M9 21a6 6 0 0 0-6-6" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="12" cy="12" r="5.5" /><ellipse cx="12" cy="12" rx="10.5" ry="3.6" transform="rotate(-20 12 12)" /></svg>;
  return (
    <svg {...TRAIT}>
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m2 12 8.58 3.91a2 2 0 0 0 1.66 0L22 12" />
      <path d="m2 17 8.58 3.91a2 2 0 0 0 1.66 0L22 17" />
    </svg>
  );
}

/** La bulle : la conversation. */
export function IconParler() {
  const style = useStyle();
  if (style === 'jardin') return <svg {...TRAIT}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>;
  if (style === 'voyage') return <svg {...TRAIT}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>;
  if (style === 'manga' || style === 'bd') return <svg {...TRAIT}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>;
  if (style === 'ocean') return <svg {...TRAIT}><path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" /><path d="M18 12v.5" /><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" /><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" /><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4" /><path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H8c1.17-1.24 2.2-2.88 2.46-4.26" /></svg>;
  if (style === 'arcade' || style === 'neon') return <svg {...TRAIT}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>;
  if (style === 'tableau') return <svg {...TRAIT}><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" /></svg>;
  if (style === 'decollage') return <svg {...TRAIT}><path d="M4 10a7.31 7.31 0 0 0 10 10Z" /><path d="m9 15 3-3" /><path d="M17 13a6 6 0 0 0-6-6" /><path d="M21 13A10 10 0 0 0 11 3" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="9.5" cy="14.5" r="6" /><circle cx="19" cy="5" r="1.8" /><path d="M14.5 2.5a8 8 0 0 1 7 7" /></svg>;
  return (
    <svg {...TRAIT}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

/** Les trois curseurs : les réglages. */
export function IconReglages() {
  const style = useStyle();
  if (style === 'jardin') return <svg {...TRAIT}><path d="M2 22v-5l5-5 5 5-5 5z" /><path d="M9.5 14.5 16 8" /><path d="m17 2 5 5-.5.5a3.53 3.53 0 0 1-5 0a3.53 3.53 0 0 1 0-5L17 2" /></svg>;
  if (style === 'voyage') return <svg {...TRAIT}><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /><circle cx="12" cy="12" r="10" /></svg>;
  if (style === 'manga' || style === 'bd') return <svg {...TRAIT}><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></svg>;
  if (style === 'ocean') return <svg {...TRAIT}><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /><circle cx="12" cy="12" r="10" /></svg>;
  if (style === 'arcade' || style === 'neon') return <svg {...TRAIT}><path d="M21 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z" /><path d="M6 15v-2" /><path d="M12 15V9" /><circle cx="12" cy="6" r="3" /></svg>;
  if (style === 'tableau') return <svg {...TRAIT}><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" /></svg>;
  if (style === 'decollage') return <svg {...TRAIT}><circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="12" cy="12" r="8.5" /><circle cx="9" cy="9.5" r="1.8" /><circle cx="15" cy="14.5" r="2.4" /><circle cx="14.5" cy="7.5" r="1" /><circle cx="8.5" cy="15.5" r="1" /></svg>;
  return (
    <svg {...TRAIT}>
      <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />
    </svg>
  );
}

/** La courbe qui monte : ce qui progresse. */
export function IconProgres() {
  const style = useStyle();
  if (style === 'jardin') return <svg {...TRAIT}><circle cx="12" cy="12" r="3" /><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" /><path d="M12 7.5V9M7.5 12H9m7.5 0H15m-3 4.5V15M8 8l1.88 1.88M14.12 9.88 16 8M8 16l1.88-1.88M14.12 14.12 16 16" /></svg>;
  if (style === 'voyage') return <svg {...TRAIT}><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" /></svg>;
  if (style === 'manga') return <svg {...TRAIT}><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg>;
  if (style === 'bd') return <svg {...TRAIT}><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></svg>;
  if (style === 'ocean') return <svg {...TRAIT}><path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z" /><path d="M21 14 10 2 3 14h18Z" /><path d="M10 2v16" /></svg>;
  if (style === 'arcade' || style === 'neon') return <svg {...TRAIT}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>;
  if (style === 'tableau') return <svg {...TRAIT}><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></svg>;
  if (style === 'decollage') return <svg {...TRAIT}><path d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44" /><path d="m13.56 11.747 4.332-.924" /><path d="m16 21-3.105-6.21" /><path d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z" /><path d="m6.158 8.633 1.114 4.456" /><path d="m8 21 3.105-6.21" /><circle cx="12" cy="13" r="2" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="12" cy="13" r="4.5" /><path d="M3.2 17.5C1.6 15 6 9.6 12.6 6.9" /><path d="M20.8 8.5c1.6 2.5-2.8 7.9-9.4 10.6" /><circle cx="18.5" cy="5.5" r="2" /></svg>;
  return (
    <svg {...TRAIT}>
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}
