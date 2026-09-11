/**
 * Onglet « Mes progrès ».
 *
 * Ce que l'écran raconte, dans cet ordre : combien de mots sont acquis,
 * depuis combien de temps on s'y tient, quels jours, et où en est chaque
 * paquet. Le total d'abord, le détail ensuite — jamais l'inverse : un
 * écran de chiffres qui commence par le détail ne se lit pas.
 *
 * Tous les chiffres viennent du même endroit (`progressStats`) et le
 * calendrier comme les compteurs lisent la même liste de dates
 * (`streak.days`). C'est ce qui rend impossible qu'ils se contredisent.
 */
import { useEffect, useState } from 'react';
import type { Deck, Settings } from '../domain/types';
import { todayKey } from '../engine/session';
import type { Streak } from '../engine/streak';
import { firstDay, liveStreak, totalWorked, workedSet } from '../engine/streak';
import { courbe, monthLabel } from '../engine/jalons';
import { masteryLabel } from '../engine/mastery';
import { dureeLabel, loadProgressStats, type ProgressStats } from './progressStats';

const MOIS_NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];
/** La semaine commence le lundi : c'est un calendrier français. */
const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Périmètre du cercle de rayon 15 dans le repère 36×36 de l'anneau. */
const C = 2 * Math.PI * 15;

/**
 * Le vert d'une barre d'avancement : clair au départ, profond à l'arrivée.
 *
 * La teinte redit la longueur au lieu de la répéter — à 8 %, un trait court
 * en vert soutenu se lirait comme une réussite. Interpolation en sRGB :
 * suffisante entre deux verts voisins, et sans dépendance.
 */
function vert(t: number): string {
  const a = [169, 220, 194];
  const b = [20, 104, 74];
  const k = Math.min(Math.max(t, 0), 1);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
}

interface Case {
  key: string;
  jour: number | null;
  fait: boolean;
  horsPeriode: boolean;
  aujourdhui: boolean;
}

function grilleDuMois(
  annee: number,
  mois: number,
  faits: Set<string>,
  debut: string | null,
  aujourd: string,
): Case[] {
  const premier = new Date(annee, mois, 1);
  const decalage = (premier.getDay() + 6) % 7;
  const nbJours = new Date(annee, mois + 1, 0).getDate();

  const cases: Case[] = [];
  for (let i = 0; i < decalage; i++) {
    cases.push({ key: `vide-${i}`, jour: null, fait: false, horsPeriode: true, aujourdhui: false });
  }
  for (let d = 1; d <= nbJours; d++) {
    const key = todayKey(new Date(annee, mois, d));
    cases.push({
      key,
      jour: d,
      fait: faits.has(key),
      horsPeriode: key > aujourd || (!!debut && key < debut),
      aujourdhui: key === aujourd,
    });
  }
  return cases;
}

