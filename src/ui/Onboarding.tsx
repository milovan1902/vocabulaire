/**
 * CHANTIER 90 — LE PREMIER PAS GUIDÉ.
 * CHANTIER 91 — le même parcours, relisible à tout moment depuis les
 * réglages (prop `relecture`) : trois étapes au lieu de cinq, puisque
 * la classe et le paquet sont déjà réglés.
 * CHANTIER 94 — la voix. Les cinq cartes prononcent l'anglais à la
 * révélation, comme la vraie révision, et un bouton « Écouter » le
 * répète : le guidage ne peut pas annoncer une application qui parle
 * sans la faire parler. Et l'étape des échéances explique pourquoi deux
 * « Facile » ne tombent pas le même jour.
 * CHANTIER 93 — l'écran vide réparé. En relecture, le galop d'essai
 * partait du premier paquet en jeu SANS vérifier qu'il avait des cartes
 * à montrer : un paquet illisible, absent du catalogue local ou vide
 * menait à une étape « cinq cartes » qui n'affichait rien du tout, et
 * l'en-tête seul restait à l'écran. Trois verrous : on essaie chaque
 * paquet en jeu jusqu'à en trouver un qui tient, l'étape ne se change
 * qu'une fois les cartes en main, et s'il n'y en a nulle part le
 * parcours complet reprend la main au lieu de laisser un vide.
 *
 * Ce que ce guidage n'est pas : un carrousel d'explications. On se
 * balaie ces choses-là sans les lire, et on arrive quand même sur un
 * « Aujourd'hui » vide — c'était exactement le problème du premier
 * lancement.
 *
 * Cinq étapes, dont quatre produisent un effet visible :
 *
 *   1. LA MÉTHODE  — pourquoi l'application existe : l'oubli est
 *                    mesurable, le rappel espacé le contre. Le seul
 *                    écran de texte du parcours, et il est sautable.
 *   2. LA CLASSE   — écrit le réglage `classe`, qui range le catalogue.
 *   3. LE PAQUET   — un seul, obtenu ET mis en jeu : la journée cesse
 *                    d'être vide avant même qu'on y arrive.
 *   4. CINQ CARTES — la vraie boucle, avec les quatre jugements de
 *                    l'application et les intervalles qu'ils annoncent.
 *   5. LES ÉCHÉANCES — ce que les réponses viennent de programmer, mot
 *                    par mot. La leçon de l'étape 1, vérifiée sur pièce.
 *
 * Les cinq cartes sont de VRAIES révisions : elles passent par le même
 * `gradeCard` que la session normale. C'est la condition pour que
 * l'étape 5 dise vrai — un intervalle simulé aurait été un mensonge à
 * la première minute d'usage.
 *
 * Aucun type n'est importé depuis `useStore.ts` : deux fichiers liés par
 * un import de type ne peuvent plus se déployer séparément (c'est ce qui
 * a fait échouer le chantier 79). Ce dont ce fichier a besoin est décrit
 * ici, en clair.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Card, Classe, Deck, Grade, Progress } from '../domain/types';
import { CLASSES, CLASSE_LABELS, classeConvient, classeRank } from '../domain/types';
import { emptyProgress, isNew, previewIntervals } from '../engine/scheduler';
import { speak } from './speech';
import { imageFor } from './deckImages';

/** Le strict nécessaire de ce que renvoie `loadDeck`. */
type PaquetCharge = {
  deck: { id: string; name: string };
  cards: Card[];
  progress: Record<string, Progress>;
  image: string | null;
};

const ETAPES = ['methode', 'classe', 'paquet', 'cartes', 'echeances'] as const;
type Etape = (typeof ETAPES)[number];

/** Combien de cartes pour la première prise en main. Cinq : assez pour
 *  sentir la répétition, trop peu pour ressembler à du travail. */
const CARTES_DESSAI = 5;

const JUGEMENTS: Array<{ key: Grade; label: string; className: string }> = [
  { key: 'again', label: 'À revoir', className: 'grade again' },
  { key: 'hard', label: 'Difficile', className: 'grade' },
  { key: 'good', label: 'Correct', className: 'grade' },
  { key: 'easy', label: 'Facile', className: 'grade easy' },
];

/** Un résultat de l'étape 4, tel que l'étape 5 le relit. */
type Resultat = { card: Card; grade: Grade; due: number };

