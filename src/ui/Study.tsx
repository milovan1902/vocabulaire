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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
   En tout dernier recours (sous 12 px), le mot se coupe.
   CHANTIER 236 — la réponse n'existe à l'écran qu'après le toucher. La mesure, déclenchée au
   changement de texte, tombait sur un paragraphe absent et ne se refaisait plus : la réponse
   n'était jamais ajustée (« AROUN / D », « em- / bassy »). On remesure aussi quand elle apparaît. */
const TAILLE_MIN = 12;

/* CHANTIER 244 — Strass, « Facile » : la pluie de strass (position, couleur, vitesse, rotation). */
const SV_TEINTES = ['#ffffff', '#bfe6ff', '#f0d388', '#ffd6e8'];
const SV_PLUIE = Array.from({ length: 18 }, (_, k) => ({
  left: `${(((k * 53) % 340) + 10) / 3.6}%`,
  background: `var(--gemme), ${SV_TEINTES[k % 4]}`,
  animationDuration: `${(1.3 + (k % 4) * 0.15).toFixed(2)}s`,
  animationDelay: `${(0.3 + (k % 6) * 0.09).toFixed(2)}s`,
  '--r': `${(k % 2 ? 1 : -1) * (200 + k * 20)}deg`,
}) as unknown as CSSProperties);

function useAjuste(texte: string, visible = true) {
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
  }, [texte, visible]);
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
  }, [texte, passe, visible]);
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
  /* CHANTIER 244 — Strass : la place de l'invitation au moment du toucher. L'enveloppe, le tapis
     rouge et la moitié droite de la carte déchirée se posent dessus (.sv-scene). */
  const [cadre, setCadre] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const refStage = useRef<HTMLDivElement>(null);
  const refScene = useRef<HTMLDivElement>(null);
  /* Raté : la moitié droite est une copie exacte de la carte (mêmes mots, mêmes tailles de police). */
  useLayoutEffect(() => {
    if (style !== 'strass' || frappe !== 'again') return;
    const carte = refStage.current;
    const scene = refScene.current;
    if (!carte || !scene) return;
    const copie = carte.cloneNode(true) as HTMLElement;
    copie.classList.remove('n-again');
    scene.appendChild(copie);
    return () => { copie.remove(); };
  }, [frappe, style]);

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
  const refWord = useAjuste(front, !revealed);
  const refAnswer = useAjuste(back, revealed);

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
        ref={refStage}
        className={`studystage t${index % 2}${style === 'strass' && frappe ? ` n-${frappe}` : ''}`}
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
        {/* CHANTIER 244 — Strass : les tampons « Liste d'attente » (Dur) et « Admis » (Bien). */}
        {style === 'strass' && (
          <span className="sv-tampons" aria-hidden="true"><b className="t-attente">Liste d’attente</b><b className="t-admis">Admis</b></span>
        )}
      </div>

      {/* CHANTIER 244 — Strass : ce qui se pose sur l'invitation pendant la note. */}
      {style === 'strass' && frappe && cadre && (
        <div className="sv-scene" ref={refScene} aria-hidden="true" style={{ top: cadre.top, left: cadre.left, width: cadre.width, height: cadre.height }}>
          {frappe === 'good' && (
            <>
              <i className="env-fond" />
              <i className="env-poche" />
              <span className="env-rabat"><i /><b>◆</b></span>
            </>
          )}
          {frappe === 'easy' && (
            <>
              <i className="tapis" />
              <i className="rouleau" />
              <span className="pluie">{SV_PLUIE.map((st, k) => <s key={k} style={st} />)}</span>
              <b className="vip">Entrée VIP</b>
            </>
          )}
        </div>
      )}

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
                  : style === 'plage' ? (g.key === 'again' ? 1820 : g.key === 'easy' ? 910 : 630) : style === 'chateau' ? 650
                  /* CHANTIER 237 — Jungle : le panneau penche (Raté) ou pivote ; Pacific Express : le signal s'allume. */
                  : style === 'jungle' ? (g.key === 'again' ? 1100 : 900) : style === 'western' ? 1000
                  /* CHANTIER 238 — Parquet : le tir (planche, cercle, ou panier). */
                  : style === 'basket' ? 1250
                  /* CHANTIER 239 — Pelouse : le ballon touché part (roule, à côté, poteau, lucarne). */
                  : style === 'foot' ? 1250
                  /* CHANTIER 240 — Mêlée : le ballon touché part (en avant, à côté, poteau, entre les poteaux). */
                  : style === 'rugby' ? 1350
                  /* CHANTIER 241 — Tapis vert : le jeton touché part au pot (se coucher, suivre, relancer, tapis). */
                  : style === 'tapis' ? 1350
                  /* CHANTIER 242 — Salon privé : la carte touchée est abattue (Facile : toute la main, en éventail). */
                  : style === 'salon' ? (g.key === 'easy' ? 1600 : 1400)
                  /* CHANTIER 244 — Strass : l'invitation (déchirée, chassée, mise sous enveloppe, tapis rouge). */
                  : style === 'strass' ? (g.key === 'again' ? 1300 : g.key === 'hard' ? 1400 : g.key === 'good' ? 1800 : 2000) : 0;
                if (attente && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
                  if (style === 'strass') {
                    const el = refStage.current;
                    if (el) setCadre({ top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight });
                  }
                  setFrappe(g.key);
                  window.setTimeout(() => { setFrappe(null); void grade(g.key); }, attente);
                } else void grade(g.key);
              }}
            >
              {style === 'cinema' ? CLAPS[g.key] : estLudique(style) ? COURTS[g.key] : g.label}
              <small>{intervals?.[g.key]}</small>
              {(style === 'plage' || style === 'chateau' || style === 'basket' || style === 'foot' || style === 'rugby' || style === 'tapis' || style === 'salon' || style === 'strass') && (
                /* CHANTIER 241 — Tapis vert : dix morceaux (cartes jetées, jetons de la mise, jetons qui rebondissent). */
                /* CHANTIER 242 — Salon privé : deux calques sur la carte (les plis, le dos). */
                /* CHANTIER 244 — Strass : aucun morceau, le calque est l'étoile qui scintille sur la pierre. */
                <i className="g-fx" aria-hidden="true">{Array.from({ length: style === 'tapis' ? 10 : style === 'salon' ? 2 : style === 'strass' ? 0 : 5 }, (_, k) => <i key={k} />)}</i>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
