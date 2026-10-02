/**
 * CHANTIER 168 — les apparences à débloquer avec les XP.
 *
 * Automatique, Clair et Sombre sont toujours libres. Les autres se
 * débloquent aux paliers ci-dessous (gratuit : jusqu'à 1 000 XP), ou
 * d'office en mode payant. 600, 800 et 1 000 XP attendent les
 * prochaines apparences.
 *
 * Une apparence débloquée reste acquise sur l'appareil, même si le calcul
 * des XP changeait un jour. Celle qui était déjà choisie avant ce
 * chantier est acquise d'office (voir `retenir`, appelé par Account).
 */
import type { Theme } from './theme';
import { estPremium } from '../engine/xp';

export const DEBLOCAGE: Partial<Record<Theme, number>> = {
  cahier: 100,
  'lycee-clair': 250,
  lycee: 400,
};

const CLE = 'vocab-apparences-acquises';

export function acquises(): Theme[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function retenir(t: Theme) {
  if (DEBLOCAGE[t] === undefined) return;
  const a = acquises();
  if (a.includes(t)) return;
  try { localStorage.setItem(CLE, JSON.stringify([...a, t])); } catch { /* tant pis : recalculé */ }
}

export function estDebloquee(t: Theme, xp: number): boolean {
  const seuil = DEBLOCAGE[t];
  return seuil === undefined || estPremium() || xp >= seuil || acquises().includes(t);
}
