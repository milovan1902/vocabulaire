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
 * détouré sur fond transparent — à trois exceptions documentées à leur
 * place : « Modaux » (chantier 72), « Réagir et s'exprimer — 5e »
 * (chantier 75) et « Fabriquer les mots » (chantier 102).
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
import mots4e from '../assets/packs/4e-mots.png';
import formes4e from '../assets/packs/4e-formes.png';
import presentPerfect4e from '../assets/packs/4e-present-perfect.png';
import irreguliers4e from '../assets/packs/4e-irreguliers.png';
import reagir4e from '../assets/packs/4e-reagir.png';
import parler4eFin from '../assets/packs/4e-parler.png';
import fabriquer4eFin from '../assets/packs/4e-fabriquer.png';
import temps4eFin from '../assets/packs/4e-temps.png';
import siAlors4eFin from '../assets/packs/4e-si-alors.png';
import prendre4eFin from '../assets/packs/4e-prendre.png';

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

  /*
   * CHANTIER 96 — LES CINQ DOS DE LA QUATRIÈME
   *
   * Vos cinq images, reprises telles quelles : aucun sujet n'est
   * redessiné, aucune couleur du dessin n'est touchée. Le seul travail
   * est le DÉTOURAGE, et il fallait qu'il soit exact — quatre de ces
   * cinq planches arrivaient sur un fond opaque (noir pour trois,
   * crème pour deux) qui, posé tel quel, aurait mis un carré au milieu
   * du parchemin du chantier 95. C'est précisément la couleur qu'il ne
   * faut pas perdre.
   *
   * LE FOND EST RETIRÉ PAR DIFFUSION DEPUIS LES BORDS pour les trois
   * planches noires : le noir extérieur devient transparent, les noirs
   * INTÉRIEURS — le contour de la bulle, l'ombre portée des lettres,
   * les traits du calendrier — sont enclos et restent. C'est la
   * méthode du chantier 75, avec un seuil plus serré pour le present
   * perfect, dont le socle gris foncé frôle le noir du fond.
   *
   * Les cinq illustrations sont TRANSPARENTES, sans exception. Aucune
   * n'est couplée à la teinte de son parchemin comme le sont « Modaux »
   * (sauge) et « Les verbes courants » (miel) : si vous changez un jour
   * le papier d'un de ces cinq paquets, il n'y a rien à reteinter.
   *
   * Le filigrane « Groupe SNCF GPT » du coin bas-droit est effacé sur
   * les quatre planches qui le portaient.
   */

  /*
   * LES MOTS — 4e. La bulle bleue de « words », cousine de celle de
   * « Premiers mots » (canard) et de « Mots de tous les jours »
   * (brique) : troisième bulle du catalogue, troisième aplat. Le bleu
   * franc ne se confond avec aucun des deux, et c'est ce qui permet une
   * SIXIÈME carte miel dans « Vocabulaire de base ».
   */
  '4e-vocabulaire': mots4e,
  'les-mots-4e': mots4e,
  'les-mots': mots4e,

  /*
   * LES FORMES — 4e. Le monogramme de lettres imbriquées, recadré sur
   * son sujet : votre planche le posait petit au centre d'un grand
   * carré crème, il aurait occupé le quart du cadre. Il est donc
   * découpé à sa boîte et remis à l'échelle des autres dos.
   *
   * C'est le seul dessin purement abstrait du catalogue. Ses quatre
   * couleurs — bleu nuit, orange, framboise, violet — ne figurent
   * ensemble nulle part ailleurs, ce qui compte double ici : il partage
   * la sauge avec « Le present perfect », et c'est le dessin, seul, qui
   * sépare les deux cartes dans le rayon Grammaire.
   */
  '4e-grammaire': formes4e,
  'les-formes-4e': formes4e,
  'les-formes': formes4e,

  /*
   * LE PRESENT PERFECT — 4e. Le calendrier qui s'effeuille et la flèche
   * de retour : le passé qui revient dans le présent, ce que dit ce
   * temps. Détouré au seuil le plus serré du lot (12/24 contre 26/70),
   * parce que son socle gris foncé n'est qu'à trente niveaux du noir du
   * fond — au-delà, le détourage l'aurait mangé.
   *
   * RÉSERVE À CONNAÎTRE : c'est le seul dos monochrome du catalogue.
   * Gris et noir sur sauge, il est plus sourd que ses voisins, et à 38
   * pixels il se lit comme une masse grise. Il se distingue tout de même
   * des « Formes », qui sont quatre couleurs vives sur le même papier.
   * Si vous le voulez dans une famille de couleur, comme les lettres des
   * « Verbes irréguliers » du chantier 71, dites-le : c'est une recolo-
   * risation, pas un redessin.
   */
  '4e-present-perfect': presentPerfect4e,
  'le-present-perfect-4e': presentPerfect4e,
  'le-present-perfect': presentPerfect4e,

  /*
   * LES VERBES IRRÉGULIERS — 4e. Les mêmes lettres de plastique que le
   * paquet de cinquième (chantier 71), au même relief, mais restées
   * dans leur camaïeu de BLEUS là où celles de 5e sont passées dans les
   * chaudes. C'est la règle du chantier 56 appliquée à l'envers : le
   * dessin dit la matière, la couleur dit la classe — ici, deux paquets
   * de verbes irréguliers que rien ne doit faire confondre, puisqu'ils
   * se suivent dans le rayon Conjugaison et que le second CONTINUE le
   * premier (troisième forme).
   *
   * Les clés n'incluent volontairement PAS 'les-verbes-irreguliers'
   * tout court : cette graphie est déjà celle du paquet de cinquième,
   * plus haut. Seul le suffixe -4e mène ici.
   */
  '4e-irreguliers': irreguliers4e,
  'les-verbes-irreguliers-4e': irreguliers4e,

  /*
   * RÉAGIR ET RACONTER — 4e. Votre affiche typographique, détourée de
   * son crème : les lettres, les traits de couleur et les six vignettes
   * se posent directement sur l'ardoise du rayon.
   *
   * C'est ce qui la sépare de « Réagir et s'exprimer — 5e » du chantier
   * 75, qui a GARDÉ son carré crème faute d'un détourage possible à
   * l'époque. Les deux paquets se suivent dans « Phrases toutes faites »
   * et sur le même papier : le carré de l'un, l'absence de carré de
   * l'autre, c'est aujourd'hui leur différence la plus visible à petite
   * taille. Si le carré de la 5e vous gêne maintenant qu'il a un voisin
   * propre, je le détoure de la même façon — un mot et c'est fait.
   *
   * RÉSERVE : cette planche porte des LÉGENDES en capitales (« RÉACTIONS
   * & ÉMOTIONS », « LE RÉCIT ET LES ARTS SCÉNIQUES »…). À 38 et 54
   * pixels elles ne se lisent pas ; il reste deux grands mots et six
   * vignettes, ce qui suffit à reconnaître la carte. Même réserve que
   * « Voyage — phrases » (chantier 55).
   */
  '4e-reagir': reagir4e,
  'reagir-et-raconter-4e': reagir4e,
  'reagir-et-raconter': reagir4e,

  /*
   * CHANTIER 102 — LES CINQ DOS DE FIN DE QUATRIÈME
   *
   * Les cinq paquets du chantier 97 reçoivent leur illustration, et la
   * réserve ouverte ce jour-là est levée : le rayon « Vocabulaire de
   * base » portait huit cartes sur le même miel, dont deux n'avaient que
   * deux lettres. Les huit se distinguent maintenant par le dessin seul.
   *
   * Vos cinq planches sont reprises telles quelles — aucun sujet
   * redessiné, aucune couleur du dessin touchée. Les parchemins du
   * chantier 97 ne bougent pas : `deckPaper.ts` n'est pas modifié par
   * cette livraison.
   *
   * QUATRE SUR CINQ SONT TRANSPARENTES. La cinquième, « Fabriquer les
   * mots », ne l'est pas et ne peut pas l'être : voir sa note.
   */

  /*
   * PARLER DE TOUT — 4e. Les deux interlocuteurs en vis-à-vis, au trait.
   *
   * LE DAMIER GRIS ÉTAIT CUIT DANS LE FICHIER — de vrais pixels, comme
   * « Le monde autour de nous » au chantier 75. Il est retiré par
   * diffusion depuis les bords : les blancs INTÉRIEURS — les visages,
   * les mains, les chemises, les chaises — sont enclos par le trait et
   * gardent leur blanc. Sans cela les deux personnages se seraient
   * vidés.
   *
   * Le sujet n'occupait qu'un tiers de la planche (496 x 383 px sur
   * 1024). Il est découpé à sa boîte et agrandi de 1,9 x, donc remis à
   * l'échelle des autres dos ; sans ce recadrage il aurait pesé trois
   * fois moins que ses voisins dans la même liste.
   *
   * RÉSERVE : deuxième dos MONOCHROME du catalogue, après « Le present
   * perfect » (chantier 96). À 38 px il se lit comme deux silhouettes
   * claires cernées de noir — assez pour le séparer des sept autres
   * miels, tous colorés, mais c'est la carte la plus sourde du rayon.
   * Une mise en couleur est possible sans redessin ; validé tel quel.
   */
  '4e-fin-vocabulaire': parler4eFin,
  'parler-de-tout-4e': parler4eFin,
  'parler-de-tout': parler4eFin,

  /*
   * FABRIQUER LES MOTS — 4e. L'usine à lettres, en bande dessinée.
   *
   * SEULE ILLUSTRATION DU LOT QUI N'EST PAS TRANSPARENTE, et c'est un
   * choix, pas un renoncement : c'est un PANNEAU de bande dessinée où le
   * fond fait partie du dessin — le ciel en rayons, les usines, la
   * perspective. Le détourer reviendrait à démonter l'image. Elle reste
   * donc un plat rectangulaire posé dans le cadre du dos, et son propre
   * filet noir tient ce rôle : le bord est assumé, il encadre.
   *
   * TROISIÈME illustration opaque du catalogue, après « Modaux » (sauge)
   * et « Réagir et s'exprimer — 5e » (crème). Différence à connaître :
   * celles-là s'accordaient — ou tentaient de s'accorder — à leur
   * parchemin ; celle-ci ne s'y accorde pas du tout et n'a pas à le
   * faire. Son fond est sa propre matière imprimée. Conséquence : si
   * vous reteignez un jour le miel du rayon, rien à refaire ici, le
   * panneau est indépendant.
   *
   * RECADRAGE, VARIANTE A, validée. La planche d'origine fait 1408 x 768
   * (1,86 : 1). Posée entière dans le cadre du dos elle devenait une
   * frise de 550 px de haut sur 1024, illisible à 38 px. Elle est donc
   * coupée juste avant le nuage de mots — PAROLES / CULTURE / ÉCHANGE
   * tombe, mais aucun mot n'est tronqué — et garde le titre entier, la
   * chaîne de montage, la machine et les trois personnages. Le fichier
   * du panneau entier dort dans `assets/packs/4e-fabriquer-panneau.png`,
   * non raccordé, si vous changez d'avis.
   *
   * RÉSERVE : le titre « FABRIQUER LES MOTS » ne se lira pas à 38 px. Ce
   * qui reste est une masse dense et bariolée — la seule du rayon, les
   * sept autres miels étant des sujets isolés sur fond clair. C'est la
   * DENSITÉ qui identifie cette carte, comme pour « Modaux » au
   * chantier 72.
   */
  '4e-fin-mots': fabriquer4eFin,
  'fabriquer-les-mots-4e': fabriquer4eFin,
  'fabriquer-les-mots': fabriquer4eFin,

  /*
   * TOUS LES TEMPS — 4e. Le sablier, l'horloge et la flèche, reliés par
   * la boucle : les trois moments et le retour, ce que le paquet
   * enseigne.
   *
   * SEULE PLANCHE DÉJÀ TRANSPARENTE des cinq — rien à détourer, aucun
   * seuil à régler. Recadrée à sa boîte et centrée, c'est tout le
   * travail.
   *
   * QUATRIÈME CARTE SAUGE du rayon Grammaire, avec « Les formes »,
   * « Le present perfect » et « Si… alors ». Ce qui la distingue à 38 px
   * n'est pas sa couleur — son ocre et son vert sont proches du papier —
   * mais sa GÉOMÉTRIE : trois cercles alignés, forme que ne porte aucune
   * autre carte du catalogue.
   */
  '4e-fin-temps': temps4eFin,
  'tous-les-temps-4e': temps4eFin,
  'tous-les-temps': temps4eFin,

  /*
   * SI… ALORS — 4e. Les deux bulles et la flèche : la condition à
   * gauche, la conséquence à droite.
   *
   * Fond blanc franc, détourage net au seuil large (244/10). Le sujet
   * est très large (1153 x 448, soit 2,6 : 1) : il occupe la largeur du
   * cadre et laisse du parchemin au-dessus et au-dessous. L'agrandir
   * davantage écraserait les bulles contre le filet du dos.
   *
   * RÉSERVE : ce dessin PORTE du texte, « Si… » et « Alors… ». À 38 px
   * les mots ne se lisent plus ; il reste une bulle bleu pâle, une
   * flèche et une bulle jaune. C'est paradoxalement le plus
   * reconnaissable des cinq — aucune autre carte n'a deux taches de
   * couleur côte à côte. Même réserve qu'au chantier 55, même
   * conclusion : la forme suffit.
   */
  '4e-fin-modaux': siAlors4eFin,
  'si-alors-4e': siAlors4eFin,
  'si-alors': siAlors4eFin,

  /*
   * PRENDRE LA PAROLE — 4e. Le profil et la bulle : quelqu'un parle.
   *
   * Détourage net sur fond blanc. Une chose à savoir : L'INTÉRIEUR DE LA
   * BOUCHE RESTE BLANC, parce qu'il est enclos par le trait du visage et
   * qu'il fait partie du dessin — c'est lui qui dit que la bouche est
   * ouverte. Sur l'ardoise du rayon, ce petit blanc se voit et se lit
   * comme tel. Le retirer aurait troué le menton.
   *
   * TROISIÈME CARTE du rayon « Phrases toutes faites », après « Réagir
   * et s'exprimer — 5e » (carré crème, chantier 75) et « Réagir et
   * raconter — 4e » (affiche typographique, chantier 96). C'est la seule
   * des trois à porter une FIGURE ; les deux autres sont
   * typographiques. Aucune confusion possible dans la liste.
   */
  '4e-fin-phrases': prendre4eFin,
  'prendre-la-parole-4e': prendre4eFin,
  'prendre-la-parole': prendre4eFin,
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
