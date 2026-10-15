/**
 * CHANTIER 273 — LE CARNET KRAFT, LE MANGA ET LA BD POP S'ANIMENT
 * (maquette « Apparences Carnet Manga BD », 3a, 3b et 3c).
 *
 * Carnet kraft (data-style="voyage") — voyage.css :
 *   — vers la Révision : la carte d'embarquement, le talon qui se détache, le tampon « Embarqué », l'avion ;
 *   — les notes : « Refusé », « Contrôle », le cachet « Validé », « Visa accordé » et l'avion ;
 *   — Cette semaine : cinq tampons de douane (LUN → VEN), l'itinéraire à 5 / 5, « Escale bonus ! », « Tour du monde ».
 * Manga (data-style="manga") et BD pop (data-style="bd") — bulles.css :
 *   — Manga : lignes de vitesse et « ドン ! » ; ガーン, ギクッ, よし, すごい ; une case encrée par jour,
 *     « つづく… », « Chapitre bonus », le sceau 完 ;
 *   — BD pop : « BOOM ! » et les bandes ; CRAC, AÏE, POW, WAOUH ; cinq onomatopées (PAF, BAM, ZIP, POW, BOUM),
 *     « Semaine bouclée ! », « À suivre… », « FIN ! ».
 *
 * Les animations (keyframes cmb-*) sont dans bulles.css. Tout est décoratif (aria-hidden) ;
 * rien ne joue si le téléphone demande moins d'animations.
 */
import type { CSSProperties, ReactNode } from 'react';

type Css = CSSProperties & Record<`--${string}`, string | number>;
type Style3 = 'voyage' | 'manga' | 'bd';

const LEX = "'Lexend', sans-serif";
const CAV = "'Caveat', cursive";
const ARC = "'Archivo Variable', 'Archivo', sans-serif";
const JP = "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', 'Archivo', sans-serif";
const K = { ink: '#3a2a1a', grey: '#6b5640', bleu: '#2f5d8a', rouge: '#b5452f', orange: '#b8701a', vert: '#3d7a46', or: '#d8b25a', papier: '#fbf6ea' };
const BURST = 'polygon(50% 0%,61% 18%,82% 8%,79% 30%,100% 36%,84% 52%,98% 70%,76% 72%,74% 95%,56% 82%,40% 100%,34% 78%,12% 86%,18% 64%,0% 54%,16% 40%,4% 20%,26% 22%,30% 2%)';
const ETINCELLE = 'polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)';
const ETOILE = 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)';
const AVION = 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z';

const abs = (st: Css): Css => ({ position: 'absolute', pointerEvents: 'none', ...st });
const contour = (c: string, w: number) => [[w, 0], [-w, 0], [0, w], [0, -w], [w, w], [-w, -w], [w, -w], [-w, w]].map(([x, y]) => `${x}px ${y}px 0 ${c}`).join(',');
const POP = (d: number) => `cmb-pop .3s cubic-bezier(.3,1.6,.5,1) ${d}s both`;
const TAMPON = (d: number) => `cmb-tampon .4s cubic-bezier(.3,1.4,.5,1) ${d}s both`;
const encore = (n: number) => `encore ${5 - n} jour${5 - n > 1 ? 's' : ''}`;

function Trait({ d, anim, stroke, w, opacity }: { d: string; anim: string; stroke: string; w: number; opacity?: number }) {
  return <path d={d} fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} opacity={opacity} style={{ animation: anim }} />;
}

function Burst({ pos, w, h, fond, r = 0, anim, txt, txtSt }: { pos: Css; w: number; h: number; fond: string; r?: number; anim: string; txt?: string; txtSt?: Css }) {
  return (
    <span style={abs({ width: w, height: h, '--r': `${r}deg`, animation: anim, ...pos })}>
      <i style={abs({ inset: 0, background: '#1a1a1a', clipPath: BURST })} />
      <i style={abs({ inset: 5, background: fond, clipPath: BURST })} />
      {txt && <b style={abs({ inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ARC, fontWeight: 900, lineHeight: 1, whiteSpace: 'nowrap', ...txtSt })}>{txt}</b>}
    </span>
  );
}

