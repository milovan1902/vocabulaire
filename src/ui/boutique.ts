/**
 * CHANTIER 268 — LA BOUTIQUE DES APPARENCES : le catalogue et les prix.
 *
 * Les XP deviennent des crédits (1 XP = 1 crédit, sans le plafond du
 * gratuit). Chaque apparence a un palier, qui fixe son prix en crédits.
 * Le prix en euros est noté pour plus tard : aucun achat réel n'est
 * branché tant que Google Play ne l'est pas.
 *
 * Pour ajouter une apparence : une ligne ici, dans sa famille. Une
 * apparence absente de ce catalogue est traitée comme gratuite.
 * `fond`, `accent`, `encre`, `police` ne servent qu'à la vignette.
 */
import type { Theme } from './theme';

export type Palier = 'libre' | 'couleurs' | 'theme' | 'scene';

export const PRIX: Record<Palier, number> = { libre: 0, couleurs: 300, theme: 500, scene: 800 };
/** Pour le jour où l'achat en euros sera branché (Google Play). Non affiché. */
export const PRIX_EUROS: Record<Palier, string> = { libre: '', couleurs: '0,99 €', theme: '1,99 €', scene: '2,99 €' };
export const NOM_PALIER: Record<Palier, string> = { libre: 'Gratuite', couleurs: 'Couleurs', theme: 'Thème', scene: 'Scène illustrée' };

export interface Article {
  id: Theme;
  palier: Palier;
  /** Une ligne, sous la vignette. */
  court: string;
  /** Deux lignes au plus, dans la fiche. */
  long: string;
  fond: string;
  accent: string;
  encre: string;
  police: string;
}

export interface Famille { nom: string; articles: Article[] }

