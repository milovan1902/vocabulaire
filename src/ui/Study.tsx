/** Écran de révision : une carte à la fois. */
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

  const panelStyle = {
    top: `${settings.panelInsetY}%`,
    bottom: `${settings.panelInsetY}%`,
    left: `${settings.panelInsetX}%`,
    right: `${settings.panelInsetX}%`,
  };
  const plainPanel = { top: '8%', bottom: '8%', left: '7%', right: '7%' };

  return (
    <>
      <div className="progressbar">
        <i style={{ width: `${(100 * index) / Math.max(total, 1)}%` }} />
      </div>

      <div className="cardstage">
        <div
          className={`studycard ${image ? 'illustrated' : ''}`}
          style={image ? { backgroundImage: `url("${image}")` } : undefined}
        >
          <div className="panel" style={image ? panelStyle : plainPanel}>
            <span className="tag">{current.card.theme}</span>
            <div className="prompt">{settings.reversed ? 'En français ?' : 'En anglais ?'}</div>
            <div className="front">{front}</div>
            {revealed && <div className="backtext">{back}</div>}
            {revealed && current.card.example && (
              <div className="example">{current.card.example}</div>
            )}
            {revealed && (
              <button className="speak" onClick={pronounce}>Écouter</button>
            )}
          </div>
        </div>
      </div>

      {!revealed ? (
        <button className="reveal" onClick={reveal}>Afficher la réponse</button>
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

      <div className="center">
        <button className="quit" onClick={onQuit}>Arrêter la session</button>
      </div>
    </>
  );
}
