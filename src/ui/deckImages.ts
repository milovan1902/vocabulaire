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
