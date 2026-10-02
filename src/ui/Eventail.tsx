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
import { useRef, useState } from 'react';
import type { DeckSummary } from './deckSummary';
import { DeckFace } from './components';

export function Eventail({
  paquets, centre, onCentre, onOuvrir, forme = 'eventail',
}: {
  paquets: DeckSummary[];
  /** CHANTIER 171 — 'orbite' : les paquets voisins montent sur l'anneau de la planète. */
  forme?: 'eventail' | 'orbite';
  centre: number;
  onCentre: (i: number) => void;
  onOuvrir: (i: number) => void;
}) {
  const [dx, setDx] = useState(0);
  const [glisse, setGlisse] = useState(false);
  const depart = useRef<{ x: number; cible: number | null } | null>(null);

  const aller = (i: number) => onCentre(Math.max(0, Math.min(paquets.length - 1, i)));
  const fin = () => { depart.current = null; setGlisse(false); setDx(0); };

  return (
    <div
      className={`eventail${forme === 'orbite' ? ' orbite' : ''}`}
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
      {paquets.map((r, i) => {
        const o = i - centre;
        const a = Math.abs(o);
        const s = Math.sign(o);
        const orb = forme === 'orbite';
        const x = (a === 0 ? 0 : a === 1 ? (orb ? 108 : 82) * s : (orb ? 150 : 130) * s) + dx * 0.6;
        const y = orb && a > 0 ? -34 : 0;
        const rot = a === 0 ? dx * 0.04 : a === 1 ? (orb ? 14 : 10) * s : 16 * s;
        const k = a === 0 ? 1 : a === 1 ? (orb ? 0.66 : 0.86) : 0.6;
        return (
          <div
            key={r.deck.id}
            data-i={i}
            role="option"
            aria-selected={a === 0}
            aria-label={`${r.deck.name}, ${r.due} carte${r.due > 1 ? 's' : ''} à revoir`}
            className={`eventail-carte${a === 0 ? ' centre' : ''}`}
            style={{
              transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${k})`,
              opacity: a === 0 ? 1 : a === 1 ? 0.72 : 0,
              zIndex: 10 - a,
              transition: glisse ? 'none' : undefined,
              pointerEvents: a > 1 ? 'none' : undefined,
            }}
          >
            <span className="eventail-dos">
              <DeckFace id={r.deck.id} name={r.deck.name} image={r.image} categoryId={r.deck.categoryId} />
            </span>
            {a === 0 && r.due > 0 && <span className="eventail-due">{r.due}</span>}
          </div>
        );
      })}
    </div>
  );
}
