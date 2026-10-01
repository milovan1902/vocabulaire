/**
 * CHANTIER 156 — le bandeau « Nouvelle version disponible ».
 * En bas de l'écran, au-dessus des onglets. « Plus tard » le cache jusqu'à
 * la prochaine ouverture (la mise à jour s'appliquera alors d'elle-même).
 */
import { useState, useSyncExternalStore } from 'react';
import { abonneMiseAJour, appliqueMiseAJour, miseAJourPrete } from '../data/miseAJour';

export function MiseAJour() {
  const prete = useSyncExternalStore(abonneMiseAJour, miseAJourPrete);
  const [cache, setCache] = useState(false);
  if (!prete || cache) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(76px + env(safe-area-inset-bottom))',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 12,
        background: '#0F253C',
        color: '#fff',
        boxShadow: '0 6px 20px rgba(0,0,0,.25)',
      }}
    >
      <span style={{ flex: 1, fontWeight: 600 }}>Nouvelle version disponible</span>
      <button className="btn" onClick={appliqueMiseAJour}>Recharger</button>
      <button
        onClick={() => setCache(true)}
        style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.8, padding: 8 }}
      >
        Plus tard
      </button>
    </div>
  );
}
