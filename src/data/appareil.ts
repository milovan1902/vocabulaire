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

/** Le prénom, le profil élève/adulte, la frise de la première révision.
    341 — et ce qui disait « abonné », les apparences acquises, le cran de difficulté :
    le compte suivant les héritait (catalogue ouvert, apparences achetées par un autre). */
const PERSONNE = [
  'vocab:prenom', 'vocab:profil', 'vocab:visite-rdv',
  'vocab:abonne', 'vocab-apparences-acquises', 'vocab-apparences-achats', 'vocab-boutique-migree', 'vocab:cran',
];

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

/*
 * CHANTIER 341 — LE CHANGEMENT DE COMPTE SE RÈGLE AVANT L'AFFICHAGE.
 *
 * Après le retour de Google, l'application redémarre : elle chargeait les
 * paquets du compte d'avant et réécrivait sa liste « en jeu » au moment même
 * où l'appareil était vidé (une course). Le nouveau compte héritait ainsi des
 * paquets en travail de l'ancien, à 0 %. On compare donc les comptes ici,
 * appelé par main.tsx AVANT de monter l'application.
 */
const PROPRIETAIRE = 'vocab:proprietaire';
/** Lu par useAuth.ts après la première synchronisation (visite d'un compte neuf). */
export const CHANGE_COMPTE = 'vocab:compte-change';

/** Vide l'appareil pour un autre compte : données, listes vides (et non absentes), personne. */
export async function videPourCompte(userId: string): Promise<void> {
  const { repository } = await import('./repository');
  await repository.importAll({});
  await repository.saveInstalled([]);
  await repository.saveActive([]);
  await repository.saveDeckJournal({});
  oubliePersonne();
  try { localStorage.setItem(PROPRIETAIRE, userId); } catch { /* rien */ }
  try { sessionStorage.setItem(CHANGE_COMPTE, '1'); } catch { /* rien */ }
}

/** Vrai si l'appareil appartenait à un AUTRE compte (et vient d'être vidé). */
export async function verifieCompte(userId: string): Promise<boolean> {
  let avant: string | null = null;
  try { avant = localStorage.getItem(PROPRIETAIRE); } catch { /* rien */ }
  if (avant && avant !== userId) {
    await videPourCompte(userId);
    return true;
  }
  try { localStorage.setItem(PROPRIETAIRE, userId); } catch { /* rien */ }
  return false;
}

/** Au démarrage, avant l'affichage : la session (y compris au retour de Google) contre le propriétaire. */
export async function verifieCompteAuDemarrage(): Promise<void> {
  const { supabase } = await import('./supabase');
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (id) await verifieCompte(id);
}
