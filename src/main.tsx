import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Lancement from './ui/Lancement';
import { FiletErreur } from './ui/FiletErreur';
import { installeSuiviErreurs, signaleErreur } from './data/erreurs';
import { mesure } from './data/mesures';
import { demandeStockagePersistant, noteJourUsage } from './data/stockage';
import { installeMiseAJour } from './data/miseAJour';
import { MiseAJour } from './ui/MiseAJour';
import { Defile } from './ui/Defile';
import { Salle } from './ui/Salle';
import { appliquerApercu, estTheme } from './ui/theme';
/* CHANTIER 341 — le changement de compte se règle avant l'affichage. */
import { verifieCompteAuDemarrage } from './data/appareil';
/* CHANTIER 350 — la taille du texte choisie dans Réglages › Apparence, posée avant l'affichage. */
import { installeTaille } from './data/tailleTexte';
installeTaille();
/* CHANTIER 161 — Atkinson Hyperlegible, livrée avec l'application : elle
   marche hors ligne. Installée par `npm install @fontsource/atkinson-hyperlegible`. */
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles.css';
/* Posée APRÈS styles.css : à sélecteur égal, c'est elle qui l'emporte. */
import './ui/apparence.css';
/* CHANTIER 302 — répondre à l'écrit ou à l'oral (champ, micro, verdict). */
import './ui/reponse.css';
/* CHANTIER 164 — le style Cahier et ses deux polices, livrées avec l'app.
   Installées par `npm install @fontsource/lexend @fontsource/caveat`. */
import '@fontsource/lexend/400.css';
import '@fontsource/lexend/600.css';
import '@fontsource/lexend/800.css';
import '@fontsource/caveat/700.css';
import './ui/cahier.css';
/* CHANTIER 165 — le style Lycée et sa police, livrée avec l'app.
   Installée par `npm install @fontsource-variable/archivo`. */
import '@fontsource-variable/archivo';
import './ui/lycee.css';
/* CHANTIER 171 — les deux apparences « Espace » (Décollage, Orbite). Aucune
   police nouvelle : elles reprennent Archivo et Lexend, déjà livrées. */
import './ui/espace.css';
/* CHANTIER 173 — Tableau vert et Tableau noir (Caveat, déjà livrée). */
import './ui/tableau.css';
/* CHANTIER 174 — Borne arcade et Néon (Archivo et Caveat, déjà livrées). */
import './ui/neon.css';
/* CHANTIER 176 — Grand bleu (Lexend, déjà livrée). */
import './ui/ocean.css';
/* CHANTIER 178 — Carnet kraft, Manga et BD pop (Lexend, Caveat, Archivo, déjà livrées). */
import './ui/voyage.css';
import './ui/bulles.css';
/* CHANTIER 180 — Jardin (Lexend, déjà livrée). */
import './ui/jardin.css';
/* CHANTIER 181 — Parquet, Pelouse, Mêlée (Lexend, Archivo, déjà livrées). */
import './ui/sport.css';
/* CHANTIER 182 — Strass, Grille de départ, Diner, TV (Lexend, Archivo, déjà livrées). */
import './ui/retro.css';
/* CHANTIER 183 — Tapis vert et Salon privé (Lexend, Newsreader, déjà livrées). */
import './ui/poker.css';
/* CHANTIER 210 — Station 1936 (Lexend, Archivo, déjà livrées). */
import './ui/montagne.css';
/* CHANTIER 187 — fonds animés (Grand bleu, Décollage, Orbite) et lune de la semaine. Posée en dernier. */
import './ui/anime.css';
/* CHANTIER 213 — Fashion week (Lexend, Newsreader, déjà livrées), après anime.css. */
import './ui/mode.css';
/* CHANTIER 216 — Cinéma muet (Limelight) et Bibliothèque (IM Fell English), polices dans public/fonts. */
import './ui/cinema.css';
import './ui/biblio.css';
/* CHANTIER 223 — Salon de thé (Parisienne) et Cabinet 1900 (Cinzel), polices dans public/fonts. */
import './ui/patisserie.css';
import './ui/cabinet.css';
/* CHANTIER 227 — Japon zen (Shippori Mincho) et Cotton Club (Bodoni Moda, Poiret One), polices dans public/fonts. */
import './ui/japon.css';
import './ui/jazz.css';
/* CHANTIER 235 — Plage et surf (Shrikhand) et Château (Cinzel, Cinzel Decorative), polices dans public/fonts. */
import './ui/plage.css';
import './ui/chateau.css';
/* CHANTIER 237 — Jungle et safari (Lilita One) et Pacific Express (Rye), polices dans public/fonts. */
import './ui/jungle.css';
import './ui/western.css';
/* CHANTIER 269 — Atelier d'horloger (Marcellus, police dans public/fonts). */
import './ui/horloger.css';
/* CHANTIER 348 — contrastes de la révision, apparence par apparence : chargé en dernier. */
import './ui/contraste.css';
/* CHANTIER 349 — « Supprimer les animations » d'Android : le filet de sécurité, chargé en dernier. */
import './ui/mouvement.css';

