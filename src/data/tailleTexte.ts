/*
 * CHANTIER 350 — ACCESSIBILITÉ, ÉTAPE 3 : LA TAILLE DU TEXTE.
 *
 * Chrome sur Android ignore la police du téléphone, et nos tailles sont en
 * pixels : on propose donc notre propre réglage (Réglages › Apparence).
 *
 * Le moyen : la balise viewport. Pour « Grand » (+15 %), la page est mise en
 * page sur un écran 15 % plus étroit, puis affichée agrandie pour remplir
 * l'écran — exactement comme un zoom du navigateur. Tout grandit ensemble
 * (texte, boutons, marges) et les positions restent justes (visite, fonds
 * animés), sans toucher à une seule règle CSS. Sans effet sur ordinateur.
 *
 * Réglage de l'APPAREIL (pas du compte) : il reste au changement de compte.
 */
export type TailleTexte = 'normal' | 'grand' | 'tresgrand';

const CLE = 'vocab:taille-texte';
const FACTEUR: Record<TailleTexte, number> = { normal: 1, grand: 1.15, tresgrand: 1.3 };

export const TAILLES: { id: TailleTexte; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'grand', label: 'Grand' },
  { id: 'tresgrand', label: 'Très grand' },
];

export function lisTaille(): TailleTexte {
  try {
    const v = localStorage.getItem(CLE);
    if (v === 'grand' || v === 'tresgrand') return v;
  } catch { /* rien */ }
  return 'normal';
}

function applique(t: TailleTexte): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const f = FACTEUR[t];
  const largeur = window.screen?.width || window.innerWidth;
  const contenu = f === 1
    ? 'width=device-width, initial-scale=1, viewport-fit=cover'
    : `width=${Math.round(largeur / f)}, initial-scale=${f}, viewport-fit=cover`;
  if (meta.content !== contenu) meta.content = contenu;
}

export function choisisTaille(t: TailleTexte): void {
  try {
    if (t === 'normal') localStorage.removeItem(CLE);
    else localStorage.setItem(CLE, t);
  } catch { /* rien */ }
  applique(t);
}

/** Au démarrage (main.tsx), et à chaque rotation de l'écran. */
export function installeTaille(): void {
  applique(lisTaille());
  window.addEventListener('orientationchange', () => setTimeout(() => applique(lisTaille()), 250));
}
