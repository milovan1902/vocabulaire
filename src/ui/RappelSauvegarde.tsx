/**
 * CHANTIER 154 — la bannière « tout est sur ce téléphone ».
 *
 * Affichée en tête de « Mon travail », sans compte seulement, après trois
 * jours d'usage, si aucune sauvegarde depuis quatorze jours. « Plus tard »
 * la fait taire une semaine.
 */
import { useState } from 'react';
import { rappelPlusTard, rappelSauvegardeDu, telechargeSauvegarde } from '../data/stockage';
import { phraseErreur } from '../data/messageErreur';

export function RappelSauvegarde() {
  const [visible, setVisible] = useState(rappelSauvegardeDu);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!visible) return null;

  async function sauver() {
    setErreur(null);
    try {
      await telechargeSauvegarde();
      setVisible(false);
    } catch (e) {
      setErreur(phraseErreur(e, 'sauvegarde-rappel'));
    }
  }

  return (
    <div className="consultbox" role="note">
      <p className="ttl">Ta progression n’est que sur ce téléphone</p>
      <p className="hint">
        Si Chrome est vidé ou si tu changes de téléphone, elle sera perdue.
        Enregistre une sauvegarde, ou connecte-toi depuis les Réglages pour
        la garder en ligne.
      </p>
      {erreur && <p className="hint" style={{ color: 'var(--bad)' }}>{erreur}</p>}
      <button className="btn" onClick={() => void sauver()}>Enregistrer une sauvegarde</button>
      <button className="btn ghost" onClick={() => { rappelPlusTard(); setVisible(false); }}>
        Plus tard
      </button>
    </div>
  );
}
