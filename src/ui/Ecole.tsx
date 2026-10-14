/**
 * CHANTIER 271 — LE CAHIER ET LE TABLEAU S'ANIMENT (maquette « Apparences Cahier et Tableau », 1a et 1b).
 *
 * Cahier (les quatre papiers, data-style="cahier") — cahier.css :
 *   — vers la Révision : le stylo entoure « Réviser », puis la page se tourne ;
 *   — changer de paquet : la fiche se décolle, la nouvelle arrive, le scotch se pose ;
 *   — les notes : rature rouge (À revoir), surligneur orange et gommette (Difficile),
 *     coche au stylo (Bien), étoile dorée et « Très bien ! » (Facile) ;
 *   — Cette semaine : une coche par jour, le surligneur à 5 / 5, 18/20 au 6e jour,
 *     20/20 entouré au 7e.
 *
 * Tableau (vert et noir, data-style="tableau") — tableau.css :
 *   — vers la Révision : la brosse efface le tableau, « Au tableau ! » s'écrit ;
 *   — changer de paquet : la punaise retombe dans un nuage de craie (Eventail.tsx, classe c0 / c1) ;
 *   — les notes : la brosse efface la réponse, la craie crisse et se casse, coche entourée,
 *     étoile et « Très bien ! » qui scintille ;
 *   — Cette semaine : des bâtons, le 5e barre les quatre autres, bon point au 6e jour,
 *     Tableau d'honneur au 7e.
 *
 * Tout est décoratif (aria-hidden) ; rien ne joue si le téléphone demande moins d'animations.
 */
import type { CSSProperties } from 'react';

type Css = CSSProperties & Record<`--${string}`, string | number>;

const ETOILE = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z';
const COCHE = 'M5 13l4 4 10-11';
const BOUCLE = 'M46 2 C80 1 98 4 99 18 C100 33 84 39 50 39 C18 39 1 35 1 21 C1 7 16 2 56 3';
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Des éclats qui partent en étoile autour d'un point. */
function Eclats({ n, d, className }: { n: number; d: number; className: string }) {
  return (
    <span className={className} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const a = (Math.PI * 2 * i) / n + 0.3;
        return <i key={i} style={{ '--dx': `${(Math.cos(a) * d).toFixed(0)}px`, '--dy': `${(Math.sin(a) * d).toFixed(0)}px`, animationDelay: `${(0.25 + i * 0.03).toFixed(2)}s` } as Css} />;
      })}
    </span>
  );
}

/** Cahier : le trait de stylo qui entoure le bouton « Réviser ». */
export function CercleStylo() {
  return (
    <svg className="cx-cercle" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} d={BOUCLE} />
    </svg>
  );
}

/** Cahier : « Cette semaine », sept cases cochées au stylo. */
export function SemaineCahier({ faits, auj }: { faits: number; auj: boolean }) {
  return (
    <span className={`cx-semaine${faits >= 5 ? ' plein' : ''}${faits === 5 ? ' juste' : ''}`} aria-hidden="true">
      <span className="cx-jours">
        {JOURS.map((j, i) => {
          const bonus = i >= 5;
          const fait = i < faits;
          const neuf = auj && fait && i === faits - 1;
          return (
            <span key={i} className={`cx-j${bonus ? (i === 5 ? ' bonus s' : ' bonus d') : ''}${fait ? ' on' : ''}${neuf ? ' neuf' : ''}`}>
              <small>{j}</small>
              <i>
                {fait && (bonus
                  ? <svg viewBox="0 0 24 24"><path className="etoile" d={ETOILE} /></svg>
                  : <svg viewBox="0 0 24 24"><path className="coche" pathLength={1} d={COCHE} /></svg>)}
              </i>
            </span>
          );
        })}
        {faits >= 5 && <i className="cx-sur" />}
      </span>
      {faits >= 5 && (
        <span className="cx-bas">
          {faits === 5 && <b className="cx-faite">Semaine faite</b>}
          {faits >= 6 && (
            <b className="cx-note">
              {faits >= 7 ? '20/20' : '18/20'}
              {faits >= 7 && <svg viewBox="0 0 100 40" preserveAspectRatio="none"><path pathLength={1} d="M52 3 C86 2 99 12 97 22 C95 34 62 39 32 37 C8 35 1 25 4 15 C8 6 30 1 60 5" /></svg>}
            </b>
          )}
          {faits >= 7 && <Eclats n={6} d={30} className="cx-eclats" />}
        </span>
      )}
    </span>
  );
}

