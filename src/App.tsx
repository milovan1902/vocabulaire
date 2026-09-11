/** Composant racine : navigation entre les écrans. */
import { useCallback, useEffect, useState } from 'react';
import type { Grade } from './domain/types';
import { useStore, progressFor, type LoadedDeck } from './ui/useStore';
import { buildSession, type SessionItem } from './engine/session';
import { Today } from './ui/Today';
import { Library } from './ui/Library';
import { Account } from './ui/Account';
import { Progress } from './ui/Progress';
import { IconAujourdhui, IconPaquets, IconReglages, IconProgres } from './ui/icons';
import { Search } from './ui/Search';
import { DeckHome } from './ui/DeckHome';
import { CardZoom, type ZoomSource } from './ui/CardZoom';
import { Study } from './ui/Study';
import { Editor } from './ui/Editor';
import { Screen } from './ui/components';
import { useAuth } from './ui/useAuth';
import { Welcome } from './ui/Welcome';
import { loadSummaries } from './ui/deckSummary';
import { scheduleReminder } from './ui/reminder';

/**
 * Drapeau « accueil déjà vu ». Volontairement dans localStorage et non
 * dans IndexedDB : la lecture doit être synchrone au premier rendu, sinon
 * la bibliothèque apparaît une fraction de seconde avant l'accueil.
 */
const SEEN = 'vocab:accueil-vu';

/**
 * Les quatre écrans atteints par les onglets du bas. Réunis en un seul
 * cas : aucun ne porte de donnée propre, et les onglets ont besoin de
 * les désigner indifféremment.
 *
 * Le nom interne 'account' ne change pas — seul son libellé devient
 * « Réglages ». Renommer une vue oblige à toucher tous les endroits qui la
 * désignent, pour un mot que personne ne lit.
 */
type Tab = 'today' | 'library' | 'account' | 'progress';

type View =
  | { name: 'welcome' }
  | { name: Tab }
  | { name: 'search' }
  | { name: 'deck' }
  | { name: 'study' }
  | { name: 'done'; reviewed: number }
  | { name: 'editor'; mode: 'create' | 'append' };

const ONGLETS: Array<{ name: Tab; label: string; Icone: () => JSX.Element }> = [
  { name: 'today', label: 'Aujourd’hui', Icone: IconAujourdhui },
  { name: 'library', label: 'Paquets', Icone: IconPaquets },
  { name: 'account', label: 'Réglages', Icone: IconReglages },
  { name: 'progress', label: 'Mes progrès', Icone: IconProgres },
];

