/**
 * Onglet « Mes progrès » : un encart, deux lignes, trois tiroirs.
 *
 * CHANTIER 51 — le tiroir « Mes mots » montre DEUX totaux au lieu d'un.
 * Le nombre unique qu'il affichait s'appelait « mots en jeu » alors qu'il
 * additionnait aussi les paquets en pause — et « Aujourd'hui » emploie les
 * mêmes mots pour les cartes dues du matin. On ne pouvait pas rapprocher
 * les deux écrans sans se tromper.
 *
 * Le tiroir dit maintenant, l'un sous l'autre et avec la même anatomie :
 * ce qui tourne dans la charge de travail d'aujourd'hui, puis tout ce qu'on
 * possède, pauses comprises. Chacun avec son anneau, ses cinq tas et son
 * compte de paquets. Quand rien n'est en pause, les deux coïncident et le
 * second bloc s'efface — un bloc qui répète le précédent n'apprend rien.
 *
 * CHANTIER 44 — correction d'affichage : l'anneau écrivait le
 * pourcentage brut, avec ses dix-sept décimales. Il passe par
 * `masteryLabel`, comme partout ailleurs. Le tiroir ne répète plus ce
 * chiffre à côté de l'anneau, où il faisait doublon.
 *
 * CHANTIER 42 — l'écran prend la forme des Réglages. Trois encarts :
 * « Mes mots », « Mon calendrier », « Mes paquets ». Chacun s'ouvre sur
 * son détail, et rien n'est perdu — les chiffres, le calendrier, la
 * courbe et les barres par paquet sont les blocs d'avant, déplacés.
 *
 * Une différence avec les Réglages, et elle est volontaire : on vient
 * REGARDER cet écran, pas y agir. Un onglet de progrès entièrement
 * replié ne montrerait plus rien. « Mes mots » garde donc son nombre à
 * l'écran — c'est la raison d'ouvrir l'onglet, et le faire payer d'un
 * geste serait absurde. Les deux autres lignes disent leur valeur à
 * droite, comme les Réglages : la série, et le nombre de paquets.
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
import { masteryLabel, STATUTS } from '../engine/mastery';
import {
  dureeLabel, loadProgressStats, type Perimetre, type ProgressStats,
} from './progressStats';
import { Ligne, Tiroir } from './tiroir';

const MOIS_NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];
/** La semaine commence le lundi : c'est un calendrier français. */
const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Périmètre du cercle de rayon 15 dans le repère 36×36 de l'anneau. */
const C = 2 * Math.PI * 15;

/** Quel tiroir est ouvert. Un seul à la fois, et aucun au départ. */
type Tiroirs = null | 'mots' | 'calendrier' | 'paquets';

const nb = (n: number) => n.toLocaleString('fr-FR');

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

/**
 * L'anneau des mots acquis, avec son pourcentage au centre.
 *
 * CHANTIER 44 — il écrivait `{percent} %` : le nombre brut, soit
 * « 0.17421602787456447 % » à l'écran, qui débordait de l'anneau et
 * poussait tout le reste. `masteryLabel` est la fonction que le reste
 * de l'application emploie depuis toujours pour ce même chiffre : elle
 * tronque, garde une décimale sous dix pour cent, et écrit « <0,1 % »
 * plutôt que d'arrondir à zéro un travail commencé.
 */
function Anneau({ percent, taille }: { percent: number; taille: number }) {
  return (
    <span className="progring" style={{ width: taille, height: taille }} aria-hidden="true">
      <svg className="ring" viewBox="0 0 36 36">
        <circle className="ring-bg" cx="18" cy="18" r="15" />
        <circle
          className="ring-fg"
          cx="18" cy="18" r="15"
          strokeDasharray={`${(C * Math.min(percent, 100)) / 100} ${C}`}
        />
      </svg>
      <b>{masteryLabel(percent)}</b>
    </span>
  );
}

