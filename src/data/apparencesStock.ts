/**
 * CHANTIER 268 — LES APPARENCES POSSÉDÉES, ET LEUR VOYAGE ENTRE APPAREILS.
 *
 * Deux listes, rangées sur l'appareil et poussées dans le paquet JSON des
 * réglages (voir sync.ts) :
 *  — `offertes` : acquises sans rien dépenser (l'apparence déjà choisie
 *    avant la boutique, les anciens paliers d'XP). Même clé qu'au
 *    chantier 168 : rien n'est perdu pour qui les avait.
 *  — `achats` : échangées contre des crédits, avec le prix PAYÉ. Le solde
 *    se recalcule (XP gagnés − prix payés) : changer un prix plus tard ne
 *    touche pas ce qui a déjà été acheté.
 *
 * Fusion : union. Une apparence acquise ne se perd jamais ; achetée sur deux
 * appareils, elle n'est comptée qu'une fois (l'achat le plus ancien).
 * Aucune dépendance vers l'interface : ce sont de simples identifiants.
 */
const CLE_OFFERTES = 'vocab-apparences-acquises';
const CLE_ACHATS = 'vocab-apparences-achats';

export interface Achat { t: string; prix: number; at: number }
export interface ApparencesVoyage { offertes: string[]; achats: Achat[] }

function lire<T>(cle: string): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(cle) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function ecrire(cle: string, v: unknown) {
  try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* stockage plein : tant pis */ }
}

export const lireOffertes = (): string[] => lire<string>(CLE_OFFERTES).filter((x) => typeof x === 'string');
export const lireAchats = (): Achat[] => lire<Achat>(CLE_ACHATS)
  .filter((a) => a && typeof a.t === 'string' && Number.isFinite(a.prix))
  .map((a) => ({ t: a.t, prix: Number(a.prix), at: Number(a.at) || 0 }));

export function ajouterOfferte(t: string) {
  const o = lireOffertes();
  if (!o.includes(t)) ecrire(CLE_OFFERTES, [...o, t]);
}
export function ajouterAchat(a: Achat) {
  const l = lireAchats();
  if (!l.some((x) => x.t === a.t)) ecrire(CLE_ACHATS, [...l, a]);
}

export function lireApparences(): ApparencesVoyage {
  return { offertes: lireOffertes(), achats: lireAchats() };
}
export function ecrireApparences(v: ApparencesVoyage) {
  ecrire(CLE_OFFERTES, v.offertes);
  ecrire(CLE_ACHATS, v.achats);
}

export function fusionnerApparences(local: ApparencesVoyage, distant: ApparencesVoyage | null | undefined): ApparencesVoyage {
  if (!distant) return local;
  const achats = new Map<string, Achat>();
  for (const a of [...(distant.achats ?? []), ...local.achats]) {
    const deja = achats.get(a.t);
    if (!deja || a.at < deja.at) achats.set(a.t, a);
  }
  /* Une apparence achetée n'a pas à figurer aussi parmi les offertes, et inversement :
     offerte quelque part, elle ne coûte rien ailleurs. */
  const offertes = [...new Set([...(distant.offertes ?? []), ...local.offertes])];
  return { offertes, achats: [...achats.values()].filter((a) => !offertes.includes(a.t)) };
}
