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
  'le preterit': 6,

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
   * CHANTIER 61 — le miel aussi pour « Les verbes courants — 5e ».
   * Demandé, et livré tel quel ; la réserve est écrite dans le
   * LISEZ-MOI plutôt qu'ici.
   *
   * Le rayon « Vocabulaire de base » compte désormais QUATRE cartes sur
   * le même parchemin. Le papier n'y distingue donc plus rien : tout
   * repose sur les dessins — une bulle canard, une bulle brique, un
   * sticker bleu nuit, un mot multicolore. Ces quatre-là se séparent
   * encore, mais la marge est consommée : une cinquième carte miel dans
   * ce rayon ne serait plus lisible.
   */
  'les verbes courants 5e': 2,
  'les verbes courants': 2,

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
