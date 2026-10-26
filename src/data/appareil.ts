/**
 * CHANTIER 334 — CE QUE L'APPAREIL RETIENT DE LA PERSONNE, HORS PROGRESSION.
 *
 * La progression vit dans le dépôt local (repository). Ces souvenirs-là
 * vivent à part, dans localStorage : le prénom et le profil de la visite,
 * et le fait que la première connexion a déjà eu lieu. Ils doivent partir
 * avec le compte, sinon le compte suivant hérite du prénom du précédent et
 * ne voit jamais la visite.
 *
 * Les clés sont écrites ici en clair (et non importées) pour éviter une
 * dépendance circulaire avec App.tsx et Visite.tsx : les garder identiques.
 */

/** Le prénom, le profil élève/adulte, la frise de la première révision. */
const PERSONNE = ['vocab:prenom', 'vocab:profil', 'vocab:visite-rdv'];

/** L'accueil vu, la visite faite ou en cours, le compte propriétaire. */
const PREMIERE_FOIS = ['vocab:accueil-vu', 'vocab:guidage-fait', 'vocab:visite-etape', 'vocab:proprietaire'];

/** Envoyé quand un compte tout neuf se connecte : App.tsx relance la visite. */
export const EVT_NOUVEAU_COMPTE = 'vocab:nouveau-compte';

function retire(cles: string[]): void {
  for (const k of cles) {
    try { localStorage.removeItem(k); } catch { /* rien à faire */ }
  }
}

/** Un autre compte prend l'appareil : on oublie la personne d'avant. */
export function oubliePersonne(): void {
  retire(PERSONNE);
}

/** Compte supprimé : l'appareil redevient neuf, accueil et visite compris. */
export function appareilNeuf(): void {
  retire([...PERSONNE, ...PREMIERE_FOIS]);
}

/** Un nouveau compte : la visite se relancera, sans repasser par l'accueil. */
export function visiteARefaire(): void {
  retire(['vocab:guidage-fait', 'vocab:visite-etape', 'vocab:visite-rdv']);
  window.dispatchEvent(new Event(EVT_NOUVEAU_COMPTE));
}