function Eclats({ n, d, cols, size, del, pos, forme }: { n: number; d: number; cols: string[]; size: number; del: number; pos?: Css; forme?: string }) {
  return (
    <span style={abs({ left: '50%', top: '45%', width: 0, height: 0, ...pos })}>
      {Array.from({ length: n }, (_, i) => {
        const a = (Math.PI * 2 * i) / n + 0.3;
        return <i key={i} style={abs({ left: -size / 2, top: -size / 2, width: size, height: size, borderRadius: forme ? 0 : '50%', clipPath: forme ?? 'none', background: cols[i % cols.length], '--dx': `${Math.round(Math.cos(a) * d)}px`, '--dy': `${Math.round(Math.sin(a) * d)}px`, animation: `cmb-eclat .75s ease-out ${(del + i * 0.03).toFixed(2)}s both` })} />;
      })}
    </span>
  );
}

function Avion({ pos, c, size, anim, x }: { pos: Css; c: string; size: number; anim: string; x: string }) {
  return (
    <span style={abs({ width: size, height: size, color: c, '--x': x, '--r': '45deg', animation: anim, ...pos })}>
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={AVION} /></svg>
    </span>
  );
}

/* ================================================================== Carnet kraft */
function TamponV({ txt, c, r, pos, size, sous, d = 0.05, fond }: { txt: string; c: string; r: number; pos: Css; size: number; sous?: string; d?: number; fond?: string }) {
  return (
    <span style={abs({ display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box', padding: '7px 14px', borderRadius: 6, border: `3px solid ${c}`, boxShadow: `inset 0 0 0 2px ${K.papier}, inset 0 0 0 4px ${c}`, background: fond, color: c, fontFamily: LEX, fontWeight: 900, fontSize: size, letterSpacing: '.12em', lineHeight: 1, opacity: 0.92, whiteSpace: 'nowrap', '--r': `${r}deg`, animation: TAMPON(d), ...pos })}>
      {txt}
      {sous && <small style={{ fontSize: 11, letterSpacing: '.06em', fontWeight: 700, marginTop: 4 }}>{sous}</small>}
    </span>
  );
}

/** Carnet kraft : la carte d'embarquement avant la Révision (posée sur document.body). */
export function TransitionVoyage({ paquet }: { paquet: string }) {
  const champ = (l: string, v: string) => (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <small style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: K.grey }}>{l}</small>
      <b style={{ fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</b>
    </span>
  );
  return (
    <div className="cmb-plein" style={abs({ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(58,42,26,.55)', animation: 'cmb-voile .2s ease-out both, cmb-fondu .3s ease-in 1.6s forwards' })} aria-hidden="true">
      <i style={abs({ left: 16, right: 16, top: 'calc(26% - 32px)', borderTop: '2px dashed #fbf6ea', animation: 'cmb-ecrire .6s linear 1.15s both' })} />
      <Avion pos={{ left: 0, top: 'calc(26% - 48px)' }} c="#fbf6ea" size={32} anim="cmb-vole .6s linear 1.15s both" x="calc(100vw + 20px)" />
      <span style={abs({ left: 28, right: 28, top: '26%', maxWidth: 420, margin: '0 auto', fontFamily: LEX, color: K.ink, animation: 'cmb-zoom .35s cubic-bezier(.3,1.3,.5,1) both' })}>
        <span style={{ display: 'block', position: 'relative', borderRadius: '12px 12px 0 0', background: `linear-gradient(${K.or} 0 34px, ${K.papier} 34px)`, padding: '48px 16px 16px', boxShadow: '0 16px 30px rgba(58,42,26,.35)' }}>
          <b style={abs({ left: 16, top: 10, fontSize: 12, fontWeight: 800, letterSpacing: '.14em' })}>CARTE D’EMBARQUEMENT</b>
          <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '12px 16px' }}>
            {champ('DE', 'Français')}{champ('VERS', 'Anglais')}{champ('VOL', paquet)}{champ('PORTE', '12')}
          </span>
          <TamponV txt="EMBARQUÉ" c={K.rouge} r={-12} pos={{ right: 14, top: 58 }} size={18} d={1.0} fond="rgba(251,246,234,.6)" />
        </span>
        <span style={{ display: 'flex', justifyContent: 'space-between', borderRadius: '0 0 12px 12px', background: K.papier, borderTop: '2px dashed rgba(58,42,26,.3)', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: K.grey, transformOrigin: '0 0', animation: 'cmb-dechire .45s ease-in .75s forwards' }}>
          <span>SIÈGE 7A</span><span>EMBARQUEMENT 08:15</span>
        </span>
      </span>
    </div>
  );
}

function EffetsVoyage({ frappe }: { frappe: string }) {
  if (frappe === 'again') return <><TamponV txt="REFUSÉ" c={K.rouge} r={-14} pos={{ left: '50%', top: '40%', width: 160, marginLeft: -80 }} size={28} /><Eclats n={7} d={50} cols={[K.rouge]} size={6} del={0.12} pos={{ top: '46%' }} /></>;
  if (frappe === 'hard') return (
    <>
      <TamponV txt="CONTRÔLE" c={K.orange} r={8} pos={{ left: '50%', top: '30%', width: 180, marginLeft: -90 }} size={24} />
      <span style={abs({ left: 0, right: 0, bottom: 24, textAlign: 'center', fontFamily: CAV, fontWeight: 700, fontSize: 28, lineHeight: 1, color: K.orange, animation: 'cmb-ecrire .6s ease-out .55s both' })}>à revoir de près</span>
    </>
  );
  if (frappe === 'good') return (
    <>
      <span style={abs({ left: 20, bottom: 26, width: 86, height: 86, boxSizing: 'border-box', borderRadius: '50%', border: `2.5px solid ${K.bleu}`, boxShadow: `inset 0 0 0 4px ${K.papier}, inset 0 0 0 5.5px ${K.bleu}`, color: K.bleu, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, fontFamily: LEX, lineHeight: 1, '--r': '-10deg', animation: TAMPON(0.05) })}>
        <b style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.1em' }}>VALIDÉ</b>
        <small style={{ fontSize: 10, fontWeight: 700 }}>{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }).replace('/', ' · ')}</small>
      </span>
      <svg viewBox="0 0 120 40" preserveAspectRatio="none" style={abs({ left: 112, bottom: 46, width: 120, height: 40, overflow: 'visible' })}>
        {[8, 20, 32].map((y, i) => <Trait key={i} d={`M0 ${y} Q10 ${y - 6} 20 ${y} T40 ${y} T60 ${y} T80 ${y} T100 ${y} T120 ${y}`} anim={`cmb-dessin .4s ease-out ${(0.3 + i * 0.08).toFixed(2)}s both`} stroke={K.bleu} w={2} />)}
      </svg>
    </>
  );
  return (
    <>
      <TamponV txt="VISA" c={K.vert} r={-10} pos={{ left: '50%', top: '44%', width: 150, marginLeft: -75 }} size={34} sous="accordé ✓" />
      <Eclats n={8} d={70} cols={[K.or, '#e9c46a']} size={8} del={0.25} pos={{ top: '52%' }} forme={ETINCELLE} />
      <i style={abs({ left: 16, right: 16, top: '24%', borderTop: `2px dashed ${K.bleu}`, animation: 'cmb-ecrire .9s linear .45s both' })} />
      <Avion pos={{ left: 4, top: 'calc(24% - 14px)' }} c={K.bleu} size={28} anim="cmb-vole .9s linear .45s both" x="min(82vw, 380px)" />
    </>
  );
}

function SemaineVoyage({ faits: n, auj }: { faits: number; auj: boolean }) {
  const m = Math.min(n, 5);
  const JOURS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN'];
  const ENCRES = [K.rouge, K.bleu, K.vert, K.rouge, K.bleu];
  const PENTES = [-12, 8, -6, 10, -9];
  const feutre = (t: string, c: string) => <span style={{ fontFamily: CAV, fontWeight: 700, fontSize: 22, lineHeight: 1, color: c, whiteSpace: 'nowrap', animation: auj ? 'cmb-ecrire .6s ease-out .3s both' : 'none' }}>{t}</span>;
  return (
    <>
      <b>{n > 5 ? `${n} jours` : `${n} / 5`}</b>
      <span style={{ position: 'relative', display: 'flex', gap: 4, alignItems: 'center' }} aria-hidden="true">
        {n >= 5 && <i style={abs({ left: 11, width: 104, top: '50%', borderTop: `2px dashed ${K.rouge}`, transformOrigin: '0 50%', animation: auj && n === 5 ? 'cmb-trait .5s ease-out .35s both' : 'none' })} />}
        {JOURS.map((j, i) => {
          const fait = i < m;
          const c = ENCRES[i];
          return (
            <i key={j} style={{ position: 'relative', flex: 'none', width: 22, height: 17, boxSizing: 'border-box', borderRadius: 3, display: 'grid', placeItems: 'center', fontStyle: 'normal', fontFamily: LEX, fontSize: 6.5, fontWeight: 900, letterSpacing: '.02em', lineHeight: 1,
              border: fait ? `1.5px solid ${c}` : '1.5px dashed rgba(58,42,26,.25)', boxShadow: fait ? `inset 0 0 0 1.5px var(--panel), inset 0 0 0 2.5px ${c}` : 'none', background: 'var(--panel)', color: fait ? c : 'rgba(58,42,26,.3)',
              '--r': `${PENTES[i]}deg`, transform: fait ? `rotate(${PENTES[i]}deg)` : 'none', animation: fait && auj && i === n - 1 ? TAMPON(0) : 'none' } as Css}>{j}</i>
          );
        })}
      </span>
      {n < 5 && <small>{encore(n)}</small>}
      {n === 5 && feutre('Escale validée !', K.rouge)}
      {n === 6 && feutre('Escale bonus !', '#8a6418')}
      {n >= 7 && (
        <>
          {feutre('Tour du monde !', K.rouge)}
          <span style={abs({ right: -6, top: 6, width: 62, height: 62, boxSizing: 'border-box', borderRadius: '50%', border: `2.5px solid ${K.rouge}`, boxShadow: `inset 0 0 0 3px var(--panel), inset 0 0 0 4.5px ${K.rouge}`, background: 'rgba(246,238,220,.85)', color: K.rouge, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: LEX, lineHeight: 1, '--r': '-14deg', transform: 'rotate(-14deg)', animation: auj ? TAMPON(0.2) : 'none' })} aria-hidden="true">
            <small style={{ fontSize: 7, fontWeight: 800, letterSpacing: '.08em', maxWidth: 44 }}>TOUR DU MONDE</small>
            <b style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>7</b>
          </span>
        </>
      )}
    </>
  );
}

/* ================================================================== Manga */
function Ono({ t, size, col, bord, pos, r, anim, sous }: { t: string; size: number; col: string; bord: string; pos: Css; r: number; anim: string; sous?: string }) {
  return (
    <span style={abs({ display: 'flex', flexDirection: 'column', alignItems: 'center', '--r': `${r}deg`, animation: anim, ...pos })}>
      <b style={{ fontFamily: JP, fontWeight: 900, fontSize: size, lineHeight: 1, color: col, textShadow: bord, whiteSpace: 'nowrap' }}>{t}</b>
      {sous && <small style={{ marginTop: 4, padding: '1px 6px', background: '#111', color: '#fff', fontFamily: ARC, fontWeight: 900, fontStyle: 'italic', fontSize: 11, letterSpacing: '.1em' }}>{sous}</small>}
    </span>
  );
}
const lignes = (alpha: number, anim: string) => (
  <i style={abs({ inset: 0, background: `repeating-conic-gradient(from 0deg at 50% 55%, rgba(17,17,17,${alpha}) 0 2deg, transparent 2deg 9deg)`, WebkitMaskImage: 'radial-gradient(circle at 50% 55%, transparent 30%, #000 62%)', maskImage: 'radial-gradient(circle at 50% 55%, transparent 30%, #000 62%)', animation: anim })} />
);

/** Manga : lignes de vitesse, « ドン ! », la case qui se découpe (posé sur document.body). */
export function TransitionManga() {
  return (
    <div className="cmb-plein" style={abs({ position: 'fixed', inset: 0, zIndex: 1000, background: '#fbfbf8', overflow: 'hidden', animation: 'cmb-voile .12s ease-out both, cmb-fondu .25s ease-in 1.35s forwards' })} aria-hidden="true">
      <i style={abs({ inset: -120, background: 'repeating-conic-gradient(from 0deg at 50% 50%, #111 0 2.2deg, transparent 2.2deg 8deg)', WebkitMaskImage: 'radial-gradient(circle, transparent 18%, #000 52%)', maskImage: 'radial-gradient(circle, transparent 18%, #000 52%)', animation: 'cmb-vitesse 1s ease-out .05s both' })} />
      <Ono t="ドン!" size={104} col="#111" bord={contour('#fff', 5)} pos={{ left: 0, right: 0, top: '38%' }} r={-8} anim={POP(0.25)} sous="DON !" />
      <i style={abs({ inset: 0, boxSizing: 'border-box', background: '#fff', border: '6px solid #111', animation: 'cmb-coupe .4s ease-in .95s both' })} />
    </div>
  );
}

function EffetsManga({ frappe }: { frappe: string }) {
  const blanc = contour('#fff', 3);
  if (frappe === 'again') return (
    <>
      <i style={abs({ left: 0, right: 0, top: 0, height: '62%', background: 'repeating-linear-gradient(90deg, rgba(17,17,17,.75) 0 2px, transparent 2px 8px)', WebkitMaskImage: 'linear-gradient(#000 25%, transparent)', maskImage: 'linear-gradient(#000 25%, transparent)', transformOrigin: '50% 0', animation: 'cmb-baisse .35s ease-out both' })} />
      <Ono t="ガーン" size={60} col="#111" bord={blanc} pos={{ left: 0, right: 0, top: '38%' }} r={-6} anim={POP(0.25)} sous="GAAN !" />
    </>
  );
  if (frappe === 'hard') return (
    <>
      <span style={abs({ right: '20%', top: '16%', animation: 'cmb-goutte 1.2s ease-in .35s both' })}>
        <i style={{ display: 'block', width: 18, height: 18, boxSizing: 'border-box', background: '#fff', border: '2.5px solid #111', borderRadius: '0 50% 50% 50%', transform: 'rotate(45deg)' }} />
      </span>
      <Ono t="ギクッ!" size={44} col="#111" bord={blanc} pos={{ left: '8%', top: '24%' }} r={8} anim={POP(0.1)} sous="GIKU !" />
    </>
  );
  if (frappe === 'good') return (
    <>
      {lignes(0.4, 'cmb-vitesse .7s ease-out both')}
      <Burst pos={{ right: 8, top: '16%' }} w={132} h={106} fond="#fff" r={8} anim={POP(0.1)} txt="よし!" txtSt={{ fontFamily: JP, fontSize: 34, color: '#111' }} />
      <small style={abs({ right: 40, top: 'calc(16% + 108px)', padding: '1px 6px', background: '#111', color: '#fff', fontFamily: ARC, fontWeight: 900, fontStyle: 'italic', fontSize: 11, letterSpacing: '.1em', '--r': '0deg', animation: POP(0.25) })}>YOSHI !</small>
    </>
  );
  const pts = [[12, 18], [84, 14], [8, 62], [90, 58], [24, 86], [74, 84], [50, 8], [46, 92]];
  return (
    <>
      <i style={abs({ left: '50%', top: '45%', width: 280, height: 280, margin: '-140px 0 0 -140px', borderRadius: '50%', backgroundImage: 'radial-gradient(#111 1.2px, transparent 1.6px)', backgroundSize: '7px 7px', WebkitMaskImage: 'radial-gradient(circle, #000 30%, transparent 70%)', maskImage: 'radial-gradient(circle, #000 30%, transparent 70%)', opacity: 0.5, animation: 'cmb-halo 1.2s ease-out both' })} />
      {lignes(0.5, 'cmb-vitesse .9s ease-out both')}
      {pts.map(([x, y], i) => <i key={i} style={abs({ left: `${x}%`, top: `${y}%`, width: 18 + (i % 3) * 6, height: 18 + (i % 3) * 6, background: i % 2 ? '#e63946' : '#111', clipPath: ETINCELLE, animation: `cmb-scintille .8s ease-out ${(0.2 + i * 0.08).toFixed(2)}s both` })} />)}
      <Ono t="すごい!" size={54} col="#e63946" bord={`${contour('#111', 2)},${contour('#fff', 4)}`} pos={{ left: 0, right: 0, top: '36%' }} r={-4} anim={POP(0.15)} sous="SUGOI !" />
    </>
  );
}

function SemaineManga({ faits: n, auj }: { faits: number; auj: boolean }) {
  const m = Math.min(n, 5);
  const carre = (i: number, on: boolean, bonus: boolean) => (
    <span key={i} style={{ position: 'relative', flex: 'none', width: bonus ? 10 : 14, height: 14 }}>
      <i style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', border: '2px solid #111', background: on ? (bonus ? '#e63946' : '#111') : '#fff', transform: 'skewX(-8deg)', animation: on && auj && i === n - 1 ? 'cmb-gonfle .3s cubic-bezier(.3,1.6,.5,1) both' : 'none' }} />
      {on && auj && i === n - 1 && <Eclats n={6} d={16} cols={['#111']} size={4} del={0.05} pos={{ left: '50%', top: '50%' }} />}
    </span>
  );
  const pop = auj ? POP(0.2) : 'none';
  return (
    <>
      <b>{n > 5 ? `${n} jours` : `${n} / 5`}</b>
      <span style={{ display: 'flex', gap: 4, alignItems: 'center' }} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => carre(i, i < m, false))}
        {n >= 5 && [5, 6].map((i) => carre(i, i < n, true))}
      </span>
      {n < 5 && <small>{encore(n)}</small>}
      {n === 5 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, '--r': '-3deg', transform: 'rotate(-3deg)', animation: pop } as Css} aria-hidden="true">
          <b style={{ padding: '3px 10px', borderRadius: '50%', border: '2.5px solid #111', background: '#fff', fontFamily: JP, fontWeight: 900, fontSize: 14 }}>つづく…</b>
          <small style={{ fontSize: 11, fontWeight: 900, fontStyle: 'italic' }}>À SUIVRE</small>
        </span>
      )}
      {n === 6 && <b style={{ padding: '3px 8px', background: '#111', color: '#fff', fontSize: 11, fontWeight: 900, fontStyle: 'italic', letterSpacing: '.04em', '--r': '-3deg', transform: 'rotate(-3deg)', animation: pop } as Css} aria-hidden="true">CHAPITRE BONUS</b>}
      {n >= 7 && (
        <>
          <small style={{ fontWeight: 800, fontStyle: 'italic', color: '#c62832' }}>Fin du volume !</small>
          {auj && <i style={abs({ right: -14, top: -14, width: 120, height: 120, background: 'repeating-conic-gradient(from 0deg, rgba(17,17,17,.3) 0 2deg, transparent 2deg 10deg)', WebkitMaskImage: 'radial-gradient(circle, transparent 22%, #000 30%, transparent 62%)', maskImage: 'radial-gradient(circle, transparent 22%, #000 30%, transparent 62%)', animation: 'cmb-vitesse .8s ease-out .15s both' })} />}
          <span style={abs({ right: 8, top: 10, width: 46, height: 50, boxSizing: 'border-box', border: '3px solid #e63946', borderRadius: 6, background: 'rgba(255,255,255,.9)', color: '#e63946', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1, '--r': '10deg', transform: 'rotate(10deg)', animation: auj ? TAMPON(0.2) : 'none' })} aria-hidden="true">
            <b style={{ fontFamily: JP, fontWeight: 900, fontSize: 24 }}>完</b>
            <small style={{ fontSize: 9, fontWeight: 900, marginTop: 2 }}>FIN</small>
          </span>
        </>
      )}
    </>
  );
}

