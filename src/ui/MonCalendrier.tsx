/**
 * L'écran « Mon calendrier ».
 *
 * CHANTIER 64 — LE CALENDRIER SORT DU TIROIR, ET REMONTE PLUS LOIN
 *
 * Deux changements, et le second est le vrai sujet :
 *
 * 1. C'EST UN ÉCRAN, comme « Mes mots » depuis le chantier 63. Même
 *    chevron de retour au-dessus du titre, même animation d'entrée,
 *    même barre d'onglets qui reste en vue. Le calendrier tenait dans un
 *    tiroir, mais une grille de sept colonnes qu'on parcourt mois après
 *    mois n'est pas une parenthèse : on s'y promène.
 *
 * 2. ON PEUT REMONTER PLUS LOIN. La borne était le mois du PREMIER JOUR
 *    TRAVAILLÉ : sur un compte ouvert en septembre, la flèche gauche
 *    était grise dès le premier clic, et rien ne disait pourquoi. Le
 *    plancher est maintenant de douze mois — ou plus si l'historique est
 *    plus vieux.
 *
 *    Les mois antérieurs au début sont montrés VIDES et le disent en
 *    clair sous la grille. Un mois vide qu'on peut regarder vaut mieux
 *    qu'une flèche grise qui ne s'explique pas : dans le premier cas on
 *    apprend qu'on n'avait pas commencé, dans le second on croit à une
 *    panne.
 *
 * La grille, les trois compteurs et le compte du mois lisent la même
 * liste de dates (`streak.days`) : c'est ce qui rend impossible qu'ils se
 * contredisent.
 */
import { useState } from 'react';
import { todayKey } from '../engine/session';
import type { Streak } from '../engine/streak';
import { firstDay, liveStreak, totalWorked, workedSet } from '../engine/streak';

const MOIS_NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];
/** La semaine commence le lundi : c'est un calendrier français. */
const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Jusqu'où on peut remonter quand l'historique est plus court : onze
 * mois en arrière, soit douze mois consultables avec le mois courant.
 *
 * C'est la même fenêtre que la vue « mois » de la courbe des paliers.
 * Deux écrans qui parlent du passé doivent en montrer autant l'un que
 * l'autre, sinon l'un des deux a l'air amputé.
 */
const RECUL_PLANCHER = 11;

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

export function MonCalendrier({
  streak, onRetour,
}: {
  streak: Streak;
  /** Remonter à « Mes progrès ». */
  onRetour: () => void;
}) {
  const [moisRecule, setMoisRecule] = useState(0);

  const aujourd = todayKey();
  const faits = workedSet(streak);
  const debut = firstDay(streak);
  const serieJours = liveStreak(streak);
  const total = totalWorked(streak);

  /*
   * Deux bornes, et on garde la plus lointaine : le mois du premier jour
   * travaillé, ou onze mois en arrière. Sans la seconde, un compte neuf
   * n'avait aucun passé à consulter.
   */
  const maintenant = new Date();
  const moisDepuisDebut = debut
    ? (maintenant.getFullYear() - Number(debut.slice(0, 4))) * 12
      + (maintenant.getMonth() - (Number(debut.slice(5, 7)) - 1))
    : 0;
  const borne = Math.max(moisDepuisDebut, RECUL_PLANCHER);

  const recul = Math.min(moisRecule, borne);
  const vue = new Date(maintenant.getFullYear(), maintenant.getMonth() - recul, 1);
  const cases = grilleDuMois(vue.getFullYear(), vue.getMonth(), faits, debut, aujourd);
  const faitsDuMois = cases.filter((c) => c.jour !== null && c.fait).length;

  /*
   * Un mois entièrement antérieur au premier jour travaillé. On le dit,
   * plutôt que d'annoncer « 0 jour travaillé » — ce qui se lirait comme
   * un mois raté alors qu'on n'avait pas commencé.
   */
  const finDuMois = todayKey(new Date(vue.getFullYear(), vue.getMonth() + 1, 0));
  const avantDebut = !!debut && finDuMois < debut;

  const moisDit = `${MOIS_NOMS[vue.getMonth()]} ${vue.getFullYear()}`;

  return (
    <section className="sousecran" aria-label="Mon calendrier">
      <button className="sousecran-retour" onClick={onRetour}>
        <span aria-hidden="true">‹</span>
        Mes progrès
      </button>
      <h2 className="screen-title">Mon calendrier</h2>

      <div className="prog-compteurs">
        <span>
          <b>{serieJours}</b>
          <small>jour{serieJours > 1 ? 's' : ''} d’affilée</small>
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
          onClick={() => setMoisRecule((v) => Math.min(v + 1, borne))}
          disabled={recul >= borne}
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <b>{moisDit}</b>
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
        {avantDebut
          ? `Vous n’aviez pas encore commencé en ${MOIS_NOMS[vue.getMonth()]} : votre premier jour travaillé est le ${debut?.slice(8, 10)}/${debut?.slice(5, 7)}/${debut?.slice(0, 4)}.`
          : `${faitsDuMois} jour${faitsDuMois > 1 ? 's' : ''} travaillé${faitsDuMois > 1 ? 's' : ''} en ${MOIS_NOMS[vue.getMonth()]}${debut ? `, ${total} depuis le début` : ''}.`}
      </p>

      {/* Onze clics pour revenir de janvier à décembre : un raccourci,
          et seulement quand on est effectivement parti. */}
      {recul > 0 && (
        <button className="cal-revenir" onClick={() => setMoisRecule(0)}>
          Revenir à ce mois-ci
        </button>
      )}

      <p className="hint prog-perim-note">
        Un jour est marqué dès qu’une carte y a été revue — jamais selon le
        nombre de cartes. Le calendrier n’affirme qu’une chose : vous étiez
        là ce jour-là.
      </p>
    </section>
  );
}
