/**
 * Les icônes des onglets — les cinq en image, désormais.
 *
 * Aucune ne suit `currentColor` : une image en couleur ne peut pas prendre
 * celle de l'onglet actif. C'est donc l'opacité qui dit l'état, pour les
 * cinq pareillement (voir `.tabicon` dans la feuille de style). Les
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

/**
 * CHANTIER 103 — la bulle de l'onglet « Parler ».
 *
 * Seule icône de la barre dessinée pour elle : les quatre autres sont vos
 * planches. Elle n'emploie donc que les deux couleurs de l'application —
 * l'or de la craie et l'encre — pour ne pas prétendre appartenir à la même
 * série d'illustrations.
 *
 * UNE SEULE FORME PLEINE, et c'est une décision : à 24 px, deux contours qui
 * se chevauchent font une tache, et la barre compte déjà un empilement (les
 * paquets). La bulle d'encre en arrière-plan dit qu'on est deux à parler
 * sans ajouter un second contour à lire.
 *
 * Le micro avait été écarté : il fait doublon avec le bouton « Commencer à
 * parler », et un micro dans une barre d'onglets se lit comme
 * « enregistrer » plutôt que comme « aller ici ».
 */
export function IconParler() {
  return <img src="/tab-parler.png" alt="" width={24} height={24} className="tabicon" />;
}
