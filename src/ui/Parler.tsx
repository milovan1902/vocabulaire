/**
 * L'onglet « Parler » — ce qu'on règle AVANT d'ouvrir la bouche.
 *
 * CHANTIER 103 — LE CINQUIÈME ONGLET
 * CHANTIER 104 — LA JAUGE DIT LA VÉRITÉ
 * CHANTIER 106 — ET LES CONVERSATIONS SE RETROUVENT
 *
 * Trois cartes, dans l'ordre des questions qu'on se pose :
 *
 * 1. COMBIEN DE TEMPS AI-JE ? Le chiffre ne vient plus du téléphone mais
 *    DU SERVEUR, qui compte des jetons et répond en minutes. C'est le seul
 *    montage honnête : un compteur tenu dans l'application se remet à zéro
 *    en vidant le cache du navigateur.
 *
 * 2. QU'EST-CE QUE JE SAIS DÉJÀ ? Les mots passés au palier 100, tirés des
 *    paliers réels (voir `motsRecents`). C'est la carte qui rend
 *    l'abonnement défendable : aucune IA généraliste ne sait ce que cet
 *    élève vient d'apprendre.
 *
 * 3. DE QUOI PARLE-T-ON ? Dix thèmes au plus, choisis d'avance. Le niveau
 *    est rappelé en tête, en lecture seule : c'est la classe déclarée dans
 *    les Réglages qui le fixe, jamais le modèle.
 *
 * LA CONVERSATION DEMANDE UN COMPTE, et ce n'est pas une contrariété
 * administrative : un plafond par personne suppose de savoir qui est la
 * personne. Tout le reste de l'application continue sans compte.
 *
 * LES THÈMES restent dans `localStorage` — préférence de séance, locale à
 * l'appareil, qui n'a pas à traverser la synchronisation. Le temps
 * consommé, lui, est passé côté serveur au chantier 104 : c'est de
 * l'argent, ça ne se garde pas dans le téléphone.
 *
 * CHANTIER 113 — LA VITESSE DE LA VOIX, RÉGLÉE AVANT DE PARLER.
 * De 60 % à 100 % de la vitesse normale, par pas de 5. Gardée dans
 * `localStorage`, comme les thèmes : c'est une préférence d'appareil.
 * Elle ne concerne que la conversation ; les cartes gardent le débit
 * des Réglages.
 *
 * CHANTIER 312 — TROIS SOUS-ONGLETS.
 * L'écran empilait sept cartes. Le temps de parole tient désormais sur une
 * ligne, au-dessus de trois sous-onglets :
 *   • S'exercer (par défaut) : le mode, le choix, le bouton. Rien d'autre.
 *   • Conversations : l'archive, directement en liste (ParlerHistorique intégré).
 *   • Préparer : les mots de la semaine, la vitesse de la voix, le niveau.
 * « Pas d'inspiration ? » est replié. Le pied ne parle plus de thèmes en
 * mise en situation. Les scènes inventées partent avec le niveau (classe,
 * cran, mots) et affichent leurs mots utiles.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
/* CHANTIER 371 — « Comprendre mes phrases ». */
import { ChoixComprendre, nombreEnAttente, noteComprises, type PhraseAttente, type Tour as TourComprendre } from './Comprendre';
import type { Classe, Deck, Settings } from '../domain/types';
import { CLASSE_LABELS, NIVEAU_ADULTE_LABELS, readNiveauAdulte } from '../domain/types';
import { motsRecents, type MotRecent } from './motsRecents';
import { quandDit, finDit, budgetParler, euros, sujetsRecents, cranRetenu, ideesDuJour, demandeIdees, type Budget, type Fiche, type Idee } from '../data/parler';
import { ParlerSeance } from './ParlerSeance';
import { mesure } from '../data/mesures';
/* 335 — gratuit : les scènes inventées sont offertes une fois. */
import { estPremium } from '../engine/xp';
import { ParlerHistorique } from './ParlerHistorique';
import { SITUATIONS, titreSituation } from '../data/situations';
import { detailExploitant } from '../data/messageErreur';
import './parler-onglets.css';
/* CHANTIER 359 — le tu et le vous. */
import { tvp } from './ton';

/**
 * Les thèmes proposés. Au plus dix retenus.
 *
 * CHANTIER 305 — 14 → 30 thèmes. Les anciens sont gardés tels quels (les
 * choix enregistrés restent valides). Les nouveaux sont concrets, neutres
 * et adaptés aux mineurs : rien qui demande de prendre position.
 *
 * CHANTIER 306 — affichés par ordre alphabétique, article ignoré
 * (« Les animaux » sous A, « L’espace » sous E).
 */
