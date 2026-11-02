import { useEffect, useState } from 'react';
import { estMot } from '../engine/reponse';
import { MOTS_DEFI, cleMot, estAcquis, finDuJour, tirerMots, type MotDefi } from '../engine/defi';
import { todayKey } from '../engine/session';
import type { Store } from './useStore';

/*
 * CHANTIER 357 — les 5 mots du défi éclair.
 *
 * Lus dans tous les paquets de la collection, quelques secondes après
 * l'ouverture (pour ne pas ralentir le démarrage). Le tirage du jour est
 * gardé sur l'appareil : rouvrir l'application ne change pas les mots.
 * null = pas encore lu ; [] = moins de 5 mots acquis (la carte reste cachée).
 *
 * CHANTIER 384 — l'appareil retient aussi les mots déjà posés au défi
 * (mot → jour), pour ne pas les reposer tant qu'il en reste de nouveaux.
 */
const CLE = 'vocab:defi-jour';
const CLE_VUS = 'vocab:defi-vus';
type Garde = { jour: string; mots: Array<{ d: string; c: string }> };
type Vus = Record<string, string>;

function lire(): Garde | null {
  try { return JSON.parse(localStorage.getItem(CLE) ?? 'null') as Garde | null; } catch { return null; }
}
function ecrire(g: Garde) {
  try { localStorage.setItem(CLE, JSON.stringify(g)); } catch { /* rien */ }
}
function lireVus(): Vus {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_VUS) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Vus) : {};
  } catch { return {}; }
}
function ecrireVus(v: Vus) {
  try { localStorage.setItem(CLE_VUS, JSON.stringify(v)); } catch { /* rien */ }
}

async function preparer(store: Store): Promise<MotDefi[]> {
  const jour = todayKey();
  const fin = finDuJour();
  const tous: MotDefi[] = [];
  for (const id of store.installed) {
    try {
      const d = await store.loadDeck(id);
      for (const card of d.cards) {
        const p = d.progress[card.id];
        if (card.fr && estMot(card.en) && estAcquis(p, fin)) tous.push({ deckId: id, card, progress: p });
      }
    } catch { /* paquet illisible : on passe */ }
  }
  const garde = lire();
  if (garde?.jour === jour) {
    const repris = garde.mots
      .map((m) => tous.find((t) => t.deckId === m.d && t.card.id === m.c))
      .filter((m): m is MotDefi => !!m);
    if (repris.length === MOTS_DEFI) return repris;
  }
  const vus = lireVus();
  const choisis = tirerMots(tous, MOTS_DEFI, Math.random, vus);
  if (choisis.length) {
    ecrire({ jour, mots: choisis.map((m) => ({ d: m.deckId, c: m.card.id })) });
    for (const m of choisis) vus[cleMot(m)] = jour;
    ecrireVus(vus);
  }
  return choisis;
}

export function useDefi(store: Store): MotDefi[] | null {
  const [mots, setMots] = useState<MotDefi[] | null>(null);
  const { ready, installed, loadDeck } = store;
  useEffect(() => {
    if (!ready) return undefined;
    let vivant = true;
    const t = window.setTimeout(() => {
      void preparer({ ...store, installed, loadDeck }).then((m) => { if (vivant) setMots(m); });
    }, 2500);
    return () => { vivant = false; window.clearTimeout(t); };
    // Relu quand la collection change, pas à chaque note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, installed, loadDeck]);
  return mots;
}
