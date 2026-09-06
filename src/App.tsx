/** Composant racine : navigation entre les écrans. */
import { useCallback, useEffect, useState } from 'react';
import type { Grade } from './domain/types';
import { useStore, progressFor, type LoadedDeck } from './ui/useStore';
import { buildSession, type SessionItem } from './engine/session';
import { Library } from './ui/Library';
import { DeckHome } from './ui/DeckHome';
import { CardZoom, type ZoomSource } from './ui/CardZoom';
import { Study } from './ui/Study';
import { Editor } from './ui/Editor';
import { Screen } from './ui/components';
import { useAuth } from './ui/useAuth';
import { Welcome } from './ui/Welcome';

/**
 * Drapeau « accueil déjà vu ». Volontairement dans localStorage et non
 * dans IndexedDB : la lecture doit être synchrone au premier rendu, sinon
 * la bibliothèque apparaît une fraction de seconde avant l'accueil.
 */
const SEEN = 'vocab:accueil-vu';

type View =
  | { name: 'welcome' }
  | { name: 'library' }
  | { name: 'deck' }
  | { name: 'study' }
  | { name: 'done'; reviewed: number }
  | { name: 'editor'; mode: 'create' | 'append' };

export default function App() {
  const store = useStore();
  /** Carte en vol entre la bibliothèque et l'écran d'un paquet. */
  const [zoom, setZoom] = useState<ZoomSource | null>(null);

  const [view, setView] = useState<View>(() =>
    localStorage.getItem(SEEN) ? { name: 'library' } : { name: 'welcome' },
  );
  // La synchronisation modifie les données sous nos pieds : on relit ensuite.
  const auth = useAuth(useCallback(() => { void store.refreshAll(); }, [store]));
  const [loaded, setLoaded] = useState<LoadedDeck | null>(null);
  const [queue, setQueue] = useState<SessionItem[]>([]);

  const openDeck = useCallback(
    async (id: string) => {
      setLoaded(await store.loadDeck(id));
      setView({ name: 'deck' });
    },
    [store],
  );

  const reload = useCallback(async () => {
    if (!loaded) return;
    await store.refreshAll();
    setLoaded(await store.loadDeck(loaded.deck.id));
  }, [loaded, store]);

  const backToLibrary = useCallback(async () => {
    await store.refreshAll();
    setLoaded(null);
    setView({ name: 'library' });
  }, [store]);

  /**
   * Fin de session : on remonte le travail tout de suite.
   * Sans cela, la synchronisation n'avait lieu qu'à l'ouverture de
   * l'application, et l'autre appareil restait longtemps en retard.
   */
  const endSession = useCallback(async () => {
    await reload();
    if (auth.session) await auth.runSync();
  }, [reload, auth]);

  function startSession(ignoreGoal = false) {
    if (!loaded) return;
    const visible = loaded.cards.filter((c) => loaded.selectedThemes.includes(c.theme));
    const q = buildSession(
      visible,
      (id) => progressFor(loaded.progress, id),
      store.settingsFor(loaded.deck.id),
      store.counterFor(loaded.deck.id),
      Date.now(),
      ignoreGoal,
    );
    if (!q.length) return;
    setQueue(q);
    setView({ name: 'study' });
  }

  const handleGrade = useCallback(
    async (item: SessionItem, grade: Grade) => {
      if (!loaded) return;
      const next = await store.gradeCard(loaded.deck.id, item.progress, grade, item.wasNew);
      // On tient la progression à jour en mémoire pour les statistiques au retour.
      loaded.progress[next.cardId] = next;
    },
    [loaded, store],
  );

  useEffect(() => {
    document.title = title(view, loaded);
  }, [view, loaded]);

  /*
   * Marqueur lu par la feuille de style pendant le vol de la carte : il
   * masque la vignette de départ et la carte recto d'arrivée, pour qu'on
   * ne voie jamais trois exemplaires du même objet.
   */
  useEffect(() => {
    if (zoom) document.documentElement.dataset.zoom = '1';
    else delete document.documentElement.dataset.zoom;
  }, [zoom]);

  /*
   * Retour de Google : la session existe, l'accueil n'a plus lieu d'être.
   * Traité dans un effet et non pendant le rendu, pour ne pas modifier
   * l'état d'un composant en cours d'affichage.
   */
  useEffect(() => {
    // Uniquement au tout premier passage : sinon, un visiteur connecté qui
    // revient volontairement lire la page d'accueil en serait aussitôt
    // éjecté, et le bouton « Revoir la page d'accueil » ne ferait rien.
    if (view.name === 'welcome' && auth.session && !localStorage.getItem(SEEN)) {
      localStorage.setItem(SEEN, '1');
      setView({ name: 'library' });
    }
  }, [view.name, auth.session]);

  if (!store.ready) {
    return (
      <div className="app">
        <div className="topbar"><h1>Vocabulaire</h1></div>
        <Screen><p className="lead">Chargement…</p></Screen>
      </div>
    );
  }

  /* L'accueil occupe tout l'écran : ni barre de titre, ni bouton retour. */
  if (view.name === 'welcome') {
    return (
      <div className="app">
        <Screen>
          {auth.loading ? (
            <p className="lead">Chargement…</p>
          ) : (
            <Welcome
              auth={auth}
              onSkip={() => {
                localStorage.setItem(SEEN, '1');
                setView({ name: 'library' });
              }}
            />
          )}
        </Screen>
      </div>
    );
  }

  return (
    <div className="app">
      {zoom && <CardZoom source={zoom} onDone={() => setZoom(null)} />}
      <div className="topbar">
        {view.name !== 'library' && (
          <button
            className="iconbtn"
            aria-label="Retour"
            onClick={() => {
              if (view.name === 'study' && !confirm('Quitter la session en cours ?')) return;
              if (view.name === 'deck') void backToLibrary();
              else if (loaded) { void reload(); setView({ name: 'deck' }); }
              else void backToLibrary();
            }}
          >
            ‹
          </button>
        )}
        <h1>{title(view, loaded)}</h1>
        {view.name === 'library' && (
          <button
            className="iconbtn home"
            aria-label="Page d’accueil"
            title="Page d’accueil"
            onClick={() => setView({ name: 'welcome' })}
          >
            ⌂
          </button>
        )}
        {view.name === 'deck' && loaded && (
          <span className="count">{loaded.cards.length} mots</span>
        )}
      </div>

      <Screen>
        {view.name === 'library' && (
          <Library
            decks={store.decks}
            installed={store.installed}
            categories={store.categories}
            settings={store.common}
            auth={auth}
            onOpen={(id, vol) => {
              /*
               * Avec « animations réduites », on n'entame pas le vol : la
               * couche étant masquée, la fin de l'animation pourrait ne
               * jamais être signalée et la carte recto resterait invisible.
               */
              const sobre = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              if (vol && !sobre) {
                const d = store.decks.find((x) => x.id === id);
                setZoom({
                  deckId: id,
                  name: d?.name ?? '',
                  total: vol.total,
                  due: vol.due,
                  image: vol.image,
                  from: vol.from,
                });
              }
              void openDeck(id);
            }}
            onCreate={() => setView({ name: 'editor', mode: 'create' })}
            onSettings={(s) => void store.setCommon(s)}
            onAdd={(id) => void store.addDeck(id)}
            onRemove={(id) => void store.removeDeck(id)}
            onHome={() => setView({ name: 'welcome' })}
          />
        )}

        {view.name === 'deck' && loaded && (
          <DeckHome
            loaded={loaded}
            settings={store.settingsFor(loaded.deck.id)}
            overrides={store.overrides[loaded.deck.id] ?? null}
            counter={store.counterFor(loaded.deck.id)}
            userId={auth.session?.user.id ?? null}
            general={store.common}
            onGeneral={(s) => void store.setCommon(s)}
            onOverrides={async (o) => {
              await store.setOverride(loaded.deck.id, o);
              await reload();
            }}
            onStart={startSession}
            onAddCards={() => setView({ name: 'editor', mode: 'append' })}
            onReload={() => void reload()}
            onBackToLibrary={() => void backToLibrary()}
          />
        )}

        {view.name === 'study' && loaded && (
          <Study
            queue={queue}
            image={loaded.image}
            settings={store.settingsFor(loaded.deck.id)}
            onGrade={handleGrade}
            onQuit={() => { void endSession(); setView({ name: 'deck' }); }}
            onDone={(reviewed) => { void endSession(); setView({ name: 'done', reviewed }); }}
          />
        )}

        {view.name === 'done' && (
          <div className="done">
            <h2>Session terminée</h2>
            <p>
              {view.reviewed} carte{view.reviewed > 1 ? 's' : ''} revue
              {view.reviewed > 1 ? 's' : ''}. Les mots marqués « à revoir »
              reviendront très vite.
            </p>
            <button className="btn" onClick={() => setView({ name: 'deck' })}>
              Retour au paquet
            </button>
          </div>
        )}

        {view.name === 'editor' && (
          <Editor
            mode={view.mode}
            deck={loaded?.deck}
            existingCards={loaded?.cards}
            onCancel={() => setView(loaded ? { name: 'deck' } : { name: 'library' })}
            onSaved={(id) => { void store.refreshAll(); void openDeck(id); }}
          />
        )}
      </Screen>
    </div>
  );
}

function title(view: View, loaded: LoadedDeck | null): string {
  if (view.name === 'welcome') return 'Vocabulaire';
  if (view.name === 'library') return 'Vocabulaire';
  if (view.name === 'editor') return view.mode === 'create' ? 'Nouveau paquet' : 'Ajouter des mots';
  return loaded?.deck.name ?? 'Vocabulaire';
}
