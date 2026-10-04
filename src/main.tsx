import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Lancement from './ui/Lancement';
import { FiletErreur } from './ui/FiletErreur';
import { installeSuiviErreurs, signaleErreur } from './data/erreurs';
import { mesure } from './data/mesures';
import { demandeStockagePersistant, noteJourUsage } from './data/stockage';
import { installeMiseAJour } from './data/miseAJour';
import { MiseAJour } from './ui/MiseAJour';
import { FondAnime } from './ui/FondAnime';
/* CHANTIER 161 — Atkinson Hyperlegible, livrée avec l'application : elle
   marche hors ligne. Installée par `npm install @fontsource/atkinson-hyperlegible`. */
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles.css';
/* Posée APRÈS styles.css : à sélecteur égal, c'est elle qui l'emporte. */
import './ui/apparence.css';
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
/* CHANTIER 187 — fonds animés (Grand bleu, Décollage, Orbite) et lune de la semaine. Posée en dernier. */
import './ui/anime.css';

/* CHANTIER 145 — les erreurs non rattrapées partent au suivi. */
installeSuiviErreurs();

/* CHANTIER 147 — première ouverture (une fois), puis une ouverture par jour. */
mesure('installation');
mesure('ouverture');

/* CHANTIER 154 — la progression ne doit pas être effacée par le navigateur. */
void demandeStockagePersistant();
noteJourUsage();

/* CHANTIER 156 — une nouvelle version s'annonce et s'applique en un geste. */
installeMiseAJour();

createRoot(document.getElementById('root')!, {
  onUncaughtError: (e) => signaleErreur(e, 'react'),
  onCaughtError: (e) => signaleErreur(e, 'react-rattrapee'),
}).render(
  <StrictMode>
    {/* CHANTIER 146 — le filet enveloppe tout : une erreur de rendu affiche
        « Recharger » au lieu d'un écran blanc. */}
    <FiletErreur>
      {/* Posé à côté de l'application, pas autour : App.tsx a trois sorties
          possibles (chargement, accueil, onglets) et l'ouverture doit couvrir
          les trois sans qu'aucune ne la connaisse. */}
      <Lancement />
      {/* CHANTIER 187 — bulles, ciel étoilé, éclats au toucher : derrière tout, hors de l'application. */}
      <FondAnime />
      <App />
      <MiseAJour />
    </FiletErreur>
  </StrictMode>,
);
