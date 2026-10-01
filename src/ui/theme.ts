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
export type Theme = 'auto' | 'clair' | 'sombre' | 'cahier' | 'lycee';

const CLE = 'vocab-theme';

export const THEME_LABELS: Record<Theme, string> = {
  auto: 'Automatique',
  clair: 'Clair',
  sombre: 'Sombre',
  cahier: 'Cahier',
  lycee: 'Lycée',
};

export function themeChoisi(): Theme {
  const v = localStorage.getItem(CLE);
  return v === 'clair' || v === 'sombre' || v === 'cahier' || v === 'lycee' ? v : 'auto';
}

/** Ce que « automatique » vaut à cet instant. */
function systeme(): 'clair' | 'sombre' {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'clair' : 'sombre';
}

export function themeEffectif(t: Theme = themeChoisi()): 'clair' | 'sombre' {
  if (t === 'cahier') return 'clair';
  if (t === 'lycee') return 'sombre';
  return t === 'auto' ? systeme() : t;
}

function appliquer(t: Theme) {
  const e = themeEffectif(t);
  document.documentElement.dataset.theme = e;
  if (t === 'cahier' || t === 'lycee') document.documentElement.dataset.style = t;
  else delete document.documentElement.dataset.style;
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
