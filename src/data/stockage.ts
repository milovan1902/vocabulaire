/**
 * CHANTIER 154 — NE PAS PERDRE LA PROGRESSION SANS COMPTE
 *
 * Sans compte, toute la progression vit dans le stockage du navigateur.
 * Quand le téléphone manque de place, Chrome peut l'effacer sans prévenir.
 *
 * 1. `demandeStockagePersistant` demande au navigateur de ne jamais
 *    l'effacer de lui-même. Chrome l'accorde d'office à une app installée ;
 *    ailleurs il peut refuser, sans conséquence.
 * 2. `noteJourUsage` compte les jours d'utilisation, pour ne rappeler la
 *    sauvegarde qu'à quelqu'un qui a vraiment du travail à perdre.
 * 3. `telechargeSauvegarde` est le téléchargement de la sauvegarde, partagé
 *    par les Réglages et la bannière de « Mon travail ».
 */
import { repository } from './repository';

const CLE_JOURS = 'vocab:jours-usage';
const CLE_SAUVEGARDE = 'vocab:derniere-sauvegarde';
const CLE_PLUS_TARD = 'vocab:rappel-sauvegarde-plus-tard';

const JOURS_AVANT_RAPPEL = 3;
const JOURS_ENTRE_SAUVEGARDES = 14;
const JOURS_PLUS_TARD = 7;
const JOUR_MS = 86_400_000;

function lit(cle: string): string | null {
  try { return localStorage.getItem(cle); } catch { return null; }
}
function ecrit(cle: string, v: string): void {
  try { localStorage.setItem(cle, v); } catch { /* stockage plein ou bloqué */ }
}

export async function demandeStockagePersistant(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch { /* navigateur ancien : rien à faire */ }
}

/** Un jour de plus, au plus une fois par jour. */
export function noteJourUsage(): void {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  let e: { n: number; dernier: string } = { n: 0, dernier: '' };
  try { e = JSON.parse(lit(CLE_JOURS) ?? '') ?? e; } catch { /* premier jour */ }
  if (e.dernier === aujourdhui) return;
  ecrit(CLE_JOURS, JSON.stringify({ n: (e.n ?? 0) + 1, dernier: aujourdhui }));
}

/** Faut-il rappeler la sauvegarde ? (à n'appeler que sans compte) */
export function rappelSauvegardeDu(): boolean {
  let n = 0;
  try { n = JSON.parse(lit(CLE_JOURS) ?? '{}').n ?? 0; } catch { /* rien */ }
  if (n < JOURS_AVANT_RAPPEL) return false;
  const maintenant = Date.now();
  const sauvee = Number(lit(CLE_SAUVEGARDE) ?? 0);
  if (sauvee && maintenant - sauvee < JOURS_ENTRE_SAUVEGARDES * JOUR_MS) return false;
  const plusTard = Number(lit(CLE_PLUS_TARD) ?? 0);
  if (plusTard && maintenant - plusTard < JOURS_PLUS_TARD * JOUR_MS) return false;
  return true;
}

export function rappelPlusTard(): void {
  ecrit(CLE_PLUS_TARD, String(Date.now()));
}

/** Télécharge le fichier de sauvegarde. Lève en cas d'échec. */
export async function telechargeSauvegarde(): Promise<void> {
  const data = await repository.exportAll();
  const payload = {
    format: 'vocab-backup',
    version: 3,
    date: new Date().toISOString(),
    data,
  };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vocabulaire-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
  ecrit(CLE_SAUVEGARDE, String(Date.now()));
}