export function Progress({
  decks, settings, streak,
}: {
  /** Les paquets possédés : on rend compte de tout ce qu'on a, pas du seul jeu du jour. */
  decks: Deck[];
  settings: Settings;
  streak: Streak;
}) {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [moisRecule, setMoisRecule] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadProgressStats(decks, settings);
      if (alive) setStats(s);
    })();
    return () => { alive = false; };
  }, [decks, settings]);

  if (!stats) return <p className="lead">Chargement…</p>;

  const aujourd = todayKey();
  const faits = workedSet(streak);
  const debut = firstDay(streak);
  const serie = liveStreak(streak);
  const total = totalWorked(streak);

  /* Jusqu'où on peut remonter : le mois du premier jour travaillé. */
  const maintenant = new Date();
  const moisMin = debut
    ? (maintenant.getFullYear() - Number(debut.slice(0, 4))) * 12
      + (maintenant.getMonth() - (Number(debut.slice(5, 7)) - 1))
    : 0;
  const recul = Math.min(moisRecule, Math.max(moisMin, 0));
  const vue = new Date(maintenant.getFullYear(), maintenant.getMonth() - recul, 1);
  const cases = grilleDuMois(vue.getFullYear(), vue.getMonth(), faits, debut, aujourd);
  const faitsDuMois = cases.filter((c) => c.jour !== null && c.fait).length;

  const points = courbe(stats.jalons);
  const maxCourbe = Math.max(...points.map((p) => p.acquis), 1);
  const xy = points.map((p, i) => ({
    ...p,
    x: points.length > 1 ? (320 * i) / (points.length - 1) : 160,
    y: 96 - (88 * p.acquis) / maxCourbe,
  }));
  const trace = xy.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <>
      <h2 className="screen-title">Mes progrès</h2>

      <div className="prog-tete">
        <div className="prog-grand">
          <span className="label">Mots acquis</span>
          <b>{stats.acquis}</b>
        </div>
        <span className="prog-anneau" aria-hidden="true">
          <svg className="ring" viewBox="0 0 36 36">
            <circle className="ring-bg" cx="18" cy="18" r="15" />
            <circle
              className="ring-fg"
              cx="18" cy="18" r="15"
              strokeDasharray={`${(C * Math.min(stats.percent, 100)) / 100} ${C}`}
            />
          </svg>
          <b>{masteryLabel(stats.percent)}</b>
        </span>
      </div>
      <p className="hint">
        Sur {stats.motsEnJeu.toLocaleString('fr-FR')} mots en jeu.
        {' '}{stats.enCours} sont en cours d’apprentissage.
      </p>

      <div className="prog-compteurs">
        <span>
          <b>{serie}</b>
          <small>jour{serie > 1 ? 's' : ''} d’affilée</small>
        </span>
        <span>
          <b>{streak.best}</b>
          <small>meilleure série</small>
        </span>
        <span>
          <b>{total}</b>
          <small>jours travaillés</small>
        </span>
      </div>

      <div className="prog-moisbar">
        <button
          className="btn-rond"
          onClick={() => setMoisRecule((v) => Math.min(v + 1, Math.max(moisMin, 0)))}
          disabled={recul >= moisMin}
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <b>{MOIS_NOMS[vue.getMonth()]} {vue.getFullYear()}</b>
        <button
          className="btn-rond"
          onClick={() => setMoisRecule((v) => Math.max(0, v - 1))}
          disabled={recul === 0}
          aria-label="Mois suivant"
        >
          ›
        </button>
      </div>

      <div className="prog-cal">
        {JOURS_COURTS.map((j, i) => (
          <small key={i} className="prog-cal-head">{j}</small>
        ))}
        {cases.map((c) => (
          <span
            key={c.key}
            className={
              'prog-jour'
              + (c.jour === null ? ' vide' : '')
              + (c.fait ? ' on' : '')
              + (c.horsPeriode && !c.fait ? ' hors' : '')
              + (c.aujourdhui ? ' now' : '')
            }
          >
            {c.jour ?? ''}
          </span>
        ))}
      </div>
      <p className="hint">
        {faitsDuMois} jour{faitsDuMois > 1 ? 's' : ''} travaillé{faitsDuMois > 1 ? 's' : ''}
        {' '}en {MOIS_NOMS[vue.getMonth()]}
        {debut ? `, ${total} depuis le début` : ''}.
      </p>

      <p className="rayon-label">Les mots acquis, mois par mois</p>
      {points.length < 2 ? (
        <p className="hint">
          Le premier relevé est fait. La courbe se dessinera au fil des mois :
          le palier d’un mot dit où il en est, pas quand il y est arrivé — le
          passé d’avant aujourd’hui ne peut donc pas être reconstitué.
        </p>
      ) : (
        <>
          <div className="prog-courbe">
            <svg viewBox="0 0 320 100" preserveAspectRatio="none" aria-hidden="true">
              <path d={`${trace} L320 96 L0 96 Z`} className="aire" />
              <path d={trace} className="trait" vectorEffect="non-scaling-stroke" />
            </svg>
            {xy.map((p) => (
              <b
                key={p.month}
                className="prog-courbe-n"
                style={{
                  left: `${Math.min(94, Math.max(6, (100 * p.x) / 320))}%`,
                  bottom: `${100 - p.y + 7}px`,
                }}
              >
                {p.acquis}
              </b>
            ))}
          </div>
          <div className="prog-courbe-axe">
            {xy.map((p) => <small key={p.month}>{monthLabel(p.month)}</small>)}
          </div>
        </>
      )}

      <p className="rayon-label">Paquet par paquet</p>
      <div className="prog-liste">
        {stats.rows.map((r) => (
          <span key={r.deck.id} className="prog-ligne">
            <span className="prog-ligne-haut">
              <b>{r.deck.name}</b>
              <small>{r.acquis} / {r.total}</small>
            </span>
            <span className="prog-barre">
              <i
                style={{
                  width: `${Math.max(1.5, r.percent)}%`,
                  background: `linear-gradient(90deg, #a9dcc2, ${vert(r.percent / 60)})`,
                }}
              />
            </span>
          </span>
        ))}
      </div>

      <p className="hint prog-pied">
        {stats.revisions.toLocaleString('fr-FR')} cartes revues depuis le début,
        soit environ {dureeLabel(stats.minutes)} de travail. Le temps est
        déduit du nombre de cartes, jamais chronométré.
      </p>
    </>
  );
}
