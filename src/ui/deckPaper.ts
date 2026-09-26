/**
 * Le papier du dos de carte, un par paquet.
 *
 * Jusqu'ici tous les paquets illustrés partageaient un seul fond crème
 * (`NEUTRE`, chantier 19). C'était juste tant qu'il y avait deux ou trois
 * paquets ; à sept, la liste d'« Aujourd'hui » devient une pile de cartes
 * identiques où seul le dessin de 36 pixels distingue une ligne de sa
 * voisine. Le papier reprend donc une teinte — très pâle, pour rester du
 * parchemin et non un aplat de couleur : le dessin garde la parole, le fond
 * ne fait que dire « ce n'est pas le même paquet ».
 *
 * Le filet, lui, est franc. C'est le seul trait qui survive à la vignette
 * de 54 pixels, et un liseré trop clair s'y referme en bouillie grise.
 *
 * Ce qui n'est PAS ici : la teinte des paquets non illustrés. Ceux-là
 * gardent `paletteFor` et son monogramme sur disque plein — deux systèmes
 * de couleur sur la même carte se neutralisent, c'était déjà la leçon du
 * chantier 19.
 */

export type Papier = {
  /** Le fond de la carte. */
  pale: string;
  /** Le filet et son doublage intérieur. */
  mid: string;
  /** L'encre du monogramme. Inutilisée sur un dos illustré ; gardée pour
   *  que `Papier` et le retour de `paletteFor` aient la même forme. */
  ink: string;
};

/** Le crème d'origine, désormais réservé aux cartes à image pleine. */
export const IVOIRE: Papier = { ink: '#5b5347', mid: '#c0b79f', pale: '#f4f1ea' };

/**
 * CHANTIER 113 — le gris du paquet « Reprise des fautes à l'oral ».
 * Hors de la ROUE : aucun paquet du catalogue ne doit tomber dessus par
 * hachage. Un gris froid, légèrement bleuté pour s'accorder au bleu nuit
 * du dessin ; le filet reste franc, comme sur les autres papiers.
 */
export const GRIS: Papier = { ink: '#4a4f57', mid: '#a9aeb6', pale: '#eceef1' };

/**
 * Les sept teintes, dans l'ordre de la liste.
 *
 * Toutes tirées vers le parchemin et posées sur le même palier de clarté :
 * aucune ne doit peser plus que les autres dans la liste, sans quoi elle se
 * lit comme une mise en avant. Le `mid` est le `pale` poussé de deux crans,
 * jamais un gris commun.
 */
export const ROUE: Papier[] = [
  { ink: '#3f5a68', mid: '#9ab1bf', pale: '#e7eef2' }, // bleu ardoise
  { ink: '#455c41', mid: '#9eb39a', pale: '#e8f0e7' }, // sauge
  { ink: '#6b5320', mid: '#c4aa74', pale: '#f7efdd' }, // miel
  { ink: '#4c4364', mid: '#a59cba', pale: '#ece8f2' }, // lilas
  { ink: '#6d4231', mid: '#c69a88', pale: '#f7eae4' }, // terracotta
  { ink: '#633f50', mid: '#ba97a8', pale: '#f4e8ee' }, // rose poudré
  { ink: '#2f5a57', mid: '#8fb2af', pale: '#e6f0ef' }, // bleu-vert
  /*
   * CHANTIER 77 — LA GLYCINE, HUITIÈME TEINTE
   *
   * La sauge de la Grammaire (#e8f0e7) et le bleu-vert de la Conjugaison
   * (#e6f0ef) n'avaient que deux unités d'écart sur un seul canal : à 54
   * pixels, dans la liste, c'était le même papier. La Conjugaison prend
   * donc un violet franc.
   *
   * Un ajout et non une reteinte : « Voyage — phrases » est encore sur le
   * bleu-vert, et repeindre la case l'aurait emmené au violet avec les
   * paquets de conjugaison.
   *
   * Cette teinte sort volontairement du palier de clarté des sept
   * autres — elle est un cran plus dense. C'est le prix de l'écart
   * demandé : dans la liste, les trois cartes de conjugaison pèseront un
   * peu plus que leurs voisines. C'était le compromis annoncé de
   * l'option 1b.
   */
  { ink: '#443a6e', mid: '#9d90c4', pale: '#e5dff2' }, // glycine
];

