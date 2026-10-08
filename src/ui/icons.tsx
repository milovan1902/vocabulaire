/**
 * Les icônes des onglets.
 *
 * CHANTIER 161 — UNE SEULE FAMILLE, AU TRAIT.
 *
 * Les cinq images de `public/` venaient de cinq séries différentes (clipart,
 * relief, silhouette…) et ne pouvaient pas prendre la couleur de l'onglet
 * actif : seule l'opacité disait où l'on était. Elles sont remplacées par des
 * tracés au trait (famille Lucide), qui suivent `currentColor` — gris au
 * repos, or quand l'onglet est actif, et la couleur de chaque thème sans
 * rien ajouter.
 *
 * La classe `tabsvg` (et non `tabicon`) est voulue : l'ancienne règle
 * `.tabicon` baissait l'opacité au repos, ce qui rendrait un trait gris
 * presque invisible. Voir `apparence.css`.
 *
 * Les fichiers PNG restent dans `public/` : « Mes progrès » s'en sert encore.
 */

import { useStyle } from './useStyle';

/*
 * CHANTIER 171 — deux autres familles d'icônes, selon l'apparence :
 *   — Décollage : fusée, satellite, antenne, orbite, télescope (Lucide) ;
 *   — Orbite : cinq planètes, une par onglet ;
 *   — Tableau (CHANTIER 173) : cartable, livre, casque du labo de langues,
 *     règle, toque de diplômé ;
 *   — Borne arcade et Néon (CHANTIER 174) : manette, pile de cartes, micro,
 *     joystick, coupe ;
 *   — Grand bleu (CHANTIER 176) : ancre, coquillage, poisson, boussole, voilier ;
 *   — Carnet kraft (CHANTIER 178) : carte, valise, avion, boussole, drapeau ;
 *   — Manga et BD pop (CHANTIER 178) : livre, pile, bulle, curseurs, étoile / éclair ;
 *   — Jardin (CHANTIER 180) : soleil, pousse, bulle, pelle, fleur ;
 *   — Parquet, Pelouse, Mêlée (CHANTIER 181) : le ballon du sport, pile,
 *     bulle, sifflet, coupe ;
 *   — CHANTIER 182 : Strass (bague, sac, flûte, montre, couronne), Grille de
 *     départ (formule 1, rallye, moto, kart, prototype), Diner (milk-shake,
 *     juke-box, micro, radio, patin), TV (téléviseur, téléphone à cadran,
 *     appareil photo, lampe à lave, fusée jouet).
 *   — CHANTIER 183 : Tapis vert (jeton, cartes, micro, dé, pile de jetons),
 *     Salon privé (losange, cartes, verre, roulette, trophée).
 *   — CHANTIER 225 : Salon de thé (gâteau à bougie, boîte à gâteaux, tasse de thé,
 *     fouet, pièce montée), Cabinet 1900 (erlenmeyer, bocal, cornet de phonographe,
 *     microscope, atome).
 *   — CHANTIER 235 : Plage et surf (soleil, planche, coquillage, bouée, palmier),
 *     Château (tour, écu, trompette, épée, couronne).
 *   — CHANTIER 237 : Jungle et safari (jumelles, caisse, perroquet, carte, empreinte),
 *     Pacific Express (soleil couchant, locomotive, étoile de shérif, cactus, lanterne).
 * Toujours au trait, en currentColor : l'onglet actif garde sa couleur.
 */
const TRAIT = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'tabsvg',
  'aria-hidden': true,
} as const;

