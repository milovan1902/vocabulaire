/**
 * Visuels de dos livrés avec l'application.
 *
 * Ces images sont empaquetées dans le code plutôt que stockées en base :
 * elles suivent donc l'installation sur tous les appareils, sans compte et
 * sans réseau. Le compromis est le poids et le fait qu'ajouter un visuel
 * demande un redéploiement. C'est tenable pour une poignée de paquets
 * fournis d'office ; au-delà, il faudra passer par une colonne image_url
 * et un bucket Supabase.
 *
 * Les fichiers de FOURNIS sont en 620 x 874, le format de carte de
 * l'application. Ceux d'ILLUSTRATIONS sont carrés, 1024 x 1024, sujet
 * détouré sur fond transparent.
 */
import collegeUs from '../assets/decks/college-us.webp';
import irregularVerbs from '../assets/decks/irregular-verbs.webp';
import schoolWork from '../assets/decks/school-work.webp';

import vetements from '../assets/packs/vetements.png';
import loisirsSport from '../assets/packs/loisirs-sport.png';
import premieresStructures from '../assets/packs/premieres-structures.png';
import premiersMots from '../assets/packs/premiers-mots.png';
import nombresMesures from '../assets/packs/nombres-mesures.png';
import phrasesQuotidien from '../assets/packs/phrases-quotidien.png';
import preterit from '../assets/packs/preterit.png';
import voyageVocabulaire from '../assets/packs/voyage-vocabulaire.png';
import voyagePhrases from '../assets/packs/voyage-phrases.png';
import structures5e from '../assets/packs/5e-grammaire.png';
import phrases5e from '../assets/packs/5e-phrases.png';
import mots5e from '../assets/packs/5e-vocabulaire.png';
import adjectifs5e from '../assets/packs/5e-adjectifs.png';
import irreguliers5e from '../assets/packs/5e-irreguliers.png';
import modaux5e from '../assets/packs/5e-modaux.png';
import monde5e from '../assets/packs/5e-monde.png';
import reagir5e from '../assets/packs/5e-reagir.png';
import raconter5e from '../assets/packs/5e-raconter.png';
import courants5e from '../assets/packs/5e-courants.png';

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
 * La clé accepte l'identifiant du paquet ou son nom, en clair ou normalisé :
 * les paquets fournis ont un identifiant lisible ('nombres-mesures'), ceux
 * venus de Supabase portent parfois un identifiant de classe ('6e-grammaire')
 * et ceux que vous créez dans l'application n'en ont aucun de lisible. Toutes
 * les graphies mènent au même fichier — c'est volontairement redondant :
 * renommer un paquet dans l'application ne doit pas lui faire perdre son
 * illustration.
 */
