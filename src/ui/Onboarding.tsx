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
 */
import { useCallback, useMemo, useState } from 'react';
import type { Card, Classe, Deck, Grade, Progress } from '../domain/types';
import { CLASSES, CLASSE_LABELS, classeConvient, classeRank } from '../domain/types';
import { STATUTS } from '../engine/mastery';
import { imageFor } from './deckImages';
import { Anneau } from './MesMots';
import { REPRISE_NOM } from '../data/reprise';
import './reprise.css';

type PaquetCharge = {
  deck: { id: string; name: string };
  cards: Card[];
  progress: Record<string, Progress>;
  image: string | null;
};

const ETAPES = ['methode', 'classe', 'paquet', 'progres', 'parler', 'mots', 'bilan'] as const;
type Etape = (typeof ETAPES)[number];
const RELECTURE: readonly Etape[] = ['methode', 'progres', 'parler', 'mots', 'bilan'];

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
  decks, classe, onClasse, onChoisir, onFini,
  relecture = false, enJeu = [],
}: {
  decks: Deck[];
  classe: Classe | null;
  onClasse: (c: Classe | null) => void;
  /** Obtient le paquet ET le met en jeu : sans cela, la journée reste à zéro. */
  onChoisir: (id: string) => Promise<void>;
  /** Plus employé depuis le chantier 110. Gardé pour ne pas toucher App. */
  loadDeck?: (id: string) => Promise<PaquetCharge>;
  /** Plus employé depuis le chantier 110. */
  onGrade?: (deckId: string, p: Progress, g: Grade, wasNew: boolean) => Promise<Progress>;
  onFini: (vers: 'today' | 'library' | 'account' | 'parler') => void;
  relecture?: boolean;
  enJeu?: string[];
  debit?: number;
}) {
  const [etape, setEtape] = useState<Etape>('methode');
  const [enCours, setEnCours] = useState(false);

  const relu = relecture && enJeu.length > 0;
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

  const choisirPaquet = useCallback(async (id: string) => {
    setEnCours(true);
    try {
      await onChoisir(id);
    } finally {
      setEnCours(false);
    }
    setEtape('progres');
  }, [onChoisir]);

  const classeDite = classe ? CLASSE_LABELS[classe] : null;
  const lignes = STATUTS.filter((s) => s.cle !== 'decouvrir');

  return (
    <div className="guide">
      <div className="guide-head">
        <span className="guide-pas">Étape {rang} sur {parcours.length}</span>
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
            <button className="btn" onClick={suivante}>{relu ? 'Continuer' : 'Commencer'}</button>
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

      {etape === 'progres' && (
        <>
          <h2 className="guide-titre">Tu verras tes mots avancer.</h2>
          <p className="guide-texte">
            Chaque mot passe par cinq tas, d’« À découvrir » à « Acquis ».
            L’onglet « Mes progrès » suit leur évolution, jour après jour.
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
          <h2 className="guide-titre">Les mots appris, tu vas les dire.</h2>
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
