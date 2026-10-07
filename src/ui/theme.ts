/**
 * Le thème clair ou sombre.
 *
 * Il ne passe PAS par les réglages synchronisés, volontairement : c'est
 * une préférence d'appareil, pas une donnée de travail. Le téléphone peut
 * être en sombre le soir et le portable en clair au bureau sans que l'un
 * impose son goût à l'autre — et un réglage local ne peut pas entrer en
 * conflit à la synchronisation.
 *
 * « Automatique » suit le système, et continue de le suivre : si le
 * téléphone bascule en sombre à la tombée du jour, l'application suit
 * sans qu'on la rouvre.
 */
/*
 * CHANTIER 164 — « Cahier », un quatrième choix.
 *
 * C'est un thème clair habillé : il pose `data-theme="clair"` (toutes les
 * règles du clair s'appliquent, rien n'est réécrit) ET `data-style="cahier"`,
 * que lit `cahier.css` pour le papier quadrillé, l'encre bleue, le
 * surligneur et les gommettes. Les deux autres thèmes retirent `data-style`.
 */
/*
 * CHANTIER 165 — « Lycée », un cinquième choix. Même principe que le
 * Cahier, sur la base du SOMBRE : `data-theme="sombre"` + `data-style="lycee"`,
 * que lit `lycee.css`. Les écrans qui changent de forme (Aujourd'hui,
 * Révision) lisent le style par `useStyle()`.
 */
/*
 * CHANTIER 166 — « Lycée » se dédouble. L'identifiant 'lycee' reste celui
 * du foncé (rien ne change pour qui l'a déjà choisi) ; 'lycee-clair' pose
 * la même forme sur la base du CLAIR. Les deux posent data-style="lycee" :
 * useStyle(), Today et Study n'ont rien à distinguer, seule lycee.css lit
 * data-theme pour les couleurs.
 */
/*
 * CHANTIER 170 — le Cahier en quatre papiers. 'cahier' reste l'identifiant
 * du jaune (rien ne change pour qui l'a choisi) ; 'cahier-vert',
 * 'cahier-rose' et 'cahier-bleu' posent le même data-style="cahier" plus
 * data-papier, que lit cahier.css pour la seule teinte du papier.
 */
/*
 * CHANTIER 171 — deux apparences « Espace », sur la base du SOMBRE et avec
 * la forme du Lycée (niveau, défi, éventail, tuiles) : « Décollage »
 * (station orbitale, cyan) et « Orbite » (nébuleuse, violet et or). Elles
 * posent data-style="decollage" ou "orbite", que lit espace.css.
 */
export type Theme = 'auto' | 'clair' | 'sombre' | 'cahier' | 'cahier-vert' | 'cahier-rose' | 'cahier-bleu'
  | 'lycee' | 'lycee-clair' | 'decollage' | 'orbite' | 'tableau-vert' | 'tableau-noir'
  | 'arcade' | 'neon' | 'grand-bleu' | 'carnet-kraft' | 'manga' | 'bd-pop' | 'jardin'
  | 'parquet' | 'pelouse' | 'melee' | 'strass' | 'grille' | 'diner' | 'tv' | 'tapis-vert' | 'salon-prive' | 'station' | 'fashion' | 'cinema' | 'bibliotheque' | 'salon-the' | 'cabinet';

const PAPIERS: Partial<Record<Theme, string>> = {
  'cahier-vert': 'vert',
  'cahier-rose': 'rose',
  'cahier-bleu': 'bleu',
  /* CHANTIER 173 — la couleur de l'ardoise des deux Tableaux. */
  'tableau-vert': 'vert',
  'tableau-noir': 'noir',
};

function estCahier(t: Theme): boolean {
  return t === 'cahier' || t === 'cahier-vert' || t === 'cahier-rose' || t === 'cahier-bleu';
}

/* CHANTIER 173 — « Tableau vert » et « Tableau noir » : sombres, data-style="tableau". */
function estTableau(t: Theme): boolean {
  return t === 'tableau-vert' || t === 'tableau-noir';
}

const CLE = 'vocab-theme';