export default function App() {
  const store = useStore();
  /** Carte en vol entre la liste et l'écran d'un paquet. */
  const [zoom, setZoom] = useState<ZoomSource | null>(null);

  const [view, setView] = useState<View>(() =>
    localStorage.getItem(SEEN) ? { name: 'today' } : { name: 'welcome' },
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

  /**
   * Construction d'une session à partir d'un paquet déjà chargé.
   *
   * On passe le paquet en argument plutôt que de lire l'état : « Aujourd'hui »
   * démarre une révision juste après avoir chargé son paquet, et l'état React
   * n'est pas encore à jour à cet instant. Renvoie false s'il n'y avait rien
   * à faire.
   */
  const startSession = useCallback(
    (source: LoadedDeck, ignoreGoal = false) => {
      const visible = source.cards.filter((c) => source.selectedThemes.includes(c.theme));
      const q = buildSession(
        visible,
        (id) => progressFor(source.progress, id),
        store.settingsFor(source.deck.id),
        store.counterFor(source.deck.id),
        Date.now(),
        ignoreGoal,
      );
      if (!q.length) return false;
      setQueue(q);
      setView({ name: 'study' });
      return true;
    },
    [store],
  );

  /** Ouvrir le paquet et enchaîner sans détour. */
  const reviewDeck = useCallback(
    async (id: string) => {
      const deck = await store.loadDeck(id);
      setLoaded(deck);
      if (!startSession(deck)) setView({ name: 'deck' });
    },
    [store, startSession],
  );

  const handleGrade = useCallback(
    async (item: SessionItem, grade: Grade) => {
      if (!loaded) return;
      const next = await store.gradeCard(loaded.deck.id, item.progress, grade, item.wasNew);
      // On tient la progression à jour en mémoire pour les statistiques au retour.
      loaded.progress[next.cardId] = next;
    },
    [loaded, store],
  );

  /** Charge du jour, sur les seuls paquets en jeu. Relue à la demande. */
  const dueToday = useCallback(async () => {
    const enJeu = store.decks.filter((d) => store.active.includes(d.id));
    const { summaries } = await loadSummaries(enJeu, store.common);
    return summaries.reduce((n, s) => n + s.due, 0);
  }, [store.decks, store.active, store.common]);

  // Le rappel est réarmé à chaque changement d'heure ou de collection.
  // L'heure visée étant absolue, réarmer souvent est sans conséquence.
  useEffect(() => {
    if (!store.ready) return;
    scheduleReminder(store.common.reminderAt, dueToday);
  }, [store.ready, store.common.reminderAt, dueToday]);

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
      setView({ name: 'today' });
    }
  }, [view.name, auth.session]);

  if (!store.ready) {
    return (
      <div className="app">
        <Screen><p className="lead">Chargement…</p></Screen>
      </div>
    );
  }

  /* L'accueil occupe tout l'écran : ni barre de titre, ni onglets. */
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
                setView({ name: 'today' });
              }}
            />
          )}
        </Screen>
      </div>
    );
  }

  /*
   * Deux familles d'écrans : ceux des onglets, sans barre de titre, et
   * ceux où l'on est entré depuis un onglet, avec un retour en haut.
   * Aucun écran ne porte les deux à la fois : la barre du bas sert de
   * repère fixe, la barre du haut ne sert qu'à revenir.
   */
  const surOnglet = view.name === 'today' || view.name === 'library'
    || view.name === 'account' || view.name === 'progress';

  return (
    <div className={`app${surOnglet ? ' tabbed' : ''}`}>
      {zoom && <CardZoom source={zoom} onDone={() => setZoom(null)} />}

      {!surOnglet && (
        <div className="topbar">
          <button
            className="iconbtn"
            aria-label="Retour"
            onClick={() => {
              if (view.name === 'study' && !confirm('Quitter la session en cours ?')) return;
              if (view.name === 'search') setView({ name: 'library' });
              else if (view.name === 'deck') void backToLibrary();
              else if (loaded) { void reload(); setView({ name: 'deck' }); }
              else void backToLibrary();
            }}
          >
            ‹
          </button>
          <h1>{title(view, loaded)}</h1>
          {view.name === 'progress' && (
          /*
           * Les paquets POSSÉDÉS, pas ceux en jeu : on rend compte de tout
           * ce qu'on a travaillé, y compris d'un paquet mis en pause depuis.
           */
          <Progress
            decks={store.decks.filter((d) => store.installed.includes(d.id))}
            settings={store.common}
            streak={store.streak}
          />
        )}

        {view.name === 'deck' && loaded && (
            <span className="count">{loaded.cards.length} mots</span>
          )}
        </div>
      )}

      <Screen>
        {view.name === 'today' && (
          <Today
            decks={store.decks}
            active={store.active}
            settings={store.common}
            streak={store.streak}
            onReview={(id) => void reviewDeck(id)}
            onOpen={(id) => void openDeck(id)}
            onManage={() => setView({ name: 'library' })}
          />
        )}

        {view.name === 'library' && (
          <Library
            decks={store.decks}
            installed={store.installed}
            active={store.active}
            categories={store.categories}
            settings={store.common}
            auth={auth}
            onSearch={() => setView({ name: 'search' })}
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
            onReview={(id) => void reviewDeck(id)}
            onAdd={(id) => void store.addDeck(id)}
            onRemove={(id) => void store.removeDeck(id)}
            onSetActive={(id, on) => void store.setActive(id, on)}
          />
        )}

        {view.name === 'search' && (
          <Search
            decks={store.decks}
            installed={store.installed}
            onOpen={(id) => void openDeck(id)}
          />
        )}

        {view.name === 'account' && (
          <Account
            settings={store.common}
            auth={auth}
            streak={store.streak}
            onSettings={(s) => void store.setCommon(s)}
            onHome={() => setView({ name: 'welcome' })}
          />
        )}

        {view.name === 'progress' && (
          /*
           * Les paquets POSSÉDÉS, pas ceux en jeu : on rend compte de tout
           * ce qu'on a travaillé, y compris d'un paquet mis en pause depuis.
           */
          <Progress
            decks={store.decks.filter((d) => store.installed.includes(d.id))}
            settings={store.common}
            streak={store.streak}
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
            onStart={(ignoreGoal) => { startSession(loaded, ignoreGoal); }}
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
            <button className="btn ghost" onClick={() => setView({ name: 'today' })}>
              Revenir à aujourd’hui
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

      {surOnglet && (
        <nav className="tabbar">
          {ONGLETS.map(({ name, label, Icone }) => (
            <button
              key={name}
              className={view.name === name ? 'on' : ''}
              aria-current={view.name === name ? 'page' : undefined}
              onClick={() => setView({ name })}
            >
              <Icone />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function title(view: View, loaded: LoadedDeck | null): string {
  if (view.name === 'welcome') return 'Vocabulaire';
  if (view.name === 'today') return 'Aujourd’hui';
  if (view.name === 'library') return 'Paquets';
  if (view.name === 'account') return 'Réglages';
  if (view.name === 'progress') return 'Mes progrès';
  if (view.name === 'search') return 'Rechercher';
  if (view.name === 'editor') return view.mode === 'create' ? 'Nouveau paquet' : 'Ajouter des mots';
  return loaded?.deck.name ?? 'Vocabulaire';
}
