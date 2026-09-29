import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Lancement from './ui/Lancement';
import { installeSuiviErreurs, signaleErreur } from './data/erreurs';
import './styles.css';

/* CHANTIER 145 — les erreurs non rattrapées partent au suivi. */
installeSuiviErreurs();

createRoot(document.getElementById('root')!, {
  onUncaughtError: (e) => signaleErreur(e, 'react'),
  onCaughtError: (e) => signaleErreur(e, 'react-rattrapee'),
}).render(
  <StrictMode>
    {/* Posé à côté de l'application, pas autour : App.tsx a trois sorties
        possibles (chargement, accueil, onglets) et l'ouverture doit couvrir
        les trois sans qu'aucune ne la connaisse. */}
    <Lancement />
    <App />
  </StrictMode>,
);