/* ================================================================== BD pop */
/** BD pop : « BOOM ! » sur la trame, puis trois bandes de BD (posé sur document.body). */
export function TransitionBD() {
  const bande = (top: number, anim: string, kids?: ReactNode) => (
    <span style={abs({ left: 0, right: 0, top: `${top}%`, height: '34%', boxSizing: 'border-box', background: '#fff', border: '4px solid #1a1a1a', animation: anim })}>{kids}</span>
  );
  return (
    <div className="cmb-plein" style={abs({ position: 'fixed', inset: 0, zIndex: 1000, overflow: 'hidden', backgroundColor: '#ffd23f', backgroundImage: 'radial-gradient(rgba(230,57,70,.45) 2.6px, transparent 3.2px)', backgroundSize: '12px 12px', animation: 'cmb-voile .15s ease-out both, cmb-fondu .25s ease-in 1.45s forwards' })} aria-hidden="true">
      <Burst pos={{ left: '50%', top: '22%', marginLeft: -200 }} w={400} h={340} fond="#fff" r={-6} anim="cmb-pop .35s cubic-bezier(.3,1.5,.5,1) .05s both" />
      <Burst pos={{ left: '50%', top: 'calc(22% + 50px)', marginLeft: -150 }} w={300} h={240} fond="#e63946" r={4} anim={POP(0.2)} txt="BOOM !" txtSt={{ fontSize: 66, color: '#ffd23f', textShadow: contour('#1a1a1a', 4) }} />
      {bande(0, 'cmb-bande-g .3s ease-out .85s both')}
      {bande(33, 'cmb-bande-d .3s ease-out .95s both', (
        <span style={{ position: 'absolute', left: 0, top: 0, padding: '5px 10px', background: '#ffd23f', borderRight: '3px solid #1a1a1a', borderBottom: '3px solid #1a1a1a', fontFamily: ARC, fontWeight: 900, fontSize: 13, textTransform: 'uppercase', color: '#1a1a1a' }}>Pendant ce temps, en Révision…</span>
      ))}
      {bande(66, 'cmb-bande-g .3s ease-out 1.05s both')}
    </div>
  );
}

