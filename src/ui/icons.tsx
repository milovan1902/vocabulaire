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
 *   — Orbite : cinq planètes, une par onglet.
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
  if (style === 'decollage') return <svg {...TRAIT}><path d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44" /><path d="m13.56 11.747 4.332-.924" /><path d="m16 21-3.105-6.21" /><path d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z" /><path d="m6.158 8.633 1.114 4.456" /><path d="m8 21 3.105-6.21" /><circle cx="12" cy="13" r="2" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="12" cy="13" r="4.5" /><path d="M3.2 17.5C1.6 15 6 9.6 12.6 6.9" /><path d="M20.8 8.5c1.6 2.5-2.8 7.9-9.4 10.6" /><circle cx="18.5" cy="5.5" r="2" /></svg>;
  return (
    <svg {...TRAIT}>
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}
