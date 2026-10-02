/**
 * Écran d'entrée : ce qu'il y a à faire aujourd'hui.
 *
 * Ne regarde que les paquets *en jeu*. Un paquet possédé mais en pause n'a
 * rien à faire ici : c'est tout l'intérêt de la pause.
 *
 * L'écran ne choisit plus à votre place. Il posait autrefois « la pioche du
 * jour » — le paquet le plus en retard, mis en avant d'office. Le premier
 * geste de la journée était donc de défaire ce choix, et un écran qui
 * s'ouvre sur une proposition qu'on refuse a perdu son ouverture. Les
 * paquets arrivent maintenant à égalité ; le bouton de révision n'existe
 * pas tant qu'aucun n'est choisi.
 *
 * CHANTIER 51 — le grand nombre disait « cartes en jeu ». « Mes progrès »
 * emploie les mêmes mots pour un tout autre chiffre : les mots travaillés,
 * dix ou vingt fois plus nombreux. Deux sens pour une expression, dans deux
 * onglets voisins — l'écart passait pour une erreur de calcul alors qu'il
 * n'était qu'une erreur de vocabulaire. Ici, c'est « à revoir » : ce qui est
 * dû ce matin, et rien d'autre.
 */
import { useEffect, useState } from 'react';
import type { Deck, Settings } from '../domain/types';
import { loadSummaries, type DeckSummary } from './deckSummary';
import { DeckFace, DeckVign } from './components';
import { masteryLabel, STATUTS } from '../engine/mastery';
import type { Streak } from '../engine/streak';
import { doneToday, lastSeven, liveStreak, shiftDay } from '../engine/streak';
import { todayKey } from '../engine/session';
import { budgetParler, quandDit, type Budget } from '../data/parler';
import { minutesPour } from '../engine/tempo';
import { niveauDe } from '../engine/niveau';
import { CARTES_PAR_JOUR, cartesDuJour, gainDuJour, serieValidee, xpTotal } from '../engine/xp';
import { estLudique, useStyle } from './useStyle';
import { Eventail } from './Eventail';

const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

/*
 * CHANTIER 166 — l'assiduité du style Lycée : la semaine du CALENDRIER
 * (lundi → aujourd'hui), contre un objectif de cinq jours. Cinq et non
 * sept : deux jours de repos par semaine ne sont pas un échec.
 */
const OBJECTIF_SEMAINE = 5;

function joursCetteSemaine(s: Streak): number {
  const auj = todayKey();
  const depuisLundi = (new Date().getDay() + 6) % 7;
  const faits = new Set(s.days);
  let n = 0;
  for (let i = 0; i <= depuisLundi; i++) if (faits.has(shiftDay(auj, -i))) n++;
  return n;
}

/**
 * Le choix du jour.
 *
 * Il se garde jusqu'à minuit, pas au-delà : revenir sur l'onglet dix
 * minutes plus tard doit retrouver son paquet, mais le lendemain matin
 * l'écran doit reposer la question. Un choix d'hier qui survit à la nuit
 * redevient une pioche imposée, c'est-à-dire exactement ce qu'on retire.
 *
 * La date est enregistrée avec l'identifiant plutôt que comparée à une
 * péremption : c'est la seule façon d'être juste quand l'application reste
 * ouverte pendant le changement de jour.
 */
const CLE_CHOIX = 'aujourdhui-paquet-choisi';

