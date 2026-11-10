/**
 * CHANTIER 404 — LES CHIFFRES DE L'ÉCRAN « ORAL », À TROIS ÉCHELLES.
 *
 * Jours (14), semaines (12) ou mois (12) : le même calcul, une seule fonction.
 * Les tranches sont construites sur le CALENDRIER (jamais en retirant n × 24 h,
 * que le passage à l'heure d'hiver décale — voir le chantier 363).
 *
 * Tout vient de `parler_seance` (durée, répliques, corrections) et, pour le
 * temps parlé, du compteur du jour (`parler_jour`), qui remonte plus loin que
 * les conversations gardées. Jamais de transcription.
 */

export type Echelle = 'jours' | 'semaines' | 'mois';

/** Combien de tranches pour chaque échelle. */
export const NB: Record<Echelle, number> = { jours: 14, semaines: 12, mois: 12 };

export interface LigneParole {
  finie_le: string;
  secondes: number | null;
  repliques: number | null;
  /** 383 — pour écarter « Comprendre mes phrases » de l'aisance. */
  themes?: string[] | null;
  corrections: unknown[] | null;
}

export interface JourParle { jour: string; secondes: number }

export interface Tranche {
  /** Identifiant calendaire de la tranche (jour, lundi ou mois). */
  cle: string;
  /** Secondes de conversation gardées (sert aux fautes). */
  sec: number;
  fautes: number;
  /** Temps parlé : le compteur du jour s'il est lisible, sinon les conversations gardées. */
  parle: number;
  /** Aisance : répliques et secondes de Discuter et des mises en scène seulement. */
  repAisance: number;
  secAisance: number;
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** Le lundi de la semaine d'une date, à minuit. */
export function lundi(d: Date): number {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.getTime();
}

/** La tranche à laquelle appartient une date, pour une échelle. */
export function cleDe(d: Date, e: Echelle): string {
  if (e === 'jours') return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  if (e === 'semaines') return String(lundi(d));
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
}

/** Les dates de départ des tranches, de la plus ancienne à la courante. */
function departs(e: Echelle, maintenant: Date): Date[] {
  const n = NB[e];
  const a = maintenant.getFullYear();
  const m = maintenant.getMonth();
  const j = maintenant.getDate();
  return Array.from({ length: n }, (_, i) => {
    const k = n - 1 - i;
    if (e === 'jours') return new Date(a, m, j - k);
    if (e === 'semaines') {
      const l = new Date(lundi(maintenant));
      return new Date(l.getFullYear(), l.getMonth(), l.getDate() - k * 7);
    }
    return new Date(a, m - k, 1);
  });
}

/** Le premier jour couvert par l'échelle « mois » (la plus longue), au format AAAA-MM-JJ. */
export function plusAncienJour(maintenant: Date): string {
  const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - (NB.mois - 1), 1);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-01`;
}

export function tranches(
  lignes: LigneParole[],
  parJour: JourParle[] | null,
  e: Echelle,
  maintenant: Date = new Date(),
): Tranche[] {
  const T: Tranche[] = departs(e, maintenant).map((d) => ({
    cle: cleDe(d, e), sec: 0, fautes: 0, parle: 0, repAisance: 0, secAisance: 0,
  }));
  const parCle = new Map(T.map((t) => [t.cle, t]));

  for (const l of lignes) {
    const s = l.secondes ?? 0;
    if (s <= 0) continue;
    const t = parCle.get(cleDe(new Date(l.finie_le), e));
    if (!t) continue;
    t.sec += s;
    t.fautes += (l.corrections ?? []).length;
    if (!(l.themes ?? []).includes('Comprendre mes phrases')) {
      t.secAisance += s;
      t.repAisance += l.repliques ?? 0;
    }
  }

  if (parJour && parJour.length) {
    for (const j of parJour) {
      const t = parCle.get(cleDe(new Date(`${j.jour}T12:00:00`), e));
      if (t) t.parle += j.secondes ?? 0;
    }
  } else {
    for (const t of T) t.parle = t.sec;
  }
  return T;
}

export interface Point { i: number; v: number }

/** Fautes par 10 minutes : une tranche sans au moins une minute parlée ne compte pas. */
export function pointsFautes(T: Tranche[]): Point[] {
  return T.flatMap((t, i) => (t.sec >= 60 ? [{ i, v: (t.fautes * 600) / t.sec }] : []));
}

/** Aisance : répliques par minute, sur au moins une minute de Discuter / mise en scène. */
export function pointsAisance(T: Tranche[]): Point[] {
  return T.flatMap((t, i) => (t.secAisance >= 60 ? [{ i, v: (t.repAisance * 60) / t.secAisance }] : []));
}