/* CHANTIER 266 — /admin : le tableau de bord de l'exploitant, chargé à part.
   Il ne monte ni l'application ni les fonds animés, et sa visite ne compte
   pas comme une ouverture dans les mesures d'usage. */
const Admin = lazy(() => import('./ui/Admin'));
/* CHANTIER 353 — les fonds animés (93 Ko de code) et l'aperçu de la boutique se chargent à part :
   le premier écran n'attend plus le décor. */
const FondAnime = lazy(() => import('./ui/FondAnime').then((m) => ({ default: m.FondAnime })));
const Vitrine = lazy(() => import('./ui/Vitrine').then((m) => ({ default: m.Vitrine })));
const estAdmin = /^\/admin\/?$/.test(window.location.pathname);
/* CHANTIER 276 — /vitrine : l'aperçu d'une apparence pour la boutique (Vitrine.tsx), affiché en
   réduction dans la fiche. Rien n'y est écrit : ni apparence, ni progression, ni mesures. */
const estVitrine = /^\/vitrine\/?$/.test(window.location.pathname);
/* CHANTIER 355 — ni /admin ni l'aperçu de la boutique n'ont d'ouverture : on retire celle
   d'index.html ici, quoi qu'il arrive au petit script de la page (l'aperçu restait caché derrière). */
if (estAdmin || estVitrine) document.getElementById('ouverture')?.remove();
if (estVitrine) {
  const t = new URLSearchParams(window.location.search).get('apparence');
  if (t && estTheme(t)) appliquerApercu(t);
}

/* CHANTIER 145 — les erreurs non rattrapées partent au suivi. */
installeSuiviErreurs();

/* CHANTIER 147 — première ouverture (une fois), puis une ouverture par jour. */
if (!estAdmin && !estVitrine) {
  mesure('installation');
  mesure('ouverture');
}

/* CHANTIER 154 — la progression ne doit pas être effacée par le navigateur. */
if (!estVitrine) {
  void demandeStockagePersistant();
  noteJourUsage();
}

/* CHANTIER 156 — une nouvelle version s'annonce et s'applique en un geste. */
if (!estVitrine) installeMiseAJour();

function monte() {
createRoot(document.getElementById('root')!, {
  onUncaughtError: (e) => signaleErreur(e, 'react'),
  onCaughtError: (e) => signaleErreur(e, 'react-rattrapee'),
}).render(estVitrine ? (
  <StrictMode>
    <FiletErreur>
      <Suspense fallback={null}>
        <Vitrine />
      </Suspense>
    </FiletErreur>
  </StrictMode>
) : estAdmin ? (
  <StrictMode>
    <FiletErreur>
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    </FiletErreur>
  </StrictMode>
) : (
  <StrictMode>
    {/* CHANTIER 146 — le filet enveloppe tout : une erreur de rendu affiche
        « Recharger » au lieu d'un écran blanc. */}
    <FiletErreur>
      {/* Posé à côté de l'application, pas autour : App.tsx a trois sorties
          possibles (chargement, accueil, onglets) et l'ouverture doit couvrir
          les trois sans qu'aucune ne la connaisse. */}
      <Lancement />
      {/* CHANTIER 187 — bulles, ciel étoilé, éclats au toucher : derrière tout, hors de l'application. */}
      <Suspense fallback={null}>
        <FondAnime />
      </Suspense>
      {/* CHANTIER 213 — Fashion week : le podium et les mannequins. */}
      <Defile />
      {/* CHANTIER 221 — Cinéma muet et Bibliothèque : le projecteur, le pianiste ; la lampe, l'horloge, le chat. */}
      <Salle />
      <App />
      <MiseAJour />
    </FiletErreur>
  </StrictMode>
));
}

/* 341 — l'application ne se monte qu'après la vérification du compte (une lecture locale, quelques millisecondes). */
/* CHANTIER 353 — la feuille de styles se charge sans bloquer (vite.config.ts) : on l'attend ici,
   derrière l'ouverture, pour ne jamais montrer un écran sans styles. */
function stylesPrets(): Promise<void> {
  const lien = document.querySelector<HTMLLinkElement>('link[data-css-app]');
  if (!lien || (window as unknown as { __cssPret?: number }).__cssPret) return Promise.resolve();
  return new Promise((ok) => {
    lien.addEventListener('load', () => ok(), { once: true });
    lien.addEventListener('error', () => ok(), { once: true });
    window.setTimeout(ok, 8000);
  });
}

if (estAdmin || estVitrine) void stylesPrets().then(monte);
else void Promise.all([stylesPrets(), verifieCompteAuDemarrage().catch(() => undefined)]).finally(monte);
