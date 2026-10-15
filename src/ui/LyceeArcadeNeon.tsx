/**
 * CHANTIER 272 — LE LYCÉE, LA BORNE ARCADE ET LE NÉON S'ANIMENT
 * (maquette « Apparences Lycée Arcade Néon », 2a, 2b et 2c).
 *
 * Lycée (foncé et clair, data-style="lycee") — lycee.css :
 *   — vers la Révision : une copie double se déplie, l'en-tête s'écrit au stylo ;
 *   — changer de paquet : la carte du centre rentre dans la pile, la nouvelle en sort ;
 *   — les notes : la carte rayée en diagonale (À revoir), « peut mieux faire » puis
 *     souligné (Difficile), coche verte et « Bien » (Bien), coche et « TB » en vert (Facile) ;
 *   — Cette semaine : la note sur 20 monte, entourée à 5 / 5, « Excellent travail » au 6e jour,
 *     le tampon « Félicitations » au 7e.
 *
 * Borne arcade (data-style="arcade") et Néon (data-style="neon") — neon.css :
 *   — Arcade : INSERT COIN, la pièce, READY?, GO! ; GAME OVER, MISS, GOOD! +50, PERFECT! +100 ;
 *     la barre de vie, STAGE CLEAR, BONUS STAGE, HIGH SCORE et les initiales ; STAGE SELECT.
 *   — Néon : l'écran s'éteint, les tubes de la Révision se rallument ; tout l'encadré clignote
 *     en rouge, orange ou vert (Facile : un trait fait le tour, puis le halo) ; un point par jour,
 *     « 6 JOURS » lettre par lettre, l'enseigne dorée au 7e.
 *
 * Tout est décoratif (aria-hidden) ; rien ne joue si le téléphone demande moins d'animations.
 */
import type { CSSProperties } from 'react';

type Css = CSSProperties & Record<`--${string}`, string | number>;

const COCHE = 'M5 13l4 4 10-11';
const OVALE = 'M52 3 C86 2 99 12 97 22 C95 34 62 39 32 37 C8 35 1 25 4 15 C8 6 30 1 60 5';
const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PIXELS = ['#3dff8b', '#29f0ff', '#ff3ea5', '#ffe14d'];

/** Lycée : la copie double qui se déplie avant la Révision (posée sur document.body). */
export function TransitionLycee({ paquet }: { paquet: string }) {
  const d = new Date();
  const date = `${String(d.getDate()).padStart(2, '0')} / ${String(d.getMonth() + 1).padStart(2, '0')}`;
  return (
    <div className="lyx-copie" aria-hidden="true">
      <span className="feuilles">
        <span className="g">
          <b style={{ animationDelay: '0.65s' }}>Matière : anglais</b>
          <b style={{ animationDelay: '0.9s' }}>Paquet : {paquet}</b>
          <b style={{ animationDelay: '1.1s' }}>Date : {date}</b>
        </span>
        <span className="d"><b>Révision</b><i /></span>
      </span>
    </div>
  );
}

/** Borne arcade : INSERT COIN, la pièce tombe dans la fente, READY?, GO! (posée sur document.body). */
export function TransitionArcade() {
  return (
    <div className="arx-coin" aria-hidden="true">
      <b className="insert">INSERT COIN</b>
      <i className="piece" />
      <i className="fente" />
      <b className="ready">READY?</b>
      <b className="go">GO!</b>
    </div>
  );
}

/** Arcade, 7 jours : les initiales qui défilent comme sur une vraie borne. */
function Initiales({ anime }: { anime: boolean }) {
  return (
    <span className="arx-init">
      {['T', 'O', 'I'].map((c, j) => {
        const t = LETTRES.indexOf(c);
        const st: Css = anime
          ? { '--y': `${-t}em`, animation: `arx-roule ${(0.5 + j * 0.25).toFixed(2)}s steps(${t}) 0.3s both` }
          : { transform: `translateY(${-t}em)` };
        return <span key={j} style={st}>{LETTRES.split('').map((x) => <span key={x}>{x}</span>)}</span>;
      })}
    </span>
  );
}

