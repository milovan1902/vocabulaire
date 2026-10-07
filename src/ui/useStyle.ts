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

export type Style = 'cahier' | 'lycee' | 'decollage' | 'orbite' | 'tableau' | 'arcade' | 'neon' | 'ocean' | 'voyage' | 'manga' | 'bd' | 'jardin' | 'basket' | 'foot' | 'rugby'
  | 'strass' | 'circuit' | 'diner' | 'tv' | 'tapis' | 'salon' | 'station' | 'fashion' | 'cinema' | 'biblio' | 'patisserie' | 'cabinet' | 'japon' | 'jazz' | null;

function lire(): Style {
  const s = document.documentElement.dataset.style;
  return s === 'cahier' || s === 'lycee' || s === 'decollage' || s === 'orbite' || s === 'tableau'
    || s === 'arcade' || s === 'neon' || s === 'ocean'
    || s === 'voyage' || s === 'manga' || s === 'bd' || s === 'jardin'
    || s === 'basket' || s === 'foot' || s === 'rugby'
    || s === 'strass' || s === 'circuit' || s === 'diner' || s === 'tv'
    || s === 'tapis' || s === 'salon' || s === 'station' || s === 'fashion'
    || s === 'cinema' || s === 'biblio' || s === 'patisserie' || s === 'cabinet' || s === 'japon' || s === 'jazz' ? s : null;
}

/**
 * CHANTIER 171 — les styles qui prennent la FORME du Lycée (niveau, défi,
 * éventail, tuiles, notes courtes). Décollage et Orbite en font partie.
 */
export function estLudique(s: Style): boolean {
  return s === 'lycee' || s === 'decollage' || s === 'orbite' || s === 'tableau'
    || s === 'arcade' || s === 'neon' || s === 'ocean'
    || s === 'voyage' || s === 'manga' || s === 'bd' || s === 'jardin'
    || s === 'basket' || s === 'foot' || s === 'rugby'
    || s === 'strass' || s === 'circuit' || s === 'diner' || s === 'tv'
    || s === 'tapis' || s === 'salon' || s === 'station' || s === 'fashion'
    || s === 'cinema' || s === 'biblio' || s === 'patisserie' || s === 'cabinet' || s === 'japon' || s === 'jazz';
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
