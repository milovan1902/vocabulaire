/**
 * Onglet « Mes progrès » : un encart, deux lignes, trois tiroirs.
 *
 * CHANTIER 62 — LA COURBE DES QUATRE PALIERS
 *
 * Le tiroir « Mes mots » porte maintenant l'évolution des paliers, au
 * grain jour, semaine ou mois. Trois décisions s'y lisent, et la première
 * est celle qui a écarté les autres formes :
 *
 * 1. QUATRE LIGNES, PAS CINQ. « À découvrir » compte les mots jamais
 *    présentés — sur un paquet neuf, c'est presque tout. Tracé avec les
 *    autres, il impose une échelle où « à reprendre » (quelques dizaines)
 *    devient une ligne plate collée au filet, et où l'on ne voit plus
 *    rien du travail. Ce n'est pas un progrès mais un stock : la barre
 *    empilée juste au-dessus le montre déjà, et mieux.
 *
 * 2. ON TRACE UN ÉTAT, PAS UN DÉBIT. Chaque point est le dernier relevé
 *    de sa période, jamais une moyenne — la moyenne de 380 et 390 mots
 *    acquis ne veut rien dire (voir `engine/paliers.ts`).
 *
 * 3. LA COURBE MENSUELLE DES MOTS ACQUIS RESTE. Elle porte le passé déjà
 *    noté depuis le chantier 34, que les relevés quotidiens ne peuvent
 *    pas inventer : ils commencent le jour de la livraison. Dans quelques
 *    mois, quand la série quotidienne couvrira le même terrain, elle
 *    pourra partir — mais la retirer aujourd'hui effacerait de l'écran
 *    le seul historique réel.
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
 * `masteryLabel`, comme partout ailleurs.
 *
 * CHANTIER 42 — l'écran prend la forme des Réglages. Trois encarts :
 * « Mes mots », « Mon calendrier », « Mes paquets ». Chacun s'ouvre sur
 * son détail.
 *
 * Une différence avec les Réglages, et elle est volontaire : on vient
 * REGARDER cet écran, pas y agir. Un onglet de progrès entièrement
 * replié ne montrerait plus rien. « Mes mots » garde donc son nombre à
 * l'écran — c'est la raison d'ouvrir l'onglet.
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
import { GRAINS, labelDe, serie, type Grain, type Releve } from '../engine/paliers';
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

/** L'anneau des mots acquis, avec son pourcentage au centre. */
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

/*
 * Les quatre paliers tracés : tous sauf « à découvrir ».
 *
 * Voir l'en-tête du fichier pour le pourquoi. Le nom de la classe de
 * tracé se déduit de celui du statut — `st-acquis` donne `tr-acquis` —
 * afin que `engine/mastery.ts` reste la seule liste des cinq tas. Une
 * deuxième table aurait fini par donner un autre ordre ou une autre
 * couleur, et deux lectures d'un même vert.
 */
const LIGNES = STATUTS.filter((s) => s.cle !== 'decouvrir');

/**
 * L'évolution des paliers, au grain choisi.
 *
 * L'ÉCHELLE NE PART PAS DE ZÉRO EN HAUT : le sommet du cadre est le plus
 * grand des quatre nombres affichés, recalculé à chaque changement de
 * grain. C'est ce qui rend les quatre lignes comparables entre elles —
 * une échelle fixée sur le total des mots les aplatirait toutes.
 */
