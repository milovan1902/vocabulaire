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

/*
 * Deux icônes fournies en image. Elles ne suivent pas `currentColor` — une
 * image en couleur ne peut pas prendre celle de l'onglet actif : c'est
 * l'opacité qui dit l'état (voir `.tabicon` dans la feuille de style). Les
 * fichiers vivent dans `public/`, servis tels quels.
 */

/** Le calendrier fourni. */
export function IconAujourdhui() {
  return <img src="/tab-aujourdhui.png" alt="" width={24} height={24} className="tabicon" />;
}

/** Les trois cartes fournies : la collection. */
export function IconPaquets() {
  return <img src="/tab-paquets.png" alt="" width={24} height={24} className="tabicon" />;
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
