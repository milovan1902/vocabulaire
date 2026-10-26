/**
 * CHANTIER 336 — L'OFFRE GRATUITE, AU MÊME ENDROIT.
 *
 * Grille du 26/10 :
 *   — catalogue : un paquet offert par classe (et Voyager pour les adultes),
 *     le reste aux abonnés. Un paquet déjà dans la collection y reste ;
 *   — paquet personnalisé : le premier offert, une seule fois par compte
 *     (un paquet supprimé compte encore : la liste des suppressions voyage
 *     avec le compte, voir sync.ts) ;
 *   — apparences : 12 au plus sans abonnement (les 3 de base comprises).
 *
 * La photo et Parler sont limités côté serveur (335).
 */
import type { Deck } from '../domain/types';
import { estPremium } from '../engine/xp';
import { estCreateur } from './createur';
import { repository } from './repository';
import { estPerso } from './sync';

export const PAQUETS_OFFERTS = new Set([
  '6e-vocabulaire', '5e-verbes', '4e-fin-vocabulaire', '3e-verbes',
  '2de-expressions', '1re-fin-familles', 'tle-oral', 'ad-voyager',
]);

export const PAQUET_OFFERT_ADULTE = 'ad-voyager';
export const APPARENCES_MAX_GRATUIT = 12;

/** Abonné, ou compte du créateur : rien n'est retenu. */
export function sansLimite(): boolean {
  return estPremium() || estCreateur();
}

/** Un paquet du catalogue que seul un abonné peut obtenir. */
export function reserveAbonnes(d: Deck): boolean {
  return d.builtin && !d.priceCents && !PAQUETS_OFFERTS.has(d.id) && !sansLimite();
}

/** Vrai si le paquet personnalisé offert a déjà été créé (même supprimé depuis). */
export async function persoOffertPris(decks?: Deck[]): Promise<boolean> {
  const liste = decks ?? (await repository.listDecks());
  if (liste.some(estPerso)) return true;
  return Object.keys(await repository.getPersoSupprimes()).length > 0;
}
