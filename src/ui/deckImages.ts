/**
 * Visuels de dos livrés avec l'application.
 *
 * Ces images sont empaquetées dans le code plutôt que stockées en base :
 * elles suivent donc l'installation sur tous les appareils, sans compte et
 * sans réseau. Le compromis est le poids — environ 115 Ko au total — et le
 * fait qu'ajouter un visuel demande un redéploiement. C'est tenable pour
 * une poignée de paquets fournis d'office ; au-delà, il faudra passer par
 * une colonne image_url et un bucket Supabase.
 *
 * Les fichiers sont en 620 x 874, le format de carte de l'application.
 */
import collegeUs from '../assets/decks/college-us.webp';
import irregularVerbs from '../assets/decks/irregular-verbs.webp';
import schoolWork from '../assets/decks/school-work.webp';

import vetements from '../assets/packs/vetements.png';
import loisirsSport from '../assets/packs/loisirs-sport.png';

const FOURNIS: Record<string, string> = {
  'college-us': collegeUs,
  'irregular-verbs': irregularVerbs,
  'school-work': schoolWork,
};

/**
 * Visuel à afficher pour un paquet.
 *
 * Une image choisie par la personne l'emporte toujours sur celle fournie :
 * on ne remplace pas son choix par le nôtre. Renvoie null si ni l'une ni
 * l'autre n'existe, auquel cas l'appelant affiche le dos dessiné.
 */
export function imageFor(deckId: string, stored: string | null | undefined): string | null {
  return stored ?? FOURNIS[deckId] ?? null;
}

/**
 * Illustrations de dos de carte.
 *
 * À ne pas confondre avec FOURNIS ci-dessus, et la différence est de nature,
 * pas de degré. Un visuel de FOURNIS est une image de carte entière, au
 * format 620 x 874 : elle remplit la vignette bord à bord et remplace le dos
 * dessiné. Une illustration, elle, est un SUJET détouré sur fond transparent
 * qui vient se poser À L'INTÉRIEUR du dos dessiné, dans le cadre que
 * `CardBack` trace déjà. Le paquet garde donc sa carrure et son filet.
 *
 * La clé accepte l'identifiant du paquet ou son nom : les paquets fournis
 * ont un identifiant lisible ('college-us'), ceux que vous créez dans
 * l'application non. Les deux graphies mènent au même fichier.
 */
const ILLUSTRATIONS: Record<string, string> = {
  'vetements': vetements,
  'les-vetements': vetements,
  'loisirs-sport': loisirsSport,
  'loisirs-et-sport': loisirsSport,
};

/** Minuscules, sans accent ni ponctuation. */
function cle(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Illustration d'un paquet, ou null s'il n'en a pas.
 *
 * L'appelant ne doit la consulter QUE lorsque `imageFor` a renvoyé null :
 * une image de carte entière, fournie ou choisie, l'emporte toujours.
 */
export function artFor(deckId: string, name: string): string | null {
  return ILLUSTRATIONS[cle(deckId)] ?? ILLUSTRATIONS[cle(name)] ?? null;
}
