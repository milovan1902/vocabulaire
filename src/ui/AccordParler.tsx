/**
 * CHANTIER 402 — LE DEUXIÈME ACCORD, AVANT LA PREMIÈRE CONVERSATION
 *
 * Parler met un enfant ou un adulte en face d'une intelligence artificielle.
 * Avant la première séance :
 *  - un élève de moins de 15 ans (6e à 3e) coche l'accord d'un parent ;
 *  - un adulte déclare avoir 18 ans ou plus.
 *
 * La case est ENREGISTRÉE PAR LE SERVEUR, avec sa date : tant qu'elle ne l'est
 * pas, le serveur refuse de parler (voir `functions/api/_protection.ts`).
 * Ce n'est pas une vérification d'identité, et le texte ne le prétend pas.
 */
import { useState } from 'react';

export function AccordParler({
  adulte, onDonne,
}: {
  adulte: boolean;
  /** Enregistre l'accord sur le serveur ; vrai si c'est fait. */
  onDonne: () => Promise<boolean>;
}) {
  const [coche, setCoche] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState(false);

  const valide = async () => {
    setEnvoi(true);
    setEchec(false);
    const ok = await onDonne();
    if (!ok) setEchec(true);
    setEnvoi(false);
  };

  return (
    <section className="parler" aria-label="Avant de parler">
      <h2 className="screen-title">Parler anglais</h2>
      <div className="parler-carte">
        <p className="parler-kicker">Avant la première conversation</p>
        <p className="hint">
          Tu vas parler avec une <b>intelligence artificielle</b>, pas avec une personne.
          Elle est réglée pour des élèves, mais elle peut se tromper : tu peux signaler
          n’importe quelle réponse depuis la conversation. Ce que tu écris ou dis est envoyé
          à Anthropic (États-Unis), qui fournit l’IA, le temps de la réponse.
        </p>
        <label className="accord-case">
          <input
            type="checkbox"
            checked={coche}
            onChange={(e) => setCoche(e.target.checked)}
          />
          <span>
            {adulte ? (
              <>J’ai <b>18 ans ou plus</b>.</>
            ) : (
              <>
                Un <b>parent</b> est d’accord pour que je discute avec une IA, et il a lu{' '}
                <a href="/confidentialite.html" target="_blank" rel="noopener">
                  ce que devient ma progression
                </a>.
              </>
            )}
          </span>
        </label>
        {echec && (
          <p className="hint" role="alert">
            L’accord n’a pas pu être enregistré. Vérifie ta connexion et réessaie.
          </p>
        )}
        <button className="btn" disabled={!coche || envoi} onClick={() => void valide()}>
          {envoi ? 'Enregistrement…' : 'Continuer'}
        </button>
      </div>
    </section>
  );
}