/** « Cette semaine » des trois apparences, sous le titre de la tuile. */
export function SemaineLAN({ style, faits, auj }: { style: 'lycee' | 'arcade' | 'neon'; faits: number; auj: boolean }) {
  const m = Math.min(faits, 5);
  const reste = 5 - faits;
  const encore = `encore ${reste} jour${reste > 1 ? 's' : ''}`;
  const neuf = (i: number) => (auj && i === faits - 1 ? ' neuf' : '');
  const bonus = faits >= 5 ? [5, 6] : [];

  if (style === 'lycee') {
    return (
      <>
        <span className="lyx-ligne">
          <b>{faits > 5 ? `${faits} jours` : `${faits} / 5`}</b>
          {faits > 0 && (
            <span className="lyx-note" aria-hidden="true">
              <span className={auj && faits <= 5 ? 'neuf' : ''}>{m * 4}/20</span>
              {faits >= 5 && <svg className={auj && faits === 5 ? 'neuf' : ''} viewBox="0 0 100 40" preserveAspectRatio="none"><path pathLength={1} d={OVALE} /></svg>}
            </span>
          )}
        </span>
        {faits >= 6
          ? <span className={`lyx-appr${auj && faits === 6 ? ' neuf' : ''}`} aria-hidden="true">Excellent travail</span>
          : <small>{faits < 5 ? encore : 'objectif atteint'}</small>}
        <span className="lyx-segs" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => <i key={i} className={`${i < m ? 'on' : ''}${i < m ? neuf(i) : ''}`} />)}
          {bonus.map((i) => <i key={i} className={`bonus${i < faits ? ' on' : ''}${i < faits ? neuf(i) : ''}`} />)}
        </span>
        {faits >= 7 && <span className={`lyx-tampon${auj ? ' neuf' : ''}`} aria-hidden="true">Félicitations</span>}
      </>
    );
  }

  if (style === 'arcade') {
    return (
      <>
        <span className="arx-ligne">
          <b>{faits > 5 ? `5 / 5 +${faits - 5}` : `${faits} / 5`}</b>
          {faits > 0 && faits <= 5 && <span className={`arx-lv${auj ? ' neuf' : ''}`} aria-hidden="true">LV {m}</span>}
        </span>
        <span className="arx-vie" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => <i key={i} className={`${i < m ? 'on' : ''}${i < m ? neuf(i) : ''}`} />)}
          {bonus.map((i) => <i key={i} className={`bonus${i < faits ? ' on' : ''}${i < faits ? neuf(i) : ''}`} />)}
        </span>
        {faits < 5 && <small>{encore}</small>}
        {faits === 5 && <span className={`arx-msg clear${auj ? ' neuf' : ''}`} aria-hidden="true">STAGE CLEAR</span>}
        {faits === 6 && <span className={`arx-msg bonus${auj ? ' neuf' : ''}`} aria-hidden="true">BONUS STAGE</span>}
        {faits >= 7 && (
          <span className={`arx-msg hs${auj ? ' neuf' : ''}`} aria-hidden="true">
            <span>HIGH SCORE!</span>
            <Initiales anime={auj} />
          </span>
        )}
      </>
    );
  }

  const txt = `${faits} JOURS`;
  return (
    <>
      <span className="nex-points" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => <i key={i} className={`${i < m ? 'on' : ''}${i < m ? neuf(i) : ''}`} />)}
        {bonus.map((i) => <i key={i} className={`bonus${i < faits ? ' on' : ''}${i < faits ? neuf(i) : ''}`} />)}
      </span>
      {faits <= 5 ? (
        <>
          <b className={faits === 5 ? 'nex-plein' : ''}>{faits} / 5</b>
          <small>{faits < 5 ? encore : 'objectif atteint'}</small>
        </>
      ) : (
        <span className={`nex-enseigne${faits >= 7 ? ' or' : ''}${auj ? ' neuf' : ''}`} aria-hidden="true">
          {txt.split('').map((c, i) => (
            <span key={i} style={auj && faits === 6 ? { animationDelay: `${(i * 0.12).toFixed(2)}s` } : undefined}>{c === ' ' ? '\u00a0' : c}</span>
          ))}
        </span>
      )}
    </>
  );
}

/** Ce qui se pose sur la carte pendant la note. Néon : seul Facile ajoute un calque (le trait qui fait le tour). */
export function EffetsLAN({ style, frappe }: { style: 'lycee' | 'arcade' | 'neon'; frappe: string }) {
  if (style === 'lycee') {
    return (
      <span className={`lyx-fx ${frappe}`} aria-hidden="true">
        {frappe === 'again' && (
          <svg className="rature" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path pathLength={1} d="M3 4 Q50 52 97 96" />
            <path pathLength={1} d="M5 2 Q52 49 98 93" />
          </svg>
        )}
        {frappe === 'hard' && (
          <>
            <b className="pmf">peut mieux faire</b>
            <svg className="souligne" viewBox="0 0 100 10" preserveAspectRatio="none"><path pathLength={1} d="M2 6 Q10 1 18 6 T34 6 T50 6 T66 6 T82 6 T98 6" /></svg>
          </>
        )}
        {frappe === 'good' && (
          <>
            <svg className="coche" viewBox="0 0 24 24"><path pathLength={1} d={COCHE} /></svg>
            <b className="bien">Bien</b>
          </>
        )}
        {frappe === 'easy' && (
          <>
            <svg className="coche" viewBox="0 0 24 24"><path pathLength={1} d={COCHE} /></svg>
            <b className="tb">TB</b>
            <svg className="tb-trait" viewBox="0 0 56 12" preserveAspectRatio="none">
              <path pathLength={1} d="M2 4 Q28 1 54 3" />
              <path pathLength={1} d="M4 10 Q30 7 52 9" />
            </svg>
          </>
        )}
      </span>
    );
  }

  if (style === 'arcade') {
    return (
      <span className={`arx-fx ${frappe}`} aria-hidden="true">
        {frappe === 'easy' && Array.from({ length: 14 }, (_, i) => {
          const a = (Math.PI * 2 * i) / 14;
          const d = 90 + (i % 3) * 22;
          return <i key={i} className="px" style={{ '--c': PIXELS[i % 4], '--dx': `${Math.round(Math.cos(a) * d)}px`, '--dy': `${Math.round(Math.sin(a) * d * 0.8)}px`, animationDelay: `${(0.15 + (i % 4) * 0.04).toFixed(2)}s` } as Css} />;
        })}
        <b className="txt">{frappe === 'again' ? 'GAME OVER' : frappe === 'hard' ? 'MISS' : frappe === 'good' ? 'GOOD!' : 'PERFECT!'}</b>
        {frappe === 'good' && <b className="pts">+50</b>}
        {frappe === 'easy' && <b className="pts">+100</b>}
      </span>
    );
  }

  if (frappe !== 'easy') return null;
  return (
    <span className="nex-tour" aria-hidden="true">
      <span><i /></span>
    </span>
  );
}
