/**
 * Écran d'entrée : ce qu'il y a à faire aujourd'hui.
 *
 * Une seule question posée à l'ouverture — combien, et dans quel paquet.
 * D'où une seule action pleine largeur : réviser le paquet le plus en
 * retard. Le reste est informatif.
 */
import { useEffect, useState } from 'react';
import type { Deck, Settings } from '../domain/types';
import { loadSummaries, type DeckSummary } from './deckSummary';
import { CardBack } from './components';
import type { Streak } from '../engine/streak';
import { doneToday, lastSeven, liveStreak } from '../engine/streak';

const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

export function Today({
  decks, installed, settings, streak, onReview, onOpen,
}: {
  decks: Deck[];
  installed: string[];
  settings: Settings;
  streak: Streak;
  /** Ouvre le paquet et démarre aussitôt une session. */
  onReview: (id: string) => void;
  /** Ouvre l'écran du paquet, sans démarrer de session. */
  onOpen: (id: string) => void;
}) {
  const [rows, setRows] = useState<DeckSummary[] | null>(null);
  const [dueByDay, setDueByDay] = useState<number[]>([]);
  const [resting, setResting] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const mine = decks.filter((d) => installed.includes(d.id));
      const charge = await loadSummaries(mine, settings);
      if (!alive) return;
      setRows(charge.summaries);
      setDueByDay(charge.dueByDay);
      setResting(charge.resting);
    })();
    return () => { alive = false; };
  }, [decks, installed, settings]);

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

      {total === 0 ? (
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
            {rows.length > 1
              ? `Répartis sur ${aFaire.length} paquet${aFaire.length > 1 ? 's' : ''}. `
              : ''}
            Environ {Math.max(1, Math.round(total * 0.4))} minutes.
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
                  {tete.image
                    ? <img src={tete.image} alt="" />
                    : <CardBack id={tete.deck.id} name={tete.deck.name} />}
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

          {suite.length > 0 && (
            <div className="rows">
              {suite.map((r) => (
                <button key={r.deck.id} className="row" onClick={() => onReview(r.deck.id)}>
                  <span style={{ flex: 1 }}>{r.deck.name}</span>
                  <span className="due">{r.due}</span>
                </button>
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
