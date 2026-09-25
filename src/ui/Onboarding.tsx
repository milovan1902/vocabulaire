/**
 * CHANTIER 90 — LE PREMIER PAS GUIDÉ.
 * CHANTIER 91 — relisible à tout moment depuis les réglages (`relecture`).
 * CHANTIER 94 — la voix.
 * CHANTIER 110 — SEPT ÉTAPES : LA MÉTHODE, PUIS « PARLER ».
 *
 * Le parcours explique maintenant les deux moitiés de l'application, dans
 * l'ordre où l'élève les rencontre :
 *
 *   1. LA MÉTHODE  — l'oubli est mesurable, le rappel espacé le contre.
 *   2. LA CLASSE   — écrit le réglage `classe`, qui range le catalogue.
 *   3. LE PAQUET   — un seul, obtenu ET mis en jeu : la journée cesse
 *                    d'être vide avant même qu'on y arrive.
 *   4. LES PROGRÈS — ce que « Mes progrès » montrera : l'anneau, les
 *                    courbes des paliers. Chiffres FICTIFS, et annoncés
 *                    comme tels.
 *   5. PARLER      — l'onglet, dix minutes par jour, au niveau de la classe.
 *   6. TES MOTS    — les mots acquis reviennent dans la conversation.
 *   7. LE BILAN    — les corrections, et les mots qui ont posé problème,
 *                    à cocher pour le paquet « Reprise des fautes à l'oral ».
 *
 * Les étapes 5 à 7 ne lancent RIEN : ni micro, ni minute consommée. La
 * conversation et le bilan montrés sont des exemples écrits d'avance.
 *
 * Les anciennes étapes « cinq cartes » et « échéances » sont retirées,
 * comme décidé sur la maquette « Premiers pas v2 ». `loadDeck` et `onGrade`
 * restent acceptés sans être employés : App.tsx n'a pas à changer pour ça.
 *
 * En relecture : la méthode, les progrès et les trois écrans « Parler ».
 * La classe et le paquet sont déjà réglés, on ne les redemande pas.
 *
 * CHANTIER 112 — LES CINQ CARTES REVIENNENT, ET LES DOS SONT DESSINÉS.
 *
 * Neuf étapes : « cinq cartes » et « échéances » reprennent leur place
 * après le paquet, telles qu'au chantier 94 (voix, clavier, relecture qui
 * cherche un paquet lisible). En relecture : méthode, cartes, échéances,
 * puis progrès et Parler.
 *
 * Les dos des paquets proposés passent par `DeckVign`, comme sur
 * « Aujourd'hui » : parchemin et illustration. `imageFor` seul ne
 * connaissait que trois paquets et laissait les autres vides.
 *
 * CHANTIER 120 — la nouvelle étape 2 « paquets » (chantier 119) posée sur
 * les textes du chantier 115, sans en perdre un seul.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Card, Classe, Deck, Grade, Progress } from '../domain/types';
import { CLASSES, CLASSE_LABELS, classeConvient, classeRank } from '../domain/types';
import { STATUTS } from '../engine/mastery';
import { emptyProgress, isNew, previewIntervals } from '../engine/scheduler';
import { speak } from './speech';
import { DeckVign } from './components';
import { Anneau } from './MesMots';
import { REPRISE_NOM } from '../data/reprise';
import './reprise.css';

type PaquetCharge = {
  deck: { id: string; name: string };
  cards: Card[];
  progress: Record<string, Progress>;
  image: string | null;
};

const ETAPES = ['methode', 'paquets', 'classe', 'paquet', 'cartes', 'echeances', 'progres', 'parler', 'mots', 'bilan'] as const;
type Etape = (typeof ETAPES)[number];
const RELECTURE: readonly Etape[] = ['methode', 'paquets', 'cartes', 'echeances', 'progres', 'parler', 'mots', 'bilan'];

/** Cinq : assez pour sentir la répétition, trop peu pour ressembler à du travail. */
const CARTES_DESSAI = 5;