/**
 * L'attribution voulue, par nom normalisé.
 *
 * Par NOM et non par identifiant : les noms sont ceux qui s'affichent, donc
 * ceux qu'on peut vérifier à l'œil sur la maquette. Si vos identifiants sont
 * stables et parlants, remplissez plutôt `PAR_ID` ci-dessous — il est
 * consulté en premier.
 */
const PAR_NOM: Record<string, number> = {
  'phrases de tous les jours': 0,
  'premieres structures': 1,
  'premiers mots': 2,
  'le preterit': 7, // chantier 77 : glycine

  /*
   * CHANTIER 59 — QUATRE PAQUETS SUR LE MÊME ROSE POUDRÉ
   *
   * « Les vêtements », « Loisirs et sport », « Nombres, quantités et
   * mesures » et « Voyage — vocabulaire » partagent désormais le rose.
   * Choix du propriétaire, et il faut savoir ce qu'il coûte : le
   * parchemin ne distingue plus ces quatre paquets, seuls leurs dessins
   * le font. Le lilas (3) et le terracotta (4) sortent donc de l'usage
   * — ils ne sont plus attribués à personne.
   *
   * Ce qui restait de ma règle vaut encore pour les couples 6e / 5e
   * ci-dessous : là, le papier dit la matière. Ici, il ne dit plus rien
   * de particulier, et c'est tenable tant que les quatre dessins sont
   * franchement différents — un maillot, des chiffres, une valise, un
   * tee-shirt le sont.
   */
  'les vetements': 5,
  'loisirs et sport': 5,
  'nombres quantites et mesures': 5,

  /*
   * CHANTIERS 54 À 58 — LES COUPLES 6e / 5e PARTAGENT LEUR PAPIER
   *
   * Décision du chantier 58, et elle renverse celle des chantiers 54 à
   * 57 : un paquet de cinquième prend LE MÊME parchemin que son homologue
   * de sixième. Seule l'illustration les distingue.
   *
   *    Premières structures — 6e   \                     sauge
   *    Structures et repères — 5e  /  même papier
   *
   *    Phrases de tous les jours — 6e  \                 bleu ardoise
   *    Phrases de tous les jours — 5e  /  même papier
   *
   *    Premiers mots — 6e          \                     miel
   *    Mots de tous les jours — 5e /  même papier
   *
   * Ce que ça dit, et c'est plus juste que ce que je faisais : le papier
   * devient la MATIÈRE — la grammaire est sauge, les phrases sont
   * ardoise, le vocabulaire est miel — et la couleur du dessin devient la
   * seule marque de la classe. Un repère par question posée, au lieu de
   * deux qui variaient ensemble.
   *
   * Ce qu'il faut accepter en échange : dans la liste d'un rayon, les
   * deux paquets d'un couple sont sur le même fond. Ils ne se
   * distinguent que par l'aplat du sujet — canard contre brique, sauge
   * contre violet, bleu contre menthe. En vignette de 54 pixels c'est
   * l'aplat qui porte tout ; les trois couples ont été choisis pour que
   * l'écart de teinte y suffise, mais la marge est plus mince qu'avec
   * deux parchemins différents. La pastille de classe sous la vignette
   * reste le repère sûr.
   *
   * « Voyage — phrases » garde le bleu-vert du chantier 55 : il n'a pas
   * d'homologue, et le bleu ardoise l'aurait posé sur le même parchemin
   * que les DEUX paquets « Phrases de tous les jours » — trois cartes
   * identiques de fond dans un rayon de trois.
   */
  'premieres structures 6e': 1,
  'structures et reperes 5e': 1,
  'structures et reperes': 1,

  'phrases de tous les jours 6e': 0,
  'phrases de tous les jours 5e': 0,

  /*
   * CHANTIER 76 — « Les verbes courants » prend le miel de « Premiers
   * mots ». Le dos livré au même chantier a son fond teinté de cette
   * teinte exacte : les deux vont ensemble, ne changez pas l'un sans
   * l'autre.
   */
  'les verbes courants 5e': 2,
  'les verbes courants': 2,
  'verbes du quotidien 5e': 2,

  'premiers mots 6e': 2,
  'mots de tous les jours 5e': 2,
  'mots de tous les jours': 2,

  /*
   * CHANTIER 60 — le miel aussi pour « Décrire et comparer — 5e », comme
   * « Premiers mots ». Choix du propriétaire.
   *
   * Le rayon « Vocabulaire de base » porte donc trois cartes sur le même
   * parchemin. C'est le plus grand groupe à fond commun du catalogue, et
   * la distinction repose entièrement sur les dessins — une bulle
   * canard, une bulle brique, un sticker bleu nuit. Ces trois-là sont
   * franchement différents ; une quatrième carte miel dans ce rayon
   * serait de trop.
   */
  'decrire et comparer 5e': 2,
  'decrire et comparer': 2,

/*
   * CHANTIER 70 — LES CINQ PAQUETS DE CONSOLIDATION, ET LA ROUE PLEINE
   *
   * Trois suivent la règle du chantier 58 sans discussion — le papier dit
   * la matière :
   *
   *    Le monde autour de nous — 5e      miel        (vocabulaire)
   *    Modaux, futur et petits mots — 5e sauge       (grammaire)
   *    Réagir et s'expliquer — 5e        ardoise     (phrases)
   *
   * Le miel porte donc CINQ cartes dans « Vocabulaire de base ». Ce n'est
   * pas la règle qui casse, c'est la règle qui s'applique : le vocabulaire
   * est miel. La distinction repose entièrement sur les dessins, et il n'y
   * a plus de marge — une sixième carte miel dans ce rayon ne serait plus
   * tenable.
   *
   *    Raconter au passé — 5e            bleu-vert   (même matière que
   *                                                   « Le prétérit »)
   *    Les verbes irréguliers — 5e       terracotta  (matière nouvelle)
   *
   * Le terracotta sortait d'usage depuis le chantier 59 ; il revient pour
   * les irréguliers, seul paquet du catalogue qui soit un TABLEAU —
   * l'infinitif d'un côté, l'infinitif et le prétérit de l'autre. Dans le
   * rayon « Conjugaison », trois paquets, deux teintes : bleu-vert pour
   * les deux prétérits, terracotta pour le tableau.
   *
   * APRÈS CE CHANTIER LA ROUE EST PLEINE : sept teintes, sept usages, plus
   * une seule libre. La prochaine matière demandera une huitième teinte —
   * dites-le-moi et je la dessine sur le même palier de clarté.
   */
  'le monde autour de nous 5e': 2,
  'le monde autour de nous': 2,

  'modaux futur et petits mots 5e': 1,
  'modaux futur et petits mots': 1,

  /*
   * CHANTIER 75 — le paquet s'appelle « Réagir et s'exprimer », le nom que
   * porte son dessin. Les deux graphies sont enregistrées : un paquet qui
   * perd son parchemin parce qu'on a renommé sa carte, c'est le genre de
   * panne qu'on ne voit pas venir.
   */
  'reagir et s exprimer 5e': 0,
  'reagir et s exprimer': 0,
  'reagir et s expliquer 5e': 0,
  'reagir et s expliquer': 0,

  'raconter au passe 5e': 7,
  'raconter au passe': 7,

  /*
   * CHANTIER 73, REVU AU 77 — les irréguliers suivent le prétérit, et
   * les trois paquets du rayon sont désormais sur la GLYCINE (7), non
   * plus sur le bleu-vert. Choix du propriétaire.
   *
   * Ce que ça dit, et c'est défendable : le rayon Conjugaison porte
   * désormais UNE seule teinte pour ses trois paquets — le prétérit, ses
   * phrases, et le tableau des irréguliers sont la même matière. Le
   * parchemin dit le rayon ; seuls les dessins distinguent les paquets,
   * et ils sont franchement différents (calendrier, lettres de
   * plastique).
   *
   * Le terracotta ressort d'usage : il reste libre pour la prochaine
   * matière. Le bleu-vert, lui, n'est plus porté que par « Voyage —
   * phrases ».
   */
  'les verbes irreguliers 5e': 7,
  'les verbes irreguliers': 7,

  /*
   * EDHEC ÉPINGLÉ SUR LE LILAS
   *
   * Il y était déjà — mais par le hachage de repli, pas par décision, et
   * un repli change de teinte dès qu'on touche au nom du paquet ou à la
   * taille de la roue. L'épingler fige ce que vous voyez aujourd'hui.
   *
   * C'est une exception assumée à la règle du papier-matière : ce paquet
   * est dans « Vocabulaire de base » sans être du vocabulaire de base, et
   * son lilas le dit. Le passer au miel ferait six cartes miel dans le
   * rayon — c'est la raison de fond.
   */
  'edhec business school': 3,

  'voyage phrases': 6,
  'voyage vocabulaire': 5,

  /*
   * CHANTIER 95 — les noms des paquets de 4e, en SECOND recours.
   *
   * `PAR_ID` ci-dessus les épingle déjà, et c'est lui qui répond. Ces
   * lignes ne servent qu'au cas où un paquet serait recréé à la main
   * avec un autre identifiant — un import, une manipulation en base. Le
   * papier ne doit pas dépendre d'une chance.
   *
   * « les verbes irreguliers » sans classe est déjà là, au chantier 73,
   * et sur la même glycine : les deux paquets de verbes irréguliers
   * partagent le papier de leur rayon, comme il se doit.
   */
  'les mots 4e': 2,
  'les formes 4e': 1,
  'le present perfect 4e': 1,
  'les verbes irreguliers 4e': 7,
  'reagir et raconter 4e': 0,
  'reagir et raconter': 0,

  /*
   * CHANTIER 97 — les cinq paquets de FIN de quatrième, en second
   * recours comme ceux du chantier 95. `PAR_ID` répond le premier.
   *
   * « si alors 4e » est la forme normalisée de « Si… alors — 4e » :
   * les points de suspension et le tiret cadratin tombent au passage
   * dans `normaliser`. Vérifié, pas supposé.
   */
  'parler de tout 4e': 2,
  'parler de tout': 2,
  'fabriquer les mots 4e': 2,
  'fabriquer les mots': 2,
  'tous les temps 4e': 1,
  'tous les temps': 1,
  'si alors 4e': 1,
  'prendre la parole 4e': 0,
  'prendre la parole': 0,

  /*
   * CHANTIER 122 — les cinq paquets de DÉBUT de troisième, en second
   * recours. `PAR_ID` répond le premier.
   *
   * « passer l oral 3e » est la forme normalisée de « Passer l’oral —
   * 3e » : l'apostrophe typographique et le tiret tombent dans
   * `normaliser`, comme les points de suspension au chantier 97.
   */
  'le monde en debat 3e': 2,
  'le monde en debat': 2,
  'les verbes pour argumenter 3e': 2,
  'les verbes pour argumenter': 2,
  'tournures avancees 3e': 1,
  'tournures avancees': 1,
  'passif et discours rapporte 3e': 1,
  'passif et discours rapporte': 1,
  'passer l oral 3e': 0,
  'passer l oral': 0,

  /*
   * CHANTIER 124 — les cinq paquets de FIN de troisième, en second
   * recours. `PAR_ID` répond le premier.
   */
  'd ici et d ailleurs 3e': 2,
  'd ici et d ailleurs': 2,
  'les erreurs a ne plus faire 3e': 4,
  'les erreurs a ne plus faire': 4,
  'tous les temps en revue 3e': 1,
  'tous les temps en revue': 1,
  'rediger au brevet 3e': 0,
  'rediger au brevet': 0,
  'le jour de l oral 3e': 0,
  'le jour de l oral': 0,
};
/**
 * À remplir si l'identifiant est le repère le plus sûr chez vous.
 *
 * CHANTIER 95 — LES CINQ PAQUETS DE QUATRIÈME Y SONT, ET PAR IDENTIFIANT.
 *
 * Par identifiant et non par nom, contrairement à tout ce qui précède :
 * ces cinq paquets sont créés par le SQL du même chantier, leurs
 * identifiants sont donc connus et stables. Un nom peut se retoucher au
 * catalogue ; '4e-irreguliers' ne bougera pas.
 *
 * LE PAPIER DIT LE RAYON. C'est la règle du chantier 58, appliquée sans
 * exception ici — et c'est ce qui était demandé :
 *
 *    Les mots — 4e                 miel        (Vocabulaire de base)
 *    Les formes — 4e               sauge       (Grammaire)
 *    Le present perfect — 4e       sauge       (Grammaire)
 *    Les verbes irréguliers — 4e   glycine     (Conjugaison)
 *    Réagir et raconter — 4e       ardoise     (Phrases toutes faites)
 *
 * Ce que ça coûte, et il faut le savoir avant de l'ouvrir : le miel porte
 * maintenant SIX cartes, la sauge QUATRE dont deux de 4e sur le même
 * papier, et la glycine TROIS. Dans un rayon, ces cartes ne se
 * distinguent plus que par leur dessin — et ces cinq paquets n'en ont pas
 * encore. Voir la note du LISEZ-MOI : d'ici là, c'est le monogramme sur
 * parchemin teinté qui les sépare, deux lettres et rien d'autre.
 *
 * Les deux paquets de grammaire sur la MÊME sauge est le seul point que
 * je changerais si vous me le demandez : « Le present perfect » pourrait
 * prendre le terracotta, libre depuis le chantier 77. Le papier cesserait
 * alors de dire le rayon pour ce paquet-là — c'est l'arbitrage, et il
 * vous revient.
 */
