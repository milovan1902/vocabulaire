/**
 * CHANTIER 308 — LES MISES EN SITUATION (côté application)
 *
 * Ce qui s'affiche : l'id, la catégorie, le titre. Le reste (rôle, étapes,
 * imprévus) est sur le serveur, dans `functions/api/_situations.ts`. Les
 * ids doivent être les mêmes des deux côtés.
 */
export interface Situation {
  id: string;
  titre: string;
}

export const SITUATIONS: Array<{ cat: string; liste: Situation[] }> = [
  {
    cat: 'Voyage',
    liste: [
      { id: 'hotel', titre: 'Récupérer sa chambre d’hôtel' },
      { id: 'aeroport', titre: 'Enregistrer sa valise à l’aéroport' },
      { id: 'passeports', titre: 'Passer le contrôle des passeports' },
      { id: 'train', titre: 'Acheter un billet de train' },
      { id: 'bagage-perdu', titre: 'Déclarer une valise perdue' },
      { id: 'famille-accueil', titre: 'Arriver dans sa famille d’accueil' },
      { id: 'chemin', titre: 'Demander son chemin' },
    ],
  },
  {
    cat: 'Restaurant et courses',
    liste: [
      { id: 'restaurant', titre: 'Commander au restaurant' },
      { id: 'fast-food', titre: 'Commander dans un fast-food' },
      { id: 'cafe', titre: 'Commander une boisson à emporter' },
      { id: 'vetements', titre: 'Acheter un vêtement' },
      { id: 'retour-article', titre: 'Rapporter un article qui ne marche pas' },
      { id: 'marche', titre: 'Faire ses courses au marché' },
      { id: 'supermarche', titre: 'Trouver des produits au supermarché' },
    ],
  },
  {
    cat: 'En ville',
    liste: [
      { id: 'bus', titre: 'Prendre le bus' },
      { id: 'velo', titre: 'Louer un vélo' },
      { id: 'musee', titre: 'Visiter un musée' },
      { id: 'cinema', titre: 'Aller au cinéma' },
      { id: 'objets-trouves', titre: 'Retrouver un objet perdu' },
    ],
  },
  {
    cat: 'Santé',
    liste: [
      { id: 'pharmacie', titre: 'À la pharmacie' },
      { id: 'medecin', titre: 'Chez le médecin' },
      { id: 'rendez-vous', titre: 'Prendre rendez-vous par téléphone' },
    ],
  },
  {
    cat: 'École et séjours',
    liste: [
      { id: 'college', titre: 'Premier jour dans un collège anglais' },
      { id: 'correspondant', titre: 'Retrouver son correspondant à la gare' },
      { id: 'club-sport', titre: 'S’inscrire à un club de sport' },
      { id: 'bibliotheque', titre: 'À la bibliothèque' },
    ],
  },
  {
    cat: 'Loisirs',
    liste: [
      { id: 'camping', titre: 'Arriver au camping' },
      { id: 'kayak', titre: 'Réserver une sortie en kayak' },
      { id: 'parc', titre: 'Au parc d’attractions' },
      { id: 'match', titre: 'Acheter des places pour un match' },
    ],
  },
];

export function titreSituation(id: string | null): string | null {
  if (!id) return null;
  for (const c of SITUATIONS) {
    const s = c.liste.find((x) => x.id === id);
    if (s) return s.titre;
  }
  return null;
}
