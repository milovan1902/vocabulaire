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
  | 'arcade' | 'neon' | 'grand-bleu' | 'carnet-kraft' | 'manga' | 'bd-pop' | 'jardin';

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
};

export function themeChoisi(): Theme {
  const v = localStorage.getItem(CLE);
  return v === 'clair' || v === 'sombre' || v === 'cahier' || v === 'cahier-vert'
    || v === 'cahier-rose' || v === 'cahier-bleu' || v === 'lycee' || v === 'lycee-clair'
    || v === 'decollage' || v === 'orbite' || v === 'tableau-vert' || v === 'tableau-noir'
    || v === 'arcade' || v === 'neon' || v === 'grand-bleu'
    || v === 'carnet-kraft' || v === 'manga' || v === 'bd-pop' || v === 'jardin' ? v : 'auto';
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