function EffetsBD({ frappe }: { frappe: string }) {
  const noir = contour('#1a1a1a', 2.5);
  if (frappe === 'again') return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={abs({ inset: 0, width: '100%', height: '100%', overflow: 'visible' })}>
        <Trait d="M0 38 L16 46 L28 36 L44 54 L58 44 L72 60 L86 50 L100 62" anim="cmb-dessin .3s ease-out .1s both" stroke="#1a1a1a" w={1.4} />
      </svg>
      <Burst pos={{ left: '50%', top: '30%', marginLeft: -92 }} w={184} h={128} fond="#e63946" r={-8} anim={POP(0.15)} txt="CRAC !" txtSt={{ fontSize: 40, color: '#fff', textShadow: noir }} />
    </>
  );
  if (frappe === 'hard') return (
    <>
      <Burst pos={{ right: 6, top: '16%' }} w={144} h={104} fond="#ff8c1a" r={10} anim={POP(0.05)} txt="AÏE !" txtSt={{ fontSize: 34, color: '#fff', textShadow: noir }} />
      <span style={abs({ left: '24%', top: '32%', width: 0, height: 0 })}>
        {[0, 1, 2].map((i) => <i key={i} style={abs({ left: -8, top: -8, width: 16, height: 16, background: '#ffd23f', clipPath: ETOILE, filter: 'drop-shadow(1.5px 1.5px 0 #1a1a1a)', animation: `cmb-orbite .9s linear ${(-0.3 * i).toFixed(2)}s 2` })} />)}
      </span>
    </>
  );
  if (frappe === 'good') return (
    <>
      <span style={abs({ left: '50%', top: 'calc(30% + 56px)', width: 0, height: 0 })}>
        {Array.from({ length: 10 }, (_, i) => <i key={i} style={abs({ left: 0, top: -2, width: 26, height: 4, background: '#1a1a1a', transformOrigin: '0 50%', '--a': `${i * 36 + 8}deg`, animation: `cmb-rayon .6s ease-out ${(0.15 + (i % 3) * 0.04).toFixed(2)}s both` })} />)}
      </span>
      <Burst pos={{ left: '50%', top: '30%', marginLeft: -82 }} w={164} h={116} fond="#1d4ed8" r={-6} anim={POP(0.05)} txt="POW !" txtSt={{ fontSize: 42, color: '#ffd23f', textShadow: noir }} />
    </>
  );
  return (
    <>
      <i style={abs({ left: '50%', top: '42%', width: 320, height: 320, margin: '-160px 0 0 -160px', borderRadius: '50%', backgroundImage: 'radial-gradient(rgba(230,57,70,.6) 2.6px, transparent 3.2px)', backgroundSize: '12px 12px', WebkitMaskImage: 'radial-gradient(circle, #000 35%, transparent 70%)', maskImage: 'radial-gradient(circle, #000 35%, transparent 70%)', animation: 'cmb-halo 1.3s ease-out both' })} />
      <Eclats n={10} d={120} cols={['#ffd23f', '#e63946', '#1d4ed8']} size={18} del={0.3} pos={{ top: '42%' }} forme={ETOILE} />
      <Burst pos={{ left: '50%', top: '26%', marginLeft: -102 }} w={204} h={138} fond="#16a34a" r={6} anim={POP(0.1)} txt="WAOUH !" txtSt={{ fontSize: 38, color: '#ffd23f', textShadow: noir }} />
    </>
  );
}

