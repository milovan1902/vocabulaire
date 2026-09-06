/**
 * Écran de révision : une carte à la fois.
 *
 * Le visuel du paquet n'est plus une vignette au milieu de l'écran : il
 * occupe tout le fond, assombri, et le mot passe devant, en grand. Ce
 * qu'on vient lire, c'est le mot ; l'image n'est plus qu'un décor qui
 * situe le paquet. Conséquence : les réglages de marge du panneau de
 * texte (panelInsetX / panelInsetY) ne servent plus ici — ils restent
 * dans les réglages, sans effet sur cet écran, et pourront être retirés
 * lors du chantier « réglages ».
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Grade, Settings } from '../domain/types';
import type { SessionItem } from '../engine/session';
import { previewIntervals } from '../engine/scheduler';
import { speak } from './speech';

const GRADES: Array<{ key: Grade; label: string; className: string }> = [
  { key: 'again', label: 'À revoir', className: 'grade again' },
  { key: 'hard', label: 'Difficile', className: 'grade' },
  { key: 'good', label: 'Correct', className: 'grade' },
  { key: 'easy', label: 'Facile', className: 'grade easy' },
];

export function Study({
  queue, image, settings, onGrade, onQuit, onDone,
}: {
  queue: SessionItem[];
  image: string | null;
  settings: Settings;
  onGrade: (item: SessionItem, grade: Grade) => Promise<void>;
  onQuit: () => void;
  onDone: (reviewed: number) => void;
}) {
  const [items, setItems] = useState<SessionItem[]>(queue);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const total = queue.length;
  const current = items[index];

  const intervals = useMemo(
    () => (current ? previewIntervals(current.progress) : null),
    [current],
  );

  const front = current ? (settings.reversed ? current.card.en : current.card.fr) : '';
  const back = current ? (settings.reversed ? current.card.fr : current.card.en) : '';

  const pronounce = useCallback(() => {
    if (current) speak(current.card.en, settings.speechRate);
  }, [current, settings.speechRate]);

  const reveal = useCallback(() => {
    setRevealed(true);
    if (settings.autoSpeak) pronounce();
  }, [settings.autoSpeak, pronounce]);

  const grade = useCallback(
    async (g: Grade) => {
      if (!current) return;
      await onGrade(current, g);
      setReviewed((n) => n + 1);

      const rest = [...items];
      // « À revoir » remet la carte un peu plus loin dans la même session.
      if (g === 'again') {
        rest.splice(Math.min(index + 4, rest.length), 0, current);
      }
      const nextIndex = index + 1;
      setItems(rest);
      setRevealed(false);
      if (nextIndex >= rest.length) onDone(reviewed + 1);
      else setIndex(nextIndex);
    },
    [current, index, items, onGrade, onDone, reviewed],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ') { e.preventDefault(); if (!revealed) reveal(); return; }
      if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        void grade(GRADES[Number(e.key) - 1].key);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, reveal, grade]);

  if (!current) return null;

  return (
    <>
      {/*
       * Fond plein cadre. En position fixe : il couvre aussi la barre du
       * haut et les marges de la coquille centrée, sans quoi la révision
       * aurait l'air posée dans une fenêtre.
       */}
      <div
        className="studybg"
        aria-hidden="true"
        style={image ? { backgroundImage: `url("${image}")` } : undefined}
      />

      <div className="studytop">
        <div className="progressbar">
          <i style={{ width: `${(100 * index) / Math.max(total, 1)}%` }} />
        </div>
        <span className="pos">
          {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
        </span>
        <button className="stop" onClick={onQuit} aria-label="Arrêter la session">
          ✕
        </button>
      </div>

      {/*
       * Toute la zone du mot révèle la réponse : sur téléphone, la cible
       * est bien plus large que le bouton, et le geste devient naturel.
       */}
      <div
        className="studystage"
        onClick={() => { if (!revealed) reveal(); }}
      >
        <span className="tag">{current.card.theme}</span>

        {!revealed ? (
          <>
            <p className="ask">{settings.reversed ? 'En français ?' : 'En anglais ?'}</p>
            <p className="word">{front}</p>
          </>
        ) : (
          <>
            <p className="wordsmall">{front}</p>
            <span className="ruleline" aria-hidden="true" />
            <p className="answer">{back}</p>
            {current.card.example && <p className="example">{current.card.example}</p>}
            <button
              className="speak"
              onClick={(e) => { e.stopPropagation(); pronounce(); }}
            >
              Écouter
            </button>
          </>
        )}
      </div>

      {!revealed ? (
        <>
          <button className="reveal" onClick={reveal}>Afficher la réponse</button>
          <p className="tap-hint">Appuyez sur le mot, ou espace au clavier.</p>
        </>
      ) : (
        <div className="grades">
          {GRADES.map((g) => (
            <button key={g.key} className={g.className} onClick={() => void grade(g.key)}>
              {g.label}
              <small>{intervals?.[g.key]}</small>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
