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
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Classe, Deck, Settings } from '../domain/types';
import { CLASSE_LABELS } from '../domain/types';
import { motsRecents, type MotRecent } from './motsRecents';
import { quandDit, finDit, budgetParler, euros, sujetsRecents, cranRetenu, ideesDuJour, demandeIdees, type Budget, type Fiche, type Idee } from '../data/parler';
import { ParlerSeance } from './ParlerSeance';
import { mesure } from '../data/mesures';
import { ParlerHistorique } from './ParlerHistorique';
import { SITUATIONS, titreSituation } from '../data/situations';
import { detailExploitant } from '../data/messageErreur';
import './parler-onglets.css';

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
    return t.filter((x): x is string => typeof x === 'string' && THEMES.includes(x));
  } catch {
    return [];
  }
}

/** CHANTIER 139 — les classes où la conversation est ouverte (13 ans et plus). */
const CLASSES_VOIX: readonly string[] = ['4e', '3e', '2de', '1re', 'Tle'];

type Etat = 'charge' | 'pret' | 'anonyme' | 'panne';
/** CHANTIER 312 — les sous-onglets. Toujours « S'exercer » à l'ouverture (la visite guidée y compte). */
type Onglet = 'exercer' | 'conversations' | 'preparer';

export function Parler({
  decks, active, settings, onSettings, onReglages, onReprise,
}: {
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
  const [ideesOuvert, setIdeesOuvert] = useState(() => /^idee:/.test(situation ?? ''));
  const [onglet, setOnglet] = useState<Onglet>('exercer');
  useEffect(() => {
    void ideesDuJour(settings.classe ?? null).then((r) => { if (r) { setIdees(r.scenes); setIdeesEncore(r.encore); } });
  }, [settings.classe]);
  const inspire = async () => {
    setIdeesEtat('charge');
    setIdeesPanne(null);
    try {
      const r = await demandeIdees(classe ?? null, cran, mots.map((m) => m.en));
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
    () => SITUATIONS.find((c) => c.liste.some((s) => s.id === situation))?.cat ?? SITUATIONS[0].cat,
  );
  const scenesDeCat = SITUATIONS.find((c) => c.cat === cat)?.liste ?? [];

  const [budget, setBudget] = useState<Budget | null>(null);
  const [etat, setEtat] = useState<Etat>('charge');
  /** Le motif brut de la panne. Petit, monospace, sélectionnable. */
  const [pourquoi, setPourquoi] = useState<string | null>(null);
  const [enSeance, setEnSeance] = useState(false);

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
  const voixOuverte = !!classe && CLASSES_VOIX.includes(classe);

  const fiche: Fiche = useMemo(() => ({
    classe,
    grammaire: classe ? GRAMMAIRE[classe] : GRAMMAIRE['6e'],
    mots: mots.map((m) => ({ en: m.en, fr: m.fr })),
    /* 308 — en mise en situation, le titre part dans l'archive à la place des thèmes. */
    themes: titreScene ? [`Mise en situation : ${titreScene}`] : choisis,
    situation: titreScene && situation ? situation : undefined,
    deja,
    cran,
  }), [classe, mots, choisis, deja, cran, titreScene, situation]);

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
              <button className="btn ghost" onClick={onReglages}>Choisir ma classe</button>
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
        onFini={() => {
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

  const ONGLETS: Array<[Onglet, string]> = [
    ['exercer', 'S’exercer'], ['conversations', 'Conversations'], ['preparer', 'Préparer'],
  ];

  return (
    <section className="parler" aria-label="Parler anglais">
      <h2 className="screen-title">Parler anglais</h2>
      {/* CHANTIER 139 — Anthropic et Google Play demandent de le dire clairement. */}
      <p className="hint">
        Tu parles avec une intelligence artificielle, pas avec une personne.
      </p>

      {/* 312 — le temps de parole sur une ligne, visible depuis les trois sous-onglets. */}
      <div className="parler-budget">
        {etat === 'charge' ? (
          <p className="hint">Lecture de ton budget…</p>
        ) : etat === 'anonyme' ? (
          <p className="hint">
            La conversation demande un compte : ton temps de parole est tenu
            sur le serveur. Connecte-toi depuis les Réglages.
          </p>
        ) : etat === 'panne' ? (
          <>
            {/* CHANTIER 155 — la panne doit se voir : gras, couleur d'alerte. */}
            <p className="hint" style={{ color: 'var(--bad)', fontWeight: 600 }}>
              Ton budget n’est pas joignable pour l’instant.{' '}
              <button className="parler-lien" onClick={() => void litBudget()}>
                Réessayer
              </button>
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
                « remis à zéro à minuit » (Préparer) pour masquer.
              </p>
            )}
          </>
        )}
      </div>

      <div className="parler-onglets" role="tablist" aria-label="Parler">
        {ONGLETS.map(([id, nom]) => (
          <button
            key={id}
            role="tab"
            aria-selected={onglet === id}
            className={onglet === id ? 'on' : ''}
            onClick={() => setOnglet(id)}
          >
            {nom}
          </button>
        ))}
      </div>

      {onglet === 'exercer' && (
        <div role="tabpanel" aria-label="S’exercer">
          {/* CHANTIER 308 — deux façons de s'exercer ; 312 — deux cartes côte à côte. */}
          <div className="parler-modes" role="group" aria-label="Type de séance">
            <button className={mode === 'libre' ? 'parler-mode on' : 'parler-mode'} aria-pressed={mode === 'libre'} onClick={() => setMode('libre')}>
              <b>Conversation</b>
              <small>On discute sur tes thèmes.</small>
            </button>
            <button className={mode === 'scene' ? 'parler-mode on' : 'parler-mode'} aria-pressed={mode === 'scene'} onClick={() => setMode('scene')}>
              <b>Mise en situation</b>
              <small>L’IA joue un rôle, avec un imprévu.</small>
            </button>
          </div>

          {mode === 'libre' ? (
            <div className="parler-carte">
              <div className="parler-tete">
                <p className="parler-kicker">De quoi parle-t-on ?</p>
                <em className="parler-compte">{choisis.length} / {MAX_THEMES}</em>
              </div>
              <div className="parler-themes">
                {THEMES.map((t) => {
                  const on = choisis.includes(t);
                  return (
                    <button
                      key={t}
                      className={on ? 'on' : ''}
                      aria-pressed={on}
                      disabled={!on && choisis.length >= MAX_THEMES}
                      onClick={() => bascule(t)}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="parler-carte">
              {/* 309 — étape 1 : la catégorie ; étape 2 : la scène. */}
              <p className="parler-kicker">1. Catégorie</p>
              <div className="parler-themes" role="group" aria-label="Catégorie">
                {SITUATIONS.map((c) => (
                  <button
                    key={c.cat}
                    className={cat === c.cat ? 'on' : ''}
                    aria-pressed={cat === c.cat}
                    onClick={() => setCat(c.cat)}
                  >
                    {c.cat}
                  </button>
                ))}
              </div>
              <p className="parler-kicker" style={{ marginTop: 20 }}>2. Scène</p>
              <div className="parler-scenes" role="group" aria-label="Scène">
                {scenesDeCat.map((s) => (
                  <button
                    key={s.id}
                    className={situation === s.id ? 'parler-scene on' : 'parler-scene'}
                    aria-pressed={situation === s.id}
                    onClick={() => setSituation(s.id)}
                  >
                    <span>{s.titre}</span>
                    {situation === s.id && <i aria-hidden="true">✓</i>}
                  </button>
                ))}
              </div>

              {/* CHANTIER 310 — trois scènes inventées par l'IA ; 312 — repliées, et à ton niveau. */}
              <div className="parler-inspi">
                <button className="parler-inspi-tete" aria-expanded={ideesOuvert} onClick={() => setIdeesOuvert((o) => !o)}>
                  <b>Pas d’inspiration ?</b>
                  <span>{ideesOuvert ? 'Replier' : 'Ouvrir'}</span>
                </button>
                {ideesOuvert && (
                  <>
                    {idees && (
                      <div className="parler-scenes" role="group" aria-label="Scènes inventées">
                        {idees.map((s, i) => (
                          <button
                            key={i}
                            className={situation === `idee:${i}` ? 'parler-scene on' : 'parler-scene'}
                            aria-pressed={situation === `idee:${i}`}
                            onClick={() => setSituation(`idee:${i}`)}
                          >
                            <span>{s.titre}</span>
                            {situation === `idee:${i}` && <i aria-hidden="true">✓</i>}
                          </button>
                        ))}
                      </div>
                    )}
                    {ideeChoisie && (
                      <>
                        <p className="hint">L’IA : {ideeChoisie.role}. Toi : {ideeChoisie.eleve}.</p>
                        {!!ideeChoisie.mots?.length && (
                          <p className="parler-utiles">
                            <span>Mots utiles</span>
                            {ideeChoisie.mots.map((m) => <em key={m}>{m}</em>)}
                          </p>
                        )}
                      </>
                    )}
                    {ideesEncore && (
                      <div className="parler-themes">
                        <button onClick={() => void inspire()} disabled={ideesEtat === 'charge'}>
                          {ideesEtat === 'charge'
                            ? 'L’IA invente…'
                            : classeChangee
                              ? 'Trois scènes à mon nouveau niveau'
                              : idees ? 'Trois autres' : 'Invente-moi 3 scènes'}
                        </button>
                      </div>
                    )}
                    <p className="hint">
                      {ideesEtat === 'erreur'
                        ? 'L’IA n’a pas répondu. Réessaie dans un instant.'
                        : classeChangee && ideesEncore
                          ? 'Ta classe a changé : ces scènes ont été inventées pour l’ancienne.'
                          : idees && !ideesEncore
                            ? 'Trois nouvelles scènes demain.'
                            : 'L’IA invente trois scènes à ton niveau. Une fois par jour.'}
                    </p>
                    {ideesEtat === 'erreur' && ideesPanne && (
                      <p className="hint" style={{ fontFamily: 'monospace', fontSize: 12, userSelect: 'text', wordBreak: 'break-word' }}>
                        {ideesPanne}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {classe ? (
            <p className="parler-niveau">
              <b>Niveau {CLASSE_LABELS[classe]}</b> — {GRAMMAIRE[classe]}.{' '}
              <button className="parler-lien" onClick={() => setOnglet('preparer')}>Voix et mots</button>
            </p>
          ) : (
            <p className="parler-niveau">
              Classe non déclarée : la conversation restera simple.{' '}
              <button className="parler-lien" onClick={onReglages}>
                Choisir ma classe
              </button>
            </p>
          )}

          <button
            className="btn parler-go"
            disabled={etat !== 'pret' || !!budget?.fini || !pret}
            onClick={() => { mesure('parler'); setEnSeance(true); }}
          >
            Commencer à parler
          </button>

          {/* 312 — le pied suit le mode : plus de « thème » demandé en mise en situation. */}
          <p className="hint parler-pied">
            {etat === 'anonyme'
              ? 'Connecte-toi pour parler. Le reste de l’application marche sans compte, comme avant.'
              : budget?.fini
                ? finDit(budget)
                : mode === 'scene'
                  ? titreScene
                    ? `Scène retenue : ${titreScene}. Appuie sur le micro et parle.`
                    : 'Choisis une scène pour commencer.'
                  : choisis.length === 0
                    ? 'Choisis au moins un thème. Sans sujet, la conversation tourne à vide au bout de deux phrases.'
                    : 'Appuie sur le micro et parle. Le clavier reste disponible pendant la séance, en second.'}
          </p>
        </div>
      )}

      {onglet === 'conversations' && (
        <div role="tabpanel" aria-label="Conversations">
          {etat === 'anonyme' ? (
            <div className="parler-carte">
              <p className="hint">Connecte-toi pour retrouver tes conversations.</p>
            </div>
          ) : (
            <>
              <p className="hint">
                Chaque séance terminée est gardée en entier : ce que tu as dit,
                et le compte rendu. C’est en les relisant à quelques jours
                d’écart qu’on voit ce qui a bougé.
              </p>
              <ParlerHistorique integre enJeu={active} onReprise={onReprise} />
            </>
          )}
        </div>
      )}

      {onglet === 'preparer' && (
        <div role="tabpanel" aria-label="Préparer">
          <div className="parler-carte">
            <p className="parler-kicker">Tes mots de la semaine</p>
            {chargeMots ? (
              <p className="hint">Lecture de tes paliers…</p>
            ) : mots.length === 0 ? (
              <p className="hint">
                Aucun mot acquis pour l’instant dans tes paquets en jeu. Travaille
                quelques cartes : ce sont ces mots-là que la conversation
                emploiera, sans que tu aies à les chercher.
              </p>
            ) : (
              <>
                <div className="parler-mots">
                  {mots.map((m) => (
                    <span key={m.en} className="parler-mot" title={m.fr}>{m.en}</span>
                  ))}
                  {autres > 0 && <span className="parler-mot plus">+ {autres}</span>}
                </div>
                <p className="hint">
                  Ils reviendront dans la conversation, sans que tu aies à les
                  chercher.
                </p>
              </>
            )}
          </div>

          <div className="parler-carte">
            <div className="parler-tete">
              <p className="parler-kicker">Vitesse de la voix</p>
              <em className="parler-compte">{vitesse} %</em>
            </div>
            <div className="parler-vitesse">
              <span aria-hidden="true">Lente</span>
              <input
                type="range"
                min={VITESSE_MIN}
                max={VITESSE_MAX}
                step={5}
                value={vitesse}
                aria-label="Vitesse de la voix de l’IA"
                onChange={(e) => changeVitesse(Number(e.target.value))}
              />
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

          <div className="parler-carte">
            <p className="parler-kicker">Ton niveau</p>
            {classe ? (
              <p className="parler-niveau">
                <b>{CLASSE_LABELS[classe]}</b> — {GRAMMAIRE[classe]}.
              </p>
            ) : (
              <p className="parler-niveau">Classe non déclarée.</p>
            )}
            <p className="hint">
              Difficulté actuelle : {cran} / 20. Elle s’ajuste après chaque
              bilan, selon ce que tu as ressenti.{' '}
              <button className="parler-lien" onClick={onReglages}>Changer de classe</button>
            </p>
          </div>

          <p className="hint parler-pied">
            <button className="parler-note" onClick={tape}>Temps de parole remis à zéro à minuit</button>
          </p>
        </div>
      )}
    </section>
  );
}
