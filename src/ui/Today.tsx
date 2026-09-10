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
 */
import { useEffect, useState } from 'react';
import type { Deck, Settings } from '../domain/types';
import { loadSummaries, type DeckSummary } from './deckSummary';
import { DeckFace, DeckVign } from './components';
import { masteryLabel } from '../engine/mastery';
import type { Streak } from '../engine/streak';
import { doneToday, lastSeven, liveStreak } from '../engine/streak';

const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

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

/** L'ordre est celui du trajet d'un mot, pas celui de son importance. */
const STATUTS = [
  { cle: 'decouvrir', libelle: 'À découvrir', classe: 'st-decouvrir' },
  { cle: 'reprendre', libelle: 'À reprendre', classe: 'st-reprendre' },
  { cle: 'cours', libelle: 'En cours', classe: 'st-cours' },
  { cle: 'presque', libelle: 'Presque acquis', classe: 'st-presque' },
  { cle: 'acquis', libelle: 'Acquis', classe: 'st-acquis' },
] as const;

export function Today({
  decks, active, settings, streak, onReview, onOpen, onManage,
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
}) {
  const [rows, setRows] = useState<DeckSummary[] | null>(null);
  const [dueByDay, setDueByDay] = useState<number[]>([]);
  const [resting, setResting] = useState(0);
  const [choisi, setChoisi] = useState<string | null>(() => lireChoix());

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

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  /** La ligne de liste, identique à celle de « Mon travail ». */
  function ligne(r: DeckSummary) {
    return (
      <div key={r.deck.id} className="workrow">
        <button className="workrow-main" onClick={() => choisir(r.deck.id)}>
          <span className="vign-wrap">
            <DeckVign id={r.deck.id} name={r.deck.name} image={r.image} w={54} h={76} />
            {r.deck.classeFrom && <span className="classdot">{r.deck.classeFrom}</span>}
          </span>
          <span className="workrow-txt">
            <b>{r.deck.name}</b>
            <small>
              {r.themesSelected < r.themesTotal
                ? `${r.themesSelected} thèmes sur ${r.themesTotal}`
                : `${r.themesTotal} thèmes`}
              {' · '}{r.total} mots
            </small>
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
              <DeckFace id={r.deck.id} name={r.deck.name} image={r.image} />
            </span>
            <span className="pioche-due">{r.due}</span>
          </span>
          <span className="avant-txt">
            <b>{r.deck.name}</b>
            <small>
              {r.themesSelected < r.themesTotal
                ? `${r.themesSelected} thèmes sur ${r.themesTotal}`
                : `${r.themesTotal} thèmes`}
              {' · '}{r.total} mots
            </small>
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

      <div className="serie" aria-label={`Série : ${serie} jours`}>
        {semaine.map((j, i) => (
          <i
            key={j.key}
            className={j.done ? 'on' : ''}
            title={`${JOURS[new Date(j.key + 'T12:00:00').getDay()]} ${j.key.slice(8)}`}
            aria-current={i === 6 ? 'date' : undefined}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <>
          <div className="today-count">
            <b>0</b>
            <span>carte<br />en jeu</span>
          </div>
          <p className="hint">
            Aucun paquet en jeu. Choisissez ceux sur lesquels vous voulez
            travailler ; leur charge apparaîtra ici.
          </p>
          <button className="btn" onClick={onManage}>Mettre un paquet en jeu</button>
        </>
      ) : total === 0 ? (
        <>
          <div className="today-count">
            <b>0</b>
            <span>carte<br />en jeu</span>
          </div>
          <p className="hint">
            {faitAujourdhui
              ? 'Journée faite. Les mots revus reviendront à leur date, pas avant.'
              : 'Tout est à jour. Les mots déjà appris reviendront d’eux-mêmes, au moment où ils commencent à s’effacer.'}
          </p>
        </>
      ) : (
        <>
          {/*
            * « en jeu » plutôt que « à voir aujourd'hui » : c'est l'étendue
            * de ce qui a été mis en chantier, pas une dette du jour. Un
            * chiffre qui décrit ne décourage pas ; un chiffre qui réclame,
            * si.
            */}
          <div className="today-count">
            <b>{total}</b>
            <span>carte{total > 1 ? 's' : ''}<br />en jeu</span>
          </div>
          <p className="today-est">
            {aFaire.length > 1 ? `Répartis sur ${aFaire.length} paquets. ` : ''}
            Environ {Math.max(1, Math.round(total / 3))} minutes.
          </p>

          {serieEnJeu && (
            <p className="serie-alerte">
              Votre série de {serie} jour{serie > 1 ? 's' : ''} tient à une
              révision aujourd’hui.
            </p>
          )}

          {enAvant && carteEnAvant(enAvant)}

          {suite.length > 0 && (
            <>
              <p className="rayon-label">
                {enAvant ? 'Les autres paquets' : 'Sur quoi travaillez-vous ?'}
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
            {dueByDay.map((n, i) => {
              const max = Math.max(...dueByDay, 1);
              const jour = new Date();
              jour.setDate(jour.getDate() + i);
              return (
                <span key={i} className={`bar${i === 0 ? ' now' : ''}`}>
                  <i style={{ height: `${Math.max(3, (100 * n) / max)}%` }} />
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
