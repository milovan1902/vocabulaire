/**
 * CHANTIER 165 — L'ÉVENTAIL DES PAQUETS (style Lycée, écran « Aujourd'hui »).
 *
 * Les paquets à réviser sont posés en éventail ; celui du centre est le
 * paquet choisi. Quatre façons de changer de paquet, pour que personne ne
 * reste bloqué :
 *   — glisser à gauche ou à droite (plus de 40 px) ;
 *   — toucher une carte de côté : elle vient au centre ;
 *   — au clavier, les flèches gauche et droite ;
 *   — toucher la carte du centre (ou Entrée) ouvre la fiche du paquet.
 *
 * L'éventail ne décide rien : il dit quel paquet est au centre (`onCentre`)
 * et lequel ouvrir (`onOuvrir`). C'est « Aujourd'hui » qui retient le choix.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { DeckSummary } from './deckSummary';
import { DeckFace } from './components';

export function Eventail({
  paquets, centre, onCentre, onOuvrir, forme = 'eventail',
}: {
  paquets: DeckSummary[];
  /** CHANTIER 171 — 'orbite' : les paquets voisins montent sur l'anneau de la planète. */
  /** CHANTIER 213 — 'portant' (Fashion week) : des housses pendues à une tringle ; celle du centre
      de face, ses voisines de profil. Au changement de paquet, elles se décrochent, glissent, se raccrochent. */
  /** CHANTIER 216 — 'pellicule' (Cinéma muet) : les paquets sont les images d'une bande perforée, qui
      défile pour amener le paquet choisi sous le projecteur. 'rayon' (Bibliothèque) : les paquets
      sont des livres rangés, vus par le dos ; celui du centre sort du rang et se présente de face. */
  /** CHANTIER 223 — 'cloche' (Salon de thé) : le paquet du centre sur un présentoir, sous une cloche de verre
      qui se soulève au changement ; 'bocaux' (Cabinet 1900) : des bocaux de verre, celui du centre s'allume. */
  /** CHANTIER 227 — 'maison' (Japon zen) : le paquet sur le pas de la porte d'une maison japonaise, dont les
      panneaux se ferment et se rouvrent ; 'pupitres' (Cotton Club) : des partitions sur des pupitres, sous un projecteur. */
  /** CHANTIER 235 — 'planches' (Plage et surf) : les paquets sont des planches de surf plantées dans le sable ;
      'chateau' (Château) : le paquet dans la porte d'un château, derrière un pont-levis. */
  /** CHANTIER 237 — 'caisses' (Jungle et safari) : le paquet est une caisse suspendue à une liane ;
      'train' (Pacific Express) : le paquet voyage sur le wagon d'une locomotive, sur un pont de bois. */
  forme?: 'eventail' | 'orbite' | 'portant' | 'pellicule' | 'rayon' | 'cloche' | 'bocaux' | 'maison' | 'pupitres' | 'planches' | 'chateau' | 'caisses' | 'train' | 'panier';
  centre: number;
  onCentre: (i: number) => void;
  onOuvrir: (i: number) => void;
}) {
  const [dx, setDx] = useState(0);
  const [glisse, setGlisse] = useState(false);
  const depart = useRef<{ x: number; cible: number | null } | null>(null);
  /* CHANTIER 213 — le nombre de changements de paquet : relance le décrochage (deux noms
     d'animation qui alternent, sans démonter les housses). Rien à l'ouverture de l'écran. */
  const [coups, setCoups] = useState(0);
  const centrePrec = useRef(centre);
  /* CHANTIER 235 — le paquet qui vient de quitter le centre, et de quel côté il part (Plage : la planche
     se couche du côté de la flèche touchée). */
  const [ancien, setAncien] = useState<{ i: number; d: 'g' | 'd' } | null>(null);
  useEffect(() => {
    if (centrePrec.current !== centre) {
      setAncien({ i: centrePrec.current, d: centre > centrePrec.current ? 'd' : 'g' });
      centrePrec.current = centre;
      setCoups((c) => c + 1);
      /* CHANTIER 238 — Parquet : le tableau d'affichage (FondAnime.tsx) marque deux points quand le ballon entre. */
      if (forme === 'panier') window.setTimeout(() => window.dispatchEvent(new Event('bk-panier')), 850);
    }
  }, [centre]);
  const por = forme === 'portant';
  const pel = forme === 'pellicule';
  const ray = forme === 'rayon';
  const clo = forme === 'cloche';
  const boc = forme === 'bocaux';
  const mai = forme === 'maison';
  const pup = forme === 'pupitres';
  const pla = forme === 'planches';
  const cha = forme === 'chateau';
  const cai = forme === 'caisses';
  const tra = forme === 'train';
  /* CHANTIER 238 — Parquet : le paquet sur le panneau du panier. */
  const pan = forme === 'panier';
  const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  /* CHANTIER 237 — Jungle : le perroquet passe toutes les 10 à 20 s. Il vole (1,15 s), se pose (4,45 s),
     puis repart (1,4 s). La phase dit au CSS quand les ailes battent. */
  const [pq, setPq] = useState(0);
  const [ph, setPh] = useState<'' | 'vol' | 'pose'>('');
  useEffect(() => {
    if (!cai || calme) return;
    const t: number[] = [];
    let b = 0;
    const visite = () => {
      setPq((c) => c + 1); setPh('vol');
      t.push(window.setTimeout(() => setPh('pose'), 1150));
      t.push(window.setTimeout(() => setPh('vol'), 5600));
      t.push(window.setTimeout(() => setPh(''), 7000));
    };
    const boucle = (d: number) => { b = window.setTimeout(() => { visite(); boucle(10000 + Math.random() * 10000); }, d); };
    boucle(2500);
    return () => { window.clearTimeout(b); t.forEach((x) => window.clearTimeout(x)); };
  }, [cai, calme]);
  /* CHANTIER 237 — Pacific Express : une boule d'herbe roule devant le pont toutes les 10 à 20 s. */
  const [boule, setBoule] = useState(0);
  useEffect(() => {
    if (!tra || calme) return;
    let t = 0;
    const boucle = (d: number) => { t = window.setTimeout(() => { setBoule((c) => c + 1); boucle(10000 + Math.random() * 10000); }, d); };
    boucle(4000);
    return () => window.clearTimeout(t);
  }, [tra, calme]);
  /* CHANTIER 235 — Plage : le bernard-l'ermite sort de sa coquille toutes les 10 à 20 s. */
  const [crabe, setCrabe] = useState(0);
  useEffect(() => {
    if (!pla || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let t = 0;
    const boucle = () => { t = window.setTimeout(() => { setCrabe((c) => c + 1); boucle(); }, 10000 + Math.random() * 10000); };
    boucle();
    return () => window.clearTimeout(t);
  }, [pla]);
  /* CHANTIER 235 — Château : le cycle jour / nuit (40 s) suit l'horloge, calculé une fois au montage :
     le fond (Salle.tsx) et le château restent d'accord. */
  const [cycle] = useState(() => `${-((Date.now() / 1000) % 40)}s`);
  const v = coups ? ` v${coups % 2}` : '';
  /* CHANTIER 216 — le pas de la pellicule, et la forme des livres (dos de 30 px). */
  const PAS = 124;
  const DOS = 30, JEU = 3, LARGE = 126, HAUT = 178;
  const HAUTEURS = [150, 162, 146, 160, 152, 158, 148];

  const aller = (i: number) => onCentre(Math.max(0, Math.min(paquets.length - 1, i)));
  const fin = () => { depart.current = null; setGlisse(false); setDx(0); };

  return (
    <div
      className={`eventail${forme === 'orbite' ? ' orbite' : ''}${por ? ' portant' : ''}${pel ? ' pellicule' : ''}${ray ? ' rayon' : ''}${clo ? ' cloche' : ''}${boc ? ' bocaux' : ''}${mai ? ' maison' : ''}${pup ? ' pupitres' : ''}${pla ? ' planches' : ''}${cha ? ' chateau' : ''}${cai ? ' caisses' : ''}${tra ? ' train' : ''}${pan ? ' panier' : ''}${pla || cha || cai || tra || pan ? v : ''}${glisse ? ' glisse' : ''}`}
      style={pel ? ({ '--decal': `${-centre * PAS + dx * 0.6}px` } as CSSProperties) : cha || tra ? ({ '--cycle': cycle } as CSSProperties) : undefined}
      role="listbox"
      aria-label="Paquets à réviser : flèches gauche et droite pour changer"
      tabIndex={0}
      onPointerDown={(e) => {
        const el = (e.target as HTMLElement).closest('[data-i]');
        depart.current = { x: e.clientX, cible: el ? Number(el.getAttribute('data-i')) : null };
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setGlisse(true);
      }}
      onPointerMove={(e) => { if (depart.current) setDx(e.clientX - depart.current.x); }}
      onPointerUp={(e) => {
        const d0 = depart.current;
        fin();
        if (!d0) return;
        const d = e.clientX - d0.x;
        if (Math.abs(d) > 40) { aller(centre + (d < 0 ? 1 : -1)); return; }
        if (d0.cible == null) return;
        if (d0.cible !== centre) aller(d0.cible);
        else onOuvrir(d0.cible);
      }}
      onPointerCancel={fin}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); aller(centre + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); aller(centre - 1); }
        else if (e.key === 'Enter') onOuvrir(centre);
      }}
    >
      {/* CHANTIER 172 — la moitié AVANT de l'anneau, posée devant la planète.
          La moitié arrière est l'anneau entier (::after), caché par la planète. */}
      {/* CHANTIER 187 — l'anneau devient un disque argenté. La partie avant n'est plus
          une moitié d'anneau : c'est le seul morceau qui passe DEVANT la planète,
          découpé à sa forme. Plus de jonction visible entre deux moitiés. */}
      {forme === 'orbite' && <i className="orbite-avant" aria-hidden="true"><i /></i>}
      {/* CHANTIER 187 — trois satellites en orbite autour de la planète. */}
      {/* CHANTIER 216 — la bande perforée, sous les images ; ses perforations glissent avec elles. */}
      {pel && <i className="pellicule-bande" aria-hidden="true" />}
      {/* CHANTIER 227 — Japon zen : la maison (toit, murs, porte ouverte, perron), le cerisier et la lanterne. */}
      {mai && (
        <span className="jp-maison" aria-hidden="true">
          <i className="toit" /><i className="faitage" /><i className="avant-toit" /><i className="murs" /><i className="entree" /><i className="linteau" />
          <i className="perron" /><i className="pierre" />
          <span className="lanterne"><i /><i /><i /><i /></span>
          <span className="cerisier"><i className="tronc" /><i className="b1" /><i className="b2" /><i className="b3" /><i className="f1" /><i className="f2" /><i className="f3" /><i className="f4" /><i className="f5" /><i className="f6" /><i className="f7" /></span>
        </span>
      )}
      {/* CHANTIER 235 — Plage et surf : trois coquillages, le bernard-l'ermite.
          CHANTIER 236 — plus de dune : les planches sont plantées dans la grande plage ; des éclats sur la mer. */}
      {pla && (
        <span className="su-plage" aria-hidden="true">
          <i className="su-eclat e1" /><i className="su-eclat e2" /><i className="su-eclat e3" /><i className="su-eclat e4" />
          <i className="su-coq c1" /><i className="su-coq c2" /><i className="su-coq c3" />
          <span className={`su-bernard${crabe ? ` v${crabe % 2}` : ''}`}><span className="corps"><i className="pattes" /><i className="yeux" /><i className="coquille" /></span></span>
        </span>
      )}
      {/* CHANTIER 235 — Château : deux tours, le rempart, la porte et ses bannières ; deux archers derrière les
          créneaux (le jour) ; les lueurs des meurtrières (la nuit). */}
      {cha && (
        <span className="ch-chateau" aria-hidden="true">
          <i className="ch-ombre-sol" />
          <span className="ch-jour">
            <span className="ch-archer a"><span className="miroir"><i className="tabard" /><i className="ceinture" /><i className="visage" /><i className="oeil" /><i className="casque" /><i className="bord" /><i className="plumet" /><i className="bras" /><i className="arc" /><i className="corde" /><i className="encoche" /></span></span>
            <span className="ch-archer b"><span className="miroir"><i className="tabard" /><i className="ceinture" /><i className="visage" /><i className="oeil" /><i className="casque" /><i className="bord" /><i className="plumet" /><i className="bras" /><i className="arc" /><i className="corde" /><i className="encoche" /></span></span>
            <i className="ch-fleche a" /><i className="ch-fleche b" />
            <span className="ch-rempart"><i className="fenetre f1" /><i className="fenetre f2" /></span>
            <span className="ch-tour g"><i className="corniche" /><i className="toit" /><i className="lisere" /><i className="mat" /><i className="drapeau" /><i className="meurtriere" /></span>
            <span className="ch-tour d"><i className="corniche" /><i className="toit" /><i className="lisere" /><i className="mat" /><i className="drapeau" /><i className="meurtriere" /></span>
            <span className="ch-porte"><i className="corniche" /><i className="banniere g" /><i className="banniere d" /><span className="arche"><i className="herse" /></span><i className="cle" /></span>
          </span>
          <i className="ch-lueur l1" /><i className="ch-lueur l2" /><i className="ch-lueur l3" /><i className="ch-lueur l4" />
        </span>
      )}
      {/* CHANTIER 237 — Jungle : la liane fleurie, et le perroquet qui vient s'y poser. */}
      {cai && (
        <span className="jg-scene" aria-hidden="true">
          <i className="liane" /><i className="fleur f1" /><i className="fleur f2" /><i className="fleur f3" /><i className="fleur f4" />
          <i className="feuille l1" /><i className="feuille l2" /><i className="feuille l3" />
          <span className={`jg-perroquet${pq && ph ? ` v${pq % 2} ${ph}` : ''}`}>
            <span className="miroir"><span className="corps">
              <i className="queue" /><i className="aile2" /><i className="ventre" /><i className="aile" />
              <span className="tete"><i className="bec" /></span><i className="pattes" />
            </span></span>
          </span>
        </span>
      )}
      {/* CHANTIER 237 — Pacific Express : le pont (il vibre au passage), le train (il part du côté de la flèche
          et revient de l'autre), la fumée, les étincelles, la lanterne de nuit, la boule d'herbe. */}
      {tra && (
        <span className="pe-scene" aria-hidden="true">
          <span className={`pe-pont${v}`}><span className="pe-ombre"><i className="tablier" /><i className="treillis" /><i className="rails" /></span></span>
          <span className={`pe-train${ancien && coups ? ` ${ancien.d}${v}` : ''}`}>
            <span className="pe-ombre">
              <i className="plateau g" /><i className="roue r1" /><i className="roue r2" /><i className="cargo" /><i className="attache a" />
              <i className="montant m1" /><i className="montant m2" /><i className="barre" />
              <i className="plateau c" /><i className="roue r3" /><i className="roue r4" /><i className="attache b" />
              <i className="toit" /><i className="cabine" /><i className="fenetre" /><i className="chaudiere" /><i className="dome" /><i className="cheminee" /><i className="phare" /><i className="chasse" />
              <i className="roue r5" /><i className="roue r6" /><i className="roue r7" /><i className="bielle" />
              <span className={`pe-fumee${v}`}><i /><i /><i /><i className="f" /><i className="f" /><i className="f" /><i className="f" /><i className="f" /></span>
              <span className={`pe-etincelles${ancien && coups ? ` ${ancien.d}${v}` : ''}`}><i /><i /><i /><i /><i /><i /><i /><i /></span>
            </span>
            <i className="lanterne" /><i className="lanterne l2" />
          </span>
          <span className={`pe-boule${boule ? ` v${boule % 2}` : ''}`}><i /></span>
        </span>
      )}
      {/* CHANTIER 238 — Parquet : les panneaux voisins, le mât et le panneau du centre (derrière le paquet). */}
      {pan && (
        <span className="bk-scene" aria-hidden="true">
          <i className="voisin g" /><i className="mat-v g" /><i className="voisin d" /><i className="mat-v d" />
          <i className="mat" /><i className={`panneau${v}`} />
        </span>
      )}
      {/* CHANTIER 227 — Cotton Club : le projecteur, le plancher, le saxophoniste et ses notes. */}
      {pup && <i className={`jz-faisceau${v}`} aria-hidden="true" />}
      {pup && <i className="jz-plancher" aria-hidden="true" />}
      {pup && (
        <span className="jz-sax" aria-hidden="true">
          <i className="tete" /><i className="chapeau" /><i className="bord" /><i className="corps" /><i className="jambe g" /><i className="jambe d" />
          <i className="tube" /><i className="col" /><i className="pavillon" /><i className="bras" />
          <i className="note n1">♪</i><i className="note n2">♫</i><i className="note n3">♪</i>
        </span>
      )}
      {/* CHANTIER 223 — Salon de thé : le présentoir (plateau, pied, deux assiettes), puis la cloche, posée après les cartes. */}
      {clo && <i className="cloche-assiette g" aria-hidden="true" />}
      {clo && <i className="cloche-assiette d" aria-hidden="true" />}
      {clo && <i className="cloche-plateau" aria-hidden="true" />}
      {clo && <i className="cloche-pied" aria-hidden="true" />}
      {/* CHANTIER 222 — Bibliothèque : le chat noir marche sur la planche, devant les livres. */}
      {ray && (
        <span className="bi-chat" aria-hidden="true">
          <span className="bi-chat-corps">
            <i className="bi-c-queue" />
            <i className="bi-c-dos" />
            <i className="bi-c-patte p1" />
            <i className="bi-c-patte p2" />
            <i className="bi-c-patte p3" />
            <i className="bi-c-patte p4" />
            <i className="bi-c-tete" />
            <i className="bi-c-oreille o1" />
            <i className="bi-c-oreille o2" />
            <i className="bi-c-oeil" />
          </span>
        </span>
      )}
      {forme === 'orbite' && <span className="orbite-lunes" aria-hidden="true"><i><i /></i><i><i /></i><i><i /></i></span>}
      {paquets.map((r, i) => {
        const o = i - centre;
        const a = Math.abs(o);
        const s = Math.sign(o);
        const orb = forme === 'orbite';
        const x = (a === 0 ? 0 : a === 1 ? (orb ? 108 : 82) * s : (orb ? 150 : 130) * s) + dx * 0.6;
        const y = orb && a > 0 ? -34 : 0;
        const rot = a === 0 ? dx * 0.04 : a === 1 ? (orb ? 14 : 10) * s : 16 * s;
        const k = a === 0 ? 1 : a === 1 ? (orb ? 0.66 : 0.86) : 0.6;
        const xp = (a === 0 ? 0 : a === 1 ? 100 * s : 170 * s) + dx * 0.6;
        const hDos = HAUTEURS[i % HAUTEURS.length];
        const xr = (a === 0 ? 0 : s * (LARGE / 2 + JEU + DOS / 2 + (a - 1) * (DOS + JEU))) + dx * 0.6;
        const transform = por
          ? `perspective(700px) translateX(${xp}px) rotateY(${a === 0 ? dx * 0.12 : -72 * s}deg) scale(${k})`
          : pel
            ? `translateX(${o * PAS + dx * 0.6}px) scale(${a === 0 ? 1 : 0.92})`
            : ray
              ? `translate(${xr}px, ${a === 0 ? -6 : HAUT - hDos}px)`
              : clo
                ? /* CHANTIER 225 — les gâteaux ne suivent plus le doigt : au relâché, la cloche se lève d'abord,
                     puis le gâteau glisse, comme avec les flèches. */
                  (a === 0 ? 'scale(0.74)' : `translate(${118 * s}px, -18px) rotate(${4 * s}deg) scale(0.5)`)
                : pla
                  ? (a === 0 ? `translateX(${dx * 0.6}px)` : `translate(${118 * s + dx * 0.6}px, 36px) rotate(${14 * s}deg) scale(0.5)`)
                : cha
                  ? 'scale(0.7)'
                : cai
                  ? (a === 0 ? 'scale(0.62)' : `translate(${120 * s}px, 34px) scale(0.36)`)
                : tra
                  ? 'scale(0.62)'
                : pan
                  ? 'none'
                : mai
                  ? 'scale(0.62)'
                : pup
                  ? (a === 0 ? 'scale(0.86)' : `translate(${126 * s}px, 40px) scale(0.55)`)
                : boc
                  ? (a === 0 ? `translateX(${dx * 0.6}px)` : `translate(${122 * s + dx * 0.6}px, 30px) scale(0.6)`)
                  : `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${k})`;
        const visible = tra || pan ? a === 0 : pel ? a <= 2 : ray ? a <= 5 : a <= 1;
        const dos = (
          <span className="eventail-dos">
            <DeckFace id={r.deck.id} name={r.deck.name} image={r.image} categoryId={r.deck.categoryId} />
          </span>
        );
        return (
          <div
            key={r.deck.id}
            data-i={i}
            role="option"
            aria-selected={a === 0}
            aria-label={`${r.deck.name}, ${r.due} carte${r.due > 1 ? 's' : ''} à revoir`}
            className={`eventail-carte${a === 0 ? ' centre' : ''}`}
            style={{
              transform,
              opacity: tra || pan ? (a === 0 || (ancien && ancien.i === i && coups && !calme) ? 1 : 0) : cai ? (a === 0 ? 1 : a === 1 ? 0.92 : 0) : (mai || cha) && a > 0 ? 0 : pla ? (a === 0 ? 1 : a === 1 ? 0.85 : 0) : pel ? (a === 0 ? 1 : a <= 2 ? 0.9 : 0) : ray ? (a <= 5 ? 1 : 0) : a === 0 ? 1 : a === 1 ? (por ? 0.85 : 0.72) : 0,
              zIndex: 10 - a,
              transition: glisse ? 'none' : undefined,
              pointerEvents: visible ? undefined : 'none',
              ...(ray ? { width: a === 0 ? LARGE : DOS, height: a === 0 ? HAUT : hDos, marginLeft: a === 0 ? -LARGE / 2 : -DOS / 2, aspectRatio: 'auto' } : {}),
            }}
          >
            {por ? <span className={`portant-vol${coups ? ` v${coups % 2}` : ''}`}>{dos}</span>
              /* CHANTIER 221 — Cinéma muet : l'image tressaute en s'arrêtant ; Bibliothèque : le livre penche avant de sortir. */
              : pel ? <span className={`pellicule-saut${coups ? ` v${coups % 2}` : ''}`}>{dos}</span>
              : ray ? <span className={`rayon-tire${coups ? ` v${coups % 2}` : ''}`}>{dos}</span>
              /* CHANTIER 223 — Cabinet 1900 : la lueur s'allume dans le bocal qui arrive. */
              : boc ? <span className={`bocal-lueur${coups ? ` v${coups % 2}` : ''}`}>{dos}</span>
              /* CHANTIER 227 — Cotton Club : la partition se soulève sous le projecteur. */
              : pup ? <span className={`pupitre-lift${v}`}>{dos}</span>
              /* CHANTIER 235 — Plage : la planche du centre sort du sable ; celle qui part se couche. */
              : pla ? <span className={`su-planche${!coups ? '' : a === 0 ? ` monte v${coups % 2}` : ancien && ancien.i === i ? ` couche-${ancien.d} v${coups % 2}` : ''}`}>{dos}</span>
              /* CHANTIER 237 — Jungle : la caisse du centre descend, celle qui part est hissée. Pacific Express :
                 le wagon qui part quitte l'écran, le suivant arrive de l'autre côté. */
              : cai ? <span className={`jg-caisse${!coups ? '' : a === 0 ? ` descend v${coups % 2}` : ancien && ancien.i === i ? ` hisse v${coups % 2}` : ''}`}><span className="jg-balance">{dos}</span></span>
              : tra ? <span className={`pe-wagon${!coups || !ancien ? '' : a === 0 ? ` arrive ${ancien.d} v${coups % 2}` : ancien.i === i ? ` part ${ancien.d} v${coups % 2}` : ''}`}>{dos}</span>
              /* CHANTIER 238 — Parquet : l'ancien paquet reste affiché jusqu'au panier, puis le nouveau s'allume. */
              : pan ? <span className={`bk-tableau-paquet${!coups || !ancien ? '' : a === 0 ? ` arrive v${coups % 2}` : ancien.i === i ? ` part v${coups % 2}` : ''}`}>{dos}</span>
              : dos}
            {a === 0 && r.due > 0 && <span className="eventail-due">{r.due}</span>}
            {/* CHANTIER 200 — la classe plancher (6e, 5e… ou « SC »), comme sur la liste et le
                paquet mis en avant : sœur du dos, pas fille, pour ne pas être rognée. Au bord bas ;
                le nombre de cartes dues reste au coin haut. */}
            {a === 0 && (r.deck.classeFrom || r.deck.sansCategorie) && (
              <span className="classdot eventail-classe">{r.deck.classeFrom ?? 'SC'}</span>
            )}
          </div>
        );
      })}
      {clo && <i className={`cloche-verre${coups ? ` v${coups % 2}` : ''}`} aria-hidden="true" />}
      {/* CHANTIER 224 — l'éclat de lumière qui glisse sur le verre quand la cloche se repose. */}
      {clo && <span className={`cloche-eclat${coups ? ` v${coups % 2}` : ''}`} aria-hidden="true"><i /></span>}
      {/* CHANTIER 227 — Japon zen : les panneaux coulissants et la bouffée de pétales, devant la carte. */}
      {mai && <i className={`jp-porte g${v}`} aria-hidden="true" />}
      {mai && <i className={`jp-porte d${v}`} aria-hidden="true" />}
      {mai && <span className={`jp-bouffee${v}`} aria-hidden="true"><i /><i /><i /></span>}
      {/* CHANTIER 235 — Plage : le jet de sable ; Château : le pont-levis, devant la porte. */}
      {pla && <span className={`su-sable${v}`} aria-hidden="true"><i /><i /><i /><i /><i /></span>}
      {cha && <span className="ch-pont-cadre" aria-hidden="true"><i className={`ch-pont${v}`} /></span>}
      {/* CHANTIER 238 — Parquet : le ballon tiré, le cercle et le filet, devant le paquet ; « +2 ». */}
      {pan && (
        <span className="bk-avant" aria-hidden="true">
          <i className="fixation" />
          <i className={`tir${ancien && coups ? ` ${ancien.d}${v}` : ''}`} />
          <i className="cercle" /><i className={`filet${v}`} />
          <b className={`plus2${v}`}>+2</b>
        </span>
      )}
      {/* CHANTIER 227 — Cotton Club : le rideau se lève à l'arrivée sur « Aujourd'hui ». */}
      {pup && <i className="jz-rideau" aria-hidden="true" />}
    </div>
  );
}
