import { useEffect } from 'react';

/*
 * L'ouverture de l'application.
 *
 * CHANTIER 353 — elle est écrite dans index.html (#ouverture), en HTML et en
 * animations CSS : elle s'affiche avant que la feuille de styles et le code
 * soient arrivés. Ce composant ne dessine plus rien : il l'estompe à la fin
 * de l'animation (4 s après son apparition), ou au premier toucher.
 * Si le code arrive après ce délai, elle s'estompe tout de suite.
 *
 * Un seul passage par lancement : le drapeau vit au niveau du module, donc
 * un remontage de React (StrictMode compris) ne rejoue rien.
 */
let fait = false;

const FIN = 4000;
/** Mouvement réduit : l'état final, tenu sept dixièmes de seconde. */
const FIN_SOBRE = 700;
/** L'estompage qui découvre l'application. */
const SORTIE = 450;

export default function Lancement() {
  useEffect(() => {
    const el = document.getElementById('ouverture');
    if (!el || fait) return;
    fait = true;
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const debut = (window as unknown as { __ouverture?: number }).__ouverture ?? 0;
    let fini = false;
    const sortir = () => {
      if (fini) return;
      fini = true;
      el.classList.add('sort');
      window.setTimeout(() => el.remove(), SORTIE);
    };
    /* Un appui passe l'ouverture : personne ne doit attendre son application. */
    el.addEventListener('click', sortir);
    const reste = (reduit ? FIN_SOBRE : FIN) - (performance.now() - debut);
    window.setTimeout(sortir, Math.max(0, reste));
  }, []);
  return null;
}
