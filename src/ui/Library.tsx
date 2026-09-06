/** Onglet « Paquets » : la collection, puis le catalogue. */
import { useEffect, useState } from 'react';
import type { Category, Deck, Settings } from '../domain/types';
import { CardBack, paletteFor } from './components';
import { loadSummaries, type DeckSummary } from './deckSummary';
import type { Auth } from './useAuth';

/**
 * Création de paquets par l'utilisateur.
 * Désactivée : la bibliothèque est un catalogue. Le code reste en place,
 * il suffit de repasser à true pour la réactiver.
 */
export const ALLOW_LOCAL_DECKS = false;

export function Library({
  decks, installed, categories, settings, auth,
  onOpen, onCreate, onAdd, onRemove,
}: {
  decks: Deck[];
  installed: string[];
  categories: Category[];
  settings: Settings;
  auth: Auth;
  /** Le second argument sert à faire voler la vignette jusqu'à l'écran suivant. */
  onOpen: (
    id: string,
    vol?: { image: string | null; from: DOMRect; total: number; due: number },
  ) => void;
  /** Création locale : masquée par défaut, voir ALLOW_LOCAL_DECKS. */
  onCreate: () => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [rows, setRows] = useState<DeckSummary[]>([]);
  const [tab, setTab] = useState<'mine' | 'catalog'>('mine');
  /** Paquet en cours de retournement : l'ouverture attend la fin du geste. */
  const [flipping, setFlipping] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const charge = await loadSummaries(decks, settings);
      if (alive) setRows(charge.summaries);
    })();
    return () => { alive = false; };
  }, [decks, settings]);

  /** Une carte de paquet, telle qu'elle apparaît dans « Mes paquets ». */
  function card({ deck, total, due, image }: DeckSummary) {
    const palette = paletteFor(deck.id);
    return (
      <button
        key={deck.id}
        className={`deckcard${flipping === deck.id ? ' flipping' : ''}`}
        style={{ ['--accent' as string]: palette.ink }}
        onClick={(e) => {
          /*
           * On transmet la position du visuel, pas celle de la carte
           * entière : c'est lui qui doit sembler décoller, sans le nom ni
           * le compteur qui l'entourent.
           */
          const dos = (e.currentTarget as HTMLElement).querySelector('.back');
          setFlipping(deck.id);
          onOpen(
            deck.id,
            dos ? { image, from: dos.getBoundingClientRect(), total, due } : undefined,
          );
        }}
      >
        <span className="stack">
          <span className="face">
            <span className="top">
              <span className="corner">{total}</span>
              <span className="suit" />
            </span>
            <span className="back">
              {image ? <img src={image} alt="" /> : <CardBack id={deck.id} name={deck.name} />}
            </span>
            <span className="name">{deck.name}</span>
            <span className="foot">
              <span>{due > 0 ? 'à réviser' : ''}</span>
              {due > 0
                ? <span className="due">{due}</span>
                : <span className="rest">à jour</span>}
            </span>
          </span>
        </span>
      </button>
    );
  }

  /**
   * Une carte de paquet vue du catalogue : le prix remplace le compteur de
   * révisions, et l'action ajoute à la collection au lieu d'ouvrir.
   */
  function catalogCard({ deck, total, image }: DeckSummary) {
    const palette = paletteFor(deck.id);
    const dedans = installed.includes(deck.id);
    const prix = deck.priceCents ? `${(deck.priceCents / 100).toFixed(2).replace('.', ',')} €` : 'Gratuit';
    return (
      <div key={deck.id} className="catitem">
        <button
          className="deckcard"
          style={{ ['--accent' as string]: palette.ink }}
          onClick={() => (dedans ? onOpen(deck.id) : onAdd(deck.id))}
        >
          <span className="stack">
            <span className="face">
              <span className="top">
                <span className="corner">{total}</span>
                <span className="suit" />
              </span>
              <span className="back">
                {image ? <img src={image} alt="" /> : <CardBack id={deck.id} name={deck.name} />}
              </span>
              <span className="name">{deck.name}</span>
              <span className="foot">
                <span>{prix}</span>
                {dedans && <span className="rest">ajouté</span>}
              </span>
            </span>
          </span>
        </button>
        {dedans ? (
          <button className="minibtn done" onClick={() => onRemove(deck.id)}>
            Retirer
          </button>
        ) : (
          <button className="minibtn" onClick={() => onAdd(deck.id)}>
            Ajouter
          </button>
        )}
      </div>
    );
  }

  /** La carte en pointillés qui crée un paquet, si la fonction est active. */
  function tile(_: null) {
    if (!ALLOW_LOCAL_DECKS) return null;
    return (
      <button className="deckcard add" onClick={onCreate}>
        <span className="stack">
          <span className="face">
            <span className="plus">+</span>
            <span className="name">Créer un paquet</span>
          </span>
        </span>
      </button>
    );
  }

  /**
   * Regroupement par rayon. L'ordre est celui que vous avez fixé ;
   * les paquets sans rayon sont rassemblés à la fin plutôt qu'oubliés.
   */
  function group(list: DeckSummary[]) {
    const out: Array<{ category: Category | null; items: DeckSummary[] }> = [];
    for (const category of [...categories].sort((a, b) => a.position - b.position)) {
      const items = list.filter((r) => r.deck.categoryId === category.id);
      if (items.length) out.push({ category, items });
    }
    const orphelins = list.filter(
      (r) => !r.deck.categoryId || !categories.some((c) => c.id === r.deck.categoryId),
    );
    if (orphelins.length) out.push({ category: null, items: orphelins });
    return out;
  }

  const mine = rows.filter((r) => installed.includes(r.deck.id));
  const sections = group(mine);
  const catalogue = group(rows);

  return (
    <>
      <h2 className="screen-title">
        {tab === 'mine' ? 'Mes paquets' : 'Catalogue'}
      </h2>

      <div className="tabs" role="tablist">
        <button
          role="tab" aria-selected={tab === 'mine'}
          className={tab === 'mine' ? 'on' : ''}
          onClick={() => setTab('mine')}
        >
          Ma collection
          {mine.length > 0 && <span className="tabcount">{mine.length}</span>}
        </button>
        <button
          role="tab" aria-selected={tab === 'catalog'}
          className={tab === 'catalog' ? 'on' : ''}
          onClick={() => setTab('catalog')}
        >
          Catalogue
          {rows.length > 0 && <span className="tabcount">{rows.length}</span>}
        </button>
      </div>

      {tab === 'mine' && (
        <>
          {mine.length === 0 && (
            <div className="empty">
              <p>Votre collection est vide.</p>
              <button className="btn ghost" onClick={() => setTab('catalog')}>
                Parcourir le catalogue
              </button>
            </div>
          )}

          {sections.map(({ category, items }) => (
            <section key={category?.id ?? '_autres'} className="rayon">
              {(category || sections.length > 1) && (
                <h2>{category ? category.name : 'Autres'}</h2>
              )}
              {category?.description && <p className="hint">{category.description}</p>}
              <div className="deckgrid">
                {items.map((row) => card(row))}
              </div>
            </section>
          ))}

          {ALLOW_LOCAL_DECKS && mine.length > 0 && (
            <div className="deckgrid">{tile(null)}</div>
          )}
        </>
      )}

      {tab === 'catalog' && (
        <>
          <p className="lead">
            Ajoutez les paquets qui vous intéressent : ils rejoignent votre
            collection et leur progression démarre.
          </p>

          {!auth.session && (
            <p className="hint" style={{ marginBottom: 16 }}>
              Vous n’êtes pas connecté : seuls les paquets fournis avec
              l’application sont visibles ici. La connexion donne accès au
              catalogue complet.
            </p>
          )}

          {catalogue.map(({ category, items }) => (
            <section key={category?.id ?? '_autres'} className="rayon">
              {(category || catalogue.length > 1) && (
                <h2>{category ? category.name : 'Autres'}</h2>
              )}
              {category?.description && <p className="hint">{category.description}</p>}
              <div className="deckgrid">
                {items.map((row) => catalogCard(row))}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