const sansArticle = (t: string) => t.replace(/^(Au|La|Le|Les|L’)\s*/, '');
const THEMES = [
  'Me présenter', 'La famille', 'Le collège', 'Le sport', 'La musique',
  'Les voyages', 'La cuisine', 'Les animaux', 'Le cinéma', 'Les vacances',
  'La ville', 'La nature', 'Les copains', 'Le week-end',
  'Au restaurant', 'Les courses', 'Les transports', 'La météo',
  'Les fêtes', 'Les jeux vidéo', 'Les séries', 'Les livres et BD',
  'Les métiers', 'Les sciences', 'L’espace', 'Les inventions',
  'Les monuments', 'Les pays anglophones', 'Le dessin et l’art', 'La mer',
].sort((a, b) => sansArticle(a).localeCompare(sansArticle(b), 'fr'));

/* CHANTIER 317 — les thèmes d'un adulte : la vie courante, sans le collège ni les copains. */
const THEMES_ADULTE = [
  ...THEMES.filter((t) => t !== 'Le collège' && t !== 'Les copains'),
  'Mon travail', 'Le logement', 'La santé', 'Le budget du quotidien', 'Les enfants',
  'Le bricolage et le jardin', 'Les e-mails et le téléphone', 'Les collègues',
].sort((a, b) => sansArticle(a).localeCompare(sansArticle(b), 'fr'));

const MAX_THEMES = 10;

const CLE_THEMES = 'vocab:parler-themes';
/** La vue exploitant : trois tapes sur « remis à zéro à minuit ». */
const CLE_EXPLOITANT = 'vocab:parler-exploitant';
const CLE_VITESSE = 'vocab:parler-vitesse';
const VITESSE_MIN = 60;
const VITESSE_MAX = 100;

function vitesseRetenue(): number {
  const n = Number(localStorage.getItem(CLE_VITESSE));
  if (!Number.isFinite(n) || n === 0) return VITESSE_MAX;
  return Math.min(VITESSE_MAX, Math.max(VITESSE_MIN, Math.round(n)));
}

/**
 * Ce que l'IA s'autorise, par classe.
 *
 * La table est ici et non enfouie dans le prompt : c'est un choix
 * pédagogique, il se relit, et il s'affiche à l'élève avant la
 * conversation. Un réglage caché est un réglage qu'on finit par oublier.
 */
const GRAMMAIRE: Record<Classe, string> = {
  CM2: 'présent, phrases courtes, questions simples',
  '6e': 'présent, questions simples, vocabulaire du quotidien',
  '5e': 'présent et prétérit, phrases reliées',
  '4e': 'présent, prétérit, futur, present perfect',
  '3e': 'tous les temps du collège, conditionnel',
  /* 305 — plus d'opinion, d'actualité ni de débat : la difficulté vient de la langue. */
  '2de': 'temps composés, explications détaillées',
  '1re': 'nuances, hypothèses, récits riches',
  Tle: 'registre soutenu, vocabulaire précis, hypothèses',
};

function themesRetenus(): string[] {
  try {
    const brut = localStorage.getItem(CLE_THEMES);
    if (!brut) return [];
    const t = JSON.parse(brut) as unknown;
    if (!Array.isArray(t)) return [];
    return t.filter((x): x is string => typeof x === 'string' && (THEMES.includes(x) || THEMES_ADULTE.includes(x)));
  } catch {
    return [];
  }
}

/** CHANTIER 139 — les classes où la conversation est ouverte (13 ans et plus). */
const CLASSES_VOIX: readonly string[] = ['4e', '3e', '2de', '1re', 'Tle'];

type Etat = 'charge' | 'pret' | 'anonyme' | 'panne';
/** CHANTIER 312 — les sous-onglets. Toujours « S'exercer » à l'ouverture (la visite guidée y compte). */
/* CHANTIER 359 — plus de sous-onglets : un accueil à deux portes (Discuter, Jouer une scène), et trois sous-écrans. */
type Onglet = 'accueil' | 'discuter' | 'scene' | 'comprendre' | 'conversations' | 'parametres';

