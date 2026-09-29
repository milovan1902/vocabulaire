/**
 * CHANTIER 145 — LE SUIVI DES ERREURS, SANS OUTIL TIERS
 *
 * Les « Android vitals » de Google ne voient que la coquille de la TWA,
 * jamais les erreurs de notre code. On les relève donc nous-mêmes, et
 * sans SDK tiers : l'app est dans le programme Familles, et chaque outil
 * externe ajouté serait un sous-traitant de plus, et des lignes de plus
 * dans la politique et le formulaire « Sécurité des données ».
 *
 * CE QUI PART : le message d'erreur, la pile d'appels (tronquée), la page
 * (le chemin, sans paramètres), le type de navigateur. RIEN D'AUTRE :
 * aucun identifiant de compte, aucun e-mail, aucune transcription.
 *
 * Garde-fous : rien en développement, cinq envois au plus par ouverture de
 * l'app, une même erreur n'est envoyée qu'une fois, et un envoi raté ne
 * fait jamais planter l'app.
 */

const MAX_PAR_SESSION = 5;
const deja = new Set<string>();
let envoyes = 0;

/** Bruits connus, sans intérêt : extensions, erreurs d'autres sites. */
function bruit(message: string, pile: string): boolean {
  return (
    message === 'Script error.' ||
    message.includes('ResizeObserver loop') ||
    /(chrome|moz|safari)-extension:\/\//.test(pile)
  );
}

function nettoie(s: string, max: number): string {
  return s.split(location.origin).join('').replace(/\?[^\s)]*/g, '').slice(0, max);
}

export function signaleErreur(e: unknown, origine: string): void {
  try {
    if (import.meta.env.DEV) return;
    const err = e instanceof Error ? e : new Error(typeof e === 'string' ? e : JSON.stringify(e) ?? String(e));
    const message = nettoie(err.message || String(err), 300);
    const pile = nettoie(err.stack ?? '', 1500);
    if (bruit(message, pile)) return;
    const cle = message + '|' + pile.split('\n')[1];
    if (deja.has(cle) || envoyes >= MAX_PAR_SESSION) return;
    deja.add(cle);
    envoyes++;
    void fetch('/api/erreur', {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, pile, origine, page: location.pathname, navigateur: navigator.userAgent.slice(0, 200) }),
    }).catch(() => {});
  } catch {
    /* Le suivi ne doit jamais devenir lui-même une panne. */
  }
}

/** À appeler une fois, avant le rendu. */
export function installeSuiviErreurs(): void {
  window.addEventListener('error', (ev) => signaleErreur(ev.error ?? ev.message, 'window'));
  window.addEventListener('unhandledrejection', (ev) => signaleErreur(ev.reason, 'promesse'));
}