function CourbePaliers({ releves }: { releves: Releve[] }) {
  const [grain, setGrain] = useState<Grain>('semaine');
  const points = serie(releves, grain);

  /*
   * Le sélecteur n'apparaît qu'une fois deux relevés en magasin. Avant,
   * les trois vues donnent le même point unique : trois boutons qui ne
   * changent rien sont une promesse en trop.
   */
  const choixUtile = releves.length >= 2;

  if (points.length < 2) {
    return (
      <>
        <p className="rayon-label">Où en sont mes mots</p>
        {choixUtile && (
          <div className="themechoix prog-grain">
            {GRAINS.map((g) => (
              <button
                key={g.cle}
                className={grain === g.cle ? 'on' : ''}
                aria-pressed={grain === g.cle}
                onClick={() => setGrain(g.cle)}
              >
                {g.libelle}
              </button>
            ))}
          </div>
        )}
        <div className="prog-courbe attente">
          <p className="hint">
            {choixUtile
              ? 'Pas encore deux relevés à ce grain. Essayez « Jour », ou revenez dans quelques semaines.'
              : 'Le premier relevé est fait. Revenez demain : chaque jour travaillé ajoute une mesure, et la courbe se dessinera d’elle-même.'}
          </p>
        </div>
        <div className="prog-courbe-axe">
          <small>aujourd’hui</small>
          <small>{releves.length} relevé{releves.length > 1 ? 's' : ''}</small>
        </div>
        <p className="hint prog-perim-note">
          Le palier d’un mot dit où il en est, jamais quand il y est arrivé :
          le passé d’avant le premier relevé ne peut pas être reconstitué.
        </p>
      </>
    );
  }

  const max = Math.max(
    1,
    ...points.flatMap((r) => LIGNES.map((s) => r[s.cle])),
  );
  const x = (i: number) => (320 * i) / (points.length - 1);
  const y = (v: number) => 96 - (88 * v) / max;

  const trace = (cle: (typeof LIGNES)[number]['cle']) =>
    points
      .map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r[cle]).toFixed(1)}`)
      .join(' ');

  /*
   * Au plus quatre libellés sous l'axe. La vue « jour » porte jusqu'à
   * trente points : trente dates dans la largeur d'un téléphone se
   * chevauchent et ne se lisent plus. On garde les bornes et deux repères
   * au tiers.
   */
  const indices = points.length <= 4
    ? points.map((_, i) => i)
    : [0, 1, 2, 3].map((k) => Math.round((k * (points.length - 1)) / 3));

  const dernier = points[points.length - 1];

  return (
    <>
      <p className="rayon-label">Où en sont mes mots</p>
      <div className="themechoix prog-grain">
        {GRAINS.map((g) => (
          <button
            key={g.cle}
            className={grain === g.cle ? 'on' : ''}
            aria-pressed={grain === g.cle}
            onClick={() => setGrain(g.cle)}
          >
            {g.libelle}
          </button>
        ))}
      </div>

      <div className="prog-courbe">
        <svg viewBox="0 0 320 100" preserveAspectRatio="none" aria-hidden="true">
          {LIGNES.map((s) => (
            <path
              key={s.cle}
              className={`tr ${s.classe.replace('st-', 'tr-')}`}
              d={trace(s.cle)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {/* Le dernier nombre de la ligne « acquis » : c'est celui qu'on
            vient chercher, et le seul qu'on puisse poser sans encombrer. */}
        <b
          className="prog-courbe-n fin"
          style={{ left: '100%', bottom: `${100 - y(dernier.acquis) + 7}px` }}
        >
          {nb(dernier.acquis)}
        </b>
      </div>
      <div className="prog-courbe-axe">
        {indices.map((i) => (
          <small key={points[i].jour}>{labelDe(points[i].jour, grain)}</small>
        ))}
      </div>

      <span className="statlist">
        {LIGNES.map((s) => (
          <span key={s.cle} className="statline">
            <i className={s.classe} />
            <span>{s.libelle}</span>
            <b>{nb(dernier[s.cle])}</b>
          </span>
        ))}
      </span>

      <p className="hint prog-perim-note">
        Les mots <b>à découvrir</b> ne sont pas tracés : ce sont les mots
        jamais présentés, un stock et non un progrès, et leur nombre écrase
        les quatre autres lignes. La barre plus haut les compte.
      </p>
      <p className="hint">
        La courbe suit tous les paquets, pauses comprises : un mot acquis
        reste acquis. Chaque point est l’état à la fin de sa période, pas une
        moyenne — et un jour sans ouverture ne laisse pas de point.
      </p>
    </>
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
  const serieJours = liveStreak(streak);
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
  const serieDite = serieJours === 0
    ? 'Série à lancer'
    : `${serieJours} jour${serieJours > 1 ? 's' : ''}`;
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

          {/* CHANTIER 62 — l'évolution des quatre paliers. */}
          <div className="prog-perim">
            <CourbePaliers releves={stats.releves} />
          </div>

          {/*
            * La courbe mensuelle des mots acquis, conservée.
            *
            * Elle porte le passé noté depuis le chantier 34, que les relevés
            * quotidiens ne peuvent pas inventer. Le jour où la série
            * quotidienne couvrira le même terrain, ce bloc pourra partir.
            */}
          {points.length >= 2 && (
            <div className="prog-perim">
              <p className="rayon-label">Les mots acquis, mois par mois</p>
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
              <p className="hint prog-perim-note">
                Le relevé mensuel, tenu depuis plus longtemps que celui des
                cinq paliers. Il ne compte que les mots acquis.
              </p>
            </div>
          )}
        </Tiroir>
      )}

      {tiroir === 'calendrier' && (
        <Tiroir titre="Mon calendrier" onFermer={() => setTiroir(null)}>
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
