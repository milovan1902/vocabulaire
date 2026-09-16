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
};
/** À remplir si l'identifiant est le repère le plus sûr chez vous. */
const PAR_ID: Record<string, number> = {};

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
export function papierFor(id: string, name: string): Papier {
  if (id in PAR_ID) return ROUE[PAR_ID[id]];
  const cle = normaliser(name);
  if (cle in PAR_NOM) return ROUE[PAR_NOM[cle]];
  return ROUE[hacher(cle || id) % ROUE.length];
}