/**
 * LE RAYON, ET NON PLUS LA LISTE : LA TABLE DE DERNIER RECOURS.
 *
 * CHANTIER 98 — écrit après une panne, et il faut la raconter parce
 * qu'elle se reproduira autrement.
 *
 * Les cinq paquets de fin de 4e sont sortis en bleu, bleu, orange,
 * violet, violet — les couleurs franches de `paletteFor`, tirées du
 * hachage de leur identifiant. La cause immédiate était une build en
 * retard sur `deckPaper.ts`. Mais la cause de fond est ailleurs, et
 * elle est dans ce fichier : depuis le chantier 52, LE PARCHEMIN
 * DÉPEND D'UNE TABLE TENUE À LA MAIN. Un paquet oublié dans `PAR_ID`
 * et `PAR_NOM` ne tombe pas sur une couleur approchante — il tombe
 * dans six couleurs franches qui n'ont rien à voir avec son rayon.
 *
 * Or la règle qu'on écrit depuis le chantier 58 est « LE PAPIER DIT LE
 * RAYON », et le rayon est en base : c'est `deck.categoryId`. La règle
 * peut donc être le code au lieu d'être une liste à recopier.
 *
 * Ce qui NE CHANGE PAS : les deux tables passent toujours en premier.
 * Chaque décision prise depuis le chantier 52 est intacte — le lilas
 * d'EDHEC, le rose des quatre paquets du 59, la glycine du 77, le
 * bleu-vert de « Voyage — phrases ». Aucune carte ne change de couleur.
 *
 * Ce que ça change : un paquet AJOUTÉ DEMAIN, oublié dans les tables,
 * porte le parchemin de son rayon au lieu d'une couleur au hasard. Le
 * hachage de repli ne sert plus qu'aux paquets sans rayon — ceux qu'on
 * crée dans l'application.
 *
 * Les rayons absents d'ici n'ont pas de teinte imposée, volontairement :
 * « Pièges » (terracotta) et les rayons à venir restent libres. Mettez
 * une ligne ici le jour où vous en décidez une.
 */