export function Onboarding({
  decks, classe, onClasse, onChoisir, loadDeck, onGrade, onFini,
  relecture = false, enJeu = [], debit = 1,
}: {
  decks: Deck[];
  classe: Classe | null;
  /** Écrit le réglage. Passe par le même chemin que l'écran Réglages. */
  onClasse: (c: Classe | null) => void;
  /** Obtient le paquet ET le met en jeu : sans cela, la journée reste à zéro. */
  onChoisir: (id: string) => Promise<void>;
  loadDeck: (id: string) => Promise<PaquetCharge>;
  onGrade: (deckId: string, p: Progress, g: Grade, wasNew: boolean) => Promise<Progress>;
  /** Sortie du guidage. « Plus tard » mène aux paquets, la fin à la journée. */
  onFini: (vers: 'today' | 'library' | 'account') => void;
  /**
   * CHANTIER 91 — relecture volontaire, depuis les réglages.
   *
   * Le même composant, amputé de ses deux écrans de réglage : la classe
   * est déjà déclarée, le paquet déjà en jeu. Les redemander à quelqu'un
   * qui vient relire la méthode, c'est lui faire refaire un choix qu'il
   * n'a pas demandé à refaire.
   */
  relecture?: boolean;
  /** Les paquets en jeu. Le premier sert de terrain au galop d'essai. */
  enJeu?: string[];
  /** La vitesse de la voix réglée dans les réglages. */
  debit?: number;
}) {
  const [etape, setEtape] = useState<Etape>('methode');
  const [charge, setCharge] = useState<PaquetCharge | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [index, setIndex] = useState(0);
  const [montre, setMontre] = useState(false);
  const [resultats, setResultats] = useState<Resultat[]>([]);
  /*
   * CHANTIER 93 — la relecture n'a pas trouvé de paquet montrable, et
   * repasse par le parcours complet : choisir un paquet redevient une
   * étape, puisque c'est redevenu une question.
   */
  const [secours, setSecours] = useState(false);

  /*
   * Relire suppose d'avoir de quoi réviser. Sans paquet en jeu, la
   * relecture retombe sur le parcours complet : classe, paquet, cartes.
   */
  const relu = relecture && enJeu.length > 0 && !secours;
  const parcours = useMemo<readonly Etape[]>(
    () => (relu ? (['methode', 'cartes', 'echeances'] as const) : ETAPES),
    [relu],
  );
  const rang = parcours.indexOf(etape) + 1;

  /*
   * Les propositions de l'étape 3.
   *
   * Gratuits d'abord : un guidage qui ouvre sur un paiement n'est pas un
   * guidage. Puis la classe déclarée, et le plancher le plus proche en
   * tête — un élève de 3ème n'a pas à voir le paquet CM2 en premier.
   */
  const propositions = useMemo(() => {
    const libres = decks.filter((d) => !d.priceCents);
    const pourMoi = libres.filter((d) => classeConvient(d.classeFrom, classe));
    const liste = pourMoi.length ? pourMoi : libres;
    return [...liste]
      .sort((a, b) => classeRank(b.classeFrom) - classeRank(a.classeFrom))
      .slice(0, 3);
  }, [decks, classe]);

  /**
   * Relecture : on reprend un paquet déjà en jeu, sans rien obtenir.
   *
   * CHANTIER 93 — on les essaie dans l'ordre, et on ne change d'étape
   * qu'avec des cartes en main. Un paquet peut échouer pour trois
   * raisons : il a disparu du catalogue local (identifiant resté « en
   * jeu » après une synchronisation), ses cartes ne sont pas encore
   * descendues, ou il est vide. Dans les trois cas, le suivant a ses
   * chances ; si aucun ne tient, le parcours complet reprend la main.
   */
  const reprendre = useCallback(async () => {
    setEnCours(true);
    for (const id of enJeu) {
      try {
        const c = await loadDeck(id);
        if (c && c.deck && c.cards && c.cards.length > 0) {
          setCharge({ ...c, progress: c.progress ?? {} });
          setIndex(0);
          setMontre(false);
          setResultats([]);
          setEnCours(false);
          setEtape('cartes');
          return;
        }
      } catch {
        /* Paquet illisible : on passe au suivant, sans rien dire. */
      }
    }
    setEnCours(false);
    setSecours(true);
    setEtape('paquet');
  }, [enJeu, loadDeck]);

  const choisirPaquet = useCallback(
    async (id: string) => {
      setEnCours(true);
      await onChoisir(id);
      const c = await loadDeck(id);
      setCharge(c);
      setIndex(0);
      setMontre(false);
      setResultats([]);
      setEnCours(false);
      setEtape('cartes');
    },
    [onChoisir, loadDeck],
  );

  /*
   * Les cartes du galop d'essai.
   *
   * Au premier lancement, les premières du paquet : rien n'a été vu.
   * En relecture, les mots jamais rencontrés d'abord, puis les plus
   * proches de leur échéance — jamais un mot révisé ce matin, qu'une
   * réponse de démonstration repousserait à tort.
   */
  const jeu = useMemo(() => {
    const cartes = charge?.cards ?? [];
    if (cartes.length === 0) return [];
    const vu = charge?.progress ?? {};
    if (!relu) return cartes.slice(0, CARTES_DESSAI);
    const jamais = cartes.filter((c) => !vu[c.id]);
    const vues = cartes
      .filter((c) => vu[c.id])
      .sort((a, b) => vu[a.id].due - vu[b.id].due);
    return [...jamais, ...vues].slice(0, CARTES_DESSAI);
  }, [charge, relu]);
  const carte = jeu[index];

  const progression = useMemo(
    () => (carte ? charge?.progress[carte.id] ?? emptyProgress(carte.id) : null),
    [carte, charge],
  );
  const apercus = useMemo(
    () => (progression ? previewIntervals(progression) : null),
    [progression],
  );

  /*
   * CHANTIER 94 — LA VOIX, DÈS LE GUIDAGE.
   *
   * L'application prononce l'anglais à chaque révélation : c'est un de
   * ses gestes quotidiens, et le guidage n'en disait rien. Une phrase
   * l'aurait annoncé ; la voix le montre.
   *
   * Même règle que la révision (chantier 50) : on prononce l'anglais au
   * moment où il s'affiche — ici la révélation, puisque le galop d'essai
   * va toujours du français vers l'anglais.
   */
  const dire = useCallback(() => {
    if (carte) speak(carte.en, debit);
  }, [carte, debit]);

  /* La dépendance porte sur le mot ET sur la révélation : une carte
     déjà dite ne se redit pas à chaque rendu. */
  const motAnglais = carte?.en;
  useEffect(() => {
    if (etape !== 'cartes' || !montre || !motAnglais) return;
    speak(motAnglais, debit);
  }, [etape, montre, motAnglais, debit]);

  const juger = useCallback(
    async (g: Grade) => {
      if (!charge || !carte || !progression) return;
      const suivante = await onGrade(charge.deck.id, progression, g, isNew(progression));
      /* On tient la progression à jour en mémoire : l'étape 5 la relit. */
      charge.progress[suivante.cardId] = suivante;
      setResultats((r) => [...r, { card: carte, grade: g, due: suivante.due }]);
      setMontre(false);
      if (index + 1 >= jeu.length) setEtape('echeances');
      else setIndex(index + 1);
    },
    [charge, carte, progression, onGrade, index, jeu.length],
  );

  /* Clavier, comme dans la révision : espace révèle, 1 à 4 jugent. */
  useEffect(() => {
    if (etape !== 'cartes') return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ') { e.preventDefault(); setMontre(true); return; }
      if (montre && ['1', '2', '3', '4'].includes(e.key)) {
        void juger(JUGEMENTS[Number(e.key) - 1].key);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [etape, montre, juger]);

  const entete = (
    <div className="guide-head">
      <span className="guide-pas">
        Étape {rang} sur {parcours.length}
        {etape === 'cartes' && jeu.length > 0 && ` · carte ${index + 1} sur ${jeu.length}`}
      </span>
      {etape !== 'echeances' && (
        <button className="guide-skip" onClick={() => onFini(relu ? 'account' : 'library')}>
          {relu ? 'Fermer' : 'Plus tard'}
        </button>
      )}
    </div>
  );

  return (
    <div className="guide">
      {entete}

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
            L’effort du rappel est ce qui fixe le souvenir : chaque fois que vous
            retrouvez un mot de vous-même, sa trace se renforce et l’échéance suivante
            s’éloigne. C’est la répétition espacée, l’un des résultats les plus solides
            de la psychologie de la mémoire.
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
            <button
              className="btn"
              disabled={enCours}
              onClick={() => { if (relu) void reprendre(); else setEtape('classe'); }}
            >
              {relu ? 'Refaire cinq cartes' : 'Commencer'}
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
            <button
              className="btn ghost wide"
              onClick={() => { onClasse(null); setEtape('paquet'); }}
            >
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
              const img = imageFor(d.id, null);
              return (
                <button key={d.id} disabled={enCours} onClick={() => void choisirPaquet(d.id)}>
                  <span className="dos" aria-hidden="true">
                    {img ? <img src={img} alt="" /> : <span className="dos-vide" />}
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
              ? 'Le mot anglais vient d’être prononcé — « Écouter » le répète. Avouer un oubli n’est pas une faute : c’est ce qui règle la suite.'
              : 'Cherchez la réponse dans votre tête, puis vérifiez. L’application dira le mot anglais à voix haute.'}
          </p>

          <div className="guide-carte" onClick={() => { if (!montre) setMontre(true); }}>
            <span className="guide-kicker">{charge?.deck?.name ?? ''}</span>
            <p className="recto">{carte.fr}</p>
            {montre && (
              <>
                <span className="ruleline" aria-hidden="true" />
                <p className="verso">{carte.en}</p>
                {carte.example && <p className="exemple">{carte.example}</p>}
                {/* stopPropagation : toute la carte est cliquable, et
                    demander à entendre n'est pas demander à voir. */}
                <button
                  className="speak guide-speak"
                  onClick={(e) => { e.stopPropagation(); dire(); }}
                >
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
            Le paquet en jeu n’a pas pu être lu sur cet appareil : ses cartes ne
            sont peut-être pas encore descendues. Choisissez-en un, ou fermez et
            revenez plus tard.
          </p>
          <div className="guide-pied">
            <button
              className="btn"
              onClick={() => { setSecours(true); setEtape('paquet'); }}
            >
              Choisir un paquet
            </button>
          </div>
          <div className="guide-pied">
            <button className="btn ghost wide" onClick={() => onFini('today')}>
              Voir ma journée
            </button>
          </div>
        </>
      )}

      {etape === 'echeances' && (
        <>
          <h2 className="guide-titre">
            Vos {resultats.length} mots ont chacun leur rendez-vous.
          </h2>
          <p className="guide-texte">
            Calculé sur vos réponses, pas sur un calendrier : plus un mot vous a coûté,
            plus il revient tôt.
          </p>

          <ul className="guide-echeances">
            {resultats.map((r, i) => (
              <li key={`${r.card.id}-${i}`}>
                <span className="mot">
                  <b>{r.card.en}</b>
                  <small>{r.card.fr}</small>
                </span>
                <small className="juge">
                  {JUGEMENTS.find((j) => j.key === r.grade)?.label}
                </small>
                <b className="quand">{quand(r.due)}</b>
              </li>
            ))}
          </ul>

          <p className="guide-note">
            À chaque rappel réussi, ces écarts doubleront presque. C’est là que le mot
            passe en mémoire profonde — et vous n’avez rien à calculer.
          </p>
          {/*
            * CHANTIER 94 — deux « Facile » ne tombent pas le même jour, et
            * c'est voulu. Sans cette phrase, l'écran a l'air de se tromper.
            */}
          <p className="guide-note">
            Deux mots jugés pareils peuvent revenir à des dates différentes : chaque
            mot garde sa propre histoire — combien de fois vous l’avez retrouvé, et à
            quels écarts —, et l’application décale légèrement les échéances au hasard
            pour ne pas vous coller cinquante rappels le même matin.
          </p>

          <div className="guide-pied">
            <button className="btn" onClick={() => onFini('today')}>Voir ma journée</button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Quand un mot revient, en clair.
 *
 * Écrit ici plutôt qu'emprunté à `scheduler.ts` : celui-là formate des
 * DURÉES pour les boutons de jugement (« 3 j »), on veut ici des
 * RENDEZ-VOUS (« dans 3 jours », « demain »). Deux usages, deux tons.
 */
function quand(due: number, maintenant = Date.now()): string {
  const min = Math.round((due - maintenant) / 60000);
  if (min < 10) return 'dans la séance';
  if (min < 60) return `dans ${min} min`;
  const h = Math.round(min / 60);
  if (h < 20) return `dans ${h} h`;
  const j = Math.max(1, Math.round(h / 24));
  if (j === 1) return 'demain';
  if (j < 31) return `dans ${j} jours`;
  const mois = Math.round(j / 30);
  return `dans ${mois} mois`;
}

/**
 * Les échéances d'un même mot, dessinées à l'échelle : ce sont les
 * ÉCARTS qui parlent, pas les nombres. Un SVG plutôt que des divs — la
 * proportion reste juste quelle que soit la largeur du téléphone.
 */
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