function jourCourant(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function lireChoix(): string | null {
  try {
    const brut = window.localStorage.getItem(CLE_CHOIX);
    if (!brut) return null;
    const v = JSON.parse(brut) as { id?: string; jour?: string };
    if (v?.id && v.jour === jourCourant()) return v.id;
    window.localStorage.removeItem(CLE_CHOIX);
    return null;
  } catch {
    // Stockage indisponible : l'écran nu est un repli correct.
    return null;
  }
}

function ecrireChoix(id: string | null) {
  try {
    if (id) {
      window.localStorage.setItem(CLE_CHOIX, JSON.stringify({ id, jour: jourCourant() }));
    } else {
      window.localStorage.removeItem(CLE_CHOIX);
    }
  } catch {
    // Le choix vaut alors pour la session, à défaut de la journée.
  }
}

/**
 * Ce que dit la ligne sous le nom d'un paquet.
 *
 * CHANTIER 51 — elle annonçait le paquet ENTIER (« 12 thèmes sur 30 · 420
 * mots ») alors que le travail ne porte que sur les thèmes retenus. Le
 * nombre de mots suit maintenant le même périmètre que la charge et que
 * « Mes progrès » : les trois écrans comptent enfin la même chose.
 */
function sousTitre(r: DeckSummary): string {
  return r.themesSelected < r.themesTotal
    ? `${r.themesSelected} thèmes sur ${r.themesTotal} · ${r.enJeu} mots en jeu`
    : `${r.themesTotal} thèmes · ${r.total} mots`;
}

/** CHANTIER 171 — la fusée (Lucide « rocket ») de l'apparence Décollage. */
function Fusee() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

export function Today({
  decks, active, settings, streak, onReview, onOpen, onManage, onCalendrier, onParler,
}: {
  decks: Deck[];
  /** Paquets en jeu. */
  active: string[];
  settings: Settings;
  streak: Streak;
  onReview: (id: string) => void;
  onOpen: (id: string) => void;
  /** Vers « Mon travail », quand rien n'est en jeu. */
  onManage: () => void;
  /** CHANTIER 166 — « Cette semaine » ouvre Mon calendrier. */
  onCalendrier: () => void;
  /** CHANTIER 166 — « Parler » ouvre l'onglet Parler. */
  onParler: () => void;
}) {
  const [rows, setRows] = useState<DeckSummary[] | null>(null);
  const [dueByDay, setDueByDay] = useState<number[]>([]);
  const [resting, setResting] = useState(0);
  const [choisi, setChoisi] = useState<string | null>(() => lireChoix());
  /* CHANTIER 165 — style Lycée : la forme de l'écran change, pas seulement ses couleurs. */
  const style = useStyle();
  /* CHANTIER 166 — le temps de parole : undefined = en cours de lecture,
     null = sans compte, 'erreur' = service injoignable (hors ligne…). */
  const [budget, setBudget] = useState<Budget | null | 'erreur' | undefined>(undefined);

  useEffect(() => {
    if (!estLudique(style)) return;
    let alive = true;
    budgetParler()
      .then((b) => { if (alive) setBudget(b); })
      .catch(() => { if (alive) setBudget('erreur'); });
    return () => { alive = false; };
  }, [style]);



  useEffect(() => {
    let alive = true;
    (async () => {
      const enJeu = decks.filter((d) => active.includes(d.id));
      const charge = await loadSummaries(enJeu, settings);
      if (!alive) return;
      setRows(charge.summaries);
      setDueByDay(charge.dueByDay);
      setResting(charge.resting);
    })();
    return () => { alive = false; };
  }, [decks, active, settings]);

  function choisir(id: string | null) {
    setChoisi(id);
    ecrireChoix(id);
  }

  if (!rows) return <p className="lead">Chargement…</p>;

  const aFaire = [...rows].filter((r) => r.due > 0).sort((a, b) => b.due - a.due);
  const total = aFaire.reduce((n, r) => n + r.due, 0);

  /*
   * Un choix de la veille peut porter sur un paquet mis en pause depuis, ou
   * déjà terminé pour aujourd'hui. On ne le rend pas : la liste ferait
   * autorité contre l'écran, et l'écran perdrait.
   */
  const enAvant = aFaire.find((r) => r.deck.id === choisi) ?? null;
  const suite = aFaire.filter((r) => r.deck.id !== enAvant?.deck.id);

  const serie = liveStreak(streak);
  const faitAujourdhui = doneToday(streak);
  const semaine = lastSeven(streak);
  /* Série en jeu : elle existe, elle n'est pas encore assurée, et il reste
     du travail pour la sauver. Sans ces trois conditions, se taire. */
  const serieEnJeu = serie > 0 && !faitAujourdhui && total > 0;
  /* CHANTIER 168 — la journée qui rapporte des XP : 20 cartes notées. */
  const cartesAuj = cartesDuJour(streak);
  const gain = gainDuJour(streak);
  const manque = Math.max(0, CARTES_PAR_JOUR - cartesAuj);
  const ligneXp = gain.valide
    ? `Journée validée : +${gain.xp} XP.`
    : `${cartesAuj} / ${CARTES_PAR_JOUR} cartes aujourd’hui — +${gain.xp} XP à la clé.`;

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  /** La ligne de liste, identique à celle de « Mon travail ». */
  function ligne(r: DeckSummary) {
    return (
      <div key={r.deck.id} className="workrow">
        <button className="workrow-main" onClick={() => choisir(r.deck.id)}>
          <span className="vign-wrap">
            {/*
              * CHANTIER 100 — `categoryId` : le parchemin du rayon.
              *
              * Troisième recours de `papierExplicite`, après `PAR_ID` et
              * `PAR_NOM` : aucune carte déjà décidée ne change. Ce qu'il
              * corrige, c'est le paquet ABSENT des deux tables, qui tirait
              * jusqu'ici une des six couleurs franches au hasard de son
              * identifiant — la panne des cinq paquets de fin de 4e.
              *
              * Cette ligne et celle de `carteEnAvant` VONT ENSEMBLE. N'en
              * corriger qu'une laisserait le paquet mis en avant sur sa
              * couleur franche pendant que sa propre ligne en liste serait
              * sur parchemin, dans le même écran.
              */}
            <DeckVign
              id={r.deck.id}
              name={r.deck.name}
              image={r.image}
              w={54}
              h={76}
              categoryId={r.deck.categoryId}
            />
            {(r.deck.classeFrom || r.deck.sansCategorie) && <span className="classdot">{r.deck.classeFrom ?? 'SC'}</span>}
          </span>
          <span className="workrow-txt">
            <b>{r.deck.name}</b>
            <small>{sousTitre(r)}</small>
          </span>
        </button>
        <span className="due">{r.due}</span>
      </div>
    );
  }

  /** Le paquet mis en avant : le seul endroit d'où l'on peut travailler. */
  function carteEnAvant(r: DeckSummary) {
    const b = r.mastery.breakdown;
    const tas = STATUTS
      .map((s) => ({ ...s, n: b[s.cle] }))
      .filter((s) => s.n > 0);
    // Périmètre du cercle de rayon 15 dans le repère 36×36 du SVG.
    const C = 2 * Math.PI * 15;

    return (
      <div className="avant">
        <button className="avant-haut" onClick={() => onOpen(r.deck.id)}>
          {/*
            * La pastille est SŒUR du cadre, pas fille : le cadre masque ce
            * qui dépasse de lui — c'est ce qui tient l'illustration dans le
            * filet — et une pastille posée à cheval sur son bord y serait
            * rognée.
            */}
          <span className="avant-vign-wrap">
            <span className="avant-vign">
              {/* CHANTIER 100 — le pendant de la ligne de liste ; voir la
                  note dans `ligne()`. Les deux se corrigent ensemble. */}
              <DeckFace
                id={r.deck.id}
                name={r.deck.name}
                image={r.image}
                categoryId={r.deck.categoryId}
              />
            </span>
            {/*
              * La classe plancher, comme sur les lignes de la liste.
              *
              * Elle manquait ici : la pastille du nombre de cartes dues avait
              * pris seule le chemin hors du cadre au chantier 26, et le paquet
              * choisi perdait donc son niveau au moment précis où on le
              * regarde le plus. Les deux pastilles tiennent ensemble — l'une
              * au coin haut, l'autre au bord bas.
              */}
            {(r.deck.classeFrom || r.deck.sansCategorie) && (
              <span className="classdot classdot-lg">{r.deck.classeFrom ?? 'SC'}</span>
            )}
            <span className="pioche-due">{r.due}</span>
          </span>
          <span className="avant-txt">
            <b>{r.deck.name}</b>
            <small>{sousTitre(r)}</small>
            <span className="avant-avanc">
              <span className="avant-anneau" aria-hidden="true">
                <svg className="ring" viewBox="0 0 36 36">
                  <circle className="ring-bg" cx="18" cy="18" r="15" />
                  <circle
                    className="ring-fg"
                    cx="18" cy="18" r="15"
                    strokeDasharray={`${(C * Math.min(r.mastery.percent, 100)) / 100} ${C}`}
                  />
                </svg>
              </span>
              <span className="avant-pct">
                <b>{masteryLabel(r.mastery.percent)}</b>
                <small>d’avancement</small>
              </span>
            </span>
          </span>
        </button>

        {tas.length > 0 && (
          <>
            <span className="statbar" aria-hidden="true">
              {tas.map((s) => (
                <i
                  key={s.cle}
                  className={s.classe}
                  style={{ width: `${(100 * s.n) / r.mastery.counted}%` }}
                />
              ))}
            </span>
            <span className="statlist">
              {tas.map((s) => (
                <span key={s.cle} className="statline">
                  <i className={s.classe} />
                  <span>{s.libelle}</span>
                  <b>{s.n}</b>
                </span>
              ))}
            </span>
          </>
        )}

        <button className="btn" onClick={() => onReview(r.deck.id)}>
          Réviser {Math.min(r.due, settings.cardsPerSession)} cartes
        </button>
        <button className="btn ghost" onClick={() => choisir(null)}>
          Choisir un autre paquet
        </button>
      </div>
    );
  }

  /*
   * CHANTIER 165 — L'ÉCRAN « AUJOURD'HUI » DU STYLE LYCÉE.
   *
   * Seulement quand il y a du travail : une journée faite, ou sans paquet,
   * garde l'écran ordinaire (habillé par lycee.css). L'éventail ne montre
   * que les paquets qui ont des cartes dues ; celui du centre est le paquet
   * choisi, et c'est lui que le bouton lance.
   */
  if (estLudique(style) && total > 0) {
    const iCentre = Math.max(0, aFaire.findIndex((r) => r.deck.id === choisi));
    const pc = aFaire[iCentre];
    const n = niveauDe(xpTotal(streak));
    const flamme = serieValidee(streak);
    const fr = (v: number) => v.toLocaleString('fr-FR');
    const faits = joursCetteSemaine(streak);
    /* CHANTIER 171 — les mots changent avec l'apparence, la forme reste. */
    const mots = style === 'decollage'
      ? { defi: 'Mission du jour', go: 'Décoller', jour: `carburant ${cartesAuj} / ${CARTES_PAR_JOUR}` }
      : style === 'tableau'
        ? { defi: 'Au tableau aujourd’hui', go: 'Réviser', jour: `${cartesAuj} / ${CARTES_PAR_JOUR} cartes pour gagner tes XP` }
      : style === 'orbite'
        ? { defi: 'Exploration du jour', go: 'C’est parti', jour: `${cartesAuj} / ${CARTES_PAR_JOUR} cartes pour gagner tes XP` }
        : { defi: 'Défi du jour', go: 'C’est parti', jour: `${cartesAuj} / ${CARTES_PAR_JOUR} cartes pour gagner tes XP` };
    let parlerN = '…';
    let parlerSous = '';
    if (budget === null) { parlerN = 'Parler'; parlerSous = 'connecte-toi pour commencer'; }
    else if (budget === 'erreur') { parlerN = '—'; parlerSous = 'indisponible pour l’instant'; }
    else if (budget) {
      const m = Math.max(0, Math.floor(budget.minutes));
      parlerN = `${m} min`;
      parlerSous = budget.pause
        ? 'en pause jusqu’au 1er du mois'
        : m === 0 || budget.fini
          ? (budget.periode === 'semaine' ? 'reviennent lundi' : 'reviennent à minuit')
          : `restante${m > 1 ? 's' : ''} ${quandDit(budget)}`;
    }
    return (
      <div className="today ly">
        {/* CHANTIER 173 — Tableau : la date écrite à la craie et la série, en tête. */}
        {style === 'tableau' && (
          <div className="today-head">
            <p className="today-date">{date}</p>
            {serie > 0 && <span className="serie-count">{serie} jour{serie > 1 ? 's' : ''} d’affilée</span>}
          </div>
        )}
        <div className="ly-haut">
          <span className="ly-niv" aria-hidden="true"><small>NIV.</small><b>{n.niveau}</b></span>
          <span className="ly-xp">
            <span className="ly-xp-txt">
              <b>Niveau {n.niveau}</b>
              <span>{fr(n.dansNiveau)} / {fr(n.pourNiveau)} XP</span>
            </span>
            <span className="ly-barre"><i style={{ width: `${Math.round((100 * n.dansNiveau) / n.pourNiveau)}%` }} /></span>
          </span>
          <span className="ly-flamme" aria-label={`Série : ${flamme} jour${flamme > 1 ? 's' : ''} à ${CARTES_PAR_JOUR} cartes`}>
            {style === 'decollage' ? <Fusee /> : style === 'orbite' ? (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            )}
            <b>{flamme}</b>
          </span>
        </div>

        {style === 'tableau' && (
          <div className="serie7" aria-label={`Série : ${serie} jours`}>
            {semaine.map((j, i) => {
              const nom = JOURS[new Date(j.key + 'T12:00:00').getDay()];
              return (
                <span key={j.key} className={`serie7-j${j.done ? ' on' : ''}${i === 6 ? ' auj' : ''}`} aria-current={i === 6 ? 'date' : undefined}>
                  <small>{nom.charAt(0).toUpperCase()}</small>
                  <i>{j.done ? '✓' : ''}</i>
                </span>
              );
            })}
          </div>
        )}

        <div className="ly-defi">
          <div className="ly-defi-haut">
            <span>{mots.defi}</span>
            <span className="ly-gain">{gain.valide ? `+${gain.xp} XP ✓` : `+${gain.xp} XP`}</span>
          </div>
          <b className="ly-defi-n">{total} carte{total > 1 ? 's' : ''}</b>
          <span className="ly-defi-sous">
            Environ {minutesPour(total)} min · {aFaire.length} paquet{aFaire.length > 1 ? 's' : ''}
          </span>
          <span className="ly-defi-jour">
            <span className="ly-barre"><i style={{ width: `${Math.min(100, (100 * cartesAuj) / CARTES_PAR_JOUR)}%` }} /></span>
            <span>{gain.valide ? 'Journée validée' : mots.jour}</span>
          </span>
        </div>

        <div className="ly-scene">
          <Eventail
            paquets={aFaire}
            centre={iCentre}
            forme={style === 'orbite' ? 'orbite' : 'eventail'}
            onCentre={(i) => choisir(aFaire[i].deck.id)}
            onOuvrir={(i) => onOpen(aFaire[i].deck.id)}
          />
          {/* CHANTIER 171 — Décollage : une fusée de chaque côté pour changer de paquet.
              CHANTIER 173 — Tableau : une craie. */}
          {(style === 'decollage' || style === 'tableau') && aFaire.length > 1 && (
            <>
              <button
                className="ly-fusee prec"
                aria-label="Paquet précédent"
                disabled={iCentre === 0}
                onClick={() => choisir(aFaire[iCentre - 1].deck.id)}
              >{style === 'tableau' ? <i className="craie-baton" /> : <Fusee />}</button>
              <button
                className="ly-fusee suiv"
                aria-label="Paquet suivant"
                disabled={iCentre === aFaire.length - 1}
                onClick={() => choisir(aFaire[iCentre + 1].deck.id)}
              >{style === 'tableau' ? <i className="craie-baton" /> : <Fusee />}</button>
            </>
          )}
        </div>
        <div className="ly-points" aria-hidden="true">
          {aFaire.map((r, i) => <i key={r.deck.id} className={i === iCentre ? 'on' : ''} />)}
        </div>
        <p className="ly-nom">{pc.deck.name} <span>· {masteryLabel(pc.mastery.percent)}</span></p>

        <button className="btn ly-go" onClick={() => onReview(pc.deck.id)}>
          {mots.go} · {Math.min(pc.due, settings.cardsPerSession)} cartes
        </button>

        {/* CHANTIER 166 — deux tuiles : l'assiduité ouvre le calendrier,
            le temps de parole ouvre l'onglet Parler. */}
        <div className="ly-bas">
          <button className="ly-tuile" onClick={onCalendrier}>
            <span className="ly-tuile-haut"><span>Cette semaine</span></span>
            <b>{faits > OBJECTIF_SEMAINE ? `${faits} jours` : `${faits} / ${OBJECTIF_SEMAINE} jours`}</b>
            <span className="ly-segments" aria-hidden="true">
              {Array.from({ length: OBJECTIF_SEMAINE }, (_, i) => <i key={i} className={i < faits ? 'on' : ''} />)}
            </span>
          </button>
          <button className="ly-tuile" onClick={onParler}>
            <span className="ly-tuile-haut">
              <span>Parler</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </span>
            <b>{parlerN}</b>
            <small>{parlerSous}</small>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="today">
      <div className="today-head">
        <p className="today-date">{date}</p>
        {serie > 0 && (
          <span className="serie-count">
            {serie} jour{serie > 1 ? 's' : ''} d’affilée
          </span>
        )}
      </div>

      {/*
        * CHANTIER 161 — la semaine en sept pastilles, avec l'initiale du
        * jour. Un jour fait porte une coche ; aujourd'hui, s'il reste à
        * faire, est un cercle en pointillé. Les sept traits de 5 px ne se
        * voyaient pas.
        */}
      <div className="serie7" aria-label={`Série : ${serie} jours`}>
        {semaine.map((j, i) => {
          const nom = JOURS[new Date(j.key + 'T12:00:00').getDay()];
          return (
            <span
              key={j.key}
              className={`serie7-j${j.done ? ' on' : ''}${i === 6 ? ' auj' : ''}`}
              title={`${nom} ${j.key.slice(8)}`}
              aria-current={i === 6 ? 'date' : undefined}
            >
              <small>{nom.charAt(0).toUpperCase()}</small>
              <i>
                {j.done && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </i>
            </span>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <>
          <div className="today-count">
            <b>0</b>
            <span>carte<br />à revoir</span>
          </div>
          <p className="hint">
            Aucun paquet en jeu. Choisis ceux sur lesquels tu veux
            travailler ; leur charge apparaîtra ici.
          </p>
          <button className="btn" onClick={onManage}>Mettre un paquet en jeu</button>
        </>
      ) : total === 0 ? (
        <>
          <div className="today-count">
            <b>0</b>
            <span>carte<br />à revoir</span>
          </div>
          <p className="hint">
            {faitAujourdhui
              ? 'Journée faite. Les mots revus reviendront à leur date, pas avant.'
              : 'Tout est à jour. Les mots déjà appris reviendront d’eux-mêmes, au moment où ils commencent à s’effacer.'}
          </p>
          {/* CHANTIER 168 — moins de 20 cartes dues : on peut aller chercher
              des mots nouveaux pour valider la journée. */}
          {gain.valide ? (
            <p className="today-xp">{ligneXp}</p>
          ) : (
            <p className="today-xp">
              {cartesAuj} / {CARTES_PAR_JOUR} cartes aujourd’hui. Pour gagner
              tes {gain.xp} XP, ouvre un paquet et choisis « Continuer quand
              même » : encore {manque} carte{manque > 1 ? 's' : ''}.
            </p>
          )}
        </>
      ) : (
        <>
          {/*
            * « à revoir » : les cartes dues ce matin, sur les paquets en jeu
            * et les thèmes retenus. Ce n'est pas une dette — elles sont là
            * parce qu'elles commencent à s'effacer — mais c'est bien un
            * travail du jour, et non l'étendue du vocabulaire. « Mes
            * progrès » compte celle-là, et dit « mots », jamais « cartes ».
            */}
          <div className="today-count">
            <b>{total}</b>
            <span>carte{total > 1 ? 's' : ''}<br />à revoir</span>
          </div>
          <p className="today-est">
            {aFaire.length > 1 ? `Répartis sur ${aFaire.length} paquets. ` : ''}
            {/* CHANTIER 50 — `total / 3` valait bien vingt secondes par
                carte, mais rien ne le disait : le jour où la constante
                bouge, cette ligne serait restée seule en arrière. */}
            Environ {minutesPour(total)} minutes.
          </p>
          <p className="today-xp">{ligneXp}</p>

          {serieEnJeu && (
            <p className="serie-alerte">
              Ta série de {serie} jour{serie > 1 ? 's' : ''} tient à une
              révision aujourd’hui.
            </p>
          )}

          {enAvant && carteEnAvant(enAvant)}

          {suite.length > 0 && (
            <>
              <p className="rayon-label">
                {enAvant ? 'Les autres paquets' : 'Sur quoi tu travailles ?'}
              </p>
              <div className="worklist todaylist">
                {suite.map(ligne)}
              </div>
            </>
          )}
        </>
      )}

      {dueByDay.some((n) => n > 0) && (
        <div className="memoire">
          <p className="label">Les sept prochains jours</p>
          <div className="bars">
            {dueByDay.map((_, i) => {
              /*
               * CHANTIER 112 — aujourd'hui compte ce que la séance montrera (le
               * chiffre du haut), pas tous les mots jamais vus. Et l'échelle est
               * en racine carrée : 80 contre 5 écrasait les six autres jours en
               * traits plats. L'ordre des barres reste juste, le chiffre au-dessus
               * donne la valeur exacte.
               */
              const jours = dueByDay.map((v, k) => (k === 0 ? Math.min(v, total) : v));
              const n = jours[i];
              const max = Math.sqrt(Math.max(...jours, 1));
              const jour = new Date();
              jour.setDate(jour.getDate() + i);
              return (
                <span key={i} className={`bar${i === 0 ? ' now' : ''}`}>
                  <b className="bar-n">{n > 0 ? n : ''}</b>
                  <i style={{ height: `${n > 0 ? Math.max(6, (100 * Math.sqrt(n)) / max) : 3}%` }} />
                  <em>{JOURS[jour.getDay()]}</em>
                </span>
              );
            })}
          </div>
          <p className="hint">
            {resting} mot{resting > 1 ? 's' : ''} dorment en mémoire. Ils
            reviendront à leur date, pas avant.
          </p>
        </div>
      )}
    </div>
  );
}
