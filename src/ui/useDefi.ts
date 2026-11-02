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
 * CHANTIER 391 — un débutant qui n'a pas encore 5 mots acquis a quand même
 * son défi : on complète avec ses mots déjà révisés les mieux notés. Il
 * faut seulement 5 mots révisés au moins une fois. Le tirage est relu
 * pendant la journée tant qu'il manque des mots.
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
  /* 391 — les mots déjà révisés mais pas encore acquis, pour un débutant. */
  const secours: MotDefi[] = [];
  for (const id of store.installed) {
    try {
      const d = await store.loadDeck(id);
      for (const card of d.cards) {
        const p = d.progress[card.id];
        if (!card.fr || !estMot(card.en) || !p) continue;
        if (estAcquis(p, fin)) tous.push({ deckId: id, card, progress: p });
        else if (p.reps >= 1) secours.push({ deckId: id, card, progress: p });
      }
    } catch { /* paquet illisible : on passe */ }
  }
  const garde = lire();
  if (garde?.jour === jour) {
    const repris = garde.mots
      .map((m) => tous.find((t) => t.deckId === m.d && t.card.id === m.c)
        ?? secours.find((t) => t.deckId === m.d && t.card.id === m.c))
      .filter((m): m is MotDefi => !!m);
    if (repris.length === MOTS_DEFI) return repris;
  }
  const vus = lireVus();
  let choisis = tirerMots(tous, MOTS_DEFI, Math.random, vus);
  if (!choisis.length && tous.length + secours.length >= MOTS_DEFI) {
    /* 391 — les acquis d'abord, puis les mieux notés (Facile, Bien, Difficile, À revoir). */
    const rang: Record<string, number> = { easy: 3, good: 2, hard: 1, again: 0 };
    const meilleurs = [...secours].sort((x, y) => (rang[y.progress.lastGrade ?? ''] ?? -1) - (rang[x.progress.lastGrade ?? ''] ?? -1)
      || (y.progress.mastery ?? 0) - (x.progress.mastery ?? 0));
    const vivier = [...tous, ...meilleurs.slice(0, Math.max(MOTS_DEFI * 2, MOTS_DEFI - tous.length))];
    choisis = tirerMots(vivier, MOTS_DEFI, Math.random, {});
  }
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
  /* 391 — tant qu'il manque des mots, on relit toutes les 5 cartes notées dans la journée. */
  const cartes = store.streak.counts?.[todayKey()] ?? 0;
  const relance = mots !== null && mots.length === 0 ? Math.floor(cartes / 5) : -1;
  useEffect(() => {
    if (!ready) return undefined;
    let vivant = true;
    const t = window.setTimeout(() => {
      void preparer({ ...store, installed, loadDeck }).then((m) => { if (vivant) setMots(m); });
    }, 2500);
    return () => { vivant = false; window.clearTimeout(t); };
    // Relu quand la collection change, pas à chaque note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, installed, loadDeck, relance]);
  return mots;
}