/**
 * Un périmètre de mots : son titre, son anneau, ses cinq tas.
 *
 * La barre et la liste des statuts sont celles de « Aujourd'hui », aux
 * mêmes classes et dans le même ordre (`STATUTS`, dans `engine/mastery`) :
 * ce que l'accueil montre pour un paquet, ce bloc le montre pour un
 * ensemble de paquets, et les couleurs veulent dire la même chose.
 */
function BlocMots({ titre, p, note }: { titre: string; p: Perimetre; note: string }) {
  const tas = STATUTS.map((s) => ({ ...s, n: p.tas[s.cle] })).filter((s) => s.n > 0);

  return (
    <div className="prog-perim">
      <p className="rayon-label">{titre}</p>
      <div className="prog-tete">
        <div className="prog-grand">
          <span className="label">Mots acquis</span>
          <b>{nb(p.acquis)}</b>
        </div>
        <Anneau percent={p.percent} taille={58} />
      </div>
      <p className="hint">{note}</p>

      {tas.length > 0 && (
        <>
          <span className="statbar" aria-hidden="true">
            {tas.map((s) => (
              <i key={s.cle} className={s.classe} style={{ width: `${(100 * s.n) / p.mots}%` }} />
            ))}
          </span>
          <span className="statlist">
            {tas.map((s) => (
              <span key={s.cle} className="statline">
                <i className={s.classe} />
                <span>{s.libelle}</span>
                <b>{nb(s.n)}</b>
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  );
}

export function Progress({
  decks, active, settings, streak,
}: {
  /** Les paquets possédés : on rend compte de tout ce qu'on a, pas du seul jeu du jour. */
  decks: Deck[];
  /** Les paquets en jeu, parmi les précédents. Ils font le premier périmètre. */
  active: string[];
  settings: Settings;
  streak: Streak;
}) {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [moisRecule, setMoisRecule] = useState(0);
  const [tiroir, setTiroir] = useState<Tiroirs>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadProgressStats(decks, active, settings);
      if (alive) setStats(s);
    })();
    return () => { alive = false; };
  }, [decks, active, settings]);

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

  /*
   * Ce que les deux lignes affichent à droite. « Série à lancer » est un
   * état, pas un vide : « 0 jour » se lirait comme une panne.
   */
  const serieDite = serie === 0 ? 'Série à lancer' : `${serie} jour${serie > 1 ? 's' : ''}`;
  const paquetsDits = `${stats.rows.length} paquet${stats.rows.length > 1 ? 's' : ''}`;

  const { charge, tout } = stats;
  const enPause = stats.paquetsEnPause > 0;

  /*
   * La phrase sous chaque anneau. Elle dit le périmètre — combien de mots,
   * dans combien de paquets — et non le chiffre de l'anneau, qui est déjà
   * à l'écran juste au-dessus.
   */
  const noteCharge = charge.paquets === 0
    ? 'Aucun paquet en jeu : votre charge de travail est vide. Remettez-en un en jeu depuis l’onglet Paquets.'
    : `Sur ${nb(charge.mots)} mots en jeu, dans ${charge.paquets} paquet${charge.paquets > 1 ? 's' : ''}.`
      + ` ${nb(charge.enCours)} sont en cours d’apprentissage.`;

  const noteTout = `Sur ${nb(tout.mots)} mots au total, dans ${tout.paquets} paquet${tout.paquets > 1 ? 's' : ''}`
    + ` — dont ${nb(stats.motsEnPause)} mots dans ${stats.paquetsEnPause} paquet${stats.paquetsEnPause > 1 ? 's' : ''} en pause.`;

  return (
    <>
      <h2 className="screen-title">Mes progrès</h2>

      <div className="reglist">
        {/* L'encart des mots garde son nombre à l'écran : c'est la
            réponse qu'on venait chercher. Il compte TOUT ce qu'on
            possède — le tiroir sépare ensuite les deux périmètres. */}
        <button className="progmots" onClick={() => setTiroir('mots')}>
          <img src="/ico-mots.png" alt="" width={40} height={40} />
          <span>
            <span className="progmots-nom">Mes mots</span>
            <span className="progmots-ligne">
              <b>{nb(tout.acquis)}</b>
              <small>acquis</small>
            </span>
            <small>
              sur {nb(tout.mots)} mots au total
              {' · '}{nb(tout.enCours)} en cours
            </small>
          </span>
          <Anneau percent={tout.percent} taille={58} />
          <i aria-hidden="true">›</i>
        </button>

        <Ligne
          icone="/ico-calendrier.png"
          titre="Mon calendrier"
          sous="La série, et les jours travaillés."
          valeur={serieDite}
          onClick={() => setTiroir('calendrier')}
        />
        {/* Même icône que l'onglet « Paquets » : c'est la même chose
            qu'on désigne, et deux dessins pour un objet se paieraient. */}
        <Ligne
          icone="/tab-paquets.png"
          titre="Mes paquets"
          sous="Où en est chacun, paquet par paquet."
          valeur={paquetsDits}
          onClick={() => setTiroir('paquets')}
        />
      </div>

      {tiroir === 'mots' && (
        <Tiroir titre="Mes mots" onFermer={() => setTiroir(null)}>
          {/*
            * Les paquets en jeu d'abord : c'est le vocabulaire que la
            * charge d'« Aujourd'hui » fait tourner, donc le seul des deux
            * totaux qu'un travail de la journée peut faire bouger.
            */}
          <BlocMots
            titre={enPause ? 'Dans ma charge de travail' : 'Mes paquets en jeu'}
            p={charge}
            note={noteCharge}
          />

          {enPause ? (
            <BlocMots titre="Tout compris, pauses incluses" p={tout} note={noteTout} />
          ) : (
            <p className="hint prog-perim-note">
              Aucun paquet en pause : votre charge de travail couvre tout
              votre vocabulaire, et ce total est donc le seul.
            </p>
          )}

          <p className="hint prog-perim-note">
            À ne pas confondre avec le nombre de l’onglet « Aujourd’hui » :
            celui-là compte les cartes <b>à revoir ce matin</b>, pas les mots
            travaillés. Il est bien plus petit, et il change chaque jour.
          </p>

          <p className="rayon-label">Les mots acquis, mois par mois</p>
          {points.length < 2 ? (
            <p className="hint">
              Le premier relevé est fait. La courbe se dessinera au fil des
              mois : le palier d’un mot dit où il en est, pas quand il y est
              arrivé — le passé d’avant aujourd’hui ne peut donc pas être
              reconstitué.
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
              {/* La courbe suit le périmètre complet : mettre un paquet en
                  pause ne doit pas faire redescendre un historique. */}
              <p className="hint prog-perim-note">
                La courbe compte tous les paquets, pauses comprises : un mot
                acquis reste acquis.
              </p>
            </>
          )}
        </Tiroir>
      )}

      {tiroir === 'calendrier' && (
        <Tiroir titre="Mon calendrier" onFermer={() => setTiroir(null)}>
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
        </Tiroir>
      )}

      {tiroir === 'paquets' && (
        <Tiroir titre="Mes paquets" onFermer={() => setTiroir(null)}>
          <div className="prog-liste">
            {stats.rows.map((r) => (
              <span key={r.deck.id} className="prog-ligne">
                <span className="prog-ligne-haut">
                  <b>{r.deck.name}</b>
                  {/* La pause se dit ici : sans quoi on cherche pourquoi ce
                      paquet ne bouge plus d'un mois sur l'autre. */}
                  {!r.enJeu && <em>en pause</em>}
                  <small>{nb(r.acquis)} / {nb(r.total)}</small>
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
            {nb(stats.revisions)} cartes revues depuis le
            début, soit environ {dureeLabel(stats.minutes)} de travail. Le temps
            est déduit du nombre de cartes, jamais chronométré.
          </p>
        </Tiroir>
      )}
    </>
  );
}
