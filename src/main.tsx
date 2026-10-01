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
import './styles.css';

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
      <App />
      <MiseAJour />
    </FiletErreur>
  </StrictMode>,
);
