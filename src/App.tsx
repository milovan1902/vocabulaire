/** Composant racine : navigation entre les écrans. */
import { mesure } from './data/mesures';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { Grade } from './domain/types';
import { useStore, progressFor, type LoadedDeck } from './ui/useStore';
import { buildSession, type SessionItem } from './engine/session';
import { Today } from './ui/Today';
import { IconAujourdhui, IconPaquets, IconParler, IconReglages, IconProgres } from './ui/icons';
import { DeckHome } from './ui/DeckHome';
import { CardZoom, type ZoomSource } from './ui/CardZoom';
import { motsRates, type DeckControle } from './engine/controle';
import { VeilleControle } from './ui/VeilleControle';
import { Study } from './ui/Study';
import { Screen } from './ui/components';
import { useAuth } from './ui/useAuth';
import { Welcome } from './ui/Welcome';
/* CHANTIER 293 — la première connexion guidée remplace les douze étapes du 292. */
import { Visite, ETAPES as ETAPES_VISITE, type RendezVous } from './ui/Visite';
import { isNew } from './engine/scheduler';
import { PAQUETS_OFFERTS, PAQUET_OFFERT_ADULTE, reserveAbonnes } from './data/offre';
import { estAdulte } from './ui/ton';
import { EVT_NOUVEAU_COMPTE } from './data/appareil';
import { classeConvient, classeRank } from './domain/types';
import type { Classe } from './domain/types';
import { REPRISE_ID, repareThemesReprise } from './data/reprise';
import { loadSummaries } from './ui/deckSummary';
/* CHANTIER 356 — boîtes de dialogue maison et bilan de fin de session. */
import { Dialogues, demande, type Question } from './ui/Dialogue';
import { BilanFin } from './ui/BilanSession';
import type { BilanSession } from './engine/bilan';
import { cartesDuJour, gainDuJour } from './engine/xp';

const QUITTER: Question = {
  titre: 'Quitter la session ?',
  texte: 'Les cartes déjà notées sont enregistrées.',
  agir: 'Quitter',
  garder: 'Continuer la session',
  ton: 'prudent',
};

/*
 * CHANTIER 353 — LES ÉCRANS SECONDAIRES SE CHARGENT À PART.
 * Paquets, Parler, Réglages, Mes progrès, Recherche et l'éditeur ne sont plus
 * dans le code du démarrage. Ils sont pré-chargés en tâche de fond quelques
 * secondes après l'ouverture : changer d'onglet reste instantané.
 */
const charge = {
  Library: () => import('./ui/Library'),
  Account: () => import('./ui/Account'),
  Progress: () => import('./ui/Progress'),
  Parler: () => import('./ui/Parler'),
  Search: () => import('./ui/Search'),
  Editor: () => import('./ui/Editor'),
};
const Library = lazy(() => charge.Library().then((m) => ({ default: m.Library })));
const Account = lazy(() => charge.Account().then((m) => ({ default: m.Account })));
const Progress = lazy(() => charge.Progress().then((m) => ({ default: m.Progress })));
const Parler = lazy(() => charge.Parler().then((m) => ({ default: m.Parler })));
const Search = lazy(() => charge.Search().then((m) => ({ default: m.Search })));
const Editor = lazy(() => charge.Editor().then((m) => ({ default: m.Editor })));
let prechargeFait = false;
function precharge() {
  if (prechargeFait) return;
  prechargeFait = true;
  window.setTimeout(() => Object.values(charge).forEach((f) => void f().catch(() => undefined)), 3000);
}
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

/*
 * CHANTIER 293 — l'étape de la visite guidée en cours. Tant qu'elle est
 * posée, la visite reprend où elle en était : après un rechargement, ou au
 * retour de Google. Elle est obligatoire à la première connexion.
 */
const VISITE = 'vocab:visite-etape';

/* CHANTIER 325 ter — la première révision de la visite montre toujours 5 cartes,
   et retient où chacune a été rangée, pour la frise de l'étape suivante. */
