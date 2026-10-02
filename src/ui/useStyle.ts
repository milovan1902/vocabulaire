/**
 * CHANTIER 165 — le style d'apparence en cours (« cahier », « lycee » ou
 * aucun), pour les écrans qui changent de FORME selon le style, pas
 * seulement de couleurs. Les couleurs, elles, passent par la feuille de
 * style seule.
 *
 * `theme.ts` émet l'événement « apparence » à chaque changement : l'écran
 * suit sans qu'on le rouvre.
 */
import { useEffect, useState } from 'react';

export type Style = 'cahier' | 'lycee' | 'decollage' | 'orbite' | null;

function lire(): Style {
  const s = document.documentElement.dataset.style;
  return s === 'cahier' || s === 'lycee' || s === 'decollage' || s === 'orbite' ? s : null;
}

/**
 * CHANTIER 171 — les styles qui prennent la FORME du Lycée (niveau, défi,
 * éventail, tuiles, notes courtes). Décollage et Orbite en font partie.
 */
export function estLudique(s: Style): boolean {
  return s === 'lycee' || s === 'decollage' || s === 'orbite';
}

export function useStyle(): Style {
  const [style, setStyle] = useState<Style>(lire);
  useEffect(() => {
    const suivre = () => setStyle(lire());
    window.addEventListener('apparence', suivre);
    return () => window.removeEventListener('apparence', suivre);
  }, []);
  return style;
}
