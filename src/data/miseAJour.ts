/**
 * CHANTIER 156 — LES MISES À JOUR ARRIVENT TOUT DE SUITE
 *
 * Avant : le nouveau service worker s'installait en silence, mais la page
 * gardait l'ancienne version jusqu'à la réouverture suivante (d'où « il
 * faut ouvrir l'app deux fois »).
 *
 * Maintenant : dès qu'une version est prête, un bandeau propose
 * « Recharger ». On vérifie aussi les mises à jour à chaque retour dans
 * l'app et toutes les heures, pas seulement à l'ouverture.
 */
import { registerSW } from 'virtual:pwa-register';

type Ecouteur = () => void;
const ecouteurs = new Set<Ecouteur>();
let prete = false;
let appliquer: ((recharger?: boolean) => Promise<void>) | null = null;

function prevenir() {
  for (const f of ecouteurs) f();
}

export function installeMiseAJour(): void {
  if (!('serviceWorker' in navigator)) return;
  appliquer = registerSW({
    onNeedRefresh() {
      prete = true;
      prevenir();
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const verifie = () => {
        if (navigator.onLine) void reg.update().catch(() => {});
      };
      setInterval(verifie, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') verifie();
      });
    },
  });
}

export function abonneMiseAJour(f: Ecouteur): () => void {
  ecouteurs.add(f);
  return () => ecouteurs.delete(f);
}

export function miseAJourPrete(): boolean {
  return prete;
}

export function appliqueMiseAJour(): void {
  if (appliquer) void appliquer(true);
  else location.reload();
}