/** Le calendrier : ce qu'il y a à faire aujourd'hui. */
export function IconAujourdhui() {
  const style = useStyle();
  /* CHANTIER 235 — Plage et surf et Château. */
  if (style === 'plage') return <svg {...TRAIT}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>;
  if (style === 'chateau') return <svg {...TRAIT}><path d="M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z" /><path d="M18 11V4H6v7" /><path d="M15 22v-4a3 3 0 0 0-6 0v4" /><path d="M22 11V9M2 11V9M6 4V2M18 4V2M10 4V2M14 4V2" /></svg>;
  /* CHANTIER 237 — Jungle et safari et Pacific Express. */
  if (style === 'jungle') return <svg {...TRAIT}><path d="M10 10h4" /><path d="M19 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3" /><path d="M20 21a2 2 0 0 0 2-2v-3.851c0-1.39-2-2.962-2-4.829V8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2z" /><path d="M22 16H2" /><path d="M4 21a2 2 0 0 1-2-2v-3.851c0-1.39 2-2.962 2-4.829V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2z" /><path d="M9 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3" /></svg>;
  if (style === 'western') return <svg {...TRAIT}><path d="M12 10V2" /><path d="m4.93 10.93 1.41 1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41 1.41" /><path d="M22 22H2" /><path d="m16 6-4 4-4-4" /><path d="M16 18a4 4 0 0 0-8 0" /></svg>;
  /* CHANTIER 227 — Japon zen et Cotton Club. */
  if (style === 'japon') return <svg {...TRAIT}><path d="M3 5h18" /><path d="M5 9h14" /><path d="M7 5v16M17 5v16" /><path d="M12 9v3" /></svg>;
  if (style === 'jazz') return <svg {...TRAIT}><path d="M12 2v3" /><path d="M8 5h8l-2 5h-4z" /><path d="M10 10 5 22M14 10l5 12" /></svg>;
  /* CHANTIER 225 — Salon de thé et Cabinet 1900. */
  if (style === 'patisserie') return <svg {...TRAIT}><path d="M4 20h16" /><path d="M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6" /><path d="M5 15.5c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0" /><path d="M12 12V8" /><path d="M12 3.5c.8 1 1 1.7.6 2.4a.8.8 0 0 1-1.2 0c-.4-.7-.2-1.4.6-2.4z" /></svg>;
  if (style === 'cabinet') return <svg {...TRAIT}><path d="M9 3h6" /><path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" /><path d="M7 15h10" /></svg>;
  if (style === 'tapis') return <svg {...TRAIT}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>;
  if (style === 'salon') return <svg {...TRAIT}><path d="M12 2l8 10-8 10-8-10z" /></svg>;
  if (style === 'strass') return <svg {...TRAIT}><circle cx="12" cy="15.5" r="5.5" /><path d="M9.5 6.5 11 3.5h2l1.5 3L12 10z" /></svg>;
  if (style === 'circuit') return <svg {...TRAIT} viewBox="0 0 32 20"><path d="M4 14V10h5l3-2h6l2 2h9v2l-3 2M4 10V6h4" /><circle cx="8" cy="14" r="3" /><circle cx="24" cy="14" r="3" /></svg>;
  if (style === 'diner') return <svg {...TRAIT}><path d="M7 9h10l-1.5 12h-7z" /><path d="M6 9a6 4 0 0 1 12 0" /><path d="M12.5 5 15 1.5" /></svg>;
  if (style === 'tv') return <svg {...TRAIT}><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M8 2l4 5 4-5" /><rect x="6" y="10" width="9" height="7" rx="2" /><path d="M18 11v.01M18 15v.01" /></svg>;
  if (style === 'basket') return <svg {...TRAIT}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8" /></svg>;
  if (style === 'foot') return <svg {...TRAIT}><circle cx="12" cy="12" r="9" /><path d="m12 8 3.8 2.8-1.5 4.4H9.7l-1.5-4.4z" /><path d="M12 3v5M20.6 9.2l-4.8 1.6M17.3 19.3l-3-4.1M6.7 19.3l3-4.1M3.4 9.2l4.8 1.6" /></svg>;
  if (style === 'rugby') return <svg {...TRAIT}><ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-35 12 12)" /><path d="m8.6 15.4 6.8-6.8M10.2 11.4l2.4 2.4M11.8 9.8l2.4 2.4" /></svg>;
  if (style === 'jardin') return <svg {...TRAIT}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>;
  if (style === 'voyage') return <svg {...TRAIT}><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M15 5.764v15" /><path d="M9 3.236v15" /></svg>;
  if (style === 'manga' || style === 'bd') return <svg {...TRAIT}><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>;
  if (style === 'ocean') return <svg {...TRAIT}><path d="M12 22V8" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /><circle cx="12" cy="5" r="3" /></svg>;
  if (style === 'arcade' || style === 'neon') return <svg {...TRAIT}><line x1="6" x2="10" y1="11" y2="11" /><line x1="8" x2="8" y1="9" y2="13" /><line x1="15" x2="15.01" y1="12" y2="12" /><line x1="18" x2="18.01" y1="10" y2="10" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" /></svg>;
  if (style === 'tableau') return <svg {...TRAIT}><path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M8 10h8" /><path d="M8 18h8" /><path d="M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>;
  if (style === 'decollage') return <svg {...TRAIT}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="11" cy="13" r="7" /><path d="M7.5 11.5a4 4 0 0 1 3-3" /><path d="M19.5 2.5v5M17 5h5" /></svg>;
  return (
    <svg {...TRAIT}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/** Les cartes empilées : la collection. */
export function IconPaquets() {
  const style = useStyle();
  /* CHANTIER 235 — Plage et surf et Château. */
  if (style === 'plage') return <svg {...TRAIT}><ellipse cx="12" cy="12" rx="4" ry="10" transform="rotate(35 12 12)" /><path d="M8.6 17 15.4 7" /></svg>;
  if (style === 'chateau') return <svg {...TRAIT}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="M12 3v18M4 11h16" /></svg>;
  /* CHANTIER 237 — Jungle et safari et Pacific Express. */
  if (style === 'jungle') return <svg {...TRAIT}><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M3 15h18M3 9l18 6" /></svg>;
  if (style === 'western') return <svg {...TRAIT}><path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" /><path d="m9 15-1-1" /><path d="m15 15 1-1" /><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z" /><path d="m8 19-2 3" /><path d="m16 19 2 3" /></svg>;
  /* CHANTIER 227 — Japon zen et Cotton Club. */
  if (style === 'japon') return <svg {...TRAIT}><path d="M2 11 12 4l10 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>;
  if (style === 'jazz') return <svg {...TRAIT}><path d="M4 4h16v10H4z" /><path d="M7 7h10M7 10h7" /><path d="M12 14v6M8 21h8" /></svg>;
  /* CHANTIER 225 — Salon de thé et Cabinet 1900. */
  if (style === 'patisserie') return <svg {...TRAIT}><rect x="3" y="9" width="18" height="12" rx="1" /><path d="M3 13h18M12 9v12" /><path d="M12 9c-1.5-3-5-3.5-5-1.5S10 9 12 9c2 0 5 .5 5-1.5S13.5 6 12 9z" /></svg>;
  if (style === 'cabinet') return <svg {...TRAIT}><rect x="6" y="2" width="12" height="3" rx="1" /><path d="M7 5v1a3 3 0 0 1-2 2.8V19a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8.8A3 3 0 0 1 17 6V5" /><path d="M5 13h14" /></svg>;
  if (style === 'tapis') return <svg {...TRAIT}><rect x="3" y="5" width="10" height="15" rx="1.5" transform="rotate(-12 8 12.5)" /><rect x="10" y="4" width="10" height="15" rx="1.5" transform="rotate(10 15 11.5)" /></svg>;
  if (style === 'salon') return <svg {...TRAIT}><rect x="3" y="5" width="10" height="15" rx="1.5" transform="rotate(-12 8 12.5)" /><rect x="10" y="4" width="10" height="15" rx="1.5" transform="rotate(10 15 11.5)" /></svg>;
  if (style === 'strass') return <svg {...TRAIT}><path d="M5 9h14l-1.5 11h-11z" /><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2" /></svg>;
  if (style === 'circuit') return <svg {...TRAIT} viewBox="0 0 32 20"><path d="M3 14v-3l3-1 3-4h10l4 4 5 1v3M11 6v4h9" /><circle cx="8" cy="14" r="3" /><circle cx="24" cy="14" r="3" /></svg>;
  if (style === 'diner') return <svg {...TRAIT}><path d="M5 21V10a7 7 0 0 1 14 0v11z" /><path d="M8 21v-5h8v5M8 11a4 4 0 0 1 8 0" /></svg>;
  if (style === 'tv') return <svg {...TRAIT}><path d="M3 9c0-3 4-5 9-5s9 2 9 5l-3 1-2-2H8l-2 2z" /><path d="M6 11l-2 9h16l-2-9" /><circle cx="12" cy="15" r="2.5" /></svg>;
  if (style === 'basket' || style === 'foot' || style === 'rugby') return <svg {...TRAIT}><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m2 12 8.58 3.91a2 2 0 0 0 1.66 0L22 12" /><path d="m2 17 8.58 3.91a2 2 0 0 0 1.66 0L22 17" /></svg>;
  if (style === 'jardin') return <svg {...TRAIT}><path d="M7 20h10" /><path d="M10 20c5.5-2.5.8-6.4 3-10" /><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" /><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" /></svg>;
  if (style === 'voyage') return <svg {...TRAIT}><path d="M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2" /><path d="M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" /><path d="M10 20h4" /><circle cx="16" cy="20" r="2" /><circle cx="8" cy="20" r="2" /></svg>;
  if (style === 'manga' || style === 'bd') return <svg {...TRAIT}><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>;
  if (style === 'ocean') return <svg {...TRAIT}><path d="M14 11a2 2 0 1 1-4 0 4 4 0 0 1 8 0 6 6 0 0 1-12 0 8 8 0 0 1 16 0 10 10 0 1 1-20 0 11.93 11.93 0 0 1 2.42-7.22 2 2 0 1 1 3.16 2.44" /></svg>;
  if (style === 'arcade' || style === 'neon') return <svg {...TRAIT}><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m2 12 8.58 3.91a2 2 0 0 0 1.66 0L22 12" /><path d="m2 17 8.58 3.91a2 2 0 0 0 1.66 0L22 17" /></svg>;
  if (style === 'tableau') return <svg {...TRAIT}><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>;
  if (style === 'decollage') return <svg {...TRAIT}><path d="M13 7 9 3 5 7l4 4" /><path d="m17 11 4 4-4 4-4-4" /><path d="m8 12 4 4 6-6-4-4Z" /><path d="m16 8 3-3" /><path d="M9 21a6 6 0 0 0-6-6" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="12" cy="12" r="5.5" /><ellipse cx="12" cy="12" rx="10.5" ry="3.6" transform="rotate(-20 12 12)" /></svg>;
  return (
    <svg {...TRAIT}>
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m2 12 8.58 3.91a2 2 0 0 0 1.66 0L22 12" />
      <path d="m2 17 8.58 3.91a2 2 0 0 0 1.66 0L22 17" />
    </svg>
  );
}

/** La bulle : la conversation. */
export function IconParler() {
  const style = useStyle();
  /* CHANTIER 235 — Plage et surf et Château. */
  if (style === 'plage') return <svg {...TRAIT}><path d="M3 14a9 9 0 0 1 18 0l-3 4H6z" /><path d="M12 5v13M7.5 6.5 9 18M16.5 6.5 15 18" /><path d="M10 18v3h4v-3" /></svg>;
  if (style === 'chateau') return <svg {...TRAIT}><path d="M3 10v4M3 12h11" /><path d="M14 9l7-4v14l-7-4z" /><path d="M7 12v3h3v-3" /></svg>;
  /* CHANTIER 237 — Jungle et safari et Pacific Express. */
  if (style === 'jungle') return <svg {...TRAIT}><path d="M16 7h.01" /><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" /><path d="m20 7 2 .5-2 .5" /><path d="M10 18v3" /><path d="M14 17.75V21" /><path d="M7 18a6 6 0 0 0 3.84-10.61" /></svg>;
  if (style === 'western') return <svg {...TRAIT}><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>;
  /* CHANTIER 227 — Japon zen et Cotton Club. */
  if (style === 'japon') return <svg {...TRAIT}><path d="M4 10h16a8 8 0 0 1-16 0z" /><path d="M2 21h20" /><path d="M9 3c-1 1.3 1 2.4 0 3.8M14 3c-1 1.3 1 2.4 0 3.8" /></svg>;
  if (style === 'jazz') return <svg {...TRAIT}><rect x="8" y="2" width="8" height="12" rx="4" /><path d="M8 7h8M8 10h8" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v4M8 22h8" /></svg>;
  /* CHANTIER 225 — Salon de thé et Cabinet 1900. */
  if (style === 'patisserie') return <svg {...TRAIT}><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" /><path d="M3 21h16" /><path d="M8 2c-1 1.2 1 2.2 0 3.4M12 2c-1 1.2 1 2.2 0 3.4" /></svg>;
  if (style === 'cabinet') return <svg {...TRAIT}><path d="M4 21h7" /><path d="M7.5 21v-6" /><path d="M7.5 15 20 4c1.2 3.2.6 9-3 11.6S9 17 7.5 15z" /></svg>;
  if (style === 'tapis') return <svg {...TRAIT}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" /></svg>;
  if (style === 'salon') return <svg {...TRAIT}><path d="M4 4h16l-8 9z" /><path d="M12 13v8M8 21h8" /></svg>;
  if (style === 'strass') return <svg {...TRAIT}><path d="M9 2h6l-.5 7a2.5 2.5 0 0 1-5 0z" /><path d="M12 11.5V20M8.5 21h7M11 6h.01M13 4.5h.01" /></svg>;
  if (style === 'circuit') return <svg {...TRAIT} viewBox="0 0 32 20"><circle cx="6" cy="14" r="4" /><circle cx="26" cy="14" r="4" /><path d="M6 14l5-6h8l3 3h-6l-4 3M22 11l4 3M17 8l2-3h3" /></svg>;
  if (style === 'diner') return <svg {...TRAIT}><rect x="8" y="2" width="8" height="12" rx="4" /><path d="M8 6h8M8 10h8M12 17v3M8 21h8M5 10a7 7 0 0 0 14 0" /></svg>;
  if (style === 'tv') return <svg {...TRAIT}><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13.5" r="4" /><path d="M8 7l1.5-3h5L16 7M6 10h.01" /></svg>;
  if (style === 'basket' || style === 'foot' || style === 'rugby') return <svg {...TRAIT}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>;
  if (style === 'jardin') return <svg {...TRAIT}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>;
  if (style === 'voyage') return <svg {...TRAIT}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>;
  if (style === 'manga' || style === 'bd') return <svg {...TRAIT}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>;
  if (style === 'ocean') return <svg {...TRAIT}><path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" /><path d="M18 12v.5" /><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" /><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" /><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4" /><path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H8c1.17-1.24 2.2-2.88 2.46-4.26" /></svg>;
  if (style === 'arcade' || style === 'neon') return <svg {...TRAIT}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>;
  if (style === 'tableau') return <svg {...TRAIT}><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" /></svg>;
  if (style === 'decollage') return <svg {...TRAIT}><path d="M4 10a7.31 7.31 0 0 0 10 10Z" /><path d="m9 15 3-3" /><path d="M17 13a6 6 0 0 0-6-6" /><path d="M21 13A10 10 0 0 0 11 3" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="9.5" cy="14.5" r="6" /><circle cx="19" cy="5" r="1.8" /><path d="M14.5 2.5a8 8 0 0 1 7 7" /></svg>;
  return (
    <svg {...TRAIT}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

/** Les trois curseurs : les réglages. */
export function IconReglages() {
  const style = useStyle();
  /* CHANTIER 235 — Plage et surf et Château. */
  if (style === 'plage') return <svg {...TRAIT}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24" /></svg>;
  if (style === 'chateau') return <svg {...TRAIT}><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 6-6M16 16l4 4M19 21l2-2" /></svg>;
  /* CHANTIER 237 — Jungle et safari et Pacific Express. */
  if (style === 'jungle') return <svg {...TRAIT}><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M15 5.764v15" /><path d="M9 3.236v15" /></svg>;
  if (style === 'western') return <svg {...TRAIT}><path d="M10 22V5a2 2 0 0 1 4 0v17" /><path d="M10 14H7a2 2 0 0 1-2-2V9" /><path d="M14 11h3a2 2 0 0 0 2-2V7" /><path d="M6 22h12" /></svg>;
  /* CHANTIER 227 — Japon zen et Cotton Club. */
  if (style === 'japon') return <svg {...TRAIT}><path d="M12 21 3 9a12 12 0 0 1 18 0z" /><path d="M12 21 8 8M12 21V7M12 21l4-13" /></svg>;
  if (style === 'jazz') return <svg {...TRAIT}><rect x="2" y="5" width="20" height="14" rx="1" /><path d="M7 5v9M12 5v9M17 5v9" /><path d="M2 14h20" /></svg>;
  /* CHANTIER 225 — Salon de thé et Cabinet 1900. */
  if (style === 'patisserie') return <svg {...TRAIT}><path d="M12 13v9" /><path d="M12 13c-4-2-5-9 0-11 5 2 4 9 0 11z" /><path d="M12 13c-1.8-2-2-7.5 0-11 2 3.5 1.8 9 0 11z" /></svg>;
  if (style === 'cabinet') return <svg {...TRAIT}><path d="M6 18h8" /><path d="M3 22h18" /><path d="M14 22a7 7 0 1 0 0-14h-1" /><path d="M9 14h2" /><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" /><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" /></svg>;
  if (style === 'tapis') return <svg {...TRAIT}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01" strokeWidth="2.6" /></svg>;
  if (style === 'salon') return <svg {...TRAIT}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.3 4.3M14.1 14.1l4.3 4.3M5.6 18.4l4.3-4.3M14.1 9.9l4.3-4.3" /></svg>;
  if (style === 'strass') return <svg {...TRAIT}><circle cx="12" cy="12" r="5" /><path d="M9 7.5 9.5 3h5l.5 4.5M9 16.5l.5 4.5h5l.5-4.5M12 10v2l1.5 1" /></svg>;
  if (style === 'circuit') return <svg {...TRAIT} viewBox="0 0 32 20"><path d="M4 15h24M11 15v-4h4M18 12l3-3" /><circle cx="14" cy="7" r="2.5" /><circle cx="7" cy="15" r="2.5" /><circle cx="25" cy="15" r="2.5" /></svg>;
  if (style === 'diner') return <svg {...TRAIT}><rect x="3" y="8" width="18" height="12" rx="3" /><path d="M7 8l9-5M6 12h4M6 15h4M6 18h4" /><circle cx="15.5" cy="14" r="3" /></svg>;
  if (style === 'tv') return <svg {...TRAIT}><path d="M9.5 2h5L18 16H6z" /><path d="M6 16l-1 6h14l-1-6" /><circle cx="12" cy="7" r="1.3" /><circle cx="11" cy="12" r="2" /></svg>;
  if (style === 'basket' || style === 'foot' || style === 'rugby') return <svg {...TRAIT}><circle cx="9" cy="14" r="5" /><path d="M13 11l8-3v5h-6" /><path d="M6 9.5V7a3 3 0 0 1 6 0" /></svg>;
  if (style === 'jardin') return <svg {...TRAIT}><path d="M2 22v-5l5-5 5 5-5 5z" /><path d="M9.5 14.5 16 8" /><path d="m17 2 5 5-.5.5a3.53 3.53 0 0 1-5 0a3.53 3.53 0 0 1 0-5L17 2" /></svg>;
  if (style === 'voyage') return <svg {...TRAIT}><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /><circle cx="12" cy="12" r="10" /></svg>;
  if (style === 'manga' || style === 'bd') return <svg {...TRAIT}><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></svg>;
  if (style === 'ocean') return <svg {...TRAIT}><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" /><circle cx="12" cy="12" r="10" /></svg>;
  if (style === 'arcade' || style === 'neon') return <svg {...TRAIT}><path d="M21 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z" /><path d="M6 15v-2" /><path d="M12 15V9" /><circle cx="12" cy="6" r="3" /></svg>;
  if (style === 'tableau') return <svg {...TRAIT}><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" /></svg>;
  if (style === 'decollage') return <svg {...TRAIT}><circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="12" cy="12" r="8.5" /><circle cx="9" cy="9.5" r="1.8" /><circle cx="15" cy="14.5" r="2.4" /><circle cx="14.5" cy="7.5" r="1" /><circle cx="8.5" cy="15.5" r="1" /></svg>;
  return (
    <svg {...TRAIT}>
      <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />
    </svg>
  );
}

/** La courbe qui monte : ce qui progresse. */
export function IconProgres() {
  const style = useStyle();
  /* CHANTIER 235 — Plage et surf et Château. */
  if (style === 'plage') return <svg {...TRAIT}><path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4" /><path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3" /><path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35" /><path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14" /></svg>;
  if (style === 'chateau') return <svg {...TRAIT}><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" /></svg>;
  /* CHANTIER 237 — Jungle et safari et Pacific Express. */
  if (style === 'jungle') return <svg {...TRAIT}><circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" /><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" /></svg>;
  if (style === 'western') return <svg {...TRAIT}><path d="M10 2h4" /><path d="M9 5h6" /><path d="M8 5h8l-1 13H9z" /><path d="M8 21h8" /><path d="M12 9c1 1.2 1.5 2.1 1.5 3a1.5 1.5 0 0 1-3 0c0-.9.5-1.8 1.5-3z" /></svg>;
  /* CHANTIER 227 — Japon zen et Cotton Club. */
  if (style === 'japon') return <svg {...TRAIT}><path d="M2 20 9 7l2.5 3L13 8l9 12z" /><path d="m7 10.5 2 1 2.5-1.5 1.5 1 2-1" /></svg>;
  if (style === 'jazz') return <svg {...TRAIT}><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg>;
  /* CHANTIER 225 — Salon de thé et Cabinet 1900. */
  if (style === 'patisserie') return <svg {...TRAIT}><path d="M4 21h16" /><rect x="5" y="16" width="14" height="5" rx="1" /><rect x="7.5" y="11" width="9" height="5" rx="1" /><rect x="10" y="6" width="4" height="5" rx="1" /><path d="M12 6V3" /></svg>;
  if (style === 'cabinet') return <svg {...TRAIT}><circle cx="12" cy="12" r="1" /><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" /><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" /></svg>;
  if (style === 'tapis') return <svg {...TRAIT}><ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" /></svg>;
  if (style === 'salon') return <svg {...TRAIT}><path d="M7 3h10v5a5 5 0 0 1-10 0z" /><path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6v4H9z" /></svg>;
  if (style === 'strass') return <svg {...TRAIT}><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5z" /><path d="M5 21h14" /></svg>;
  if (style === 'circuit') return <svg {...TRAIT} viewBox="0 0 32 20"><path d="M2 14v-2l4-1 5-4h7l5 3 6 1 1 3M6 11V6h3" /><circle cx="8" cy="14" r="3" /><circle cx="24" cy="14" r="3" /></svg>;
  if (style === 'diner') return <svg {...TRAIT}><path d="M5 3h6v8l6 1.5a3 3 0 0 1 3 3V17H5z" /><circle cx="8" cy="20" r="2" /><circle cx="17" cy="20" r="2" /></svg>;
  if (style === 'tv') return <svg {...TRAIT}><path d="M12 2c3 3 4 7 4 11l-4 3-4-3c0-4 1-8 4-11z" /><path d="M8 13l-3 4 3 1M16 13l3 4-3 1M10 19l2 3 2-3" /><circle cx="12" cy="9" r="1.5" /></svg>;
  if (style === 'basket' || style === 'foot' || style === 'rugby') return <svg {...TRAIT}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>;
  if (style === 'jardin') return <svg {...TRAIT}><circle cx="12" cy="12" r="3" /><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" /><path d="M12 7.5V9M7.5 12H9m7.5 0H15m-3 4.5V15M8 8l1.88 1.88M14.12 9.88 16 8M8 16l1.88-1.88M14.12 14.12 16 16" /></svg>;
  if (style === 'voyage') return <svg {...TRAIT}><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" /></svg>;
  if (style === 'manga') return <svg {...TRAIT}><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg>;
  if (style === 'bd') return <svg {...TRAIT}><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></svg>;
  if (style === 'ocean') return <svg {...TRAIT}><path d="M22 18H2a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4Z" /><path d="M21 14 10 2 3 14h18Z" /><path d="M10 2v16" /></svg>;
  if (style === 'arcade' || style === 'neon') return <svg {...TRAIT}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>;
  if (style === 'tableau') return <svg {...TRAIT}><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></svg>;
  if (style === 'decollage') return <svg {...TRAIT}><path d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44" /><path d="m13.56 11.747 4.332-.924" /><path d="m16 21-3.105-6.21" /><path d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z" /><path d="m6.158 8.633 1.114 4.456" /><path d="m8 21 3.105-6.21" /><circle cx="12" cy="13" r="2" /></svg>;
  if (style === 'orbite') return <svg {...TRAIT}><circle cx="12" cy="13" r="4.5" /><path d="M3.2 17.5C1.6 15 6 9.6 12.6 6.9" /><path d="M20.8 8.5c1.6 2.5-2.8 7.9-9.4 10.6" /><circle cx="18.5" cy="5.5" r="2" /></svg>;
  return (
    <svg {...TRAIT}>
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}
