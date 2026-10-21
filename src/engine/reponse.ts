/**
 * CHANTIER 302 — RÉPONDRE À L'ÉCRIT OU À L'ORAL.
 *
 * La comparaison entre ce que l'élève a écrit (ou dit) et la réponse de la
 * carte. Volontairement tolérante sur la forme, stricte sur le mot :
 *   — majuscules, ponctuation et articles de tête ne comptent pas
 *     (« the », « a », « an », « to » ; « le », « la », « les », « l' »…) ;
 *   — une petite faute de frappe ou un accent oublié passe, signalé en orange ;
 *   — plusieurs réponses séparées par « / », « ; » ou « , » sont toutes acceptées.
 */
import type { ModeReponse } from '../domain/types';

export type { ModeReponse };
export type Verdict = 'juste' | 'faute' | 'faux';
type Langue = 'en' | 'fr';

const ARTICLES: Record<Langue, string[]> = {
  en: ['the', 'a', 'an', 'to'],
  fr: ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'se'],
};

export function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** La forme comparée : minuscules, sans ponctuation ni parenthèses, sans article de tête. */
export function base(t: string, langue: Langue): string {
  let s = t.toLowerCase().replace(/[’`]/g, "'").replace(/\([^)]*\)/g, ' ');
  s = s.replace(/[^a-z0-9à-ÿœæ' -]+/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const mots = s.split(' ').filter(Boolean);
  while (mots.length > 1) {
    const m = mots[0];
    if (ARTICLES[langue].includes(m)) { mots.shift(); continue; }
    if (langue === 'fr' && /^[lds]'./.test(m)) { mots[0] = m.slice(2); continue; }
    break;
  }
  if (langue === 'fr' && mots.length === 1 && /^[lds]'./.test(mots[0])) mots[0] = mots[0].slice(2);
  return mots.join(' ').replace(/'/g, '');
}

function variantes(reponse: string, langue: Langue): string[] {
  return reponse.split(/[\/;,]| or | ou /).map((v) => base(v, langue)).filter(Boolean);
}

/** Une carte-mot (et non une phrase) : trois mots au plus, sans ponctuation de phrase. */
export function estMot(texte: string): boolean {
  if (/[.?!]\s*$/.test(texte.trim())) return false;
  return variantes(texte, 'en').every((v) => v.split(' ').length <= 3);
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}

/** Fautes tolérées selon la longueur du mot : aucune sous 4 lettres, 1 jusqu'à 8, 2 au-delà. */
function tolere(v: string): number {
  return v.length <= 3 ? 0 : v.length <= 8 ? 1 : 2;
}

export function compareEcrit(saisie: string, reponse: string, langue: Langue): Verdict {
  const s = base(saisie, langue);
  if (!s) return 'faux';
  const vs = variantes(reponse, langue);
  if (vs.includes(s)) return 'juste';
  for (const v of vs) {
    if (sansAccents(s) === sansAccents(v)) return 'faute';
    if (distance(sansAccents(s), sansAccents(v)) <= tolere(v)) return 'faute';
  }
  return 'faux';
}

/**
 * À l'oral, l'orthographe n'existe pas : une réponse proche est juste. On
 * accepte aussi la réponse prononcée au milieu d'une phrase (« it's the
 * luggage tag »), parce que le micro entend tout.
 */
export function compareOral(entendu: string, reponse: string, langue: Langue): Verdict {
  const t = sansAccents(base(entendu, langue));
  if (!t) return 'faux';
  for (const v0 of variantes(reponse, langue)) {
    const v = sansAccents(v0);
    if (t === v || ` ${t} `.includes(` ${v} `)) return 'juste';
    if (distance(t, v) <= tolere(v)) return 'juste';
  }
  return 'faux';
}

/** « J'avais juste » : gardé sur l'appareil pour enrichir plus tard les synonymes acceptés. */
export function noteContestation(c: { cardId: string; attendu: string; saisi: string; oral: boolean }): void {
  try {
    const cle = 'vocab-contestations';
    const liste = JSON.parse(localStorage.getItem(cle) ?? '[]') as unknown[];
    liste.push({ ...c, at: Date.now() });
    localStorage.setItem(cle, JSON.stringify(liste.slice(-200)));
  } catch { /* stockage plein ou refusé : sans conséquence */ }
}
