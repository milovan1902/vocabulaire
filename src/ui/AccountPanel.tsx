/** Bloc « compte » affiché en bas de la bibliothèque. */
import type { Auth } from './useAuth';

export function AccountPanel({ auth }: { auth: Auth }) {
  if (auth.loading) return null;

  if (!auth.session) {
    return (
      <div className="account">
        <p className="hint" style={{ marginBottom: 10 }}>
          Sans compte, tout reste sur cet appareil. Connectez-vous pour
          retrouver votre progression ailleurs et accéder aux paquets
          de la bibliothèque.
        </p>
        <button className="btn ghost" onClick={() => void auth.signIn()}>
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
