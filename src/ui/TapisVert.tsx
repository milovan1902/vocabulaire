/**
 * CHANTIER 274 — LE TAPIS VERT, TOUT REVU (maquette « Apparences Tapis vert », 4a).
 * Remplace les animations du chantier 241 (la main de poker de la semaine, les jetons misés au pot).
 *
 *   — vers la Révision : le croupier distribue cinq cartes depuis le sabot, elles se retournent sur une
 *     quinte flush à cœur, « Bonne main ! » ;
 *   — les notes : on retourne une carte de plus en plus forte — Raté, un 2♣ puis la carte se couche
 *     (« Je me couche ») ; Dur, un 7♦ et un jeton (« Je suis ») ; Bien, un roi de cœur et trois jetons
 *     (« Relance ! ») ; Facile, la lampe, les quatre as en éventail, la pluie de jetons, « Tapis ! » ;
 *   — Cette semaine : une pile de jetons, un jeton par jour ; « Main gagnante » à 5 / 5, un jeton d'or
 *     au 6e jour, un second et la quinte flush royale au 7e ;
 *   — changer de paquet : la carte est tirée du sabot (poker.css, classes c0 / c1 d'Eventail.tsx).
 *
 * Keyframes tv-* dans poker.css. Tout est décoratif (aria-hidden) ; rien ne joue si le téléphone
 * demande moins d'animations (poker.css coupe déjà toute animation du Tapis vert dans ce cas).
 */
import type { CSSProperties, ReactNode } from 'react';

type Css = CSSProperties & Record<`--${string}`, string | number>;

const TITRE = "'Newsreader', Georgia, serif";
const ROUGE = '#b3263a';
const DOS = 'repeating-linear-gradient(45deg,transparent 0 5px,rgba(0,0,0,.18) 5px 6px),repeating-linear-gradient(-45deg,#b3263a 0 5px,#9a1f31 5px 10px)';
const abs = (st: Css): Css => ({ position: 'absolute', pointerEvents: 'none', ...st });
const jetonFond = (c: string) => `radial-gradient(circle,${c} 0 50%,rgba(255,255,255,.6) 51% 53%,${c} 54% 64%,transparent 65%),repeating-conic-gradient(${c} 0 22.5deg,#f4ecd8 22.5deg 45deg)`;
const POP = (d: number) => `tv-pop .3s cubic-bezier(.3,1.6,.5,1) ${d}s both`;

function Carte({ rang, couleur, rouge, w, pos, anim, r = 0 }: { rang: string; couleur: string; rouge: boolean; w: number; pos: Css; anim?: string; r?: number }) {
  const c = rouge ? ROUGE : '#1b1b1b';
  const coin = (st: Css) => <span style={abs({ fontFamily: TITRE, fontWeight: 700, fontSize: Math.round(w * 0.17), lineHeight: 1.02, textAlign: 'center', whiteSpace: 'pre', color: c, ...st })}>{`${rang}\n${couleur}`}</span>;
  return (
    <span style={abs({ width: w, height: Math.round(w * 1.42), boxSizing: 'border-box', borderRadius: Math.round(w * 0.1), background: '#fbf7ee', border: '1px solid #d9cdb0', boxShadow: '0 8px 18px rgba(0,0,0,.35)', display: 'grid', placeItems: 'center', '--r': `${r}deg`, animation: anim, ...pos })}>
      {coin({ left: 5, top: 4 })}
      {coin({ right: 5, bottom: 4, transform: 'rotate(180deg)' })}
      <b style={{ fontSize: Math.round(w * 0.46), lineHeight: 1, color: c }}>{couleur}</b>
    </span>
  );
}
const Dos = ({ w, pos, anim }: { w: number; pos: Css; anim?: string }) => (
  <span style={abs({ width: w, height: Math.round(w * 1.42), boxSizing: 'border-box', borderRadius: Math.round(w * 0.1), border: '3px solid #fbf7ee', background: DOS, boxShadow: '0 8px 18px rgba(0,0,0,.35)', animation: anim, ...pos })} />
);
const Jeton = ({ c, size, pos, anim }: { c: string; size: number; pos: Css; anim: string }) => (
  <i style={abs({ width: size, height: size, borderRadius: '50%', background: jetonFond(c), boxShadow: '0 3px 0 rgba(0,0,0,.4)', animation: anim, ...pos })} />
);
const Mot = ({ t, size, col, ombre = 'none', pos, d }: { t: string; size: number; col: string; ombre?: string; pos: Css; d: number }) => (
  <b style={abs({ left: 0, right: 0, textAlign: 'center', fontFamily: TITRE, fontStyle: 'italic', fontWeight: 700, fontSize: size, lineHeight: 1, color: col, textShadow: ombre, whiteSpace: 'nowrap', '--r': '-4deg', animation: POP(d), ...pos })}>{t}</b>
);