/** Tableau : la brosse efface l'écran « Aujourd'hui », « Au tableau ! » s'écrit (posé sur document.body). */
export function BrosseTableau() {
  return (
    <div className="tb-efface" aria-hidden="true">
      <i className="ardoise" />
      <i className="brosse" />
      <span className="poudre">
        {Array.from({ length: 16 }, (_, i) => (
          <s key={i} style={{ left: `${6 + ((i * 37) % 88)}%`, top: `${26 + ((i * 23) % 30)}%`, width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2, '--dx': `${((i % 5) - 2) * 14}px`, '--dy': `${-20 - (i % 4) * 12}px`, animationDelay: `${(0.15 + i * 0.05).toFixed(2)}s` } as Css} />
        ))}
      </span>
      <b className="titre">Au tableau !</b>
      <svg className="trait" viewBox="0 0 180 14" preserveAspectRatio="none"><path pathLength={1} d="M4 8 Q60 2 120 7 T176 6" /></svg>
    </div>
  );
}

/** Tableau : le bon point (6 jours) et le Tableau d'honneur (7 jours), sous les bâtons. */
export function SemaineTableau({ faits }: { faits: number }) {
  if (faits === 6) {
    return (
      <b className="tb-bonpoint" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d={ETOILE} /></svg>bon point
      </b>
    );
  }
  if (faits >= 7) {
    return (
      <>
        <b className="tb-honneur" aria-hidden="true">Tableau d’honneur</b>
        <span className="tb-etoiles" aria-hidden="true">
          {[[18, 46], [70, 12], [88, 62], [40, 78], [60, 40]].map(([x, y], i) => (
            <svg key={i} viewBox="0 0 24 24" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i * 0.22).toFixed(2)}s` }}><path d={ETOILE} /></svg>
          ))}
        </span>
      </>
    );
  }
  return null;
}

/** Ce qui se pose sur la fiche (Cahier) ou le tableau (Tableau) pendant la note. */
export function EffetsEcole({ style, frappe }: { style: string; frappe: string }) {
  if (style === 'cahier') {
    return (
      <span className={`cx-fx ${frappe}`} aria-hidden="true">
        {frappe === 'again' && <b className="cx-marge">À revoir</b>}
        {frappe === 'hard' && <><b className="cx-question">?</b><b className="cx-gommette dur">Dur</b></>}
        {frappe === 'good' && (
          <>
            <svg className="cx-coche" viewBox="0 0 24 24"><path pathLength={1} d={COCHE} /></svg>
            <b className="cx-gommette bien">Bien</b>
          </>
        )}
        {frappe === 'easy' && (
          <>
            <svg className="cx-etoile" viewBox="0 0 24 24"><path d={ETOILE} /></svg>
            <Eclats n={7} d={52} className="cx-eclats grand" />
            <b className="cx-tresbien">Très bien !</b>
          </>
        )}
      </span>
    );
  }
  return (
    <span className={`tb-fx ${frappe}`} aria-hidden="true">
      {frappe === 'again' && (
        <span className="tb-poudre">
          {Array.from({ length: 9 }, (_, i) => (
            <s key={i} style={{ left: `${30 + ((i * 37) % 40)}%`, top: `${50 + ((i * 23) % 12)}%`, '--dx': `${((i % 5) - 2) * 14}px`, '--dy': `${-20 - (i % 4) * 12}px`, animationDelay: `${(0.2 + i * 0.05).toFixed(2)}s` } as Css} />
          ))}
        </span>
      )}
      {frappe === 'hard' && <b className="tb-question">?</b>}
      {frappe === 'good' && (
        <>
          <svg className="tb-coche" viewBox="0 0 24 24"><path pathLength={1} d={COCHE} /></svg>
          <b className="tb-bien">Bien</b>
          <svg className="tb-rond" viewBox="0 0 72 46" preserveAspectRatio="none"><path pathLength={1} d="M36 4 C60 3 70 14 66 26 C62 40 20 44 8 32 C0 22 10 6 40 5" /></svg>
        </>
      )}
      {frappe === 'easy' && (
        <>
          <svg className="tb-etoile" viewBox="0 0 24 24"><path pathLength={1} d={ETOILE} /></svg>
          <b className="tb-tresbien">Très bien !</b>
          <span className="tb-scintille">
            {[[12, 20], [80, 56], [22, 70], [68, 82], [48, 14], [90, 30], [8, 50], [56, 60]].map(([x, y], i) => (
              <svg key={i} viewBox="0 0 24 24" className={i % 2 ? 'or' : ''} style={{ left: `${x}%`, top: `${y}%`, width: 10 + (i % 3) * 3, height: 10 + (i % 3) * 3, animationDelay: `${(0.5 + i * 0.12).toFixed(2)}s` }}><path d={ETOILE} /></svg>
            ))}
          </span>
        </>
      )}
    </span>
  );
}