const JUGEMENTS: Array<{ key: Grade; label: string; className: string }> = [
  { key: 'again', label: 'À revoir', className: 'grade again' },
  { key: 'hard', label: 'Difficile', className: 'grade' },
  { key: 'good', label: 'Correct', className: 'grade' },
  { key: 'easy', label: 'Facile', className: 'grade easy' },
];

type Resultat = { card: Card; grade: Grade; due: number };

/*
 * Les relevés fictifs de l'étape 4 : huit semaines, les quatre tas tracés
 * par « Mon évolution ». Même échelle, mêmes classes de trait que l'écran
 * réel (`tr-reprendre`, `tr-cours`, `tr-presque`, `tr-acquis`).
 */
const FICTIF = {
  reprendre: [0, 6, 10, 12, 11, 10, 9, 8, 7],
  cours: [20, 38, 46, 48, 46, 44, 42, 40, 38],
  presque: [0, 10, 18, 24, 28, 30, 31, 30, 29],
  acquis: [0, 4, 12, 25, 41, 60, 82, 100, 118],
} as const;
const AXE = ['28 juil.', '18 août', '8 sept.', '22 sept.'];

function trace(v: readonly number[]): string {
  const max = 118;
  return v
    .map((n, i) => `${i ? 'L' : 'M'}${((320 * i) / (v.length - 1)).toFixed(1)} ${(96 - (88 * n) / max).toFixed(1)}`)
    .join(' ');
}

