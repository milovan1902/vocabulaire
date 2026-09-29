/**
 * Bloc « compte » affiché en bas de la bibliothèque.
 *
 * CHANTIER 137 — « Supprimer mon compte ». Deux gestes, pas un : le
 * premier ouvre l'avertissement, le second efface. Pas de fenêtre du
 * navigateur (`confirm`) : elle est laide dans l'application installée
 * et ne dit pas ce qui va disparaître.
 */
import { useState } from 'react';
import type { Auth } from './useAuth';
import { supprimeCompte } from '../data/compte';
import { useAccordCompte } from './accordParental';

export function AccountPanel({ auth }: { auth: Auth }) {
  // CHANTIER 141 — appelé avant tout `return` : règle des hooks.
  const accord = useAccordCompte();
  if (auth.loading) return null;

  if (!auth.session) {
    return (
      <div className="account">
        <p className="hint" style={{ marginBottom: 10 }}>
          Sans compte, tout reste sur cet appareil. Connectez-vous pour
          retrouver votre progression ailleurs et accéder aux paquets
          de la bibliothèque.
        </p>
        {accord.caseAccord}
        <button
          className="btn ghost"
          disabled={!accord.pret}
          onClick={() => void auth.signIn()}
        >
          Se connecter avec Google
        </button>
      </div>
    );
  }

  return (
    <div className="account">
      <p className="hint" style={{ marginBottom: 10 }}>
        Connecté en tant que {auth.email}.{' '}
        <SyncLabel auth={auth} />
      </p>
      <button
        className="btn ghost"
        disabled={auth.sync.status === 'running'}
        onClick={() => void auth.runSync()}
      >
        {auth.sync.status === 'running' ? 'Synchronisation…' : 'Synchroniser maintenant'}
      </button>
      <button className="btn ghost" onClick={() => void auth.logOut()}>
        Se déconnecter
      </button>
      <SupprimerCompte />
    </div>
  );
}

function SupprimerCompte() {
  const [etape, setEtape] = useState<'repos' | 'confirmer' | 'en-cours'>('repos');
  const [erreur, setErreur] = useState<string | null>(null);

  async function supprimer() {
    setEtape('en-cours');
    setErreur(null);
    try {
      await supprimeCompte();
      // Tout est effacé : on repart de l'accueil, comme un premier lancement.
      location.reload();
    } catch (e) {
      setErreur((e as Error).message);
      setEtape('confirmer');
    }
  }

  if (etape === 'repos') {
    return (
      <button
        className="btn ghost"
        style={{ color: 'var(--bad)' }}
        onClick={() => setEtape('confirmer')}
      >
        Supprimer mon compte
      </button>
    );
  }

  return (
    <div className="setting" style={{ marginTop: 10 }}>
      <p className="hint" style={{ marginBottom: 10 }}>
        <b>Supprimer ton compte efface définitivement</b> ta progression, tes
        réglages, tes conversations et leurs corrections, en ligne et sur cet
        appareil. Ça ne peut pas être annulé. Si tu veux garder ta
        progression, enregistre d’abord une sauvegarde.
      </p>
      {erreur && (
        <p className="hint" style={{ color: 'var(--bad)', marginBottom: 10 }}>{erreur}</p>
      )}
      <button
        className="btn ghost"
        style={{ color: 'var(--bad)' }}
        disabled={etape === 'en-cours'}
        onClick={() => void supprimer()}
      >
        {etape === 'en-cours' ? 'Suppression…' : 'Oui, supprimer définitivement'}
      </button>
      <button
        className="btn ghost"
        disabled={etape === 'en-cours'}
        onClick={() => { setEtape('repos'); setErreur(null); }}
      >
        Annuler
      </button>
    </div>
  );
}

function SyncLabel({ auth }: { auth: Auth }) {
  const s = auth.sync;
  if (s.status === 'running') return <>Synchronisation en cours…</>;
  if (s.status === 'error') {
    return (
      <span style={{ color: 'var(--bad)' }}>
        Dernière synchronisation en échec : {s.message}. Les données restent
        sur cet appareil, rien n’est perdu.
      </span>
    );
  }
  if (s.status === 'done') {
    const t = new Date(s.at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return <>Synchronisé à {t}.</>;
  }
  return null;
}
