/**
 * Les icônes des onglets.
 *
 * Quatre formes d'attente, au format arrêté : carré de 24, dessin dans les
 * 20 du centre, trait seul en `currentColor`, 1,75 de graisse. Elles sont
 * volontairement pauvres — le jour où les vraies arrivent, chacune se
 * remplace ici sans que la barre ni les écrans ne bougent.
 *
 * `currentColor` partout : c'est la barre qui décide de la couleur selon
 * l'onglet actif, jamais l'icône.
 */

const commun = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Une carte vue de face, pastille au coin : ce qu'il y a à faire. */
export function IconAujourdhui() {
  return (
    <svg {...commun}>
      <rect x="6" y="3.5" width="12" height="17" rx="2.2" />
      <circle cx="18" cy="5" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Trois cartes empilées : la collection. */
export function IconPaquets() {
  return (
    <svg {...commun}>
      <rect x="3.5" y="6.5" width="12" height="14" rx="2.2" />
      <path d="M6.8 4.2h8.4a2.2 2.2 0 0 1 2.2 2.2v10.4" />
      <path d="M10 2h7.5A3 3 0 0 1 20.5 5v9.6" />
    </svg>
  );
}

/** Deux curseurs : les réglages. */
export function IconReglages() {
  return (
    <svg {...commun}>
      <line x1="3" y1="8.5" x2="21" y2="8.5" />
      <circle cx="9" cy="8.5" r="2.6" fill="currentColor" stroke="none" />
      <line x1="3" y1="15.5" x2="21" y2="15.5" />
      <circle cx="15" cy="15.5" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Un anneau ouvert aux trois quarts : ce qui progresse. */
export function IconProgres() {
  return (
    <svg {...commun}>
      <path d="M12 3a9 9 0 1 1-6.36 15.36" />
    </svg>
  );
}
