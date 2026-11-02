/**
 * CHANTIER 394 — LES DÉCOUVERTES, côté données.
 *
 * Une bulle « première fois » par partie de l'application (Parler, Paquets,
 * Mes progrès…). Une bulle fermée est notée dans les réglages du compte
 * (`Settings.vus`), qui voyagent avec lui : elle ne revient pas sur un autre
 * appareil. Sans compte, la liste locale sert de relais ; elle rejoint les
 * réglages dès qu'ils sont enregistrés (useStore écoute les événements).
 */
const CLE = 'vocab:decouvertes';
export const EVT_VU = 'vocab:vu';
export const EVT_VUS_RESET = 'vocab:vus-reset';

function locales(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
}

export function estVue(id: string, vus: string[] | undefined): boolean {
  return !!vus?.includes(id) || locales().includes(id);
}

export function marquerVue(id: string): void {
  const l = locales();
  if (!l.includes(id)) {
    try { localStorage.setItem(CLE, JSON.stringify([...l, id])); } catch { /* rien */ }
  }
  window.dispatchEvent(new CustomEvent(EVT_VU, { detail: id }));
}

/** « Revoir les premiers pas » : toutes les bulles reviendront. */
export function oublierVues(): void {
  try { localStorage.removeItem(CLE); } catch { /* rien */ }
  window.dispatchEvent(new Event(EVT_VUS_RESET));
}

/** La visite de départ est en cours : aucune bulle. */
export function visiteEnCours(): boolean {
  try { return localStorage.getItem('vocab:visite-etape') !== null; } catch { return false; }
}
