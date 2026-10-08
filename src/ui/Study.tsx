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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Grade, Settings } from '../domain/types';
import type { SessionItem } from '../engine/session';
import { previewIntervals } from '../engine/scheduler';
import { speak } from './speech';
import { estLudique, useStyle } from './useStyle';

/* CHANTIER 165 — style Lycée : des notes courtes, et les couleurs rouge,
   orange, jaune, vert (voir lycee.css, classes g-again … g-easy). */
const COURTS: Record<Grade, string> = { again: 'Raté', hard: 'Dur', good: 'Bien', easy: 'Facile' };
/* CHANTIER 216 — Cinéma muet : les notes sont des claps de tournage. */
const CLAPS: Record<Grade, string> = { again: 'Coupez !', hard: 'Dur', good: 'Bien', easy: 'Bravo !' };

const GRADES: Array<{ key: Grade; label: string; className: string }> = [
  { key: 'again', label: 'À revoir', className: 'grade again' },
  { key: 'hard', label: 'Difficile', className: 'grade' },
  { key: 'good', label: 'Correct', className: 'grade' },
  { key: 'easy', label: 'Facile', className: 'grade easy' },
];

/* CHANTIER 208 — le mot et la réponse ne dépassent plus du cadre.
   CHANTIER 212 — un mot n'est plus jamais coupé. L'ancienne mesure (largeur du paragraphe)
   ne voyait pas toujours le débordement : la césure automatique et le chargement tardif de
   la police laissaient passer « BACKPA / CK ». On mesure maintenant chaque mot, seul et sur
   une ligne, et on réduit la police jusqu'à ce que le plus long tienne dans la largeur de la
   carte. Les mots peuvent toujours passer à la ligne ENTRE eux, jamais au milieu.
   Recalculé à chaque carte, quand la carte change de largeur et quand les polices arrivent.
   En tout dernier recours (sous 12 px), le mot se coupe. */
const TAILLE_MIN = 12;

