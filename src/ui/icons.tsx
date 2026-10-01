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
  return (
    <svg {...TRAIT}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/** Les cartes empilées : la collection. */
export function IconPaquets() {
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
  return (
    <svg {...TRAIT}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

/** Les trois curseurs : les réglages. */
export function IconReglages() {
  return (
    <svg {...TRAIT}>
      <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />
    </svg>
  );
}

/** La courbe qui monte : ce qui progresse. */
export function IconProgres() {
  return (
    <svg {...TRAIT}>
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}
