/** Composant racine : navigation entre les écrans. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
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
import { Onboarding } from './ui/Onboarding';
import { loadSummaries } from './ui/deckSummary';
import { scheduleReminder } from './ui/reminder';

/**
 * Drapeau « accueil déjà vu ». Volontairement dans localStorage et non
 * dans IndexedDB : la lecture doit être synchrone au premier rendu, sinon
 * la bibliothèque apparaît une fraction de seconde avant l'accueil.
 */
const SEEN = 'vocab:accueil-vu';

/**
 * CHANTIER 90 — drapeau « guidage fait ». Même stockage et même raison
 * que le précédent : la décision est prise au premier rendu.
 *
 * Le guidage ne se déclenche QUE dans la foulée d'un premier lancement
 * (voir `premierLancement`). Quelqu'un qui revient volontairement lire la
 * page d'accueil depuis les réglages n'a pas à le retraverser.
 */
const GUIDE = 'vocab:guidage-fait';

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
  | { name: 'onboarding' }
  | { name: Tab }
  | { name: 'search' }
  | { name: 'deck' }
  | { name: 'study' }
  | { name: 'done'; reviewed: number }
  | { name: 'editor'; mode: 'create' | 'append' };

const ONGLETS: Array<{ name: Tab; label: string; Icone: () => ReactElement }> = [
  { name: 'today', label: 'Aujourd’hui', Icone: IconAujourdhui },
  { name: 'library', label: 'Paquets', Icone: IconPaquets },
  { name: 'account', label: 'Réglages', Icone: IconReglages },
  { name: 'progress', label: 'Mes progrès', Icone: IconProgres },
];

/**
 * CHANTIER 45 — LES TRANSITIONS D'ÉCRAN (option 8b, « la carte qui s'avance »)
 *
 * Le rang d'un écran dans l'application. Deux chiffres, deux sens :
 *
 * — les dizaines disent l'ÉTAGE. Les quatre onglets sont de plain-pied
 *   (10 à 13) ; la recherche et l'écran d'un paquet sont un étage plus
 *   bas (20, 21) ; l'éditeur et la révision plus bas encore (30, 31, 32).
 * — les unités disent le RANG LATÉRAL dans la barre d'onglets, dans
 *   l'ordre où ils sont affichés.
 *
 * Un rang qui monte, c'est avancer ; un rang qui descend, c'est revenir.
 * L'animation n'a plus qu'à lire le signe de l'écart : aucune des vingt
 * lignes qui appellent `setView` n'a à dire dans quel sens elle va, et
 * aucune ne pourra donc se tromper.
 */
/**
 * Deux vues désignent-elles le même écran ? Le paquet ouvert n'entre pas
 * en compte (il est tenu à part, dans `loaded`) ; seul l'éditeur porte une
 * donnée qui distingue deux écrans de même nom.
 */
function memeEcran(a: View, b: View): boolean {
  if (a.name !== b.name) return false;
  if (a.name === 'editor' && b.name === 'editor') return a.mode === b.mode;
  return true;
}

function rang(v: View): number {
  if (v.name === 'welcome') return 0;
  if (v.name === 'onboarding') return 1;
  const onglet = ONGLETS.findIndex((o) => o.name === v.name);
  if (onglet >= 0) return 10 + onglet;
  if (v.name === 'search') return 20;
  if (v.name === 'deck') return 21;
  if (v.name === 'editor') return 30;
  if (v.name === 'study') return 31;
  return 32; // 'done'
}