function SemaineBD({ faits: n, auj }: { faits: number; auj: boolean }) {
  const m = Math.min(n, 5);
  const MOTS = ['PAF', 'BAM', 'ZIP', 'POW', 'BOUM'];
  const FONDS = ['#e63946', '#1d4ed8', '#16a34a', '#ff8c1a', '#e63946'];
  const PENTES = [-10, 8, -6, 10, -8];
  const pop = auj ? POP(0.2) : 'none';
  const encadre = (t: string, fond: string) => <b style={{ padding: '3px 8px', background: fond, border: '2.5px solid #1a1a1a', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap', '--r': '-2deg', transform: 'rotate(-2deg)', animation: pop } as Css} aria-hidden="true">{t}</b>;
  return (
    <>
      <b>{n > 5 ? `${n} jours` : `${n} / 5`}</b>
      <span style={{ display: 'flex', gap: 2, alignItems: 'center' }} aria-hidden="true">
        {MOTS.map((mot, i) => {
          const on = i < m;
          return (
            <span key={mot} style={{ position: 'relative', flex: 'none', width: 24, height: 22, '--r': `${PENTES[i]}deg`, transform: `rotate(${PENTES[i]}deg)`, animation: on && auj && i === n - 1 ? POP(0) : 'none' } as Css}>
              <i style={{ position: 'absolute', inset: 0, background: on ? '#1a1a1a' : 'rgba(26,26,26,.22)', clipPath: BURST }} />
              <i style={{ position: 'absolute', inset: on ? 2 : 1.5, background: on ? FONDS[i] : '#fff', clipPath: BURST }} />
              {on && <b style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: ARC, fontSize: 6.5, fontWeight: 900, lineHeight: 1, color: '#fff', textShadow: contour('#1a1a1a', 0.8) }}>{mot}</b>}
            </span>
          );
        })}
      </span>
      {n < 5 && <small>{encore(n)}</small>}
      {n === 5 && encadre('Semaine bouclée !', '#ffd23f')}
      {n === 6 && encadre('À suivre…', '#fff')}
      {n >= 7 && (
        <>
          {encadre('Fin de l’épisode', '#ffd23f')}
          {auj && <i style={abs({ right: -30, top: -30, width: 130, height: 130, borderRadius: '50%', backgroundImage: 'radial-gradient(rgba(29,78,216,.55) 2.4px, transparent 3px)', backgroundSize: '10px 10px', WebkitMaskImage: 'radial-gradient(circle, #000 30%, transparent 68%)', maskImage: 'radial-gradient(circle, #000 30%, transparent 68%)', animation: 'cmb-halo 1.2s ease-out .1s both' })} />}
          <Burst pos={{ right: -10, top: -8, transform: 'rotate(-10deg)' }} w={78} h={60} fond="#e63946" r={-10} anim={auj ? POP(0.2) : 'none'} txt="FIN !" txtSt={{ fontSize: 18, color: '#fff', textShadow: contour('#1a1a1a', 2) }} />
        </>
      )}
    </>
  );
}

/* ================================================================== exports communs */
/** « Cette semaine » des trois apparences, sous le titre de la tuile. */
export function SemaineCMB({ style, faits, auj }: { style: Style3; faits: number; auj: boolean }) {
  return (
    <span className={`cmb-sem ${style}`}>
      {style === 'voyage' ? <SemaineVoyage faits={faits} auj={auj} /> : style === 'manga' ? <SemaineManga faits={faits} auj={auj} /> : <SemaineBD faits={faits} auj={auj} />}
    </span>
  );
}

/** Ce qui se pose sur la carte pendant la note. */
export function EffetsCMB({ style, frappe }: { style: Style3; frappe: string }) {
  return (
    <span className="cmb-fx" aria-hidden="true">
      {style === 'voyage' ? <EffetsVoyage frappe={frappe} /> : style === 'manga' ? <EffetsManga frappe={frappe} /> : <EffetsBD frappe={frappe} />}
    </span>
  );
}
