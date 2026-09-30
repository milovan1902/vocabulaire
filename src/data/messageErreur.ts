/**
 * CHANTIER 153 — CE QUE L'ÉLÈVE LIT QUAND ÇA NE MARCHE PAS
 *
 * Avant : le message technique brut (« JWT expired », « Failed to fetch »,
 * « new row violates row-level security policy… ») s'affichait tel quel.
 * Illisible pour un élève, et il en dit trop sur l'intérieur de l'app.
 *
 * Maintenant : une phrase simple à l'écran, et le détail part au suivi des
 * erreurs (livraison 145), où vous le retrouvez dans `app_erreur`.
 *
 * La vue exploitant (trois tapes dans Parler) continue de montrer le
 * détail, en petit : c'est votre outil de dépannage.
 */
import { signaleErreur } from './erreurs';

const CLE_EXPLOITANT = 'vocab:parler-exploitant';

function brut(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e ?? '');
}

/** Une phrase lisible, et le détail envoyé au suivi. */
export function phraseErreur(e: unknown, origine: string): string {
  signaleErreur(e, origine);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Pas de connexion internet. Réessaie une fois connecté.';
  }
  const m = brut(e).toLowerCase();
  if (/jwt|token|session|refresh|not authenticated|compte requis|401/.test(m)) {
    return 'Ta session a expiré. Reconnecte-toi depuis les Réglages.';
  }
  if (/failed to fetch|networkerror|network request|load failed|timeout|fetch/.test(m)) {
    return 'Le serveur ne répond pas. Réessaie dans un instant.';
  }
  if (/quota|storage|indexeddb/.test(m)) {
    return 'La mémoire de l’appareil est pleine. Libère un peu de place, puis réessaie.';
  }
  return 'Un souci technique est survenu. Réessaie dans un instant.';
}

/** Le détail technique, seulement en vue exploitant. Sinon rien. */
export function detailExploitant(e: unknown, origine: string): string | null {
  signaleErreur(e, origine);
  try {
    if (localStorage.getItem(CLE_EXPLOITANT) !== '1') return null;
  } catch {
    return null;
  }
  const d = (e as { detail?: string } | null)?.detail;
  return d ?? brut(e);
}