export function Parler({
  decks, active, settings, onSettings, onReglages, onReprise, directDiscuter = false,
}: {
  /** CHANTIER 359 — pendant la visite guidée, on arrive directement sur « Discuter » (elle y montre un sujet). */
  directDiscuter?: boolean;
  decks: Deck[];
  /** Paquets en jeu : le vocabulaire dont la conversation peut se servir. */
  active: string[];
  settings: Settings;
  /** CHANTIER 307 — enregistrer le cran de difficulté dans les réglages du compte. */
  onSettings: (s: Settings) => void;
  /** Aller régler sa classe. Le niveau ne se change pas depuis ici. */
  onReglages: () => void;
  /** CHANTIER 110 — obtenir et mettre en jeu le paquet de reprise. */
  onReprise: () => Promise<void>;
}) {
  const [choisis, setChoisis] = useState<string[]>(themesRetenus);
  const [vitesse, setVitesse] = useState<number>(vitesseRetenue);
  const changeVitesse = (v: number) => {
    setVitesse(v);
    localStorage.setItem(CLE_VITESSE, String(v));
  };
  const [mots, setMots] = useState<MotRecent[]>([]);
  const [totalMots, setTotalMots] = useState(0);
  const [chargeMots, setChargeMots] = useState(true);
  /** 305 — ce que l'IA a déjà demandé : lu une fois, fixe pendant la séance (cache). */
  const [deja, setDeja] = useState<string[]>([]);
  useEffect(() => { void sujetsRecents().then(setDeja); }, []);
  /** 306 — le cran de difficulté ; 307 — lu dans les réglages du compte. */
  const cran = cranRetenu(settings.parlerCran);
  /** CHANTIER 308 — conversation libre ou mise en situation, et la scène choisie. */
  const [mode, setModeEtat] = useState<'libre' | 'scene'>(
    () => (localStorage.getItem('vocab:parler-mode') === 'scene' ? 'scene' : 'libre'),
  );
  const [situation, setSituationEtat] = useState<string | null>(
    () => {
      const id = localStorage.getItem('vocab:parler-situation');
      /* 310 — une scène inventée se garde aussi ; son titre arrive avec les idées du jour. */
      return titreSituation(id) || /^idee:[0-2]$/.test(id ?? '') ? id : null;
    },
  );
  const setMode = (m: 'libre' | 'scene') => { setModeEtat(m); localStorage.setItem('vocab:parler-mode', m); };
  const setSituation = (id: string) => { setSituationEtat(id); localStorage.setItem('vocab:parler-situation', id); };
  /** CHANTIER 310 — les 3 scènes inventées du jour, et si on peut encore en demander. */
  const [idees, setIdees] = useState<Idee[] | null>(null);
  const [ideesEncore, setIdeesEncore] = useState(true);
  const [ideesEtat, setIdeesEtat] = useState<'repos' | 'charge' | 'erreur'>('repos');
  /** 311 — la vraie cause d'un échec, affichée en petit (comme pour la conversation). */
  const [ideesPanne, setIdeesPanne] = useState<string | null>(null);
  /** 312 — replié par défaut ; ouvert d'office si une scène inventée est retenue. */
  const [onglet, setOnglet] = useState<Onglet>(directDiscuter ? 'discuter' : 'accueil');
  useEffect(() => {
    if (!directDiscuter) return;
    setOnglet('discuter');
    setModeEtat('libre');
  }, [directDiscuter]);
  useEffect(() => { window.scrollTo(0, 0); }, [onglet]);
  useEffect(() => {
    void ideesDuJour(settings.classe ?? null).then((r) => { if (r) { setIdees(r.scenes); setIdeesEncore(r.encore); } });
  }, [settings.classe]);
  const inspire = async () => {
    setIdeesEtat('charge');
    setIdeesPanne(null);
    try {
      const r = await demandeIdees(classe ?? null, cran, mots.map((m) => m.en), readNiveauAdulte(settings.adulte));
      setIdees(r.scenes);
      setIdeesEncore(r.encore);
      setIdeesEtat('repos');
    } catch (e) {
      setIdeesEtat('erreur');
      const m = e instanceof Error ? e.message : String(e);
      const d = (e as { detail?: string }).detail;
      setIdeesPanne(d ? `${m} — ${d}` : m);
    }
  };
  const idIdee = /^idee:([0-2])$/.exec(situation ?? '');
  const titreScene = mode !== 'scene' ? null
    : idIdee ? (idees?.[Number(idIdee[1])]?.titre ?? null)
    : titreSituation(situation);
  /** CHANTIER 309 — une catégorie à la fois : celle de la scène retenue, sinon la première. */
  const [cat, setCat] = useState<string>(
    () => SITUATIONS.find((c) => c.liste.some((s) => s.id === situation))?.cat ?? (SITUATIONS.find((c) => !c.adulte) ?? SITUATIONS[0]).cat,
  );
  const scenesDeCat = SITUATIONS.find((c) => c.cat === cat)?.liste ?? [];

  const [budget, setBudget] = useState<Budget | null>(null);
  const [etat, setEtat] = useState<Etat>('charge');
  /** Le motif brut de la panne. Petit, monospace, sélectionnable. */
  const [pourquoi, setPourquoi] = useState<string | null>(null);
  const [enSeance, setEnSeance] = useState(false);
  /* 371 — les phrases choisies, puis celles de la séance en cours ; l'échange, gardé avec elles. */
  const [aComprendre, setAComprendre] = useState<PhraseAttente[]>([]);
  const [seanceComprendre, setSeanceComprendre] = useState<PhraseAttente[] | null>(null);
  const echange = useRef<TourComprendre[]>([]);
  const onEchange = useCallback((m: TourComprendre[]) => { echange.current = m; }, []);

  const [exploitant, setExploitant] = useState(
    () => localStorage.getItem(CLE_EXPLOITANT) === '1',
  );
  const [tapes, setTapes] = useState(0);

  const litBudget = useCallback(async () => {
    setEtat('charge');
    try {
      const b = await budgetParler();
      if (!b) { setEtat('anonyme'); return; }
      setBudget(b);
      setEtat('pret');
      setPourquoi(null);
    } catch (e) {
      setPourquoi(detailExploitant(e, 'parler-budget'));
      setEtat('panne');
    }
  }, []);

  useEffect(() => { void litBudget(); }, [litBudget]);

  useEffect(() => {
    let vivant = true;
    setChargeMots(true);
    void motsRecents(decks, active).then((r) => {
      if (!vivant) return;
      setMots(r.mots);
      setTotalMots(r.total);
      setChargeMots(false);
    });
    return () => { vivant = false; };
  }, [decks, active]);

  const bascule = (t: string) => {
    setChoisis((prec) => {
      const suivant = prec.includes(t)
        ? prec.filter((x) => x !== t)
        : prec.length >= MAX_THEMES ? prec : [...prec, t];
      localStorage.setItem(CLE_THEMES, JSON.stringify(suivant));
      return suivant;
    });
  };

  /* Trois tapes sur la mention discrète : la vue exploitant s'allume. */
  const tape = () => {
    const n = tapes + 1;
    if (n < 3) { setTapes(n); return; }
    setTapes(0);
    const suivant = !exploitant;
    setExploitant(suivant);
    localStorage.setItem(CLE_EXPLOITANT, suivant ? '1' : '0');
  };

  const classe = settings.classe;
  /* 317 — un adulte parle quel que soit son niveau ; sa grammaire est celle de la classe calée dessus. */
  const adulte = readNiveauAdulte(settings.adulte);
  const voixOuverte = !!adulte || (!!classe && CLASSES_VOIX.includes(classe));
  const niveauNom = adulte ? `Adulte ${adulte}` : classe ? CLASSE_LABELS[classe] : null;
  const themesVus = adulte ? THEMES_ADULTE : THEMES;
  const categories = SITUATIONS.filter((c) => !c.adulte || !!adulte);

  const fiche: Fiche = useMemo(() => ({
    classe,
    grammaire: classe ? GRAMMAIRE[classe] : GRAMMAIRE['6e'],
    mots: mots.map((m) => ({ en: m.en, fr: m.fr })),
    /* 308 — en mise en situation, le titre part dans l'archive à la place des thèmes. */
    themes: seanceComprendre ? ['Comprendre mes phrases'] : titreScene ? [`Mise en situation : ${titreScene}`] : choisis,
    situation: !seanceComprendre && titreScene && situation ? situation : undefined,
    phrases: seanceComprendre ? seanceComprendre.map((p) => ({ en: p.en, fr: p.fr })) : undefined,
    deja,
    cran,
    adulte: adulte ?? undefined,
  }), [classe, mots, choisis, deja, cran, titreScene, situation, adulte, seanceComprendre]);

  /*
   * CHANTIER 139 — LA VOIX S'OUVRE EN 4e
   *
   * Avant la 4e, l'abonnement donne les cartes seulement. L'écran se
   * verrouille ici, après tous les hooks (l'ordre des hooks ne doit pas
   * changer d'un rendu à l'autre). Le serveur refuse aussi, de son côté.
   */
  if (!voixOuverte) {
    return (
      <section className="parler" aria-label="Parler anglais">
        <h2 className="screen-title">Parler anglais</h2>
        <div className="parler-carte">
          {classe ? (
            <>
              <p className="parler-kicker">À partir de la 4e</p>
              <p className="hint">
                La conversation en anglais s’ouvre à partir de la 4e. En
                attendant, tes cartes t’attendent dans la bibliothèque :
                c’est là que se construit le vocabulaire dont tu te serviras
                pour parler.
              </p>
            </>
          ) : (
            <>
              <p className="parler-kicker">Ta classe d’abord</p>
              <p className="hint">
                La conversation s’adapte à ta classe, et s’ouvre à partir de
                la 4e. Choisis ta classe dans les Réglages.
              </p>
              <button className="btn ghost" onClick={() => { sessionStorage.setItem('vocab:ouvrir-tiroir', 'classe'); onReglages(); }}>Choisir ma classe</button>
            </>
          )}
        </div>
      </section>
    );
  }

  if (enSeance && budget) {
    return (
      <ParlerSeance
        fiche={fiche}
        debit={vitesse / 100}
        budget={budget}
        exploitant={exploitant}
        amorce={seanceComprendre ? tvp('Bonjour ! Explique-moi la première phrase, s’il te plaît.', 'Bonjour ! Expliquez-moi la première phrase, s’il vous plaît.') : undefined}
        onEchange={onEchange}
        onFini={() => {
          /* 371 — les phrases expliquées gardent l'échange, et quittent la liste d'attente. */
          if (seanceComprendre) { noteComprises(seanceComprendre, echange.current); setSeanceComprendre(null); setAComprendre([]); }
          setEnSeance(false);
          void litBudget();
          /* 306 — la séance s'ajoute aux « déjà vues ». */
          void sujetsRecents().then(setDeja);
        }}
        onCran={(n) => onSettings({ ...settings, parlerCran: n })}
        enJeu={active}
        onReprise={onReprise}
      />
    );
  }

  const autres = Math.max(0, totalMots - mots.length);
  const minutes = budget?.minutes ?? 0;
  const part = etat === 'pret' ? (100 * minutes) / (budget?.max ?? 10) : 0;
  /* 312 — la scène inventée retenue, et si les idées du jour datent d'une autre classe. */
  const ideeChoisie = idIdee ? idees?.[Number(idIdee[1])] ?? null : null;
  const classeChangee = !!idees?.[0]?.classe && idees[0].classe !== classe;
  const pret = mode === 'scene' ? !!titreScene : choisis.length > 0;

  /* ---------- CHANTIER 359 — les pièces communes ---------- */
  const budgetBloc = (
    <div className="parler-budget">
      {etat === 'charge' ? (
        <p className="hint">{tvp('Lecture de ton temps de parole…', 'Lecture de votre temps de parole…')}</p>
      ) : etat === 'anonyme' ? (
        <p className="hint">
          {tvp('La conversation demande un compte : ton temps de parole est tenu sur le serveur. Connecte-toi depuis les Réglages.', 'La conversation demande un compte : votre temps de parole est tenu sur le serveur. Connectez-vous depuis les Réglages.')}
        </p>
      ) : etat === 'panne' ? (
        <>
          <p className="hint" style={{ color: 'var(--bad)', fontWeight: 600 }}>
            {tvp('Ton temps de parole n’est pas joignable pour l’instant.', 'Votre temps de parole n’est pas joignable pour l’instant.')}{' '}
            <button className="parler-lien" onClick={() => void litBudget()}>Réessayer</button>
          </p>
          {pourquoi && <p className="seance-detail">{pourquoi}</p>}
        </>
      ) : (
        <>
          <div className="parler-budget-ligne">
            <b>{minutes}</b>
            <span>min disponible{minutes > 1 ? 's' : ''} {quandDit(budget)}</span>
            <span className="parler-jauge" aria-hidden="true">
              <i style={{ width: `${part}%` }} />
            </span>
          </div>
          {exploitant && (
            <p className="seance-exploitant">
              Vue exploitant · {euros(budget?.coutJour ?? 0)} dépensés {quandDit(budget)}
              {' '}sur ce compte ({budget?.appels ?? 0} échanges). Trois tapes sur
              « remis à zéro à minuit » (Paramètres) pour masquer.
            </p>
          )}
        </>
      )}
    </div>
  );

  const entete = (titre: string) => (
    <div className="parler-entete">
      <button className="parler-retour" aria-label="Retour à Parler" onClick={() => setOnglet('accueil')}>‹</button>
      <h2 className="screen-title">{titre}</h2>
    </div>
  );

  const dispo = etat === 'pret' && !budget?.fini ? ` · ${minutes} min disponible${minutes > 1 ? 's' : ''}` : '';
  const pied = etat === 'anonyme'
    ? tvp('Connecte-toi pour parler. Le reste de l’application marche sans compte, comme avant.', 'Connectez-vous pour parler. Le reste de l’application marche sans compte, comme avant.')
    : budget?.fini
      ? finDit(budget)
      : mode === 'scene'
        ? titreScene
          ? `Scène retenue : ${titreScene}.`
          : tvp('Choisis une scène pour commencer.', 'Choisissez une scène pour commencer.')
        : choisis.length === 0
          ? tvp('Choisis au moins un sujet. Sans sujet, la conversation tourne à vide au bout de deux phrases.', 'Choisissez au moins un sujet. Sans sujet, la conversation tourne à vide au bout de deux phrases.')
          : `${niveauNom ? `Niveau ${niveauNom}` : 'Classe non déclarée'} · voix à ${vitesse} %`;
  const bas = (
    <div className="parler-bas">
      <button
        className="btn parler-go"
        disabled={etat !== 'pret' || !!budget?.fini || !pret}
        onClick={() => { mesure('parler'); setEnSeance(true); }}
      >
        {mode === 'scene' ? 'Jouer la scène' : 'Commencer à parler'}{dispo}
      </button>
      <p className="parler-pied">{pied}</p>
    </div>
  );

  const motsBloc = (
    <div className="parler-carte">
      <p className="parler-kicker">{tvp('Tes mots de la semaine', 'Vos mots de la semaine')}</p>
      {chargeMots ? (
        <p className="hint">Lecture des mots…</p>
      ) : mots.length === 0 ? (
        <p className="hint">
          {tvp('Aucun mot acquis pour l’instant dans tes paquets en jeu. Travaille quelques cartes : ce sont ces mots-là que la conversation emploiera.', 'Aucun mot acquis pour l’instant dans vos paquets en jeu. Travaillez quelques cartes : ce sont ces mots-là que la conversation emploiera.')}
        </p>
      ) : (
        <>
          <div className="parler-mots">
            {mots.map((m) => (
              <span key={m.en} className="parler-mot" title={m.fr}>{m.en}</span>
            ))}
            {autres > 0 && <span className="parler-mot plus">+ {autres}</span>}
          </div>
          <p className="hint">{tvp('L’IA les glissera dans la conversation, sans que tu aies à les chercher.', 'L’IA les glissera dans la conversation, sans que vous ayez à les chercher.')}</p>
        </>
      )}
    </div>
  );

  /* ---------- Discuter ---------- */
  if (onglet === 'discuter') {
    return (
      <section className="parler parler-sous" aria-label="Discuter">
        {entete('Discuter')}
        <div className="parler-tete">
          <p className="hint" style={{ margin: 0 }}>{tvp('Choisis tes sujets.', 'Choisissez vos sujets.')}</p>
          <em className="parler-compte">{choisis.length} / {MAX_THEMES}</em>
        </div>
        <div className="parler-themes tuiles">
          {themesVus.map((t) => {
            const on = choisis.includes(t);
            return (
              <button key={t} className={on ? 'on' : ''} aria-pressed={on} disabled={!on && choisis.length >= MAX_THEMES} onClick={() => bascule(t)}>
                <span>{t}</span>
                {on && <i aria-hidden="true">✓</i>}
              </button>
            );
          })}
        </div>
        {motsBloc}
        {bas}
      </section>
    );
  }

  /* ---------- Jouer une scène ---------- */
  if (onglet === 'scene') {
    return (
      <section className="parler parler-sous" aria-label="Jouer une scène">
        {entete('Jouer une scène')}
        <div className="parler-filtres" role="group" aria-label="Catégorie">
          {categories.map((c) => (
            <button key={c.cat} className={cat === c.cat ? 'on' : ''} aria-pressed={cat === c.cat} onClick={() => setCat(c.cat)}>
              {c.cat}
            </button>
          ))}
        </div>
        <div className="parler-cartes" role="group" aria-label="Scènes">
          {idees?.map((s, i) => (
            <button key={`idee-${i}`} className={situation === `idee:${i}` ? 'parler-scene-carte idee on' : 'parler-scene-carte idee'} aria-pressed={situation === `idee:${i}`} onClick={() => setSituation(`idee:${i}`)}>
              <span className="parler-scene-haut"><b>{s.titre}</b>{situation === `idee:${i}` && <i aria-hidden="true">✓</i>}</span>
              <small>L’IA : {s.role}. {tvp('Toi', 'Vous')} : {s.eleve}.</small>
            </button>
          ))}
          {scenesDeCat.map((s) => (
            <button key={s.id} className={situation === s.id ? 'parler-scene-carte on' : 'parler-scene-carte'} aria-pressed={situation === s.id} onClick={() => setSituation(s.id)}>
              <span className="parler-scene-haut"><b>{s.titre}</b>{situation === s.id && <i aria-hidden="true">✓</i>}</span>
            </button>
          ))}
        </div>
        <button className="parler-inspi-carte" disabled={!ideesEncore || ideesEtat === 'charge'} onClick={() => void inspire()}>
          <span className="parler-inspi-icone" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" /></svg>
          </span>
          <span className="parler-inspi-txt">
            <b>{ideesEtat === 'charge' ? 'L’IA invente…' : classeChangee && ideesEncore ? 'Trois scènes à mon nouveau niveau' : idees ? 'Pas d’inspiration ? Trois autres' : 'Pas d’inspiration ?'}</b>
            <small>
              {ideesEtat === 'erreur'
                ? tvp('L’IA n’a pas répondu. Réessaie dans un instant.', 'L’IA n’a pas répondu. Réessayez dans un instant.')
                : classeChangee && ideesEncore
                  ? tvp('Ta classe a changé : ces scènes ont été inventées pour l’ancienne.', 'Votre niveau a changé : ces scènes ont été inventées pour l’ancien.')
                  : idees && !ideesEncore
                    ? (estPremium() ? 'Trois nouvelles scènes demain.' : tvp('Tes trois scènes offertes. Avec l’abonnement : trois nouvelles chaque jour.', 'Vos trois scènes offertes. Avec l’abonnement : trois nouvelles chaque jour.'))
                    : tvp('L’IA invente trois scènes à ton niveau, avec leurs mots utiles.', 'L’IA invente trois scènes à votre niveau, avec leurs mots utiles.')}
            </small>
          </span>
          {!estPremium() && !idees && <em>offert 1×</em>}
        </button>
        {ideesEtat === 'erreur' && ideesPanne && (
          <p className="hint" style={{ fontFamily: 'monospace', fontSize: 12, userSelect: 'text', wordBreak: 'break-word' }}>{ideesPanne}</p>
        )}
        {!!ideeChoisie?.mots?.length && (
          <p className="parler-utiles">
            <span>Mots utiles pour cette scène</span>
            {ideeChoisie.mots.map((m) => <em key={m}>{m}</em>)}
          </p>
        )}
        {bas}
      </section>
    );
  }

  /* ---------- CHANTIER 371 — Comprendre mes phrases ---------- */
  if (onglet === 'comprendre') {
    return (
      <section className="parler parler-sous" aria-label="Comprendre mes phrases">
        {entete('Comprendre mes phrases')}
        <ChoixComprendre choix={aComprendre} onChoix={setAComprendre} />
        <div className="parler-bas">
          <button
            className="btn parler-go"
            disabled={etat !== 'pret' || !!budget?.fini || aComprendre.length === 0}
            onClick={() => { mesure('parler'); setSeanceComprendre(aComprendre); setEnSeance(true); }}
          >
            Commencer{dispo}
          </button>
          <p className="parler-pied">
            {etat === 'anonyme'
              ? tvp('Connecte-toi pour parler.', 'Connectez-vous pour parler.')
              : budget?.fini
                ? finDit(budget)
                : aComprendre.length
                  ? `${aComprendre.length} phrase${aComprendre.length > 1 ? 's' : ''}, dans l’ordre choisi. L’IA explique en français, ${tvp('tu peux lui poser tes questions', 'vous pouvez lui poser vos questions')}.`
                  : tvp('Choisis au moins une phrase.', 'Choisissez au moins une phrase.')}
          </p>
        </div>
      </section>
    );
  }

  /* ---------- Mes conversations ---------- */
  if (onglet === 'conversations') {
    return (
      <section className="parler parler-sous" aria-label="Mes conversations">
        {entete('Mes conversations')}
        {etat === 'anonyme' ? (
          <p className="hint">{tvp('Connecte-toi pour retrouver tes conversations.', 'Connectez-vous pour retrouver vos conversations.')}</p>
        ) : (
          <>
            <p className="hint">
              {tvp('Chaque séance terminée est gardée en entier : ce que tu as dit, et le compte rendu. C’est en les relisant à quelques jours d’écart qu’on voit ce qui a bougé.', 'Chaque séance terminée est gardée en entier : ce que vous avez dit, et le compte rendu. C’est en les relisant à quelques jours d’écart qu’on voit ce qui a bougé.')}
            </p>
            <ParlerHistorique integre enJeu={active} onReprise={onReprise} />
          </>
        )}
      </section>
    );
  }

  /* ---------- Paramètres ---------- */
  if (onglet === 'parametres') {
    return (
      <section className="parler parler-sous" aria-label="Paramètres">
        {entete('Paramètres')}
        <div className="parler-carte">
          <p className="parler-kicker">{adulte ? 'Mon niveau' : 'Ma classe'}</p>
          <div className="parler-tete">
            <b className="parler-reglage">{adulte ? `Adulte · ${adulte} (${NIVEAU_ADULTE_LABELS[adulte]})` : classe ? CLASSE_LABELS[classe] : 'Non déclarée'}</b>
            <button className="parler-lien" onClick={() => { sessionStorage.setItem('vocab:ouvrir-tiroir', 'classe'); onReglages(); }}>Changer ›</button>
          </div>
          {classe && <p className="hint">L’IA emploie : {GRAMMAIRE[classe]}.</p>}
        </div>

        <div className="parler-carte">
          <p className="parler-kicker">Difficulté</p>
          <p className="parler-reglage"><b>{cran}</b> / 20</p>
          <span className="parler-jauge20" aria-hidden="true">
            {Array.from({ length: 20 }, (_, i) => <i key={i} className={i < cran ? 'on' : ''} />)}
          </span>
          <p className="hint">{tvp('Elle s’ajuste seule après chaque bilan, selon ce que tu as ressenti.', 'Elle s’ajuste seule après chaque bilan, selon ce que vous avez ressenti.')}</p>
        </div>

        <div className="parler-carte">
          <div className="parler-tete">
            <p className="parler-kicker">Vitesse de la voix</p>
            <em className="parler-compte">{vitesse} %</em>
          </div>
          <div className="parler-vitesse">
            <span aria-hidden="true">Lente</span>
            <input type="range" min={VITESSE_MIN} max={VITESSE_MAX} step={5} value={vitesse} aria-label="Vitesse de la voix de l’IA" onChange={(e) => changeVitesse(Number(e.target.value))} />
            <span aria-hidden="true">Normale</span>
          </div>
          <p className="hint">
            {vitesse < 80
              ? 'L’IA parlera lentement : pratique pour bien suivre au début.'
              : vitesse < 100
                ? 'Un peu plus lent que la normale.'
                : 'Vitesse normale, comme une vraie conversation.'}
          </p>
        </div>

        <p className="hint parler-pied">
          <button className="parler-note" onClick={tape}>Temps de parole remis à zéro à minuit</button>
        </p>
      </section>
    );
  }

  /* ---------- L'accueil : deux grandes portes ---------- */
  return (
    <section className="parler" aria-label="Parler anglais">
      <h2 className="screen-title">Parler anglais</h2>
      {budgetBloc}

      <button className="parler-porte" onClick={() => { setMode('libre'); setOnglet('discuter'); }}>
        <span className="parler-porte-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
        </span>
        <b>Discuter</b>
        <span>{tvp('Tu choisis tes sujets. L’IA discute avec toi et glisse tes mots de la semaine.', 'Vous choisissez vos sujets. L’IA discute avec vous et glisse vos mots de la semaine.')}</span>
        <em>Choisir {tvp('mes', 'mes')} sujets ›</em>
      </button>

      <button className="parler-porte scene" onClick={() => { setMode('scene'); setOnglet('scene'); }}>
        <span className="parler-porte-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10s3-3 3-8" /><path d="M22 10s-3-3-3-8" /><path d="M10 2c0 4.4-3.6 8-8 8" /><path d="M14 2c0 4.4 3.6 8 8 8" /><path d="M2 10s2 2 2 5" /><path d="M22 10s-2 2-2 5" /><path d="M8 15h8" /><path d="M2 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" /><path d="M14 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" /></svg>
        </span>
        <b>Jouer une scène</b>
        <span>L’IA joue un rôle — un agent, un serveur, un vendeur — avec un imprévu.</span>
        <em>Choisir une scène ›</em>
      </button>

      {/* CHANTIER 371 — la 3e porte : les phrases mises de côté pendant les révisions. */}
      <button className="parler-porte comprendre" onClick={() => { setAComprendre([]); setOnglet('comprendre'); }}>
        <span className="parler-porte-icone" aria-hidden="true">?</span>
        <b>Comprendre mes phrases</b>
        <span>{tvp('L’IA t’explique, en français, les phrases mises de côté. Tu peux lui poser tes questions.', 'L’IA vous explique, en français, les phrases mises de côté. Vous pouvez lui poser vos questions.')}</span>
        <em>{nombreEnAttente() ? `${nombreEnAttente()} phrase${nombreEnAttente() > 1 ? 's' : ''} en attente ›` : 'Comment ça marche ›'}</em>
      </button>

      <div className="parler-tuiles2">
        <button onClick={() => setOnglet('conversations')}>
          <span>Mes conversations</span>
          <b>Relire ›</b>
        </button>
        <button onClick={() => setOnglet('parametres')}>
          <span>Paramètres</span>
          <b>{[adulte ? adulte : classe ? CLASSE_LABELS[classe] : null, `${cran}/20`, `${vitesse} %`].filter(Boolean).join(' · ')}</b>
        </button>
      </div>

      {/* CHANTIER 139 — Anthropic et Google Play demandent de le dire clairement. */}
      <p className="hint parler-ia">{tvp('Tu parles avec une intelligence artificielle, pas avec une personne.', 'Vous parlez avec une intelligence artificielle, pas avec une personne.')}</p>
    </section>
  );
}