/** Vers la Révision : la donne (posée sur document.body). */
export function TransitionTapis() {
  const RANGS = ['10', 'V', 'D', 'R', 'A'];
  const W = 52;
  return (
    <div style={abs({ position: 'fixed', inset: 0, zIndex: 1000, overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 42%,#2b8a58,#1a5c3a 55%,#0e3622)', animation: 'tv-voile .2s ease-out both, tv-fondu .3s ease-in 1.7s forwards' })} aria-hidden="true">
      <i style={abs({ left: 18, right: 18, top: '28%', height: '32%', boxSizing: 'border-box', border: '2px solid rgba(243,226,170,.3)', borderRadius: '50%' })} />
      <span style={abs({ right: 18, top: '9%', width: 76, height: 54, borderRadius: 8, background: 'linear-gradient(180deg,#5a3418,#3a2010)', boxShadow: '0 6px 12px rgba(0,0,0,.45), inset 0 0 0 2px #c9a46a' })}>
        <i style={abs({ left: 8, top: 10, width: 52, height: 6, borderRadius: 3, background: '#fbf7ee' })} />
      </span>
      {RANGS.map((r, i) => {
        const x = (i - 2) * 58;
        return (
          <span key={r} style={abs({ left: `calc(50% + ${x - W / 2}px)`, top: '38%', width: W, height: Math.round(W * 1.42), '--sx': `${130 - x}px`, '--sy': '-28vh', '--r': `${(i - 2) * 3}deg`, animation: `tv-donne .38s cubic-bezier(.2,.9,.3,1) ${(0.15 + i * 0.1).toFixed(2)}s both` })}>
            <Dos w={W} pos={{ left: 0, top: 0 }} anim={`tv-plie .12s ease-in ${(0.85 + i * 0.1).toFixed(2)}s forwards`} />
            <Carte rang={r} couleur="♥" rouge w={W} pos={{ left: 0, top: 0, transform: 'scaleX(0)' }} anim={`tv-deplie .12s ease-out ${(0.97 + i * 0.1).toFixed(2)}s forwards`} />
          </span>
        );
      })}
      <Mot t="Bonne main !" size={44} col="#f0cd73" ombre="0 3px 0 #3a2010, 0 0 14px rgba(240,205,115,.6)" pos={{ top: 'calc(38% + 110px)' }} d={1.45} />
    </div>
  );
}

/** Ce qui se pose sur la carte pendant la note. */
export function EffetsTapis({ frappe }: { frappe: string }) {
  const W = 96;
  const centre: Css = { left: '50%', top: '14%', marginLeft: -W / 2 };
  let fx: ReactNode = null;
  if (frappe === 'again') fx = (
    <>
      <i style={abs({ inset: 0, borderRadius: 16, background: 'rgba(14,54,34,.28)', animation: 'tv-voile .25s ease-out both' })} />
      <Carte rang="2" couleur="♣" rouge={false} w={W} pos={centre} anim="tv-retourne .4s ease-out .05s both, tv-cache .01s .85s forwards" />
      <Dos w={W} pos={centre} anim="tv-couche .75s ease-in .85s both" />
      <Mot t="Je me couche" size={30} col={ROUGE} pos={{ bottom: 26 }} d={0.4} />
    </>
  );
  if (frappe === 'hard') fx = (
    <>
      <Carte rang="7" couleur="♦" rouge w={W} pos={centre} anim="tv-retourne .4s ease-out .05s both" />
      <Jeton c="#b8560c" size={44} pos={{ left: 'calc(50% + 36px)', top: 'calc(14% + 104px)' }} anim="tv-glisse .5s cubic-bezier(.3,1.3,.5,1) .45s both" />
      <Mot t="Je suis" size={30} col="#b8560c" pos={{ bottom: 26 }} d={0.5} />
    </>
  );
  if (frappe === 'good') fx = (
    <>
      <Carte rang="R" couleur="♥" rouge w={W} pos={centre} anim="tv-retourne .4s ease-out .05s both" />
      {[0, 1, 2].map((i) => <Jeton key={i} c="#22549a" size={44} pos={{ left: 'calc(50% + 40px)', top: `calc(14% + ${108 - i * 9}px)` }} anim={`tv-tombe .4s ease-out ${(0.45 + i * 0.16).toFixed(2)}s both`} />)}
      <Mot t="Relance !" size={32} col="#22549a" pos={{ bottom: 26 }} d={0.75} />
    </>
  );
  if (frappe === 'easy') {
    const as: [string, boolean, number][] = [['♠', false, -21], ['♥', true, -7], ['♦', true, 7], ['♣', false, 21]];
    const cols = ['#b3263a', '#22549a', '#1b1b1b', '#b8560c', '#e0b44a'];
    fx = (
      <>
        <i style={abs({ inset: 0, borderRadius: 16, background: 'conic-gradient(from 160deg at 50% -10%, transparent 0, rgba(255,226,140,.45) 0 40deg, transparent 0), radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(0,0,0,.18))', animation: 'tv-lampe 1.9s ease-out both' })} />
        {as.map(([s, rge, r], i) => <Carte key={s} rang="A" couleur={s} rouge={rge} w={78} pos={{ left: '50%', top: '12%', marginLeft: -39, transformOrigin: '50% 120%' }} anim={`tv-eventail .55s cubic-bezier(.3,1.3,.5,1) ${(0.1 + i * 0.1).toFixed(2)}s both`} r={r} />)}
        <span style={abs({ left: '50%', top: '40%', width: 0, height: 0 })}>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 12 + 0.25;
            const d = 110 + (i % 3) * 20;
            return <Jeton key={i} c={cols[i % 5]} size={22} pos={{ left: -11, top: -11, '--dx': `${Math.round(Math.cos(a) * d)}px`, '--dy': `${Math.round(Math.sin(a) * d * 0.8 + 40)}px` }} anim={`tv-pluie 1s ease-out ${(0.6 + (i % 4) * 0.05).toFixed(2)}s both`} />;
          })}
        </span>
        <Mot t="Tapis !" size={54} col="#f0cd73" ombre="0 3px 0 #3a2010, 0 0 14px rgba(240,205,115,.7)" pos={{ bottom: 30 }} d={0.7} />
      </>
    );
  }
  return <span className="tv-fx" aria-hidden="true">{fx}</span>;
}

