/**
 * CHANTIER 168 — les apparences à débloquer avec les XP.
 * CHANTIER 268 — elles s'ACHÈTENT avec des crédits : 1 XP gagné = 1 crédit,
 * à dépenser sur l'apparence de son choix (prix dans boutique.ts). Les
 * paliers d'XP (100, 250, 400) disparaissent.
 *
 * Solde = XP gagnés depuis le début (sans plafond) − prix payés. Rien
 * d'autre n'est stocké : les XP se recalculent depuis la série, les achats
 * voyagent avec les réglages (data/apparencesStock.ts, sync.ts).
 *
 * Passage à la boutique, une seule fois par appareil : l'apparence en cours
 * et celles des anciens paliers déjà atteints sont offertes.
 *
 * CHANTIER 270 — le compte du créateur possède tout (data/createur.ts).
 * CHANTIER 336 — sans abonnement, 12 apparences au plus (les 3 de base comprises).
 */
import type { Theme } from './theme';
import { themeChoisi } from './theme';
import { estPremium } from '../engine/xp';
import { FAMILLES, prixDe } from './boutique';
import { APPARENCES_MAX_GRATUIT, sansLimite } from '../data/offre';
import { ajouterAchat, ajouterOfferte, lireAchats, lireOffertes } from '../data/apparencesStock';
import { estCreateur } from '../data/createur';

const CLE_MIGRATION = 'vocab-boutique-migree';
/** Les paliers du chantier 168, pour la seule migration. */
const ANCIENS_PALIERS: Partial<Record<Theme, number>> = { cahier: 100, 'lycee-clair': 250, lycee: 400 };

export function possede(t: Theme): boolean {
  return prixDe(t) === 0 || estPremium() || estCreateur() || lireOffertes().includes(t) || lireAchats().some((a) => a.t === t);
}

/** 336 — combien d'apparences sont à moi. */
export function nombrePossedees(): number {
  return FAMILLES.flatMap((f) => f.articles).filter((a) => possede(a.id)).length;
}

/** 336 — sans abonnement, la douzième est la dernière. */
export function plafondAtteint(): boolean {
  return !sansLimite() && nombrePossedees() >= APPARENCES_MAX_GRATUIT;
}

export function depense(): number {
  return lireAchats().reduce((s, a) => s + a.prix, 0);
}

/** Les crédits disponibles, d'après les XP bruts (`bilan(streak).xp`). */
export function credits(xpBrut: number): number {
  return Math.max(0, xpBrut - depense());
}

/** Échange des crédits contre une apparence. false si le solde ne suffit pas. */
export function acheter(t: Theme, xpBrut: number): boolean {
  if (possede(t)) return true;
  if (plafondAtteint()) return false;
  const prix = prixDe(t);
  if (credits(xpBrut) < prix) return false;
  ajouterAchat({ t, prix, at: Date.now() });
  return true;
}

/** Une apparence acquise sans dépense (gardée pour les appels existants). */
export function retenir(t: Theme) {
  if (prixDe(t) > 0) ajouterOfferte(t);
}

export function migrerVersBoutique(xpPlafonne: number) {
  try {
    if (localStorage.getItem(CLE_MIGRATION)) return;
    retenir(themeChoisi());
    for (const [t, seuil] of Object.entries(ANCIENS_PALIERS) as [Theme, number][]) {
      if (xpPlafonne >= seuil) retenir(t);
    }
    localStorage.setItem(CLE_MIGRATION, '1');
  } catch { /* stockage indisponible : on réessaiera */ }
}