export const FAMILLES: Famille[] = [
  {
    nom: 'Les classiques',
    articles: [
      { id: 'auto', palier: 'libre', court: 'Suit le jour et la nuit du téléphone.', long: 'Clair le jour, sombre le soir : l’app suit le réglage du téléphone, toute seule.', fond: 'linear-gradient(90deg, #f6f3ec 50%, #0F253C 50%)', accent: '#f2b705', encre: '#8a6a1a', police: '' },
      { id: 'clair', palier: 'libre', court: 'Fond clair, simple et lisible.', long: 'Le fond clair de base, sans décor.', fond: '#f6f3ec', accent: '#f2b705', encre: '#0F253C', police: '' },
      { id: 'sombre', palier: 'libre', court: 'Fond sombre, reposant le soir.', long: 'Le fond sombre de base, doux pour les yeux le soir.', fond: '#0F253C', accent: '#f2b705', encre: '#f3efe6', police: '' },
    ],
  },
  {
    nom: 'L’école',
    articles: [
      { id: 'cahier', palier: 'couleurs', court: 'Papier quadrillé, encre bleue.', long: 'Le cahier d’école : papier quadrillé, encre bleue, surligneur et gommettes.', fond: '#fbf8f1', accent: '#f2b705', encre: '#1f3a8a', police: "'Lexend'" },
      { id: 'cahier-vert', palier: 'couleurs', court: 'Le même cahier, papier vert.', long: 'Le cahier d’école, sur papier vert.', fond: '#eff7ef', accent: '#f2b705', encre: '#1f3a8a', police: "'Lexend'" },
      { id: 'cahier-rose', palier: 'couleurs', court: 'Le même cahier, papier rose.', long: 'Le cahier d’école, sur papier rose.', fond: '#fcf1f3', accent: '#f2b705', encre: '#1f3a8a', police: "'Lexend'" },
      { id: 'cahier-bleu', palier: 'couleurs', court: 'Le même cahier, papier bleu.', long: 'Le cahier d’école, sur papier bleu.', fond: '#eef4fc', accent: '#f2b705', encre: '#1f3a8a', police: "'Lexend'" },
      { id: 'lycee-clair', palier: 'couleurs', court: 'Niveaux et défi du jour.', long: 'Niveaux, défi du jour et paquets en éventail, sur fond clair.', fond: '#eaf1fb', accent: '#f2b705', encre: '#14213d', police: '' },
      { id: 'lycee', palier: 'couleurs', court: 'Niveaux et défi du jour, de nuit.', long: 'Niveaux, défi du jour et paquets en éventail, sur fond sombre.', fond: '#0a0f1f', accent: '#f2b705', encre: '#eef1f6', police: '' },
      { id: 'tableau-vert', palier: 'couleurs', court: 'La classe, écrite à la craie.', long: 'La salle de classe : tout est écrit à la craie sur l’ardoise verte.', fond: '#2f4a3a', accent: '#f7e08a', encre: '#f3f3ea', police: '' },
      { id: 'tableau-noir', palier: 'couleurs', court: 'La craie sur ardoise noire.', long: 'La salle de classe, à la craie sur l’ardoise noire.', fond: '#232527', accent: '#f7e08a', encre: '#f3f3ea', police: '' },
    ],
  },
  {
    nom: 'Espace et jeux',
    articles: [
      { id: 'decollage', palier: 'theme', court: 'Une station orbitale.', long: 'La forme du Lycée dans une station orbitale, tout en cyan.', fond: '#060a16', accent: '#4fd8ff', encre: '#d9f6ff', police: '' },
      { id: 'orbite', palier: 'theme', court: 'Paquets autour d’une planète.', long: 'Une nébuleuse violet et or, les paquets en orbite autour d’une planète.', fond: '#140d2e', accent: '#ffcf5a', encre: '#efe6ff', police: '' },
      { id: 'arcade', palier: 'theme', court: 'La salle de jeux.', long: 'La salle de jeux : pixels, scores et couleurs vives.', fond: '#07060d', accent: '#ff3ea5', encre: '#ffffff', police: '' },
      { id: 'neon', palier: 'theme', court: 'La ville, la nuit.', long: 'La ville la nuit, sous les enseignes au néon.', fond: '#170a2a', accent: '#ff4fd8', encre: '#f3e9ff', police: '' },
      { id: 'tapis-vert', palier: 'theme', court: 'La table de poker.', long: 'La table de poker, jetons et cartes sur le feutre vert.', fond: '#0e3622', accent: '#e0b44a', encre: '#f4efe0', police: "'Newsreader'" },
      { id: 'salon-prive', palier: 'theme', court: 'Le salon de jeu noir et or.', long: 'Le salon de jeu, tout en noir et or.', fond: '#121212', accent: '#d4af5a', encre: '#efe3c2', police: "'Newsreader'" },
    ],
  },
  {
    nom: 'Évasion',
    articles: [
      { id: 'grand-bleu', palier: 'theme', court: 'La plongée, sous l’eau.', long: 'La plongée : bulles, poissons et lumière qui filtre sous l’eau.', fond: '#04182b', accent: '#5ce1e6', encre: '#e6f7ff', police: '' },
      { id: 'carnet-kraft', palier: 'theme', court: 'Le carnet de voyage.', long: 'Le carnet de voyage : papier kraft, tampons et billets collés.', fond: '#e9dcc0', accent: '#2f5d8a', encre: '#3b2a1a', police: '' },
      { id: 'jardin', palier: 'theme', court: 'Chaque note, une fleur en pot.', long: 'Le potager au soleil, où chaque note est une fleur en pot.', fond: '#f4efe1', accent: '#4f8a3c', encre: '#2f4a1f', police: '' },
      { id: 'plage', palier: 'scene', court: 'Paquets en planches de surf.', long: 'La cabane de surf en plein soleil : les paquets sont des planches plantées dans le sable.', fond: '#fffaf0', accent: '#ff7a59', encre: '#0b4f6c', police: "'Shrikhand'" },
      { id: 'jungle', palier: 'scene', court: 'Paquets suspendus à une liane.', long: 'L’expédition sous la canopée : les paquets sont des caisses suspendues à une liane.', fond: '#f4ecd6', accent: '#e8743b', encre: '#22381f', police: "'Lilita One'" },
      { id: 'japon', palier: 'scene', court: 'Une maison au pied du Fuji.', long: 'Une maison au pied du mont Fuji, où le paquet attend sur le pas de la porte.', fond: '#f7f0e2', accent: '#d9472b', encre: '#2b2b2b', police: "'Shippori Mincho'" },
      { id: 'station', palier: 'scene', court: 'L’affiche de ski rétro.', long: 'L’affiche de ski rétro : les paquets montent en télécabines.', fond: '#f7efe0', accent: '#d1453b', encre: '#23395b', police: "'Archivo Variable', 'Archivo'" },
      { id: 'pacific', palier: 'scene', court: 'Le train dans le canyon.', long: 'Le train à vapeur dans le canyon, le paquet voyage sur le wagon.', fond: '#f3e2c0', accent: '#b23a1e', encre: '#4a2414', police: "'Rye'" },
    ],
  },
  {
    nom: 'Sport',
    articles: [
      { id: 'parquet', palier: 'theme', court: 'Le terrain de basket.', long: 'Le terrain de basket, sur le parquet.', fond: '#e6bd86', accent: '#e8702a', encre: '#2a1a0e', police: '' },
      { id: 'pelouse', palier: 'theme', court: 'Le terrain de football.', long: 'Le terrain de football, lignes blanches sur la pelouse.', fond: '#3f9a4a', accent: '#ffffff', encre: '#ffffff', police: '' },
      { id: 'melee', palier: 'theme', court: 'Le terrain de rugby.', long: 'Le terrain de rugby, couleurs de maillot.', fond: '#4f7d33', accent: '#8a1f2c', encre: '#f1ead8', police: '' },
      { id: 'grille', palier: 'theme', court: 'Le circuit automobile.', long: 'Le circuit automobile, au départ de la course.', fond: '#2b2d31', accent: '#e10600', encre: '#f2f2f2', police: '' },
    ],
  },
  {
    nom: 'Pop et rétro',
    articles: [
      { id: 'manga', palier: 'theme', court: 'La BD japonaise.', long: 'La bande dessinée japonaise, en noir et blanc et rouge.', fond: '#fbfbf8', accent: '#e63946', encre: '#111111', police: '' },
      { id: 'bd-pop', palier: 'theme', court: 'La BD aux couleurs vives.', long: 'La bande dessinée pop : bulles, trames et couleurs franches.', fond: '#ffd23f', accent: '#e63946', encre: '#1a1a1a', police: '' },
      { id: 'diner', palier: 'theme', court: 'Les années 50.', long: 'Le diner américain des années 50.', fond: '#f7f2e6', accent: '#d7263d', encre: '#2a2a2a', police: "'Archivo Variable', 'Archivo'" },
      { id: 'tv', palier: 'theme', court: 'Les années 60.', long: 'Le salon des années 60, devant la télé.', fond: '#f4ead5', accent: '#2a9d8f', encre: '#3a2e22', police: '' },
      { id: 'strass', palier: 'theme', court: 'La soirée de gala.', long: 'La soirée de gala, paillettes et lettres dorées.', fond: '#0e0b10', accent: '#e8c46a', encre: '#f4ecd8', police: '' },
      { id: 'jazz', palier: 'scene', court: 'La scène de jazz, années 20.', long: 'La scène de jazz des années 20 : les paquets sont des partitions sous le projecteur.', fond: '#1a0d0a', accent: '#e8b04a', encre: '#f2e6c9', police: "'Bodoni Moda'" },
      { id: 'cinema', palier: 'scene', court: 'Paquets sur une pellicule.', long: 'La salle obscure, où les paquets défilent sur une pellicule.', fond: '#0b0b0b', accent: '#f4f1ea', encre: '#e8e2d4', police: "'Limelight'" },
      { id: 'fashion', palier: 'scene', court: 'Le défilé en noir et blanc.', long: 'Le défilé en noir et blanc : les paquets sont des housses pendues à un portant.', fond: '#0d0d0d', accent: '#f6f4f0', encre: '#f5f5f5', police: "'Pinyon Script'" },
    ],
  },
  {
    nom: 'Lieux d’époque',
    articles: [
      { id: 'bibliotheque', palier: 'scene', court: 'Paquets rangés en livres.', long: 'La salle de lecture : les paquets sont des livres rangés sur un rayon.', fond: '#2b1a10', accent: '#c9a25a', encre: '#f1e6cf', police: "'IM Fell English'" },
      { id: 'salon-the', palier: 'scene', court: 'Le paquet sous une cloche.', long: 'La pâtisserie parisienne, où le paquet du jour attend sous une cloche de verre.', fond: '#fbf1ec', accent: '#e79fb2', encre: '#5a3340', police: "'Parisienne'" },
      { id: 'cabinet', palier: 'scene', court: 'Le labo d’une chimiste, la nuit.', long: 'Le laboratoire d’une chimiste, la nuit : les paquets luisent dans des bocaux.', fond: '#0e1714', accent: '#8dff9a', encre: '#e8e0c8', police: "'Cinzel'" },
      { id: 'chateau', palier: 'scene', court: 'Derrière le pont-levis.', long: 'La forteresse, où le paquet attend dans la porte, derrière le pont-levis.', fond: '#f3e6c4', accent: '#7a1f1f', encre: '#3b2b1a', police: "'Cinzel'" },
      /* CHANTIER 269 — Atelier d'horloger. */
      { id: 'horloger', palier: 'scene', court: 'Paquets en rouages de laiton.', long: 'L’atelier d’un horloger : les paquets sont des rouages qui s’engrènent, chaque carte une montre de gousset qui s’ouvre.', fond: '#15100c', accent: '#c9a24a', encre: '#efe6d2', police: "'Marcellus'" },
    ],
  },
];

const PAR_ID = new Map<string, Article>(FAMILLES.flatMap((f) => f.articles).map((a) => [a.id, a]));

export function article(t: Theme): Article | undefined {
  return PAR_ID.get(t);
}

export function prixDe(t: Theme): number {
  const a = PAR_ID.get(t);
  return a ? PRIX[a.palier] : 0;
}

/** Texte lisible sur l'accent : noir ou blanc selon sa clarté. */
export function texteSur(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#111111';
  const n = parseInt(m[1], 16);
  const l = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return l > 0.6 ? '#111111' : '#ffffff';
}