export default function App() {
  const store = useStore();
  /** Carte en vol entre la liste et l'écran d'un paquet. */
  const [zoom, setZoom] = useState<ZoomSource | null>(null);

  const [view, poseVue] = useState<View>(() =>
    localStorage.getItem(SEEN) ? { name: 'today' } : { name: 'welcome' },
  );

  /*
   * CHANTIER 88 — LA TOUCHE RETOUR DU TÉLÉPHONE.
   *
   * L'application tient sur une seule page : elle ne créait donc aucune
   * entrée d'historique, et la touche retour d'Android, n'ayant rien à
   * dépiler, quittait l'application depuis n'importe quel écran.
   *
   * On tient maintenant la pile des écrans traversés, doublée d'une
   * entrée d'historique par écran. Chaque entrée porte sa PROFONDEUR :
   * au retour, il n'y a pas à deviner de combien de crans on a reculé —
   * le navigateur le dit, et la pile est tronquée à cette hauteur. Un
   * appui long (plusieurs crans d'un coup) tombe donc juste lui aussi.
   *
   * `setView` garde son nom et sa signature : les vingt appels qui
   * changent d'écran n'ont rien à savoir de tout ceci.
   */
  const pile = useRef<View[]>([view]);
  /** Vrai le temps d'un `history.go` demandé par l'application elle-même. */
  const depileInterne = useRef(false);

  const setView = useCallback((v: View) => {
    const p = pile.current;
    if (memeEcran(p[p.length - 1], v)) return;
    /*
     * Écran déjà traversé : on redescend la pile par l'historique au lieu
     * de l'allonger. Sans cela, « Aujourd'hui → Paquets → Aujourd'hui »
     * demanderait trois retours pour sortir.
     */
    for (let i = p.length - 2; i >= 0; i--) {
      if (memeEcran(p[i], v)) {
        depileInterne.current = true;
        history.go(i + 1 - p.length);
        return;
      }
    }
    p.push(v);
    history.pushState({ profondeur: p.length }, '');
    poseVue(v);
  }, []);

  /* L'entrée du chargement est le fond de la pile. */
  useEffect(() => {
    history.replaceState({ profondeur: 1 }, '');
  }, []);

  /*
   * CHANTIER 90 — vrai seulement si l'application s'ouvre pour la
   * première fois sur cet appareil. Lu une fois, au montage : après le
   * premier passage par l'accueil le drapeau SEEN est posé, et la
   * question ne se poserait plus dans le bon sens.
   */
  const premierLancement = useRef(!localStorage.getItem(SEEN));

  /*
   * CHANTIER 91 — le guidage est-il traversé pour de bon, ou relu depuis
   * les réglages ? Un état, pas une vue de plus : la pile des écrans et
   * la touche retour n'ont pas à connaître cette nuance.
   */
  const [relecture, setRelecture] = useState(false);

  /** Sortie de l'accueil : le guidage, ou la journée s'il est déjà fait. */
  const apresAccueil = useCallback(() => {
    localStorage.setItem(SEEN, '1');
    setRelecture(false);
    const aGuider = premierLancement.current && !localStorage.getItem(GUIDE);
    setView({ name: aGuider ? 'onboarding' : 'today' });
  }, [setView]);

  /*
   * CHANTIER 79 — DEUX SOUVENIRS QUE LE RETOUR AVAIT PERDUS.
   *
   * 1. Le rayon de l'onglet « Paquets ». Library est démonté dès qu'on
   *    ouvre un paquet ; son état partait avec lui et on retombait sur
   *    « Mon travail ». Il est tenu ici, où rien ne le démonte.
   *
   * 2. L'onglet d'où l'on est parti. Le retour d'un paquet allait
   *    toujours à « Paquets », même quand le paquet avait été ouvert
   *    depuis « Aujourd'hui ».
   *
   * `origine` n'accepte que les quatre onglets : depuis l'éditeur qui
   * vient d'enregistrer, on garde le dernier connu au lieu d'en inventer
   * un.
   *
   * Le type du rayon est écrit ICI, en clair, et non importé de
   * `Library.tsx`. Un import de type aurait lié les deux fichiers : celui
   * qui arrive le premier sur le serveur ne compilerait pas, et c'est
   * exactement ce qui a fait échouer le déploiement du chantier 79.
   * Chaque fichier se déploie maintenant seul.
   */
  const [rayon, setRayon] = useState<'travail' | 'collection' | 'catalogue'>('travail');
  const [origine, setOrigine] = useState<Tab>('library');
  const estOnglet = (n: View['name']): n is Tab =>
    n === 'today' || n === 'library' || n === 'account' || n === 'progress';
  // La synchronisation modifie les données sous nos pieds : on relit ensuite.
  const auth = useAuth(useCallback(() => { void store.refreshAll(); }, [store]));
  const [loaded, setLoaded] = useState<LoadedDeck | null>(null);
  const [queue, setQueue] = useState<SessionItem[]>([]);

  /*
   * Le sens du dernier déplacement, tenu dans des refs et calculé PENDANT
   * le rendu : un effet arriverait après le premier peint, et l'animation
   * aurait déjà commencé dans le mauvais sens. Le calcul est idempotent —
   * relancer le rendu sans changer de vue ne change rien.
   */
  const rangPrec = useRef(rang(view));
  const sens = useRef<'avance' | 'recule'>('avance');
  const rangActuel = rang(view);
  if (rangActuel !== rangPrec.current) {
    sens.current = rangActuel > rangPrec.current ? 'avance' : 'recule';
    rangPrec.current = rangActuel;
  }

  const openDeck = useCallback(
    async (id: string) => {
      if (estOnglet(view.name)) setOrigine(view.name);
      setLoaded(await store.loadDeck(id));
      setView({ name: 'deck' });
    },
    [store, view.name],
  );

  const reload = useCallback(async () => {
    if (!loaded) return;
    await store.refreshAll();
    setLoaded(await store.loadDeck(loaded.deck.id));
  }, [loaded, store]);

  /** Retour au point de départ : l'onglet d'où le paquet a été ouvert. */
  const backToLibrary = useCallback(async () => {
    await store.refreshAll();
    setLoaded(null);
    setView({ name: origine });
  }, [store, origine]);

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
      if (estOnglet(view.name)) setOrigine(view.name);
      if (!startSession(deck)) setView({ name: 'deck' });
    },
    [store, startSession, view.name],
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
   * Le retour du téléphone (et celui du navigateur sur ordinateur).
   * On dépile ; l'application ne se quitte que depuis le fond de la pile,
   * c'est-à-dire l'écran d'ouverture.
   */
  useEffect(() => {
    const onRetour = (e: PopStateEvent) => {
      const p = pile.current;
      const profondeur = (e.state as { profondeur?: number } | null)?.profondeur ?? 1;
      // Un pas en avant (bouton « suivant » du navigateur) : rien à restituer.
      if (profondeur >= p.length) return;
      const cible = p[profondeur - 1];
      if (!cible) return;

      /*
       * Un retour demandé par l'application (bouton « ‹ », fin de session,
       * onglet déjà visité) : la confirmation et la relecture ont déjà été
       * faites par l'appelant, on ne les rejoue pas.
       */
      const interne = depileInterne.current;
      depileInterne.current = false;

      if (!interne && view.name === 'study') {
        if (!confirm('Quitter la session en cours ?')) {
          // Refus : on remet l'entrée que l'appui vient de consommer.
          history.pushState({ profondeur: p.length }, '');
          return;
        }
        void endSession();
      } else if (!interne && (view.name === 'deck' || view.name === 'done' || view.name === 'editor')) {
        // On a pu écrire depuis ces écrans : l'écran d'arrivée doit relire.
        void store.refreshAll();
      }

      p.length = profondeur;
      poseVue(cible);
    };
    addEventListener('popstate', onRetour);
    return () => removeEventListener('popstate', onRetour);
  }, [view.name, endSession, store]);

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
      apresAccueil();
    }
  }, [view.name, auth.session, apresAccueil]);

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
              onSkip={apresAccueil}
            />
          )}
        </Screen>
      </div>
    );
  }

  /*
   * CHANTIER 90 — le guidage du premier lancement. Comme l'accueil : ni
   * barre de titre, ni onglets. Tant qu'aucun paquet n'est choisi, la
   * barre du bas n'aurait rien à montrer.
   */
  if (view.name === 'onboarding') {
    return (
      <div className="app">
        <Screen>
          <Onboarding
            relecture={relecture}
            enJeu={store.active}
            decks={store.decks}
            classe={store.common.classe}
            onClasse={(c) => { void store.setCommon({ ...store.common, classe: c }); }}
            /*
             * Obtenir NE MET PAS en jeu (voir `addDeck`) : ici, si, et
             * c'est tout l'objet de l'étape. Sans mise en jeu, la journée
             * resterait à zéro et le guidage n'aurait rien réglé.
             */
            onChoisir={async (id) => {
              await store.addDeck(id);
              await store.setActive(id, true);
            }}
            loadDeck={(id) => store.loadDeck(id)}
            onGrade={(deckId, p, g, wasNew) => store.gradeCard(deckId, p, g, wasNew)}
            onFini={(vers) => {
              localStorage.setItem(GUIDE, '1');
              void store.refreshAll();
              setRelecture(false);
              setView({ name: vers });
            }}
          />
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

  /*
   * La révision ne s'animera pas. Son fond est une image en `position:
   * fixed` posée derrière la carte : pendant les 300 ms d'une animation,
   * un parent transformé redéfinit le repère du fixe, et l'image se met à
   * bouger avec l'écran. Entrer dans une session doit de toute façon être
   * immédiat.
   */
  const anime = view.name !== 'study';

  /*
   * La clé commande le remontage, donc l'animation. Elle inclut le paquet :
   * passer d'un paquet à un autre est un déplacement, pas une mise à jour,
   * et sans cela l'écran changerait de contenu sans rien dire.
   */
  const cleEcran = view.name === 'deck' ? `deck:${loaded?.deck.id ?? ''}` : view.name;

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
          {view.name === 'deck' && loaded && (
            <span className="count">{loaded.cards.length} mots</span>
          )}
        </div>
      )}

      {/*
        * `Screen` est écrit ici à la main, le temps d'une classe et d'une
        * clé : le composant n'accepte pas de props, et lui en ajouter
        * obligerait à redéposer `components.tsx` pour deux attributs.
        * Le balisage est le même — un seul <div className="screen">.
        */}
      <div
        key={cleEcran}
        className={`screen${anime ? ` ecran-${sens.current}` : ''}`}
      >
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
            rayon={rayon}
            onRayon={setRayon}
            /*
             * CHANTIER 82 — la prop qui manquait, et qui faisait échouer
             * tous les dépôts depuis le 79.
             *
             * Le catalogue écrit la classe déclarée (« Ma classe », les
             * lignes .classrow) : c'est un réglage, et Library ne l'écrit
             * pas lui-même, il le demande. La prop est OBLIGATOIRE dans
             * son type. En réécrivant l'appel au chantier 79 pour y
             * ajouter rayon/onRayon, je l'ai perdue.
             */
            onSettings={(s) => void store.setCommon(s)}
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
            onGuide={() => { setRelecture(true); setView({ name: 'onboarding' }); }}
          />
        )}

        {view.name === 'progress' && (
          /*
           * Les paquets POSSÉDÉS, pas ceux en jeu : on rend compte de tout
           * ce qu'on a travaillé, y compris d'un paquet mis en pause depuis.
           *
           * CHANTIER 51 — `active` en plus : l'écran distingue maintenant
           * les deux périmètres au lieu de les additionner sous un seul
           * nom. Ce qui tourne dans la charge d'aujourd'hui, et tout ce
           * qu'on possède. Sans cette liste, il ne pouvait pas faire la
           * différence — c'est de là que venait le chiffre inexplicable.
           */
          <Progress
            decks={store.decks.filter((d) => store.installed.includes(d.id))}
            active={store.active}
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
      </div>

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
  if (view.name === 'onboarding') return 'Premiers pas';
  if (view.name === 'today') return 'Aujourd’hui';
  if (view.name === 'library') return 'Paquets';
  if (view.name === 'account') return 'Réglages';
  if (view.name === 'progress') return 'Mes progrès';
  if (view.name === 'search') return 'Rechercher';
  if (view.name === 'editor') return view.mode === 'create' ? 'Nouveau paquet' : 'Ajouter des mots';
  return loaded?.deck.name ?? 'Vocabulaire';
}