const PILE = ['#b3263a', '#22549a', '#1b1b1b', '#b8560c', '#b3263a'];

/** « Cette semaine » : la pile de jetons, sous le titre de la tuile. */
export function SemaineTapis({ faits: n, auj }: { faits: number; auj: boolean }) {
  const nb = Math.min(n, 7);
  const ital = (t: string, c: string, d: number) => <span style={{ fontFamily: TITRE, fontStyle: 'italic', fontWeight: 700, fontSize: 18, lineHeight: 1.05, color: c, maxWidth: 84, '--r': '0deg', animation: auj ? POP(d) : 'none' } as Css}>{t}</span>;
  return (
    <span className="tv-sem">
      <b>{n > 5 ? `${n} jours` : `${n} / 5`}</b>
      <span style={abs({ right: 14, bottom: 14, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center' })} aria-hidden="true">
        {nb === 0 && <i style={{ display: 'block', width: 38, height: 13, boxSizing: 'border-box', borderRadius: '50%', border: '1.5px dashed rgba(27,27,27,.25)' }} />}
        {Array.from({ length: nb }, (_, i) => {
          const or = i >= 5;
          const c = or ? '#e0b44a' : PILE[i];
          return <i key={i} style={{ position: 'relative', display: 'block', width: 38, height: 13, marginTop: i ? -5 : 0, borderRadius: '50%', background: `repeating-linear-gradient(90deg, ${c} 0 5px, ${or ? '#fff3c4' : '#f4ecd8'} 5px 8px)`, boxShadow: `inset 0 -2px 0 rgba(0,0,0,.25)${or ? ', 0 0 8px rgba(224,180,74,.8)' : ''}`, zIndex: i, animation: auj && i === nb - 1 ? 'tv-tombe .45s ease-out .2s both' : 'none' }} />;
        })}
      </span>
      {n < 5 && <small>{`encore ${5 - n} jour${5 - n > 1 ? 's' : ''}`}</small>}
      {n === 5 && (
        <>
          {ital('Main gagnante', ROUGE, 0.5)}
          {auj && <i style={abs({ top: 0, bottom: 0, left: 0, width: 40, background: 'linear-gradient(90deg, transparent, rgba(240,205,115,.85), transparent)', animation: 'tv-reflet .9s ease-in-out .8s both' })} />}
        </>
      )}
      {n === 6 && ital('Jeton d’or !', '#8a6418', 0.6)}
      {n >= 7 && (
        <>
          <span style={{ position: 'relative', display: 'block', width: 84, height: 30 }} aria-hidden="true">
            {['10', 'V', 'D', 'R', 'A'].map((r, i) => <Carte key={r} rang={r} couleur="♥" rouge w={20} pos={{ left: i * 13, top: 0, transformOrigin: '50% 140%', transform: `rotate(${(i - 2) * 8}deg)` }} anim={auj ? `tv-eventail .4s ease-out ${(0.2 + i * 0.1).toFixed(2)}s both` : 'none'} r={(i - 2) * 8} />)}
          </span>
          <small style={{ fontFamily: TITRE, fontStyle: 'italic', fontWeight: 700, lineHeight: 1.1, color: ROUGE, maxWidth: 84, '--r': '0deg', animation: auj ? POP(0.8) : 'none' } as Css}>Quinte flush royale</small>
        </>
      )}
    </span>
  );
}
