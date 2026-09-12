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
export type Theme = 'auto' | 'clair' | 'sombre';

const CLE = 'vocab-theme';

export const THEME_LABELS: Record<Theme, string> = {
  auto: 'Automatique',
  clair: 'Clair',
  sombre: 'Sombre',
};

export function themeChoisi(): Theme {
  const v = localStorage.getItem(CLE);
  return v === 'clair' || v === 'sombre' ? v : 'auto';
}

/** Ce que « automatique » vaut à cet instant. */
function systeme(): 'clair' | 'sombre' {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'clair' : 'sombre';
}

export function themeEffectif(t: Theme = themeChoisi()): 'clair' | 'sombre' {
  return t === 'auto' ? systeme() : t;
}

function appliquer(t: Theme) {
  const e = themeEffectif(t);
  document.documentElement.dataset.theme = e;
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