const PAR_RAYON: Record<string, number> = {
  vocabulaire: 2,  // miel
  grammaire: 1,    // sauge
  conjugaison: 7,  // glycine
  phrases: 0,      // bleu ardoise
};

const PAR_ID: Record<string, number> = {
  '4e-vocabulaire': 2,     // miel
  '4e-grammaire': 1,       // sauge
  '4e-present-perfect': 1, // sauge
  '4e-irreguliers': 7,     // glycine
  '4e-reagir': 0,          // bleu ardoise

  /*
   * CHANTIER 97 — LES CINQ PAQUETS DE FIN DE QUATRIÈME
   *
   * MÊME RÈGLE, SANS EXCEPTION : le papier dit le rayon.
   *
   *    Parler de tout — 4e         miel      (Vocabulaire de base)
   *    Fabriquer les mots — 4e     miel      (Vocabulaire de base)
   *    Tous les temps — 4e         sauge     (Grammaire)
   *    Si… alors — 4e              sauge     (Grammaire)
   *    Prendre la parole — 4e      ardoise   (Phrases toutes faites)
   *
   * CE QUE ÇA COÛTE, ET C'EST LE PLUS LOURD DEPUIS LE CHANTIER 58.
   * Le rayon « Vocabulaire de base » porte maintenant HUIT cartes sur
   * le même miel, la sauge en porte quatre, l'ardoise trois. J'avais
   * écrit au chantier 70 qu'une sixième carte miel « ne serait plus
   * tenable » ; le chantier 95 l'a faite, celui-ci en ajoute deux.
   *
   * Je ne propose pas de reteindre pour autant, et voici pourquoi :
   * changer la teinte d'un seul de ces huit paquets ne dirait rien —
   * il ne serait pas « d'un autre rayon », il serait juste différent
   * sans raison, ce qui est pire qu'identique. La seule sortie propre
   * est l'illustration, comme au chantier 96 pour les deux sauges.
   *
   * D'ICI LÀ, HUIT MONOGRAMMES SUR LE MÊME PARCHEMIN. Dans le rayon
   * Vocabulaire, deux lettres séparent « Parler de tout » (PT) de
   * « Premiers mots » (PM). C'est mince. C'est la réserve à lever en
   * priorité, et elle se lève avec cinq dessins.
   */
  '4e-fin-vocabulaire': 2, // miel
  '4e-fin-mots': 2,        // miel
  '4e-fin-temps': 1,       // sauge
  '4e-fin-modaux': 1,      // sauge
  '4e-fin-phrases': 0,     // bleu ardoise

  /*
   * CHANTIER 122 — LES CINQ PAQUETS DE DÉBUT DE TROISIÈME
   *
   * Même règle : le papier dit le rayon. Choix du propriétaire, fait en
   * connaissance de cause.
   *
   *    Le monde en débat — 3e              miel      (Vocabulaire de base)
   *    Les verbes pour argumenter — 3e     miel      (Vocabulaire de base)
   *    Tournures avancées — 3e             sauge     (Grammaire)
   *    Passif et discours rapporté — 3e    sauge     (Grammaire)
   *    Passer l'oral — 3e                  ardoise   (Phrases toutes faites)
   *
   * Le miel porte maintenant DIX cartes dans « Vocabulaire de base ».
   * Le terracotta, libre, a été proposé pour les verbes et écarté : il
   * aurait été différent sans dire un autre rayon. La sortie reste
   * l'illustration.
   */
  '3e-vocabulaire': 2, // miel
  '3e-verbes': 2,      // miel
  '3e-grammaire': 1,   // sauge
  '3e-passif': 1,      // sauge
  '3e-phrases': 0,     // bleu ardoise

  /*
   * CHANTIER 124 — LES CINQ PAQUETS DE FIN DE TROISIÈME
   *
   *    D'ici et d'ailleurs — 3e            miel        (Vocabulaire de base)
   *    Les erreurs à ne plus faire — 3e    terracotta  (Pièges et nuances)
   *    Tous les temps en revue — 3e        sauge       (Grammaire)
   *    Rédiger au brevet — 3e              ardoise     (Phrases toutes faites)
   *    Le jour de l'oral — 3e              ardoise     (Phrases toutes faites)
   *
   * Les erreurs fréquentes vont au rayon « Pièges », choix du
   * propriétaire : le terracotta y dit bien un autre rayon, et sépare ce
   * paquet de la sauge des temps. Épinglé ICI et non dans `PAR_RAYON` :
   * « Pièges » reste sans teinte imposée, pour ne pas repeindre
   * « Collocations », qui y vit déjà.
   */
  '3e-fin-vocabulaire': 2, // miel
  '3e-fin-erreurs': 4,     // terracotta
  '3e-fin-temps': 1,       // sauge
  '3e-fin-ecrit': 0,       // bleu ardoise
  '3e-fin-oral': 0,        // bleu ardoise
};

