/**
 * Écran d'entrée : ce qu'il y a à faire aujourd'hui.
 *
 * Ne regarde que les paquets *en jeu*. Un paquet possédé mais en pause n'a
 * rien à faire ici : c'est tout l'intérêt de la pause.
 */
import { useEffect, useState } from 'react';
import type { Deck, Settings } from '../domain/types';
import { loadSummaries, type DeckSummary } from './deckSummary';
import { DeckFace, DeckVign } from './components';
import type { Streak } from '../engine/streak';
import { doneToday, lastSeven, liveStreak } from '../engine/streak';

const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

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

  if (!rows) return <p className="lead">Chargement…</p>;

  const aFaire = [...rows].filter((r) => r.due > 0).sort((a, b) => b.due - a.due);
  const total = aFaire.reduce((n, r) => n + r.due, 0);
  const tete = aFaire[0];
  const suite = aFaire.slice(1);

  const serie = liveStreak(streak);
  const faitAujourdhui = doneToday(streak);
  const semaine = lastSeven(streak);
  /* Série en jeu : elle existe, elle n'est pas encore assurée, et il reste
     du travail pour la sauver. Sans ces trois conditions, se taire. */
  const enJeu = serie > 0 && !faitAujourdhui && total > 0;

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

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
            <span>carte à voir<br />aujourd’hui</span>
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
            <span>carte à voir<br />aujourd’hui</span>
          </div>
          <p className="hint">
            {faitAujourdhui
              ? 'Journée faite. Les mots revus reviendront à leur date, pas avant.'
              : 'Tout est à jour. Les mots déjà appris reviendront d’eux-mêmes, au moment où ils commencent à s’effacer.'}
          </p>
        </>
      ) : (
        <>
          <div className="today-count">
            <b>{total}</b>
            <span>carte{total > 1 ? 's' : ''} à voir<br />aujourd’hui</span>
          </div>
          <p className="today-est">
            {aFaire.length > 1
              ? `Répartis sur ${aFaire.length} paquets. `
              : ''}
            Environ {Math.max(1, Math.round(total / 3))} minutes.
          </p>

          {enJeu && (
            <p className="serie-alerte">
              Votre série de {serie} jour{serie > 1 ? 's' : ''} tient à une
              révision aujourd’hui.
            </p>
          )}

          {tete && (
            <>
              <div className="pioche" onClick={() => onOpen(tete.deck.id)}>
                <span className="pioche-dos">
                  <DeckFace id={tete.deck.id} name={tete.deck.name} image={tete.image} />
                  <span className="pioche-due">{tete.due}</span>
                </span>
                <span className="pioche-txt">
                  <span className="label">La pioche du jour</span>
                  <b>{tete.deck.name}</b>
                  <span className="sub">{tete.total} mots</span>
                </span>
              </div>

              <button className="btn" onClick={() => onReview(tete.deck.id)}>
                Réviser {Math.min(tete.due, settings.cardsPerSession)} cartes
              </button>
            </>
          )}

          {/*
            * Les autres paquets du jour, dans la ligne de « Mon travail ».
            *
            * C'était une liste de noms en texte seul : le même paquet n'avait
            * pas le même visage selon l'onglet où on le rencontrait. Un dos
            * de carte est un repère — il ne sert que s'il est partout.
            *
            * Ce qui distingue les deux écrans n'est donc plus la forme de la
            * ligne mais ce qu'elle porte : ici le nombre de cartes à voir
            * aujourd'hui, là-bas l'avancement et la mise en pause. La pioche,
            * elle, garde sa carte en grand — c'est elle qui doit trancher sur
            * cette page, pas la liste qui la suit.
            */}
          {suite.length > 0 && (
            <div className="worklist todaylist">
              {suite.map((r) => (
                <div key={r.deck.id} className="workrow">
                  <button className="workrow-main" onClick={() => onReview(r.deck.id)}>
                    <span className="vign-wrap">
                      <DeckVign id={r.deck.id} name={r.deck.name} image={r.image} w={54} h={76} />
                      {r.deck.classeFrom && (
                        <span className="classdot">{r.deck.classeFrom}</span>
                      )}
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
              ))}
            </div>
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