const VISITE_CARTES = 5;
const VISITE_RDV = 'vocab:visite-rdv';

function rdvGardes(): RendezVous[] {
  try {
    const v = JSON.parse(localStorage.getItem(VISITE_RDV) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function visiteEnCours(): number | null {
  const brut = localStorage.getItem(VISITE);
  if (brut === null) return null;
  const n = Number(brut);
  return Number.isInteger(n) && n >= 0 && n < ETAPES_VISITE.length ? n : 0;
}

/**
 * Les cinq écrans atteints par les onglets du bas. Réunis en un seul
 * cas : aucun ne porte de donnée propre, et les onglets ont besoin de
 * les désigner indifféremment.
 *
 * Le nom interne 'account' ne change pas — seul son libellé devient
 * « Réglages ». Renommer une vue oblige à toucher tous les endroits qui la
 * désignent, pour un mot que personne ne lit.
 */
type Tab = 'today' | 'library' | 'parler' | 'account' | 'progress';

type View =
  | { name: 'welcome' }
  | { name: 'onboarding' }
  | { name: Tab }
  | { name: 'search' }
  | { name: 'deck' }
  | { name: 'study' }
  | { name: 'done'; reviewed: number; bilan: BilanSession }
  | { name: 'editor'; mode: 'create' | 'append' };

const ONGLETS: Array<{ name: Tab; label: string; Icone: () => ReactElement }> = [
  { name: 'today', label: 'Aujourd’hui', Icone: IconAujourdhui },
  { name: 'library', label: 'Paquets', Icone: IconPaquets },
  /*
   * CHANTIER 103 — « Parler » se pose au MILIEU, troisième sur cinq.
   * C'est la place du pouce, et elle dit que parler compte autant que
   * réviser. Les quatre autres gardent leur ordre et leur icône.
   */
  { name: 'parler', label: 'Parler', Icone: IconParler },
  { name: 'account', label: 'Réglages', Icone: IconReglages },
  { name: 'progress', label: 'Mes progrès', Icone: IconProgres },
];

/**
 * CHANTIER 45 — LES TRANSITIONS D'ÉCRAN (option 8b, « la carte qui s'avance »)
 *
 * Le rang d'un écran dans l'application. Deux chiffres, deux sens :
 *
 * — les dizaines disent l'ÉTAGE. Les cinq onglets sont de plain-pied
 *   (10 à 14) ; la recherche et l'écran d'un paquet sont un étage plus
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
   * CHANTIER 293 — LA VISITE GUIDÉE. L'étape en cours (null : pas de
   * visite), et si elle est relancée par l'administrateur depuis les
   * Réglages (dans ce cas, rien n'est mesuré).
   */
  const [visite, setVisite] = useState<number | null>(visiteEnCours);
  const [visiteRelue, setVisiteRelue] = useState(false);
  const [rdv, setRdv] = useState<RendezVous[]>(rdvGardes);
  const poseRdv = useCallback((r: RendezVous[]) => {
    try { localStorage.setItem(VISITE_RDV, JSON.stringify(r)); } catch { /* la frise retombera sur l'exemple */ }
    setRdv(r);
  }, []);

  const poseEtape = useCallback((n: number) => {
    localStorage.setItem(VISITE, String(n));
    setVisite(n);
  }, []);

  /** Sortie de l'accueil : la journée, et la visite si c'est la première connexion. */
  const apresAccueil = useCallback(() => {
    localStorage.setItem(SEEN, '1');
    const aGuider = premierLancement.current && !localStorage.getItem(GUIDE);
    setView({ name: 'today' });
    if (aGuider) { setVisiteRelue(false); poseEtape(0); }
  }, [setView, poseEtape]);

  /* 334 — un compte tout neuf vient de prendre l'appareil d'un autre : sa première connexion guidée. */
  useEffect(() => {
    const lance = () => { setVisiteRelue(false); setView({ name: 'today' }); poseEtape(0); };
    window.addEventListener(EVT_NOUVEAU_COMPTE, lance);
    return () => window.removeEventListener(EVT_NOUVEAU_COMPTE, lance);
  }, [setView, poseEtape]);

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
   * `origine` n'accepte que les cinq onglets : depuis l'éditeur qui
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
  /*
   * CHANTIER 166 — « Cette semaine », touché sur Aujourd'hui (style Lycée),
   * ouvre « Mes progrès » directement sur le calendrier. L'onglet du bas,
   * lui, rouvre toujours la table des matières.
   */
  const [progresOuvre, setProgresOuvre] = useState<'calendrier' | 'xp' | null>(null);
  const estOnglet = (n: View['name']): n is Tab =>
    n === 'today' || n === 'library' || n === 'parler'
    || n === 'account' || n === 'progress';
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
  /* CHANTIER 184 — une fois : cocher les dates de reprise restées décochées. */
  useEffect(() => {
    if (!store.ready) return;
    void repareThemesReprise().then((change) => {
      if (!change) return;
      void store.refreshAll();
      if (auth.session) void auth.runSync();
    });
    // Une seule fois, quand les données sont prêtes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready]);

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
      const enVisite = visite !== null;
      let q = buildSession(
        visible,
        (id) => progressFor(source.progress, id),
        store.settingsFor(source.deck.id),
        store.counterFor(source.deck.id),
        Date.now(),
        ignoreGoal || enVisite,
      );
      /*
       * CHANTIER 325 ter — pendant la visite, toujours 5 cartes : on complète
       * avec d'autres cartes du paquet, les nouvelles d'abord. Sans ça, une
       * visite relancée ne montrait que les 2 ou 3 cartes encore dues.
       */
      if (enVisite) {
        const pris = new Set(q.map((i) => i.card.id));
        const reste: SessionItem[] = visible
          .filter((c) => !pris.has(c.id))
          .map((card) => {
            const progress = progressFor(source.progress, card.id);
            return { card, progress, wasNew: isNew(progress) };
          })
          .sort((x, y) => Number(y.wasNew) - Number(x.wasNew) || Math.random() - 0.5);
        q = [...q, ...reste].slice(0, VISITE_CARTES);
        poseRdv([]);
      }
      if (!q.length) return false;
      setQueue(q);
      setView({ name: 'study' });
      return true;
    },
    [store, visite, poseRdv],
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

  /*
   * CHANTIER 291 — « Réviser les mots ratés », la veille du contrôle :
   * seulement les mots notés « À revoir » à la dernière révision, qu'ils
   * soient dus ou non. Les notes comptent comme d'habitude.
   */
  const reviewRates = useCallback(
    async (id: string) => {
      const deck = await store.loadDeck(id);
      setLoaded(deck);
      if (estOnglet(view.name)) setOrigine(view.name);
      const visible = deck.cards.filter((c) => deck.selectedThemes.includes(c.theme));
      const q: SessionItem[] = motsRates(visible, deck.progress)
        .map((card) => ({ card, progress: progressFor(deck.progress, card.id), wasNew: false }))
        .sort(() => Math.random() - 0.5);
      if (!q.length) { setView({ name: 'deck' }); return; }
      setQueue(q);
      setView({ name: 'study' });
    },
    [store, view.name],
  );

  /* CHANTIER 356 — « Revoir ces mots maintenant » : les cartes ratées de la session qui vient de finir. */
  const revoirMots = useCallback(
    async (ids: string[]) => {
      if (!loaded) return;
      const deck = await store.loadDeck(loaded.deck.id);
      setLoaded(deck);
      const garde = new Set(ids);
      const q: SessionItem[] = deck.cards
        .filter((c) => garde.has(c.id))
        .map((card) => ({ card, progress: progressFor(deck.progress, card.id), wasNew: false }))
        .sort(() => Math.random() - 0.5);
      if (!q.length) return;
      setQueue(q);
      setView({ name: 'study' });
    },
    [loaded, store],
  );
  const [suivant, setSuivant] = useState<{ id: string; nom: string; cartes: number } | null>(null);

  const handleGrade = useCallback(
    async (item: SessionItem, grade: Grade) => {
      if (!loaded) return;
      const next = await store.gradeCard(loaded.deck.id, item.progress, grade, item.wasNew);
      // On tient la progression à jour en mémoire pour les statistiques au retour.
      loaded.progress[next.cardId] = next;
      /* 325 ter — la visite garde le prochain rendez-vous de chaque carte. */
      if (visite !== null) {
        const r = rdvGardes().filter((x) => x.id !== next.cardId);
        poseRdv([...r, { id: next.cardId, en: item.card.en, fr: item.card.fr, note: grade, due: next.due }]);
      }
    },
    [loaded, store, visite, poseRdv],
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
        /*
         * 356 — la question est maintenant une boîte maison, qui ne bloque pas :
         * on remet tout de suite l'entrée que l'appui vient de consommer, et si
         * la personne confirme, on refait le retour, marqué interne.
         */
        history.pushState({ profondeur: p.length }, '');
        void demande(QUITTER).then((oui) => {
          if (!oui) return;
          void endSession();
          depileInterne.current = true;
          history.back();
        });
        return;
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
   * CHANTIER 293 — la classe vient d'être choisie pendant la visite : un
   * paquet gratuit de ce niveau est obtenu ET mis en jeu, pour que
   * « Réviser » ait quelque chose à montrer sur « Aujourd'hui ».
   * Rien n'est fait si un paquet tourne déjà.
   */
  const paquetDeClasse = async (c: Classe | null) => {
    if (store.active.length) return;
    /* 336 — d'abord le paquet offert de la classe (Voyager pour un adulte). */
    const offerts = store.decks.filter((d) => PAQUETS_OFFERTS.has(d.id));
    const offert = estAdulte(store.common)
      ? offerts.find((d) => d.id === PAQUET_OFFERT_ADULTE)
      : [...offerts.filter((d) => !d.pourAdultes && classeConvient(d.classeFrom, c))]
          .sort((a, b) => classeRank(b.classeFrom) - classeRank(a.classeFrom))[0];
    const libres = offert ? [offert] : store.decks.filter((d) => !d.priceCents && !d.pourAdultes);
    const pourMoi = libres.filter((d) => classeConvient(d.classeFrom, c));
    const liste = pourMoi.length ? pourMoi : libres;
    const d = [...liste].sort((a, b) => classeRank(b.classeFrom) - classeRank(a.classeFrom))[0];
    if (!d) return;
    await store.addDeck(d.id);
    await store.setActive(d.id, true);
    await store.refreshAll();
  };

  const finVisite = () => {
    if (!visiteRelue) mesure('onboarding_fini', 'visite');
    localStorage.setItem(GUIDE, '1');
    localStorage.removeItem(VISITE);
    poseRdv([]);
    setVisite(null);
    setVisiteRelue(false);
  };

  /*
   * Deux familles d'écrans : ceux des onglets, sans barre de titre, et
   * ceux où l'on est entré depuis un onglet, avec un retour en haut.
   * Aucun écran ne porte les deux à la fois : la barre du bas sert de
   * repère fixe, la barre du haut ne sert qu'à revenir.
   */
  const surOnglet = view.name === 'today' || view.name === 'library'
    || view.name === 'parler' || view.name === 'account' || view.name === 'progress';

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
  /* Pas un hook : cette ligne suit des « return » anticipés. precharge() ne s'exécute qu'une fois. */
  precharge();
  const cleEcran = view.name === 'deck' ? `deck:${loaded?.deck.id ?? ''}` : view.name;

  return (
    <div className={`app${surOnglet ? ' tabbed' : ''}`}>
      {zoom && <CardZoom source={zoom} onDone={() => setZoom(null)} />}
      <Dialogues />

      {!surOnglet && (
        <div className="topbar">
          <button
            className="iconbtn"
            aria-label="Retour"
            onClick={async () => {
              if (view.name === 'study' && !(await demande(QUITTER))) return;
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
        role="main"
      >
        <Suspense fallback={null}>
        {view.name === 'today' && (
          <VeilleControle
            decks={store.decks}
            active={store.active}
            onRates={(id) => void reviewRates(id)}
          />
        )}

        {view.name === 'today' && (
          <Today
            decks={store.decks}
            active={store.active}
            settings={store.common}
            streak={store.streak}
            onReview={(id) => void reviewDeck(id)}
            onOpen={(id) => void openDeck(id)}
            onManage={() => setView({ name: 'library' })}
            onCalendrier={() => { setProgresOuvre('calendrier'); setView({ name: 'progress' }); }}
            onParler={() => setView({ name: 'parler' })}
            onXp={() => { setProgresOuvre('xp'); setView({ name: 'progress' }); }}
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
            onCreer={() => { setLoaded(null); setView({ name: 'editor', mode: 'create' }); }}
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
                  papier: (d as unknown as DeckControle | undefined)?.papier ?? null,
                  from: vol.from,
                });
              }
              void openDeck(id);
            }}
            onReview={(id) => void reviewDeck(id)}
            onAdd={(id) => {
              /* 337 — le serveur ne vérifie pas encore : on refuse ici aussi. */
              const d = store.decks.find((x) => x.id === id);
              if (d && reserveAbonnes(d)) return;
              void store.addDeck(id);
            }}
            onRemove={(id) => void store.removeDeck(id)}
            onSetActive={(id, on) => void store.setActive(id, on)}
          />
        )}

        {/*
          * CHANTIER 103 — l'onglet « Parler ».
          *
          * `onParler` n'est PAS passé : aucun service de conversation n'est
          * raccordé, l'écran le dit et son bouton reste éteint. Le jour où
          * la voix existe, c'est la seule ligne à ajouter ici.
          *
          * Les paquets EN JEU, pas tous : la conversation se sert du
          * vocabulaire que la charge du jour fait tourner.
          */}
        {view.name === 'parler' && (
          <Parler
            decks={store.decks}
            active={store.active}
            settings={store.common}
            /*
             * CHANTIER 307 — le cran de difficulté réglé après le bilan part
             * tout de suite vers le compte, comme le paquet de reprise.
             */
            onSettings={(s) => {
              void store.setCommon(s).then(() => { if (auth.session) void auth.runSync(); });
            }}
            onReglages={() => setView({ name: 'account' })}
            /*
             * CHANTIER 110 — le paquet de reprise vient d'être rempli : on
             * l'obtient et on le met en jeu, sinon ses cartes attendraient
             * dans la collection sans jamais passer dans la journée.
             */
            onReprise={async () => {
              await store.refreshAll();
              await store.addDeck(REPRISE_ID);
              await store.setActive(REPRISE_ID, true);
              await store.refreshAll();
              /*
               * CHANTIER 184 — et on synchronise tout de suite, comme en fin
               * de révision : sans cela, les mots restaient sur ce seul
               * appareil jusqu'à la prochaine ouverture de l'application.
               */
              if (auth.session) void auth.runSync();
            }}
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
            onGuide={() => { setVisiteRelue(true); setView({ name: 'today' }); poseEtape(0); }}
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
            ouvrir={progresOuvre}
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
            /* 337 — un paquet réservé, hors collection : pas de révision. */
            verrouille={reserveAbonnes(loaded.deck) && !store.installed.includes(loaded.deck.id)}
            onStart={(ignoreGoal) => {
              if (reserveAbonnes(loaded.deck) && !store.installed.includes(loaded.deck.id)) return;
              startSession(loaded, ignoreGoal);
            }}
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
            /* CHANTIER 302 — de tête, à l'écrit ou à l'oral, selon le type de paquet. */
            modeReponse={loaded.deck.builtin
              ? store.settingsFor(loaded.deck.id).reponseJeu ?? 'tete'
              : store.settingsFor(loaded.deck.id).reponsePerso ?? 'ecrit'}
            onGrade={handleGrade}
            /* CHANTIER 325 bis — premiers pas : une carte ratée ne revient pas dans la même séance. */
            sansRetour={visite !== null}
            onQuit={() => { void endSession(); setView({ name: 'deck' }); }}
            onDone={(reviewed, bilan) => {
              /* 356 — le paquet suivant à réviser aujourd'hui, relu après l'enregistrement. */
              setSuivant(null);
              const ici = loaded.deck.id;
              void endSession().then(async () => {
                const autres = store.decks.filter((d) => store.active.includes(d.id) && d.id !== ici);
                const { summaries } = await loadSummaries(autres, store.common);
                const r = summaries.filter((s) => s.due > 0).sort((x, y) => y.due - x.due)[0];
                setSuivant(r ? { id: r.deck.id, nom: r.deck.name, cartes: Math.min(r.due, store.common.cardsPerSession) } : null);
              });
              setView({ name: 'done', reviewed, bilan });
            }}
          />
        )}

        {view.name === 'done' && (
          <BilanFin
            bilan={view.bilan}
            paquet={loaded?.deck.name ?? ''}
            dueDe={loaded ? (id) => progressFor(loaded.progress, id).due : undefined}
            jour={gainDuJour(store.streak)}
            cartesJour={cartesDuJour(store.streak)}
            suivant={suivant}
            onSuivant={(id) => void reviewDeck(id)}
            onAujourdhui={() => setView({ name: 'today' })}
            onPaquet={() => setView({ name: 'deck' })}
            onRevoir={(ids) => void revoirMots(ids)}
          />
        )}

        {view.name === 'editor' && (
          <Editor
            mode={view.mode}
            deck={loaded?.deck}
            existingCards={loaded?.cards}
            onCancel={() => setView(loaded ? { name: 'deck' } : { name: 'library' })}
            onSaved={async (id) => {
              /*
               * CHANTIER 282 — un paquet créé appartient à la personne et
               * part en jeu tout de suite. Sans cela, il n'apparaissait
               * nulle part dans Ma collection.
               */
              if (view.mode === 'create') {
                await store.addDeck(id);
                await store.setActive(id, true);
              }
              await store.refreshAll();
              void openDeck(id);
              if (auth.session) void auth.runSync();
            }}
          />
        )}
        </Suspense>
      </div>

      {surOnglet && (
        <nav className="tabbar">
          {ONGLETS.map(({ name, label, Icone }) => (
            <button
              key={name}
              className={view.name === name ? 'on' : ''}
              aria-current={view.name === name ? 'page' : undefined}
              onClick={() => { if (name === 'progress') setProgresOuvre(null); setView({ name }); }}
            >
              <Icone />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      {visite !== null && (
        <Visite
          etape={visite}
          vue={view.name}
          relue={visiteRelue}
          rdv={rdv}
          onEtape={poseEtape}
          onFin={finVisite}
          onClasse={(c) => { void paquetDeClasse(c); }}
          /* CHANTIER 296 — la visite ramène sur « Aujourd'hui » pour montrer un onglet. */
          onAccueil={() => { setLoaded(null); setView({ name: 'today' }); }}
        />
      )}
    </div>
  );
}

function title(view: View, loaded: LoadedDeck | null): string {
  if (view.name === 'welcome') return 'Neuro Anglais';
  if (view.name === 'onboarding') return 'Premiers pas';
  if (view.name === 'today') return 'Aujourd’hui';
  if (view.name === 'library') return 'Paquets';
  if (view.name === 'parler') return 'Parler anglais';
  if (view.name === 'account') return 'Réglages';
  if (view.name === 'progress') return 'Mes progrès';
  if (view.name === 'search') return 'Rechercher';
  if (view.name === 'editor') return view.mode === 'create' ? 'Nouveau paquet' : 'Ajouter des mots';
  return loaded?.deck.name ?? 'Neuro Anglais';
}