export const THEME_LABELS: Record<Theme, string> = {
  auto: 'Automatique',
  clair: 'Clair',
  sombre: 'Sombre',
  cahier: 'Cahier jaune',
  'cahier-vert': 'Cahier vert',
  'cahier-rose': 'Cahier rose',
  'cahier-bleu': 'Cahier bleu',
  lycee: 'Lycée foncé',
  'lycee-clair': 'Lycée clair',
  decollage: 'Décollage',
  orbite: 'Orbite',
  'tableau-vert': 'Tableau vert',
  'tableau-noir': 'Tableau noir',
  arcade: 'Borne arcade',
  neon: 'Néon',
  'grand-bleu': 'Grand bleu',
  'carnet-kraft': 'Carnet kraft',
  manga: 'Manga',
  'bd-pop': 'BD pop',
  jardin: 'Jardin',
  parquet: 'Parquet',
  pelouse: 'Pelouse',
  melee: 'Mêlée',
  strass: 'Strass',
  grille: 'Grille de départ',
  diner: 'Diner',
  tv: 'TV',
  'tapis-vert': 'Tapis vert',
  'salon-prive': 'Salon privé',
  station: 'Station 1936',
  fashion: 'Fashion week',
  cinema: 'Cinéma muet',
  bibliotheque: 'Bibliothèque',
  'salon-the': 'Salon de thé',
  cabinet: 'Cabinet 1900',
};

export function themeChoisi(): Theme {
  const v = localStorage.getItem(CLE);
  return v === 'clair' || v === 'sombre' || v === 'cahier' || v === 'cahier-vert'
    || v === 'cahier-rose' || v === 'cahier-bleu' || v === 'lycee' || v === 'lycee-clair'
    || v === 'decollage' || v === 'orbite' || v === 'tableau-vert' || v === 'tableau-noir'
    || v === 'arcade' || v === 'neon' || v === 'grand-bleu'
    || v === 'carnet-kraft' || v === 'manga' || v === 'bd-pop' || v === 'jardin'
    || v === 'parquet' || v === 'pelouse' || v === 'melee'
    || v === 'strass' || v === 'grille' || v === 'diner' || v === 'tv'
    || v === 'tapis-vert' || v === 'salon-prive' || v === 'station' || v === 'fashion' || v === 'cinema' || v === 'bibliotheque' || v === 'salon-the' || v === 'cabinet' ? v : 'auto';
}

/** Ce que « automatique » vaut à cet instant. */
function systeme(): 'clair' | 'sombre' {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'clair' : 'sombre';
}

export function themeEffectif(t: Theme = themeChoisi()): 'clair' | 'sombre' {
  if (estCahier(t)) return 'clair';
  if (t === 'lycee' || t === 'decollage' || t === 'orbite' || estTableau(t)
    || t === 'arcade' || t === 'neon' || t === 'grand-bleu') return 'sombre';
  if (t === 'lycee-clair') return 'clair';
  /* CHANTIER 178 — les trois nouvelles apparences sont claires. */
  if (t === 'carnet-kraft' || t === 'manga' || t === 'bd-pop') return 'clair';
  /* CHANTIER 180 — Jardin, clair lui aussi. */
  if (t === 'jardin') return 'clair';
  /* CHANTIER 181 — les trois apparences Sport sont claires. */
  if (t === 'parquet' || t === 'pelouse' || t === 'melee') return 'clair';
  /* CHANTIER 182 — Strass et Grille de départ sont sombres ; Diner et TV, clairs. */
  if (t === 'strass' || t === 'grille') return 'sombre';
  if (t === 'diner' || t === 'tv') return 'clair';
  /* CHANTIER 183 — les deux apparences Poker sont sombres. */
  if (t === 'tapis-vert' || t === 'salon-prive') return 'sombre';
  /* CHANTIER 210 — Station 1936 : claire (panneaux crème). */
  if (t === 'station') return 'clair';
  /* CHANTIER 213 — Fashion week : sombre (la salle du défilé dans le noir). */
  if (t === 'fashion') return 'sombre';
  /* CHANTIER 216 — Cinéma muet et Bibliothèque : sombres (la salle obscure, la salle de lecture). */
  if (t === 'cinema' || t === 'bibliotheque') return 'sombre';
  /* CHANTIER 223 — Salon de thé : clair ; Cabinet 1900 : sombre. */
  if (t === 'salon-the') return 'clair';
  if (t === 'cabinet') return 'sombre';
  if (t === 'sombre') return 'sombre';
  if (t === 'clair') return 'clair';
  return systeme();
}

