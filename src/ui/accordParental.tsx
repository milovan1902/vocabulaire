/**
 * CHANTIER 141 — accord parental avant la création d'un compte.
 *
 * L'application est ouverte dès le CM2 (10 ans) : elle relève donc de la
 * politique Familles de Google Play, et, en France, un moins de 15 ans a
 * besoin de l'accord d'un parent pour qu'on traite ses données en ligne.
 *
 * Forme retenue : une case à cocher, sur le téléphone, avant « Se
 * connecter avec Google ». Rien n'est demandé sans compte : dans ce cas
 * rien ne quitte l'appareil.
 *
 * L'accord est retenu sur l'appareil (date comprise), pour ne pas le
 * redemander à chaque connexion. Il se perd si on vide les données du
 * navigateur : la case réapparaît, c'est voulu.
 */
import { useState } from 'react';

const CLE = 'accord-compte-v1';

export function accordDonne(): boolean {
  try { return localStorage.getItem(CLE) !== null; } catch { return false; }
}

function retenirAccord(oui: boolean) {
  try {
    if (oui) localStorage.setItem(CLE, new Date().toISOString());
    else localStorage.removeItem(CLE);
  } catch { /* stockage indisponible : la case sera redemandée */ }
}

/**
 * La case et son état. `pret` dit si le bouton de connexion peut
 * s'activer. Une fois l'accord donné, la case n'est plus affichée.
 */
export function useAccordCompte() {
  const [ok, setOk] = useState(accordDonne());
  const [dejaDonne] = useState(accordDonne());

  const caseAccord = dejaDonne ? null : (
    <label
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        margin: '0 0 12px', fontSize: 15, lineHeight: 1.45, cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <input
        type="checkbox"
        checked={ok}
        onChange={(e) => { setOk(e.target.checked); retenirAccord(e.target.checked); }}
        style={{ width: 22, height: 22, flex: '0 0 22px', marginTop: 1, accentColor: 'var(--gold, #f2b705)' }}
      />
      <span>
        J’ai 15 ans ou plus, <b>ou</b> un parent a lu{' '}
        <a href="/confidentialite.html" target="_blank" rel="noopener">
          ce que devient ma progression
        </a>{' '}
        et est d’accord pour que je crée un compte.
      </span>
    </label>
  );

  return { pret: ok, caseAccord };
}
