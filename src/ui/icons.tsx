/**
 * Les icônes des onglets — les quatre en image, désormais.
 *
 * Aucune ne suit `currentColor` : une image en couleur ne peut pas prendre
 * celle de l'onglet actif. C'est donc l'opacité qui dit l'état, pour les
 * quatre pareillement (voir `.tabicon` dans la feuille de style). Les
 * fichiers vivent dans `public/`, servis tels quels.
 *
 * Le module garde sa raison d'être : une icône se remplace ici sans que la
 * barre ni les écrans ne bougent.
 */

/** Le calendrier fourni. */
export function IconAujourdhui() {
  return <img src="/tab-aujourdhui.png" alt="" width={24} height={24} className="tabicon" />;
}

/** Les trois cartes fournies : la collection. */
export function IconPaquets() {
  return <img src="/tab-paquets.png" alt="" width={24} height={24} className="tabicon" />;
}

/**
 * Les trois curseurs fournis : les réglages.
 *
 * Dessin large et bas, là où les deux autres sont carrés : il garde ses
 * proportions et se pose au centre du carré de 24 (`object-fit: contain`
 * dans la feuille de style), plutôt que d'être étiré pour le remplir.
 */
export function IconReglages() {
  return <img src="/tab-reglages.png" alt="" width={24} height={24} className="tabicon" />;
}

/** L'histogramme croissant fourni : ce qui progresse. */
export function IconProgres() {
  return <img src="/tab-progres.png" alt="" width={24} height={24} className="tabicon" />;
}
