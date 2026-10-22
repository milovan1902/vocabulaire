/**
 * CHANTIER 308 — LES MISES EN SITUATION (côté serveur)
 *
 * La banque complète : le rôle que joue l'IA, celui de l'élève, les étapes
 * à dérouler et les imprévus possibles. L'application n'envoie QUE l'id :
 * aucun texte libre de l'élève n'entre dans le prompt. C'est ce qui garde
 * la sécurité intacte (l'IA ne joue que des rôles écrits ici).
 *
 * Les titres et les catégories affichés sont dans `src/data/situations.ts` :
 * les ids doivent être les mêmes des deux côtés.
 */
export interface Scene {
  titre: string;
  role: string;
  eleve: string;
  etapes: string[];
  imprevus: string[];
}

export const SCENES: Record<string, Scene> = {
  /* Voyage */
  'hotel': {
    titre: 'Récupérer sa chambre d’hôtel',
    role: 'réceptionniste d’un hôtel à Londres',
    eleve: 'un client qui arrive avec une réservation pour deux nuits',
    etapes: ['accueil, nom de la réservation', 'pièce d’identité, durée du séjour', 'horaires et choix du petit-déjeuner', 'étage, wifi, clé de la chambre', 'réserver un taxi pour le lendemain matin'],
    imprevus: ['la chambre n’est pas encore prête', 'la réservation est introuvable sous ce nom', 'il ne reste qu’une chambre côté rue, bruyante'],
  },
  'aeroport': {
    titre: 'Enregistrer sa valise à l’aéroport',
    role: 'agent d’enregistrement d’une compagnie aérienne à Dublin',
    eleve: 'un voyageur qui rentre en France',
    etapes: ['passeport et destination', 'nombre de bagages', 'place hublot ou couloir', 'porte et heure d’embarquement'],
    imprevus: ['la valise dépasse le poids autorisé', 'le vol a une heure de retard', 'une bouteille d’eau est dans le bagage à main'],
  },
  'passeports': {
    titre: 'Passer le contrôle des passeports',
    role: 'agent du contrôle des passeports à l’arrivée à Londres',
    eleve: 'un jeune voyageur qui arrive pour un séjour',
    etapes: ['d’où il arrive', 'motif du séjour', 'durée du séjour, où il va loger (ville seulement)', 'avec qui il voyage'],
    imprevus: ['l’agent demande à voir le billet de retour', 'l’agent ne comprend pas le nom de la ville'],
  },
  'train': {
    titre: 'Acheter un billet de train',
    role: 'guichetier dans une gare d’Édimbourg',
    eleve: 'un voyageur qui veut aller à Glasgow',
    etapes: ['destination et heure', 'aller simple ou aller-retour', 'tarif jeune et prix', 'quai et heure de départ'],
    imprevus: ['le train direct est complet, il faut changer', 'la carte bancaire ne passe pas'],
  },
  'bagage-perdu': {
    titre: 'Déclarer une valise perdue',
    role: 'employé du service bagages d’un aéroport à New York',
    eleve: 'un voyageur dont la valise n’est pas arrivée',
    etapes: ['numéro du vol', 'description de la valise : couleur, taille, signe particulier', 'ce qu’il y a dedans', 'à quel hôtel la livrer (inventé)'],
    imprevus: ['la valise est partie à Chicago', 'il manque une information sur l’étiquette'],
  },
  'famille-accueil': {
    titre: 'Arriver dans sa famille d’accueil',
    role: 'mère d’une famille d’accueil à Brighton',
    eleve: 'un élève en séjour linguistique',
    etapes: ['accueil, le voyage', 'visite de la maison et de la chambre', 'horaires des repas, ce qu’il aime manger', 'programme du lendemain'],
    imprevus: ['il partage la chambre avec un autre élève', 'le repas du soir est un plat qu’il ne connaît pas'],
  },
  'chemin': {
    titre: 'Demander son chemin',
    role: 'passant dans une rue de Londres',
    eleve: 'un touriste qui cherche le British Museum',
    etapes: ['demander poliment', 'les directions : tout droit, à gauche, à droite', 'à pied ou en métro, combien de temps', 'un repère pour ne pas se perdre'],
    imprevus: ['le passant se trompe puis se corrige', 'une rue est fermée pour travaux'],
  },
  /* Restaurant et courses */
  'restaurant': {
    titre: 'Commander au restaurant',
    role: 'serveur d’un restaurant à Londres',
    eleve: 'un client qui dîne avec un ami',
    etapes: ['table pour combien', 'boissons', 'plat principal et accompagnement', 'dessert', 'l’addition'],
    imprevus: ['le plat choisi n’est plus disponible', 'une allergie : il faut vérifier les ingrédients', 'le serveur se trompe de commande'],
  },
  'fast-food': {
    titre: 'Commander dans un fast-food',
    role: 'employé d’un fast-food à Manchester',
    eleve: 'un client pressé',
    etapes: ['sur place ou à emporter', 'menu, taille, boisson', 'sauce et supplément', 'payer'],
    imprevus: ['la machine à glace est en panne', 'la commande servie n’est pas la bonne'],
  },
  'cafe': {
    titre: 'Commander une boisson à emporter',
    role: 'barista d’un café à Oxford',
    eleve: 'un client qui veut un chocolat chaud',
    etapes: ['boisson et taille', 'lait, sucre, crème', 'quelque chose à manger', 'prénom pour le gobelet, payer'],
    imprevus: ['le prénom est mal écrit sur le gobelet', 'il n’y a plus de muffins au chocolat'],
  },
  'vetements': {
    titre: 'Acheter un vêtement',
    role: 'vendeur dans un magasin de vêtements à Londres',
    eleve: 'un client qui cherche un sweat',
    etapes: ['ce qu’il cherche', 'taille et couleur', 'cabine d’essayage', 'le prix, payer'],
    imprevus: ['la taille n’existe plus dans cette couleur', 'l’étiquette n’indique pas le même prix que la caisse'],
  },
  'retour-article': {
    titre: 'Rapporter un article qui ne marche pas',
    role: 'employé du service client d’un magasin d’électronique',
    eleve: 'un client dont le casque audio ne marche pas',
    etapes: ['expliquer le problème', 'le ticket de caisse', 'échange ou remboursement', 'la solution trouvée'],
    imprevus: ['le ticket de caisse est perdu', 'le modèle n’est plus en stock'],
  },
  'marche': {
    titre: 'Faire ses courses au marché',
    role: 'marchand de fruits et légumes sur un marché de Londres',
    eleve: 'un client qui prépare une salade de fruits',
    etapes: ['ce qu’il veut', 'les quantités', 'les prix', 'payer et la monnaie'],
    imprevus: ['il n’y a plus de fraises', 'le marchand se trompe en rendant la monnaie'],
  },
  'supermarche': {
    titre: 'Trouver des produits au supermarché',
    role: 'employé d’un supermarché à Cardiff',
    eleve: 'un client qui prépare un pique-nique',
    etapes: ['où trouver un produit', 'le bon rayon', 'un produit de remplacement', 'la caisse automatique'],
    imprevus: ['la caisse automatique se bloque', 'le produit est en rupture de stock'],
  },
  /* En ville */
  'bus': {
    titre: 'Prendre le bus',
    role: 'chauffeur de bus à Londres',
    eleve: 'un voyageur qui va à Covent Garden',
    etapes: ['ce bus va-t-il à…', 'comment payer', 'combien d’arrêts', 'être prévenu au bon arrêt'],
    imprevus: ['ce bus va dans l’autre direction', 'le bus est dévié à cause d’un défilé'],
  },
  'velo': {
    titre: 'Louer un vélo',
    role: 'loueur de vélos à Cambridge',
    eleve: 'un touriste qui veut visiter la ville',
    etapes: ['durée de location', 'taille du vélo, casque', 'prix et caution', 'itinéraire conseillé'],
    imprevus: ['il ne reste que des vélos trop grands', 'il faut laisser une pièce d’identité en caution'],
  },
  'musee': {
    titre: 'Visiter un musée',
    role: 'agent d’accueil d’un musée à Londres',
    eleve: 'un visiteur',
    etapes: ['billets et tarif', 'audioguide en français', 'le plan, la salle à ne pas manquer', 'le vestiaire'],
    imprevus: ['la salle qu’il voulait voir est fermée', 'son sac est trop grand pour entrer'],
  },
  'cinema': {
    titre: 'Aller au cinéma',
    role: 'guichetier d’un cinéma à Londres',
    eleve: 'un spectateur avec un ami',
    etapes: ['le film et la séance', 'les places', 'pop-corn et boisson', 'quelle salle'],
    imprevus: ['la séance est complète', 'le film est en version originale sans sous-titres'],
  },
  'objets-trouves': {
    titre: 'Retrouver un objet perdu',
    role: 'employé des objets trouvés du métro de Londres',
    eleve: 'un voyageur qui a oublié son sac à dos',
    etapes: ['quoi, où et quand', 'description du sac', 'ce qu’il y a dedans', 'récupérer le sac'],
    imprevus: ['trois sacs se ressemblent', 'il faut revenir le lendemain'],
  },
  /* Santé */
  'pharmacie': {
    titre: 'À la pharmacie',
    role: 'pharmacien à Londres',
    eleve: 'un client qui a mal à la gorge depuis deux jours',
    etapes: ['ce qui ne va pas', 'depuis quand, fièvre ou pas', 'le produit proposé et comment le prendre', 'le prix'],
    imprevus: ['le produit n’existe qu’en grande boîte', 'le pharmacien conseille de voir un médecin si ça continue'],
  },
  'medecin': {
    titre: 'Chez le médecin',
    role: 'médecin à Dublin',
    eleve: 'un touriste qui a mal au ventre',
    etapes: ['ce qui ne va pas', 'depuis quand, ce qu’il a mangé', 'quelques questions simples', 'les conseils : repos, boire de l’eau'],
    imprevus: ['le médecin demande sa carte d’assurance', 'il doit revenir le lendemain'],
  },
  'rendez-vous': {
    titre: 'Prendre rendez-vous par téléphone',
    role: 'secrétaire d’un cabinet de dentiste à Londres',
    eleve: 'quelqu’un qui a mal à une dent',
    etapes: ['le motif', 'le jour et l’heure', 'le nom (inventé), à épeler', 'la confirmation'],
    imprevus: ['plus aucune place cette semaine', 'la ligne coupe, il faut tout répéter'],
  },
  /* École et séjours */
  'college': {
    titre: 'Premier jour dans un collège anglais',
    role: 'élève anglais qui accueille un élève français',
    eleve: 'un élève français en échange',
    etapes: ['les présentations', 'l’emploi du temps', 'la cantine', 'les clubs après les cours'],
    imprevus: ['le cours a changé de salle', 'il faut porter un uniforme dès demain'],
  },
  'correspondant': {
    titre: 'Retrouver son correspondant à la gare',
    role: 'correspondant anglais qui attend à la gare',
    eleve: 'un élève français qui arrive',
    etapes: ['se reconnaître', 'le voyage', 'le programme du week-end', 'ce qu’il aimerait faire'],
    imprevus: ['le train est arrivé sur un autre quai', 'les parents du correspondant sont en retard'],
  },
  'club-sport': {
    titre: 'S’inscrire à un club de sport',
    role: 'entraîneur d’un club de sport à Bristol',
    eleve: 'un jeune qui veut s’inscrire',
    etapes: ['quel sport, quel niveau', 'les horaires', 'l’équipement', 'le prix'],
    imprevus: ['le groupe de son âge est complet', 'l’essai gratuit n’est possible que le samedi'],
  },
  'bibliotheque': {
    titre: 'À la bibliothèque',
    role: 'bibliothécaire à Londres',
    eleve: 'un lecteur qui cherche un livre',
    etapes: ['ce qu’il cherche', 'la carte de bibliothèque', 'la durée du prêt', 'comment le rendre'],
    imprevus: ['le livre est déjà emprunté', 'la carte n’est plus valable'],
  },
  /* Loisirs */
  'camping': {
    titre: 'Arriver au camping',
    role: 'gardien d’un camping en Écosse',
    eleve: 'un campeur qui arrive avec sa famille',
    etapes: ['la réservation', 'l’emplacement', 'les douches et les horaires', 'les activités'],
    imprevus: ['il va pleuvoir toute la nuit', 'l’emplacement prévu est occupé'],
  },
  'kayak': {
    titre: 'Réserver une sortie en kayak',
    role: 'moniteur de kayak au Pays de Galles',
    eleve: 'un jeune qui veut essayer le kayak',
    etapes: ['date et nombre de personnes', 'niveau, savoir nager', 'l’équipement', 'le lieu de rendez-vous'],
    imprevus: ['le vent est trop fort, il faut changer de jour', 'il manque un gilet à la bonne taille'],
  },
  'parc': {
    titre: 'Au parc d’attractions',
    role: 'employé à l’entrée d’un parc d’attractions en Floride',
    eleve: 'un visiteur',
    etapes: ['les billets', 'la taille minimum des attractions', 'le plan, l’attraction conseillée', 'l’heure du spectacle'],
    imprevus: ['l’attraction préférée est fermée', 'la file d’attente fait une heure'],
  },
  'match': {
    titre: 'Acheter des places pour un match',
    role: 'vendeur au guichet d’un stade de football à Liverpool',
    eleve: 'un supporter avec un ami',
    etapes: ['le match, le nombre de places', 'la tribune et le prix', 'le tarif jeune', 'par où entrer'],
    imprevus: ['il n’y a plus deux places côte à côte', 'le match est retardé à cause de la pluie'],
  },
};

