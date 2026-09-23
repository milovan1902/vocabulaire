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
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Classe, Deck, Settings } from '../domain/types';
import { CLASSE_LABELS } from '../domain/types';
import { motsRecents, type MotRecent } from './motsRecents';
import { budgetParler, euros, ErreurParler, type Budget, type Fiche } from '../data/parler';
import { ParlerSeance } from './ParlerSeance';
import { ParlerHistorique } from './ParlerHistorique';

/** Les thèmes proposés. Au plus dix retenus. */
const THEMES = [
  'Me présenter', 'La famille', 'Le collège', 'Le sport', 'La musique',
  'Les voyages', 'La cuisine', 'Les animaux', 'Le cinéma', 'Les vacances',
  'La ville', 'La nature', 'Les copains', 'Le week-end',
];

const MAX_THEMES = 10;

const CLE_THEMES = 'vocab:parler-themes';
/** La vue exploitant : trois tapes sur « remis à zéro à minuit ». */
const CLE_EXPLOITANT = 'vocab:parler-exploitant';

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
  '2de': 'temps composés, opinions argumentées',
  '1re': 'nuances, hypothèses, sujets d’actualité',
  Tle: 'registre soutenu, abstraction, débat',
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

type Etat = 'charge' | 'pret' | 'anonyme' | 'panne';

export function Parler({
  decks, active, settings, onReglages,
}: {
  decks: Deck[];
  /** Paquets en jeu : le vocabulaire dont la conversation peut se servir. */
  active: string[];
  settings: Settings;
  /** Aller régler sa classe. Le niveau ne se change pas depuis ici. */
  onReglages: () => void;
}) {
  const [choisis, setChoisis] = useState<string[]>(themesRetenus);
  const [mots, setMots] = useState<MotRecent[]>([]);
  const [totalMots, setTotalMots] = useState(0);
  const [chargeMots, setChargeMots] = useState(true);

  const [budget, setBudget] = useState<Budget | null>(null);
  const [etat, setEtat] = useState<Etat>('charge');
  /** Le motif brut de la panne. Petit, monospace, sélectionnable. */
  const [pourquoi, setPourquoi] = useState<string | null>(null);
  const [enSeance, setEnSeance] = useState(false);
  const [historique, setHistorique] = useState(false);

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
      setPourquoi(
        e instanceof ErreurParler ? e.detail ?? e.message : String(e),
      );
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

  const fiche: Fiche = useMemo(() => ({
    classe,
    grammaire: classe ? GRAMMAIRE[classe] : GRAMMAIRE['6e'],
    mots: mots.map((m) => ({ en: m.en, fr: m.fr })),
    themes: choisis,
  }), [classe, mots, choisis]);

  if (historique) {
    return <ParlerHistorique onRetour={() => setHistorique(false)} />;
  }

  if (enSeance && budget) {
    return (
      <ParlerSeance
        fiche={fiche}
        debit={settings.speechRate}
        budget={budget}
        exploitant={exploitant}
        onFini={() => { setEnSeance(false); void litBudget(); }}
      />
    );
  }

  const autres = Math.max(0, totalMots - mots.length);
  const minutes = budget?.minutes ?? 0;
  const part = etat === 'pret' ? (100 * minutes) / 10 : 0;

  return (
    <section className="parler" aria-label="Parler anglais">
      <h2 className="screen-title">Parler anglais</h2>

      <div className="parler-carte">
        <div className="parler-tete">
          <p className="parler-kicker">Ton temps de parole</p>
          <button className="parler-note" onClick={tape}>remis à zéro à minuit</button>
        </div>

        {etat === 'charge' ? (
          <p className="hint">Lecture de ton budget…</p>
        ) : etat === 'anonyme' ? (
          <p className="hint">
            La conversation demande un compte : ton temps de parole est tenu
            sur le serveur, pas dans le téléphone. Connecte-toi depuis les
            Réglages.
          </p>
        ) : etat === 'panne' ? (
          <>
            <p className="hint">
              Ton budget n’est pas joignable pour l’instant.{' '}
              <button className="parler-lien" onClick={() => void litBudget()}>
                Réessayer
              </button>
            </p>
            {pourquoi && <p className="seance-detail">{pourquoi}</p>}
          </>
        ) : (
          <>
            <p className="parler-min">
              <b>{minutes}</b>
              <span>
                minute{minutes > 1 ? 's' : ''} disponible{minutes > 1 ? 's' : ''} aujourd’hui
              </span>
            </p>
            <span className="parler-jauge" aria-hidden="true">
              <i style={{ width: `${part}%` }} />
            </span>
            <p className="hint">
              {budget?.appels === 0
                ? 'Tu n’as encore rien utilisé aujourd’hui.'
                : `${budget?.appels} échange${(budget?.appels ?? 0) > 1 ? 's' : ''} aujourd’hui.`}
            </p>
            {exploitant && (
              <p className="seance-exploitant">
                Vue exploitant · {euros(budget?.coutJour ?? 0)} dépensés aujourd’hui
                sur ce compte. Trois tapes sur la mention de droite pour masquer.
              </p>
            )}
          </>
        )}
      </div>

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

      {/*
        * CHANTIER 106 — la porte de l'archive. Elle est ici, sous les
        * mots de la semaine, et non dans les Réglages : on y va pour
        * relire une correction, c'est-à-dire pour travailler, pas pour
        * administrer quoi que ce soit.
        */}
      {etat !== 'anonyme' && (
        <div className="parler-carte">
          <p className="parler-kicker">Tes conversations</p>
          <p className="hint">
            Chaque séance terminée est gardée en entier : ce que tu as dit,
            et le compte rendu. C’est en les relisant à quelques jours
            d’écart qu’on voit ce qui a bougé.
          </p>
          <button className="parler-histo-go" onClick={() => setHistorique(true)}>
            Relire mes conversations
          </button>
        </div>
      )}

      <div className="parler-carte">
        <div className="parler-tete">
          <p className="parler-kicker">De quoi parle-t-on ?</p>
          <em className="parler-compte">{choisis.length} / {MAX_THEMES}</em>
        </div>

        {classe ? (
          <p className="parler-niveau">
            <b>Niveau {CLASSE_LABELS[classe]}</b> — {GRAMMAIRE[classe]}.
          </p>
        ) : (
          <p className="parler-niveau">
            Classe non déclarée : la conversation restera simple.{' '}
            <button className="parler-lien" onClick={onReglages}>
              Choisir ma classe
            </button>
          </p>
        )}

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

      <button
        className="btn parler-go"
        disabled={etat !== 'pret' || !!budget?.fini || choisis.length === 0}
        onClick={() => setEnSeance(true)}
      >
        Commencer à parler
      </button>

      {etat === 'anonyme' ? (
        <p className="hint parler-pied">
          Connecte-toi pour parler. Le reste de l’application marche sans
          compte, comme avant.
        </p>
      ) : choisis.length === 0 ? (
        <p className="hint parler-pied">
          Choisis au moins un thème. Sans sujet, la conversation tourne à vide
          au bout de deux phrases.
        </p>
      ) : budget?.fini ? (
        <p className="hint parler-pied">
          Ton temps de parole est fini pour aujourd’hui. Il revient à minuit.
        </p>
      ) : (
        <p className="hint parler-pied">
          Appuie sur le micro et parle. Le clavier reste disponible pendant
          la séance, en second.
        </p>
      )}
    </section>
  );
}
