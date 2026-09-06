/**
 * Recherche dans les mots.
 *
 * Cherche dans les deux langues et dans les thèmes, sur les paquets de la
 * collection. Les cartes sont chargées une fois, à l'ouverture de l'écran :
 * quelques centaines de lignes en mémoire coûtent moins qu'une lecture de
 * la base à chaque lettre tapée.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Deck } from '../domain/types';
import { repository } from '../data/repository';

interface Entree {
  cardId: string;
  en: string;
  fr: string;
  theme: string;
  deckId: string;
  deckName: string;
}

/** Sans accents ni casse : « éleve » doit trouver « élève ». */
function pliable(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function Search({
  decks, installed, onOpen,
}: {
  decks: Deck[];
  installed: string[];
  onOpen: (deckId: string) => void;
}) {
  const [tout, setTout] = useState<Entree[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Entree[] = [];
      for (const deck of decks.filter((d) => installed.includes(d.id))) {
        for (const c of await repository.getCards(deck.id)) {
          out.push({
            cardId: c.id,
            en: c.en,
            fr: c.fr,
            theme: c.theme,
            deckId: deck.id,
            deckName: deck.name,
          });
        }
      }
      if (alive) setTout(out);
    })();
    return () => { alive = false; };
  }, [decks, installed]);

  const resultats = useMemo(() => {
    if (!tout) return [];
    const terme = pliable(q.trim());
    if (terme.length < 2) return [];
    /*
     * Les mots qui commencent par le terme d'abord : en tapant « go », on
     * cherche « go », pas « ago » ni « bingo ».
     */
    const debut: Entree[] = [];
    const dedans: Entree[] = [];
    for (const e of tout) {
      const en = pliable(e.en);
      const fr = pliable(e.fr);
      if (en.startsWith(terme) || fr.startsWith(terme)) debut.push(e);
      else if (en.includes(terme) || fr.includes(terme) || pliable(e.theme).includes(terme)) {
        dedans.push(e);
      }
    }
    return [...debut, ...dedans].slice(0, 60);
  }, [tout, q]);

  const terme = q.trim();

  return (
    <>
      <h2 className="screen-title">Rechercher</h2>

      <input
        className="searchfield"
        type="text"
        value={q}
        autoFocus
        placeholder="Un mot, en français ou en anglais…"
        onChange={(e) => setQ(e.target.value)}
      />

      {tout === null && <p className="hint">Chargement des mots…</p>}

      {tout !== null && terme.length > 0 && terme.length < 2 && (
        <p className="hint">Encore une lettre.</p>
      )}

      {tout !== null && terme.length >= 2 && resultats.length === 0 && (
        <p className="hint">
          Aucun mot ne correspond. La recherche ne porte que sur les paquets de
          votre collection.
        </p>
      )}

      {resultats.length > 0 && (
        <>
          <p className="rayon-label">
            {resultats.length === 60 ? '60 premiers résultats' : `${resultats.length} résultat${resultats.length > 1 ? 's' : ''}`}
          </p>
          <div className="hits">
            {resultats.map((e) => (
              <button key={e.cardId} className="hit" onClick={() => onOpen(e.deckId)}>
                <span className="hit-fr">{e.fr}</span>
                <span className="hit-en">{e.en}</span>
                <span className="hit-meta">{e.deckName} · {e.theme}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {tout !== null && tout.length === 0 && (
        <p className="hint">
          Votre collection est vide : ajoutez un paquet depuis le catalogue.
        </p>
      )}
    </>
  );
}
