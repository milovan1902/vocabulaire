/*
 * CHANTIER 350/351 — ACCESSIBILITÉ, ÉTAPE 3 : LA TAILLE DU TEXTE.
 *
 * Chrome sur Android ignore la police du téléphone, et nos tailles sont en
 * pixels : on propose donc notre propre réglage (Réglages › Apparence).
 *
 * 351 — la 350 agrandissait la page entière par la balise viewport : dans
 * l'application installée, la page débordait de l'écran et ne revenait pas à
 * la normale. On agrandit maintenant le TEXTE seul : toutes les tailles de
 * police sont multipliées par --texte à la construction (vite.config.ts).
 *
 * Réglage de l'APPAREIL (pas du compte) : il reste au changement de compte.
 */
export type TailleTexte = 'normal' | 'grand' | 'tresgrand';

const CLE = 'vocab:taille-texte';
const FACTEUR: Record<TailleTexte, number> = { normal: 1, grand: 1.15, tresgrand: 1.3 };
const VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover';

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
  const f = FACTEUR[t];
  if (f === 1) document.documentElement.style.removeProperty('--texte');
  else document.documentElement.style.setProperty('--texte', String(f));
}

export function choisisTaille(t: TailleTexte): void {
  try {
    if (t === 'normal') localStorage.removeItem(CLE);
    else localStorage.setItem(CLE, t);
  } catch { /* rien */ }
  applique(t);
}

/** Au démarrage (main.tsx), avant l'affichage. */
export function installeTaille(): void {
  /* 351 — la balise viewport revient à sa valeur d'origine (la 350 la modifiait). */
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (meta && meta.content !== VIEWPORT) meta.content = VIEWPORT;
  applique(lisTaille());
}