const ILLUSTRATIONS: Record<string, string> = {
  'vetements': vetements,
  'les-vetements': vetements,

  'loisirs-sport': loisirsSport,
  'loisirs-et-sport': loisirsSport,

  '6e-grammaire': premieresStructures,
  'premieres-structures': premieresStructures,
  'premieres-structures-6e': premieresStructures,

  '6e-vocabulaire': premiersMots,
  'premiers-mots': premiersMots,
  'premiers-mots-6e': premiersMots,

  'nombres-mesures': nombresMesures,
  'nombres-quantites-et-mesures': nombresMesures,

  '6e-phrases': phrasesQuotidien,
  'phrases': phrasesQuotidien,
  'phrases-de-tous-les-jours': phrasesQuotidien,
  'phrases-de-tous-les-jours-6e': phrasesQuotidien,

  'preterit': preterit,
  'le-preterit': preterit,

  'voyage-vocabulaire': voyageVocabulaire,
  'voyage-mots': voyageVocabulaire,
  'voyages-mots': voyageVocabulaire,

  /*
   * CHANTIER 55 — « Voyage — phrases » reçoit enfin le sien.
   *
   * Il en était privé depuis le chantier 48 pour une raison qui ne tient
   * plus : les deux paquets de voyage se suivant dans la même liste, une
   * illustration partagée les aurait rendus indiscernables. Ils ont
   * maintenant deux dessins distincts — le globe et les papiers d'un
   * côté, le globe et les bulles de dialogue de l'autre — et deux
   * papiers différents (voir `deckPaper.ts`).
   *
   * Réserve à connaître : ce dessin porte du TEXTE dans ses bulles
   * (« Hello ! », « Bonjour ! »…). À 54 pixels, la largeur de la
   * vignette dans les listes, ces mots ne se lisent plus — il reste cinq
   * bulles de couleur, ce qui suffit à reconnaître le paquet mais ne dit
   * plus « des langues ». C'est le seul visuel du catalogue dans ce cas.
   */
  'voyage-phrases': voyagePhrases,
  'voyages-phrases': voyagePhrases,
  'voyage-phrase': voyagePhrases,

  /*
   * CHANTIER 54 — le même puzzle que « Premières structures — 6e », aux
   * mêmes pièces et au même contour, recoloré en violet, framboise et
   * lilas. Les deux paquets sont de la même main : c'est ce qui dit que
   * la grammaire de cinquième continue celle de sixième.
   *
   * Aucune des trois couleurs ne figure ailleurs au catalogue — c'est ce
   * qui empêche de prendre ce paquet pour un autre dans une liste de
   * douze, là où une simple variation de la palette du 6e aurait créé
   * deux cartes jumelles.
   *
   * Le fichier est distinct de `premieres-structures.png`, et non une
   * teinte appliquée au vol : un filtre CSS toucherait aussi le contour
   * bleu nuit, qui doit rester identique d'un paquet à l'autre.
   */
  '5e-grammaire': structures5e,
  'structures-et-reperes': structures5e,
  'structures-et-reperes-5e': structures5e,

  /*
   * CHANTIER 56 — les bulles de « Phrases de tous les jours », recolorées
   * en menthe et lavande pour la cinquième. Même dessin que le paquet de
   * sixième, mêmes bulles, même contour ardoise, même liseré blanc : les
   * rôles de couleur sont permutés, rien d'autre.
   *
   * C'est le second couple de paquets bâti sur ce principe, après les
   * deux puzzles de grammaire (chantier 54). La règle qui en sort et qui
   * vaut pour la suite : un paquet de 5e reprend le dessin de son
   * homologue de 6e et en change les couleurs. Le dessin dit la MATIÈRE,
   * la couleur dit la CLASSE — et l'élève qui monte d'un niveau retrouve
   * ses repères sans confondre les deux paquets.
   *
   * Le fichier est distinct, et non un filtre appliqué au vol : une
   * teinte CSS toucherait aussi le contour ardoise et le liseré blanc,
   * qui doivent rester identiques d'un paquet à l'autre.
   */
  '5e-phrases': phrases5e,
  'phrases-de-tous-les-jours-5e': phrases5e,

  /*
   * CHANTIER 57 — la bulle de « Premiers mots », pour la cinquième.
   *
   * Troisième couple bâti sur la règle du chantier 56 : le dessin dit la
   * matière, la couleur dit la classe. Même bulle, même contour bleu
   * nuit, même crème pour les lettres ; l'aplat passe du canard à la
   * brique.
   *
   * Une différence avec les deux autres couples : ce dessin PORTE un
   * mot. « 1st words » ne pouvait pas rester sur un paquet de
   * cinquième — il disait la classe, et la fausse. Le texte est donc
   * redessiné en « everyday words », à la mesure de l'ancien (583 px de
   * large, même centre optique) et dans la même hiérarchie : la première
   * ligne plus petite que la seconde, comme « 1st » l'était.
   *
   * Réserve assumée : les lettres ne sont pas de la police d'origine,
   * qui n'était pas fournie avec le fichier. C'est un grotesque large et
   * gras, très proche à l'œil ; la différence se voit sur le « y » et le
   * « a » si l'on compare les deux bulles côte à côte en grand. À 54 et
   * 132 pixels — les deux seules tailles d'affichage — elle est
   * invisible.
   */
  '5e-vocabulaire': mots5e,
  'mots-de-tous-les-jours': mots5e,
  'mots-de-tous-les-jours-5e': mots5e,

  /*
   * CHANTIER 60 — « Décrire et comparer — 5e ».
   *
   * Premier visuel qui n'est pas un couple : ce paquet n'a pas
   * d'homologue en sixième, le dessin est donc le vôtre, sans ascendance.
   *
   * Il sort aussi du lot par sa facture — un sticker à fond bleu nuit,
   * là où les neuf autres sont des sujets détourés sur fond clair. Sur le
   * parchemin miel, il pèse donc plus lourd que ses voisins, et il porte
   * un mot (« COMPARE ») qui ne se lira pas à 54 pixels. Les deux loupes
   * et leurs graphiques, eux, tiennent : c'est la forme, pas le texte,
   * qui fait reconnaître la carte.
   */
  '5e-adjectifs': adjectifs5e,
  'decrire-et-comparer': adjectifs5e,
  'decrire-et-comparer-5e': adjectifs5e,

  /*
   * CHANTIER 71 — LES VERBES IRRÉGULIERS
   *
   * Parti de vos lettres de plastique de « Les verbes courants » : même
   * graisse, même arrondi, même relief poussé vers le bas à droite. Le
   * mot « IRREGULAR » s'ajoute au-dessus, à 132 px contre 310 px pour
   * VERBS — il ne se lira pas dans la liste, et c'est assumé : à 38
   * pixels, ce qui distingue une ligne de sa voisine est la masse de
   * couleur, pas un mot. Il sert à la carte ouverte, où il lève toute
   * ambiguïté avec l'autre paquet de verbes.
   *
   * Les cinq couleurs passent dans une famille chaude — brique, ambre,
   * noix, safran, cuivre. Au chantier 71 c'était pour se distinguer de
   * l'arc-en-ciel de « Les verbes courants » ; depuis le chantier 76 ce
   * paquet porte une affiche typographique verte, et l'écart est plus
   * franc encore. (L'arc-en-ciel d'origine dort dans
   * `assets/packs/5e-verbes.png`, non raccordé.) Le parchemin, lui, est le bleu-vert du rayon
   * Conjugaison depuis le chantier 73 : le fond dit le rayon, les
   * lettres disent le paquet.
   *
   * Réserve : les lettres ne sont pas de la police d'origine, qui
   * n'était pas fournie avec le fichier. C'est un arrondi large et gras
   * très proche à l'œil ; la différence se voit sur le « R » et le « S »
   * en comparant les deux dos côte à côte en grand. Aux deux tailles
   * d'affichage, elle est invisible.
   */
  '5e-irreguliers': irreguliers5e,
  'les-verbes-irreguliers-5e': irreguliers5e,
  'les-verbes-irreguliers': irreguliers5e,

  /*
   * CHANTIER 72 — MODAUX, FUTUR ET PETITS MOTS
   *
   * Parti de votre nuage de mots, recomposé en carré : les lettres de
   * plastique au centre avec leurs couleurs d'origine, les mots noirs en
   * condensé gras au-dessus et au-dessous, en tailles mélangées.
   *
   * L'écart avec le modèle est volontaire : les mots noirs ne sont plus
   * « Dream », « Achieve », « New beginnings » mais les formes que le
   * paquet enseigne — CAN, SHOULD, MUST, GOING TO, WILL, BECAUSE, BOTH,
   * NEITHER, ENOUGH. Le dos devient un sommaire ; à l'ancienne il ne
   * disait rien du contenu. Les petites enveloppes du modèle sont
   * tombées : elles ne voulaient rien dire ici.
   *
   * LE FOND N'EST PAS TRANSPARENT — c'est la seule illustration du
   * catalogue dans ce cas. Il porte #e8f0e7, exactement la sauge du
   * parchemin de « Premières structures », donc le carré ne se voit pas
   * sur la carte : aucun bord n'apparaît. Si vous changez un jour le
   * parchemin de ce paquet, cette image devra changer avec lui.
   *
   * Troisième carte sauge du catalogue. Ce qui la distingue à 38 pixels
   * n'est pas un sujet mais une DENSITÉ : un bloc de texte serré, là où
   * les deux autres portent un dessin isolé.
   */
  '5e-modaux': modaux5e,
  'modaux-futur-et-petits-mots-5e': modaux5e,
  'modaux-futur-et-petits-mots': modaux5e,

  /*
   * CHANTIER 75 — LES TROIS DERNIERS DOS DE LA CINQUIÈME
   *
   * Vos trois images, reprises telles quelles : je n'ai rien redessiné.
   * Deux traitements seulement, et il faut les connaître.
   *
   * LE DAMIER ÉTAIT CUIT DANS LE FICHIER. « Le monde autour de nous » et
   * « Raconter au passé » n'étaient pas transparents : le damier gris qui
   * signale d'habitude la transparence était, ici, de vrais pixels. Posés
   * tels quels, les deux dos auraient porté un carré à carreaux sur le
   * parchemin. Le fond est retiré par diffusion depuis les bords, ce qui
   * préserve les blancs INTÉRIEURS — la bulle de dialogue, les pages du
   * livre, les enveloppes — parce qu'ils sont enclos par des traits
   * sombres. 40 % de la planche pour le monde, 65 % pour raconter.
   *
   * « RÉAGIR ET S'EXPRIMER » GARDE SON FOND CRÈME (#fbfbf6). Ce n'est pas
   * un oubli : le crème fait partie du dessin, c'est le papier sur lequel
   * la typographie est posée, et le retirer laisserait les lettres
   * blanches du « A » et des avions en papier sans support. La planche
   * carrée est comblée avec la même teinte, échantillonnée au coin. C'est
   * donc la DEUXIÈME illustration non transparente du catalogue, après
   * « Modaux » — à cette différence près : celle-ci ne s'accorde pas à son
   * parchemin ardoise, un très léger carré crème se devinera sur la carte.
   * Dites-moi si vous le voyez et je le détoure autrement.
   */
  '5e-monde': monde5e,
  'le-monde-autour-de-nous-5e': monde5e,
  'le-monde-autour-de-nous': monde5e,

  '5e-reagir': reagir5e,
  'reagir-et-s-exprimer-5e': reagir5e,
  'reagir-et-sexprimer-5e': reagir5e,
  'reagir-et-s-exprimer': reagir5e,
  'reagir-et-s-expliquer-5e': reagir5e,

  '5e-raconter': raconter5e,
  'raconter-au-passe-5e': raconter5e,
  'raconter-au-passe': raconter5e,

  /*
   * CHANTIER 76 — LES VERBES COURANTS
   *
   * Votre affiche, reprise telle quelle : les quatre vignettes d'angle,
   * les avions en papier, le titre en capitales vertes. Rien n'est
   * redessiné.
   *
   * LE FOND A ÉTÉ TEINTÉ, et c'est le seul traitement. Votre crème
   * (#fdfffa) est repeint au miel exact du parchemin (#f7efdd) — le même
   * que « Premiers mots », comme demandé. Ce n'est pas un aplat posé
   * par-dessus : chaque pixel du fond est remis à l'échelle canal par
   * canal, donc la texture de papier de votre affiche est conservée. Sur
   * la carte, aucun carré ne se devine : le dessin et le parchemin sont
   * la même teinte au pixel près.
   *
   * Le fond est repeint PAR DIFFUSION DEPUIS LES BORDS, pas par couleur :
   * les blancs intérieurs — les trois avions, l'enveloppe, le « A » —
   * sont enclos par des traits et gardent leur blanc. Sans cela ils
   * auraient viré au miel et se seraient effacés dans le fond.
   *
   * Conséquence à connaître : si vous changez un jour le parchemin de ce
   * paquet, cette image devra être reteintée avec lui. C'est le même
   * couplage que « Modaux » et sa sauge.
   *
   * CINQUIÈME CARTE MIEL du rayon « Vocabulaire de base », avec
   * Premiers mots, Mots de tous les jours, Décrire et comparer et Le
   * monde autour de nous. La distinction repose entièrement
   * sur les dessins, et celui-ci est dense et typographique là où les
   * autres sont des dessins isolés : il se reconnaît de loin.
   */
  '5e-courants': courants5e,
  'les-verbes-courants-5e': courants5e,
  'les-verbes-courants': courants5e,
  'verbes-du-quotidien-5e': courants5e,


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