function useAjuste(texte: string) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [passe, setPasse] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let derniere = -1;
    const cible = el.parentElement ?? el;
    const ro = new ResizeObserver(() => {
      const l = cible.clientWidth;
      if (l !== derniere) { derniere = l; setPasse((p) => p + 1); }
    });
    ro.observe(cible);
    let actif = true;
    const relance = () => { if (actif) setPasse((p) => p + 1); };
    document.fonts?.ready.then(relance);
    /* CHANTIER 218 — la police d'un mot ne se charge qu'au moment où il s'affiche (la réponse,
       souvent en italique très gras, n'apparaît qu'au toucher). « ready » était déjà résolu :
       la mesure se faisait avec la police de secours, plus étroite, puis la vraie police
       arrivait et le mot se coupait (« coun- / tryside »). On remesure quand une police finit
       de se charger, et deux fois encore par sécurité. */
    document.fonts?.addEventListener?.('loadingdone', relance);
    const t1 = window.setTimeout(relance, 300);
    const t2 = window.setTimeout(relance, 1200);
    return () => {
      actif = false; ro.disconnect();
      document.fonts?.removeEventListener?.('loadingdone', relance);
      window.clearTimeout(t1); window.clearTimeout(t2);
    };
  }, [texte]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = '';
    el.style.hyphens = 'manual';
    el.style.overflowWrap = 'normal';
    el.style.wordBreak = 'normal';
    const cs = getComputedStyle(el);
    /* CHANTIER 218 — 6 % de marge : l'italique très gras déborde de sa propre chasse (le « y », le « e »). */
    const dispo = (el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)) * 0.94 - 2;
    if (dispo <= 0) return;
    const mots = texte.split(/\s+/).filter(Boolean);
    if (!mots.length) return;
    /* La sonde hérite de toute la typo du paragraphe (police, graisse, capitales, espacement). */
    const sonde = document.createElement('span');
    Object.assign(sonde.style, { position: 'absolute', left: '-9999px', top: '0', visibility: 'hidden', whiteSpace: 'nowrap' });
    el.appendChild(sonde);
    const plusLong = () => Math.max(...mots.map((m) => { sonde.textContent = m; return sonde.offsetWidth; }));
    let fs = parseFloat(cs.fontSize) || 32;
    let l = plusLong();
    if (l > dispo) {
      fs = Math.max(TAILLE_MIN, Math.floor((fs * dispo) / l));
      el.style.fontSize = `${fs}px`;
      l = plusLong();
      while (l > dispo && fs > TAILLE_MIN) {
        fs -= 1;
        el.style.fontSize = `${fs}px`;
        l = plusLong();
      }
    }
    sonde.remove();
    if (l > dispo) el.style.overflowWrap = 'anywhere';
  }, [texte, passe]);
  return ref;
}

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
  const style = useStyle();
  /* Bonnes réponses d'affilée dans la séance. « Raté » remet à zéro. */
  const [combo, setCombo] = useState(0);
  /* CHANTIER 221 — Cinéma muet et Bibliothèque : la note se « frappe » d'abord (le clap claque,
     le sceau s'écrase), la carte suivante arrive 0,28 s plus tard. */
  const [frappe, setFrappe] = useState<Grade | null>(null);

  const total = queue.length;
  const current = items[index];

  const intervals = useMemo(
    () => (current ? previewIntervals(current.progress) : null),
    [current],
  );

  const front = current ? (settings.reversed ? current.card.en : current.card.fr) : '';
  const back = current ? (settings.reversed ? current.card.fr : current.card.en) : '';
  const langFront = settings.reversed ? 'en' : 'fr';
  const langBack = settings.reversed ? 'fr' : 'en';
  const refWord = useAjuste(front);
  const refAnswer = useAjuste(back);

  /*
   * CHANTIER 50 — LA VOIX SUIT L'ANGLAIS, PAS LA RÉPONSE.
   *
   * La synthèse dit toujours `card.en` : c'est l'anglais qu'on apprend à
   * entendre, dans un sens comme dans l'autre. Ce qui changeait, c'était
   * le MOMENT — fixé à la révélation, quel que soit le sens.
   *
   * À l'endroit (FR → EN), la révélation est bien l'instant où l'anglais
   * apparaît : rien à changer.
   *
   * À l'envers (EN → FR), l'anglais est la QUESTION. La voix arrivait
   * donc un temps trop tard : l'application prononçait « the
   * headquarters » au moment précis où l'on avait « le siège central »
   * sous les yeux, et le mot anglais, lui, était resté muet pendant tout
   * le temps où on le lisait. Or entendre et lire le mot ensemble est
   * justement ce qu'on vient chercher en révisant dans ce sens.
   *
   * L'anglais se dit maintenant au moment où il s'affiche, et une seule
   * fois par carte.
   */
  const anglaisEnQuestion = settings.reversed;

  const pronounce = useCallback(() => {
    if (current) speak(current.card.en, settings.speechRate);
  }, [current, settings.speechRate]);

  /*
   * À l'envers : la carte se présente, l'anglais se dit. La dépendance
   * porte sur l'identifiant ET sur la position : « À revoir » réinsère
   * la même carte plus loin dans la session, et elle doit alors se dire
   * de nouveau.
   */
  const carteId = current?.card.id;
  const motAnglais = current?.card.en;
  useEffect(() => {
    if (!anglaisEnQuestion || !settings.autoSpeak || !motAnglais) return;
    speak(motAnglais, settings.speechRate);
  }, [carteId, index, motAnglais, anglaisEnQuestion, settings.autoSpeak, settings.speechRate]);

  const reveal = useCallback(() => {
    setRevealed(true);
    /* À l'envers, l'anglais a déjà été dit à la présentation : le répéter
       ici le collerait à la réponse française, qui n'est pas ce qu'on
       écoute. Le bouton « Écouter » reste là pour le redemander. */
    if (settings.autoSpeak && !anglaisEnQuestion) pronounce();
  }, [settings.autoSpeak, anglaisEnQuestion, pronounce]);

  const grade = useCallback(
    async (g: Grade) => {
      if (!current) return;
      await onGrade(current, g);
      setReviewed((n) => n + 1);
      setCombo((c) => (g === 'again' ? 0 : c + 1));

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
        {estLudique(style) && combo >= 2 && (
          <span className="ly-combo" aria-label={`${combo} bonnes réponses d’affilée`}>×{combo}</span>
        )}
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
        className={`studystage t${index % 2}`}
        onClick={() => { if (!revealed) reveal(); }}
      >
        <span className="tag">{current.card.theme}</span>

        {!revealed ? (
          <>
            <p className="ask">{settings.reversed ? 'En français ?' : 'En anglais ?'}</p>
            <p className="word" lang={langFront} ref={refWord}>{front}</p>
            {/*
              * Le mot affiché est l'anglais : on peut le réécouter avant de
              * répondre, autant de fois qu'on veut. `stopPropagation` est
              * indispensable — toute la zone du mot révèle la réponse, et
              * demander à entendre n'est pas demander à voir.
              */}
            {anglaisEnQuestion && (
              <button
                className="speak"
                onClick={(e) => { e.stopPropagation(); pronounce(); }}
              >
                Écouter
              </button>
            )}
          </>
        ) : (
          <>
            <p className="wordsmall" lang={langFront}>{front}</p>
            <span className="ruleline" aria-hidden="true" />
            <p className="answer" lang={langBack} ref={refAnswer}>{back}</p>
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
          <p className="tap-hint">Touche le mot, ou appuie sur espace au clavier.</p>
        </>
      ) : (
        <div className="grades">
          {GRADES.map((g) => (
            <button
              key={g.key}
              className={`${g.className} g-${g.key}${frappe === g.key ? ' frappe' : ''}`}
              onClick={() => {
                if (frappe) return;
                /* CHANTIER 224 — Salon de thé : le macaron s'écrase (0,65 s) ; Cabinet 1900 : la case réagit (0,45 s). */
                const attente = style === 'cinema' || style === 'biblio' ? 280 : style === 'patisserie' ? 650 : style === 'cabinet' ? 450 : style === 'japon' ? 650 : style === 'jazz' ? 600
                  /* CHANTIER 235 — Plage : la bouée (Raté : elle se perce et s'envole) ; Château : l'écu vibre. */
                  : style === 'plage' ? (g.key === 'again' ? 1820 : g.key === 'easy' ? 910 : 630) : style === 'chateau' ? 650 : 0;
                if (attente && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
                  setFrappe(g.key);
                  window.setTimeout(() => { setFrappe(null); void grade(g.key); }, attente);
                } else void grade(g.key);
              }}
            >
              {style === 'cinema' ? CLAPS[g.key] : estLudique(style) ? COURTS[g.key] : g.label}
              <small>{intervals?.[g.key]}</small>
              {(style === 'plage' || style === 'chateau') && <i className="g-fx" aria-hidden="true"><i /><i /><i /><i /><i /></i>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
