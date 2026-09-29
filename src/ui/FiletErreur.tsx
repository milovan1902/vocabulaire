/**
 * CHANTIER 146 — LE FILET ANTI ÉCRAN BLANC
 *
 * Sans lui, une seule erreur de rendu démonte toute l'application : l'élève
 * voit un écran vide et croit que l'app est cassée pour de bon. Avec lui, il
 * voit une phrase et deux boutons.
 *
 * L'erreur, elle, part toujours au suivi (livraison 145) : React la signale
 * via `onCaughtError`, branché dans main.tsx.
 *
 * CAS PARTICULIER — LA MISE À JOUR EN COURS. Après un déploiement, une page
 * restée ouverte peut réclamer un morceau de code qui n'existe plus. On
 * recharge alors tout seul, UNE fois (drapeau de session), sans rien
 * afficher : c'est la seule panne qu'un rechargement répare à coup sûr.
 *
 * « Réparer l'application » vide le cache hors ligne et le service worker,
 * puis recharge. La progression (IndexedDB) et le compte ne sont PAS
 * touchés.
 */
import { Component, type ReactNode } from 'react';

const CLE_RECHARGE = 'filet-recharge-auto';

function estMiseAJour(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch dynamically/i.test(m);
}

async function repare(): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    if ('caches' in window) {
      const noms = await caches.keys();
      await Promise.all(noms.map((n) => caches.delete(n)));
    }
  } catch { /* on recharge quand même */ }
  location.reload();
}

interface Etat { panne: boolean }

export class FiletErreur extends Component<{ children: ReactNode }, Etat> {
  state: Etat = { panne: false };

  static getDerivedStateFromError(): Etat {
    return { panne: true };
  }

  componentDidCatch(e: unknown) {
    if (estMiseAJour(e)) {
      try {
        if (!sessionStorage.getItem(CLE_RECHARGE)) {
          sessionStorage.setItem(CLE_RECHARGE, '1');
          location.reload();
        }
      } catch { /* stockage indisponible : on laisse l'écran de secours */ }
    }
  }

  render() {
    if (!this.state.panne) return this.props.children;
    return (
      <main
        role="alert"
        style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: 24, textAlign: 'center', boxSizing: 'border-box',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.25 }}>Oups, un souci est survenu.</h1>
        <p style={{ margin: 0, maxWidth: 340, fontSize: 16, lineHeight: 1.5 }}>
          Ta progression est bien gardée. Recharge l’application pour reprendre.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
          <button className="btn" style={{ minHeight: 48 }} onClick={() => location.reload()}>
            Recharger
          </button>
          <button className="btn ghost" style={{ minHeight: 48 }} onClick={() => void repare()}>
            Ça recommence ? Réparer l’application
          </button>
        </div>
      </main>
    );
  }
}
