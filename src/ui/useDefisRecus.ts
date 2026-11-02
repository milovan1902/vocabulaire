import { useEffect, useState } from 'react';
import { EVT_RECUS, listeDuels } from '../data/duels';
import { amisActifs } from '../data/amis';
import './pastille.css';

/*
 * CHANTIER 391 — LA PASTILLE DES DÉFIS REÇUS.
 *
 * Le nombre de défis à relever aujourd'hui, pour l'onglet « Mes progrès ».
 * Relu à l'ouverture (après quelques secondes, pour ne pas ralentir le
 * démarrage), au retour dans l'application, toutes les 3 minutes, et à
 * chaque lecture faite par « Mes amis ». Sans compte ou sans amis : 0,
 * et aucun appel réseau.
 */
export function useDefisRecus(connecte: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!connecte) { setN(0); return undefined; }
    let vivant = true;
    const lire = () => {
      if (!amisActifs() || document.hidden) return;
      void listeDuels().catch(() => { /* hors ligne, ou SQL 390 absent */ });
    };
    const ecoute = (e: Event) => { if (vivant) setN(Number((e as CustomEvent<number>).detail) || 0); };
    const retour = () => { if (!document.hidden) lire(); };
    window.addEventListener(EVT_RECUS, ecoute);
    document.addEventListener('visibilitychange', retour);
    const t0 = window.setTimeout(lire, 4000);
    const t = window.setInterval(lire, 3 * 60 * 1000);
    return () => {
      vivant = false;
      window.removeEventListener(EVT_RECUS, ecoute);
      document.removeEventListener('visibilitychange', retour);
      window.clearTimeout(t0);
      window.clearInterval(t);
    };
  }, [connecte]);
  return n;
}
