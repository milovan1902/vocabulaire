import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Lancement from './ui/Lancement';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Posé à côté de l'application, pas autour : App.tsx a trois sorties
        possibles (chargement, accueil, onglets) et l'ouverture doit couvrir
        les trois sans qu'aucune ne la connaisse. */}
    <Lancement />
    <App />
  </StrictMode>,
);