function appliquer(t: Theme) {
  const e = themeEffectif(t);
  document.documentElement.dataset.theme = e;
  if (estCahier(t)) document.documentElement.dataset.style = 'cahier';
  else if (t === 'lycee' || t === 'lycee-clair') document.documentElement.dataset.style = 'lycee';
  /* CHANTIER 174 — Borne arcade et Néon posent data-style="arcade" / "neon" (neon.css). */
  else if (t === 'decollage' || t === 'orbite' || t === 'arcade' || t === 'neon') document.documentElement.dataset.style = t;
  else if (estTableau(t)) document.documentElement.dataset.style = 'tableau';
  /* CHANTIER 176 — Grand bleu pose data-style="ocean" (ocean.css). */
  else if (t === 'grand-bleu') document.documentElement.dataset.style = 'ocean';
  /* CHANTIER 178 — Carnet kraft (voyage.css), Manga et BD pop (bulles.css). */
  else if (t === 'carnet-kraft') document.documentElement.dataset.style = 'voyage';
  else if (t === 'manga') document.documentElement.dataset.style = 'manga';
  else if (t === 'bd-pop') document.documentElement.dataset.style = 'bd';
  /* CHANTIER 180 — Jardin (jardin.css). */
  else if (t === 'jardin') document.documentElement.dataset.style = 'jardin';
  /* CHANTIER 181 — Parquet, Pelouse, Mêlée (sport.css). */
  else if (t === 'parquet') document.documentElement.dataset.style = 'basket';
  else if (t === 'pelouse') document.documentElement.dataset.style = 'foot';
  else if (t === 'melee') document.documentElement.dataset.style = 'rugby';
  /* CHANTIER 182 — Strass, Grille de départ, Diner, TV (retro.css). */
  else if (t === 'strass') document.documentElement.dataset.style = 'strass';
  else if (t === 'grille') document.documentElement.dataset.style = 'circuit';
  else if (t === 'diner') document.documentElement.dataset.style = 'diner';
  else if (t === 'tv') document.documentElement.dataset.style = 'tv';
  /* CHANTIER 183 — Tapis vert et Salon privé (poker.css). */
  else if (t === 'tapis-vert') document.documentElement.dataset.style = 'tapis';
  else if (t === 'salon-prive') document.documentElement.dataset.style = 'salon';
  /* CHANTIER 210 — Station 1936 (montagne.css). */
  else if (t === 'station') document.documentElement.dataset.style = 'station';
  /* CHANTIER 213 — Fashion week (mode.css, Defile.tsx). */
  else if (t === 'fashion') document.documentElement.dataset.style = 'fashion';
  /* CHANTIER 216 — Cinéma muet (cinema.css) et Bibliothèque (biblio.css). */
  else if (t === 'cinema') document.documentElement.dataset.style = 'cinema';
  else if (t === 'bibliotheque') document.documentElement.dataset.style = 'biblio';
  /* CHANTIER 223 — Salon de thé (patisserie.css) et Cabinet 1900 (cabinet.css). */
  else if (t === 'salon-the') document.documentElement.dataset.style = 'patisserie';
  else if (t === 'cabinet') document.documentElement.dataset.style = 'cabinet';
  else delete document.documentElement.dataset.style;
  const papier = PAPIERS[t];
  if (papier) document.documentElement.dataset.papier = papier;
  else delete document.documentElement.dataset.papier;
  /* Prévient les écrans qui changent de forme selon le style (useStyle). */
  window.dispatchEvent(new Event('apparence'));
  // Pour que les champs, les ascenseurs et la barre d'état du navigateur
  // suivent : sans ça, un champ de saisie resterait sombre en thème clair.
  document.documentElement.style.colorScheme = e === 'clair' ? 'light' : 'dark';
}

export function setTheme(t: Theme) {
  if (t === 'auto') localStorage.removeItem(CLE);
  else localStorage.setItem(CLE, t);
  appliquer(t);
}

/*
 * Appliqué au chargement du module, donc avant le premier rendu de React :
 * c'est ce qui évite l'éclair de thème sombre chez qui a choisi le clair.
 */
appliquer(themeChoisi());

window.matchMedia?.('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (themeChoisi() === 'auto') appliquer('auto');
});