/** Minuscules, sans accent ni ponctuation : la clé de correspondance. */
function normaliser(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Repli déterministe pour un paquet qu'aucune table ne nomme.
 *
 * Un paquet ajouté demain doit recevoir une teinte, pas retomber sur le
 * crème : c'est le crème qui signale « image pleine ». Même mélange FNV-1a
 * que `paletteFor`, pour la même raison — le multiplicateur 31 donnait la
 * même couleur à des identifiants proches.
 */
function hacher(cle: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < cle.length; i++) {
    h ^= cle.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Le papier d'un paquet illustré.
 *
 * Même signature que `artFor(id, name)`, et à appeler au même endroit : les
 * deux répondent à la même question — « de quel paquet s'agit-il ? » — et
 * doivent donc se tromper ensemble ou pas du tout.
 */
export function papierFor(id: string, name: string, categoryId?: string | null): Papier {
  const voulu = papierExplicite(id, name, categoryId);
  if (voulu) return voulu;
  return ROUE[hacher(normaliser(name) || id) % ROUE.length];
}

/**
 * Le papier VOULU pour ce paquet, ou null si personne ne l'a décidé.
 *
 * CHANTIER 95 — la même lecture que `papierFor`, amputée de son repli au
 * hasard. Elle existe pour une raison précise : jusqu'ici le parchemin ne
 * s'appliquait qu'aux paquets ILLUSTRÉS (`CardBack` en mode `bare`), et
 * un paquet sans dessin retombait sur `paletteFor` — six couleurs franches
 * tirées d'un hachage de son identifiant. Résultat : les cinq paquets de
 * 4e, qui n'ont pas encore de dos dessiné, auraient porté une couleur
 * tirée au sort au lieu de celle de leur rayon.
 *
 * Distinguer « décidé » de « au hasard » permet à `CardBack` de servir le
 * parchemin du rayon dès maintenant, dessin ou pas, et de ne garder
 * `paletteFor` que pour ce dont personne n'a jamais rien dit — un paquet
 * que vous créez vous-même dans l'application, par exemple.
 */
export function papierExplicite(
  id: string,
  name: string,
  categoryId?: string | null,
): Papier | null {
  if (id === 'reprise-oral') return GRIS;
  if (id in PAR_ID) return ROUE[PAR_ID[id]];
  const cle = normaliser(name);
  if (cle in PAR_NOM) return ROUE[PAR_NOM[cle]];
  /*
   * CHANTIER 98 — le rayon, en dernier recours avant le hasard.
   *
   * Troisième et non premier : les deux tables gardent la main, sans
   * quoi les exceptions assumées tomberaient. EDHEC repasserait au miel
   * alors que son lilas dit précisément qu'il n'est pas du vocabulaire
   * de base ; les quatre paquets du chantier 59 perdraient leur rose.
   *
   * L'argument est OPTIONNEL : tout appel existant à deux arguments
   * continue de fonctionner à l'identique. C'est ce qui permet de ne
   * toucher qu'aux écrans qui ont le rayon sous la main.
   */
  if (categoryId && categoryId in PAR_RAYON) return ROUE[PAR_RAYON[categoryId]];
  return null;
}
