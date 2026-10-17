/**
 * CHANTIER 291 — LA VEILLE DU CONTRÔLE, EN TÊTE D'« AUJOURD'HUI ».
 *
 * Pour chaque paquet en jeu dont le contrôle est demain et qui a des mots
 * ratés à la dernière révision : un encart et un bouton qui ne révise
 * qu'eux. Posé au-dessus de l'écran, il vaut pour toutes les apparences.
 */
import { useEffect, useState } from 'react';
import type { Deck } from '../domain/types';
import { repository } from '../data/repository';
import { motsRates, resteControle } from '../engine/controle';

export function VeilleControle({
  decks, active, onRates,
}: {
  decks: Deck[];
  active: string[];
  onRates: (id: string) => void;
}) {
  const [veille, setVeille] = useState<Array<{ id: string; nom: string; n: number }>>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cibles = decks.filter((d) => active.includes(d.id) && resteControle(d) === 1);
      const out: Array<{ id: string; nom: string; n: number }> = [];
      for (const d of cibles) {
        const [cards, progress, themes] = await Promise.all([
          repository.getCards(d.id),
          repository.getProgress(d.id),
          repository.getThemes(d.id),
        ]);
        const visible = themes && themes.length ? cards.filter((c) => themes.includes(c.theme)) : cards;
        const n = motsRates(visible, progress).length;
        if (n > 0) out.push({ id: d.id, nom: d.name, n });
      }
      if (alive) setVeille(out);
    })();
    return () => { alive = false; };
  }, [decks, active]);

  if (!veille.length) return null;
  return (
    <div className="veille-ctrl" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
      {veille.map((v) => (
        <div key={v.id} className="goal">
          <b>Contrôle demain · {v.nom}</b>
          <p>
            {v.n} mot{v.n > 1 ? 's' : ''} raté{v.n > 1 ? 's' : ''} à ta dernière révision.
            Un dernier passage dessus avant le contrôle.
          </p>
          <button className="btn" onClick={() => onRates(v.id)}>
            Réviser les mots ratés ({v.n})
          </button>
        </div>
      ))}
    </div>
  );
}