export function Onboarding({
  decks, classe, onClasse, onChoisir, loadDeck, onGrade, onFini,
  relecture = false, enJeu = [], debit = 1,
}: {
  decks: Deck[];
  classe: Classe | null;
  onClasse: (c: Classe | null) => void;
  /** Obtient le paquet ET le met en jeu : sans cela, la journée reste à zéro. */
  onChoisir: (id: string) => Promise<void>;
  /** Charge le paquet des cinq cartes. */
  loadDeck?: (id: string) => Promise<PaquetCharge>;
  /** Enregistre un jugement des cinq cartes, comme en révision. */
  onGrade?: (deckId: string, p: Progress, g: Grade, wasNew: boolean) => Promise<Progress>;
  onFini: (vers: 'today' | 'library' | 'account' | 'parler') => void;
  relecture?: boolean;
  enJeu?: string[];
  debit?: number;
}) {
  const [etape, setEtape] = useState<Etape>('methode');
  const [enCours, setEnCours] = useState(false);
  const [charge, setCharge] = useState<PaquetCharge | null>(null);
  const [index, setIndex] = useState(0);
  const [montre, setMontre] = useState(false);
  const [resultats, setResultats] = useState<Resultat[]>([]);
  /* La relecture n'a trouvé aucun paquet lisible : on repasse par le choix. */
  const [secours, setSecours] = useState(false);

  const relu = relecture && enJeu.length > 0 && !secours;
  const parcours = relu ? RELECTURE : ETAPES;
  const rang = parcours.indexOf(etape) + 1;
  const suivante = useCallback(() => {
    const i = parcours.indexOf(etape);
    if (i >= 0 && i + 1 < parcours.length) setEtape(parcours[i + 1]);
  }, [parcours, etape]);

  const propositions = useMemo(() => {
    const libres = decks.filter((d) => !d.priceCents);
    const pourMoi = libres.filter((d) => classeConvient(d.classeFrom, classe));
    const liste = pourMoi.length ? pourMoi : libres;
    return [...liste]
      .sort((a, b) => classeRank(b.classeFrom) - classeRank(a.classeFrom))
      .slice(0, 3);
  }, [decks, classe]);

  /* CHANTIER 119 — les trois dos de l'étape « paquets ». */
  const pile = useMemo(() => {
    const enCoursDeJeu = decks.filter((d) => enJeu.includes(d.id));
    return (enCoursDeJeu.length ? enCoursDeJeu : propositions.length ? propositions : decks).slice(0, 3);
  }, [decks, enJeu, propositions]);

  const demarrer = useCallback((c: PaquetCharge) => {
    setCharge({ ...c, progress: c.progress ?? {} });
    setIndex(0);
    setMontre(false);
    setResultats([]);
    setEtape('cartes');
  }, []);

  const choisirPaquet = useCallback(async (id: string) => {
    setEnCours(true);
    try {
      await onChoisir(id);
      const c = loadDeck ? await loadDeck(id) : null;
      if (c && c.cards?.length) demarrer(c);
      else setEtape('progres');
    } catch {
      setEtape('progres');
    } finally {
      setEnCours(false);
    }
  }, [onChoisir, loadDeck, demarrer]);

  /* Relecture : le premier paquet en jeu qui a des cartes à montrer. */
  const reprendre = useCallback(async () => {
    setEnCours(true);
    for (const id of enJeu) {
      try {
        const c = loadDeck ? await loadDeck(id) : null;
        if (c && c.deck && c.cards?.length) {
          setEnCours(false);
          demarrer(c);
          return;
        }
      } catch {
        /* Paquet illisible : on passe au suivant. */
      }
    }
    setEnCours(false);
    setSecours(true);
    setEtape('paquet');
  }, [enJeu, loadDeck, demarrer]);

  /*
   * Premier lancement : les premières cartes du paquet. Relecture : les
   * mots jamais vus, puis les plus proches de leur échéance — jamais un
   * mot révisé ce matin, qu'une réponse de démonstration repousserait.
   */
  const jeu = useMemo(() => {
    const cartes = charge?.cards ?? [];
    if (cartes.length === 0) return [];
    const vu = charge?.progress ?? {};
    if (!relu) return cartes.slice(0, CARTES_DESSAI);
    const jamais = cartes.filter((c) => !vu[c.id]);
    const vues = cartes.filter((c) => vu[c.id]).sort((a, b) => vu[a.id].due - vu[b.id].due);
    return [...jamais, ...vues].slice(0, CARTES_DESSAI);
  }, [charge, relu]);
  const carte = jeu[index];

  const progression = useMemo(
    () => (carte ? charge?.progress[carte.id] ?? emptyProgress(carte.id) : null),
    [carte, charge],
  );
  const apercus = useMemo(() => (progression ? previewIntervals(progression) : null), [progression]);

  const dire = useCallback(() => { if (carte) speak(carte.en, debit); }, [carte, debit]);
  const motAnglais = carte?.en;
  useEffect(() => {
    if (etape !== 'cartes' || !montre || !motAnglais) return;
    speak(motAnglais, debit);
  }, [etape, montre, motAnglais, debit]);

  const juger = useCallback(async (g: Grade) => {
    if (!charge || !carte || !progression || !onGrade) return;
    const apres = await onGrade(charge.deck.id, progression, g, isNew(progression));
    charge.progress[apres.cardId] = apres;
    setResultats((r) => [...r, { card: carte, grade: g, due: apres.due }]);
    setMontre(false);
    if (index + 1 >= jeu.length) setEtape('echeances');
    else setIndex(index + 1);
  }, [charge, carte, progression, onGrade, index, jeu.length]);

  /* Clavier, comme en révision : espace révèle, 1 à 4 jugent. */
  useEffect(() => {
    if (etape !== 'cartes') return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ') { e.preventDefault(); setMontre(true); return; }
      if (montre && ['1', '2', '3', '4'].includes(e.key)) void juger(JUGEMENTS[Number(e.key) - 1].key);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [etape, montre, juger]);

  const classeDite = classe ? CLASSE_LABELS[classe] : null;
  const lignes = STATUTS.filter((s) => s.cle !== 'decouvrir');

  return (
    <div className="guide">
      <div className="guide-head">
        <span className="guide-pas">
          Étape {rang} sur {parcours.length}
          {etape === 'cartes' && jeu.length > 0 && ` · carte ${index + 1} sur ${jeu.length}`}
        </span>
        {etape !== 'bilan' && (
          <button className="guide-skip" onClick={() => onFini(relu ? 'account' : 'library')}>
            {relu ? 'Fermer' : 'Plus tard'}
          </button>
        )}
      </div>

      {etape === 'methode' && (
        <>
          <h2 className="guide-titre">Vous allez oublier.<br />C’est prévu.</h2>
          <p className="guide-texte">
            Une heure après une leçon, plus de la moitié s’est déjà effacée ; au bout
            d’une semaine, il reste moins d’un tiers. Ce déclin se mesure depuis les
            travaux d’Ebbinghaus, en 1885, et il ne dépend pas de votre volonté.
          </p>
          <p className="guide-regle">
            Un mot revu juste avant l’oubli se grave plus profond qu’un mot relu dix fois.
          </p>
          <p className="guide-texte">
            Cette méthode est fondée sur le rappel, qui, à intervalles intelligents,
            permettra de fixer le souvenir. C’est votre progression qui définira
            l’espacement des répétitions. Ainsi, vous obtiendrez les meilleurs
            résultats basés sur le fonctionnement de la mémoire.
          </p>
          <div className="guide-frise">
            <p className="guide-kicker">Les rappels d’un même mot</p>
            <Frise />
            <p className="guide-note">
              L’écart s’allonge à chaque réussite et se referme au moindre oubli.
              L’application le calcule carte par carte (algorithme FSRS) ; vous n’avez
              qu’à répondre honnêtement.
            </p>
          </div>
          <div className="guide-pied">
            <button className="btn" onClick={suivante}>Prêt ?</button>
          </div>
        </>
      )}

      {/*
        * CHANTIER 119 — CE QU'EST UN PAQUET, AVANT LA PREMIÈRE CARTE.
        * On passait de la méthode à une carte sans avoir dit que
        * l'application travaille par paquets. Trois vrais dos empilés
        * (ceux en jeu en relecture, sinon les premiers du catalogue),
        * une carte retournée, et ce qu'une carte peut porter.
        */}
      {etape === 'paquets' && (
        <>
          <h2 className="guide-titre">On révise avec des paquets de cartes.</h2>
          <p className="guide-texte">
            Chaque paquet couvre un sujet du programme, à ton niveau. Tu peux le
            jouer en entier, ou thème par thème.
          </p>
          <div className="guide-pile" aria-hidden="true">
            <span className="guide-pile-dos">
              {pile.map((d, i) => (
                <span key={d.id} className={`guide-pile-un n${pile.length - 1 - i}`}>
                  <DeckVign id={d.id} name={d.name} image={null} w={82} h={116} categoryId={d.categoryId} />
                </span>
              ))}
            </span>
            <svg className="guide-pile-fleche" viewBox="0 0 40 20">
              <path d="M2 10 H34 M27 4 L34 10 L27 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="guide-pile-carte">
              <b>la maison</b>
              <i />
              <em>the house</em>
            </span>
          </div>
          <div className="guide-exemple guide-contenu">
            <span className="guide-kicker">Une carte, c’est</span>
            <p><b>un mot</b><span>la maison → <em>the house</em></span></p>
            <p><b>ou une phrase</b><span>Je suis allé à la plage. → <em>I went to the beach.</em></span></p>
          </div>
          <p className="guide-texte">
            Tu lis le français, tu cherches l’anglais dans ta tête, puis tu
            retournes la carte.
          </p>
          <div className="guide-pied">
            <button
              className="btn"
              disabled={enCours}
              onClick={() => { if (relu) void reprendre(); else suivante(); }}
            >
              Continuer
            </button>
          </div>
        </>
      )}

      {etape === 'classe' && (
        <>
          <h2 className="guide-titre">Tu es en quelle classe&nbsp;?</h2>
          <p className="guide-texte">
            Elle range le catalogue, et rien d’autre : tous les paquets restent
            accessibles. Cela se change à tout moment dans les réglages.
          </p>
          <div className="guide-classes">
            {CLASSES.map((c) => (
              <button
                key={c}
                className={classe === c ? 'on' : ''}
                onClick={() => { onClasse(c); setEtape('paquet'); }}
              >
                {CLASSE_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="guide-pied">
            <button className="btn ghost wide" onClick={() => { onClasse(null); setEtape('paquet'); }}>
              Je préfère ne pas dire
            </button>
          </div>
        </>
      )}

      {etape === 'paquet' && (
        <>
          <h2 className="guide-titre">Par quoi commencer&nbsp;?</h2>
          <p className="guide-texte">
            Un seul paquet pour l’instant. Les autres s’ajoutent depuis « Paquets »,
            quand celui-ci tourne.
          </p>
          <div className="guide-paquets">
            {propositions.map((d) => {
              return (
                <button key={d.id} disabled={enCours} onClick={() => void choisirPaquet(d.id)}>
                  <span className="dos" aria-hidden="true">
                    <DeckVign id={d.id} name={d.name} image={null} w={54} h={76} categoryId={d.categoryId} />
                  </span>
                  <span className="quoi">
                    <b>{d.name}</b>
                    <small className="meta">
                      {d.cardCount ? `${d.cardCount} mots` : 'Paquet fourni'}
                      {d.classeFrom ? ` · dès la ${CLASSE_LABELS[d.classeFrom]}` : ''}
                    </small>
                    {d.description && <small className="dit">{d.description}</small>}
                  </span>
                </button>
              );
            })}
          </div>
          {enCours && <p className="guide-note">Préparation du paquet…</p>}
        </>
      )}

      {etape === 'cartes' && carte && (
        <>
          <p className="guide-consigne">
            {montre
              ? 'Avouer un oubli n’est pas une faute : c’est ce qui règle la suite.'
              : 'Avouer un oubli n’est pas une faute : c’est ce qui règle la suite.'}
          </p>
          <div className="guide-carte" onClick={() => { if (!montre) setMontre(true); }}>
            <span className="guide-kicker">{charge?.deck?.name ?? ''}</span>
            <p className="recto">{carte.fr}</p>
            {montre && (
              <>
                <span className="ruleline" aria-hidden="true" />
                <p className="verso">{carte.en}</p>
                {carte.example && <p className="exemple">{carte.example}</p>}
                <button className="speak guide-speak" onClick={(e) => { e.stopPropagation(); dire(); }}>
                  Écouter
                </button>
              </>
            )}
          </div>
          {!montre ? (
            <div className="guide-pied">
              <button className="btn" onClick={() => setMontre(true)}>Voir la réponse</button>
            </div>
          ) : (
            <div className="grades guide-grades">
              {JUGEMENTS.map((j) => (
                <button key={j.key} className={j.className} onClick={() => void juger(j.key)}>
                  {j.label}
                  <small>{apercus?.[j.key]}</small>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {etape === 'cartes' && !carte && (
        <>
          <h2 className="guide-titre">Aucune carte à montrer.</h2>
          <p className="guide-texte">
            Le paquet n’a pas pu être lu sur cet appareil : ses cartes ne sont
            peut-être pas encore descendues. Choisissez-en un autre, ou continuez.
          </p>
          <div className="guide-pied">
            <button className="btn" onClick={() => { setSecours(true); setEtape('paquet'); }}>
              Choisir un paquet
            </button>
          </div>
          <div className="guide-pied">
            <button className="btn ghost wide" onClick={() => setEtape('progres')}>Continuer</button>
          </div>
        </>
      )}

      {etape === 'echeances' && (
        <>
          <h2 className="guide-titre">Vos {resultats.length} mots ont chacun leur rendez-vous.</h2>
          <p className="guide-texte">
            Plus un mot a été difficile à trouver, plus il reviendra tôt.
          </p>
          <ul className="guide-echeances">
            {resultats.map((r, i) => (
              <li key={`${r.card.id}-${i}`}>
                <span className="mot">
                  <b>{r.card.en}</b>
                  <small>{r.card.fr}</small>
                </span>
                <small className="juge">{JUGEMENTS.find((j) => j.key === r.grade)?.label}</small>
                <b className="quand">{quand(r.due)}</b>
              </li>
            ))}
          </ul>
          <p className="guide-note">
            À chaque rappel réussi, ces écarts doubleront presque. C’est là que le mot
            passe en mémoire profonde — et vous n’avez rien à calculer.
          </p>
          <p className="guide-note">
            Deux mots jugés pareils peuvent revenir à des dates différentes : chaque
            mot garde sa propre histoire, et l’application décale légèrement les
            échéances au hasard pour ne pas vous proposer trop de rappels le même jour.
          </p>
          <div className="guide-pied">
            <button className="btn" onClick={() => setEtape('progres')}>Continuer</button>
          </div>
        </>
      )}

      {etape === 'progres' && (
        <>
          <h2 className="guide-titre">Tu verras tes mots avancer.</h2>
          <p className="guide-texte">
            Chaque carte « mot » sera répertoriée dans 5 tas : « À découvrir », puis
            quatre autres, représentés ci-dessous dans un graphique montrant votre
            progression.
          </p>

          <div className="guide-exemple">
            <span className="guide-fictif">exemple fictif</span>
            <span className="guide-kicker">Mes mots</span>
            <div className="prog-tete">
              <div className="prog-grand">
                <span className="label">Mots acquis</span>
                <b>118</b>
              </div>
              <Anneau percent={29} taille={58} />
            </div>
          </div>

          <div className="guide-exemple">
            <span className="guide-kicker">Mon évolution</span>
            <div className="prog-courbe haute">
              <svg viewBox="0 0 320 100" preserveAspectRatio="none" aria-hidden="true">
                {lignes.map((s) => (
                  <path
                    key={s.cle}
                    className={`tr ${s.classe.replace('st-', 'tr-')}`}
                    d={trace(FICTIF[s.cle as keyof typeof FICTIF])}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            </div>
            <div className="prog-courbe-axe">
              {AXE.map((a) => <small key={a}>{a}</small>)}
            </div>
            <span className="statlist">
              {lignes.map((s) => (
                <span key={s.cle} className="statline">
                  <i className={s.classe} />
                  <span>{s.libelle}</span>
                  <b>{FICTIF[s.cle as keyof typeof FICTIF][8]}</b>
                </span>
              ))}
            </span>
          </div>

          <div className="guide-pied">
            <button className="btn" onClick={suivante}>Continuer</button>
          </div>
        </>
      )}

      {etape === 'parler' && (
        <>
          <p className="guide-kicker">Et maintenant, à l’oral</p>
          <h2 className="guide-titre">Tu vas pouvoir utiliser les mots appris pour échanger à l’oral.</h2>
          <p className="guide-texte">
            L’onglet « Parler » ouvre une vraie conversation en anglais, à voix
            haute, avec une IA qui parle à ton niveau. Pas de note, pas de
            chrono : on discute.
          </p>

          <div className="guide-exemple">
            <span className="guide-kicker">Il est ici, au milieu</span>
            <div className="guide-barre" aria-hidden="true">
              <span><img src="/tab-aujourdhui.png" alt="" />Aujourd’hui</span>
              <span><img src="/tab-paquets.png" alt="" />Paquets</span>
              <span className="on"><img src="/tab-parler.png" alt="" />Parler</span>
              <span><img src="/tab-reglages.png" alt="" />Réglages</span>
              <span><img src="/tab-progres.png" alt="" />Mes progrès</span>
            </div>
          </div>

          <div className="guide-exemple guide-faits">
            <p><b>10 min</b>de parole par jour, remises à zéro à minuit.</p>
            <p>
              <b>{classeDite ?? 'Classe'}</b>
              {classeDite
                ? 'ta classe fixe les temps et la longueur des phrases.'
                : 'déclarée dans les Réglages, elle fixe les temps employés.'}
            </p>
          </div>

          <div className="guide-pied">
            <button className="btn" onClick={suivante}>Continuer</button>
          </div>
        </>
      )}

      {etape === 'mots' && (
        <>
          <h2 className="guide-titre">Tu choisis le sujet. L’IA glisse tes mots.</h2>
          <p className="guide-texte">
            Les mots que tu viens de mémoriser reviennent dans la conversation,
            en situation, sans qu’on te les annonce.
          </p>
          <p className="guide-texte">
            Si tu fais une faute, une voix en français te corrige. Et si tu
            bloques, un bouton te permet de poser ta question en français,
            sans quitter la conversation.
          </p>

          <div className="guide-exemple">
            <span className="guide-kicker">Tes mots de la semaine</span>
            <div className="parler-mots">
              {['a crowd', 'to cheer', 'a draw', 'to train'].map((m) => (
                <span key={m} className="parler-mot">{m}</span>
              ))}
            </div>
            <div className="guide-fil">
              <p className="seance-bulle lui">Did the <u>crowd</u> <u>cheer</u> when your team scored?</p>
              <p className="seance-bulle moi">Yes! But it was a draw, two–two.</p>
              <p className="seance-bulle lui">A draw is not bad! How often do you <u>train</u>?</p>
            </div>
            <p className="guide-note">Exemple de conversation sur « Le sport ».</p>
          </div>

          <div className="guide-pied">
            <button className="btn" onClick={suivante}>Continuer</button>
          </div>
        </>
      )}

      {etape === 'bilan' && (
        <>
          <h2 className="guide-titre">À la fin, tu choisis ce que tu retravailles.</h2>
          <p className="guide-texte">
            Après chaque conversation, un bilan court : tes phrases corrigées,
            chacune avec l’explication de la faute, et jusqu’à cinq mots qui t’ont posé problème. Tu coches ceux que
            tu veux revoir.
          </p>

          <div className="guide-exemple">
            <span className="guide-kicker">Ce qui a coincé</span>
            <p className="seance-faux">I am agree with you.</p>
            <p className="seance-juste">I agree with you.</p>
            <p className="guide-note">
              En anglais, « agree » est déjà un verbe : pas besoin de « am ».
            </p>
          </div>

          <div className="guide-exemple">
            <span className="guide-kicker">Tu veux les revoir ?</span>
            <div className="reprise-liste">
              {[
                { en: 'a crowd', fr: 'une foule', note: 'Déjà dans un de tes paquets : il revient dans ta journée.', cl: 'ramene', on: true },
                { en: 'a referee', fr: 'un arbitre', note: `Nouveau : il rejoint « ${REPRISE_NOM} ».`, cl: 'nouveau', on: true },
                { en: 'a season', fr: 'une saison', note: `Nouveau : il rejoint « ${REPRISE_NOM} ».`, cl: 'nouveau', on: false },
              ].map((m) => (
                <label key={m.en} className="reprise-ligne">
                  <input type="checkbox" checked={m.on} readOnly disabled />
                  <span className="reprise-case" aria-hidden="true" />
                  <span className="reprise-mot">
                    <b>{m.en}</b>
                    <small>{m.fr}</small>
                    <em className={`reprise-note ${m.cl}`}>{m.note}</em>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="guide-regles">
            <p><b>Jamais de doublon.</b> Un mot que tu as déjà dans un paquet en jeu n’est pas recopié : c’est sa carte qui revient, en « À reprendre ».</p>
            <p><b>Le paquet « {REPRISE_NOM} »</b> reçoit les mots nouveaux. Il se met en jeu tout seul.</p>
            <p><b>Les fautes de grammaire</b> restent dans le bilan : l’IA les reprend à la conversation suivante.</p>
          </div>

          <div className="guide-pied double">
            <button className="btn" onClick={() => onFini('today')}>Voir ma journée</button>
            <button className="btn ghost wide" onClick={() => onFini('parler')}>Aller dans Parler</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Quand un mot revient, en clair : « demain », « dans 3 jours ». */
function quand(due: number, maintenant = Date.now()): string {
  const min = Math.round((due - maintenant) / 60000);
  if (min < 10) return 'dans la séance';
  if (min < 60) return `dans ${min} min`;
  const h = Math.round(min / 60);
  if (h < 20) return `dans ${h} h`;
  const j = Math.max(1, Math.round(h / 24));
  if (j === 1) return 'demain';
  if (j < 31) return `dans ${j} jours`;
  return `dans ${Math.round(j / 30)} mois`;
}

/** Les échéances d'un même mot, dessinées à l'échelle. */
function Frise() {
  const jours = [1, 3, 8, 21];
  const total = 21;
  return (
    <svg className="frise" viewBox="0 0 300 34" aria-hidden="true">
      <line x1="6" y1="22" x2="294" y2="22" stroke="currentColor" strokeOpacity="0.25" />
      <circle cx="6" cy="22" r="3.5" fill="currentColor" />
      {jours.map((j) => {
        const x = 6 + (288 * j) / total;
        return (
          <g key={j}>
            <circle cx={x} cy="22" r="3.5" fill="#f2b705" />
            <text x={x} y="11" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.7">
              {j} j
            </text>
          </g>
        );
      })}
    </svg>
  );
}