/** La scène si l'id est connu, sinon null : un id inconnu ne passe pas. */
export function sceneDe(id: unknown): Scene | null {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(SCENES, id) ? SCENES[id] : null;
}

/** CHANTIER 310 — les titres de la banque, pour que l'IA n'invente pas un doublon. */
export const TITRES_BANQUE = Object.values(SCENES).map((s) => s.titre);

const ligne = (x: unknown, max: number) =>
  typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/**
 * CHANTIER 310 — une scène inventée par l'IA, remise au gabarit de la banque :
 * longueurs bornées, une ligne par champ, 3 à 6 étapes, 1 à 3 imprévus.
 * Ce qui ne passe pas est rejeté (null).
 */
export function sceneValide(x: unknown): Scene | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const liste = (v: unknown, n: number) =>
    Array.isArray(v) ? v.map((e) => ligne(e, 100)).filter(Boolean).slice(0, n) : [];
  const s: Scene = {
    titre: ligne(o.titre, 70),
    role: ligne(o.role, 120),
    eleve: ligne(o.eleve, 120),
    etapes: liste(o.etapes, 6),
    imprevus: liste(o.imprevus, 3),
  };
  return s.titre && s.role && s.eleve && s.etapes.length >= 3 && s.imprevus.length >= 1 ? s : null;
}
