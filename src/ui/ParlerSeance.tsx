/**
 * La séance de parole.
 *
 * CHANTIER 104 — le banc d'essai au clavier.
 * CHANTIER 105 — le micro.
 * CHANTIER 106 — CE QUE HUIT MINUTES D'ESSAI ONT APPRIS.
 *
 * Quatre choses sont revenues du premier vrai test, et les quatre étaient
 * du même ordre : l'écran mentait un peu, sans le faire exprès.
 *
 * 1. LE COMPTEUR NE BOUGEAIT PAS. Il disait « 10 min restantes » après
 *    huit minutes de conversation. Deux causes, toutes deux corrigées
 *    côté serveur : le temps envoyé était un total renvoyé à chaque tour
 *    (donc inadditionnable, donc ignoré), et une lecture de quota ratée
 *    rendait un budget neuf. Ici, on n'envoie plus que l'ÉCART depuis le
 *    tour précédent.
 *
 * 2. LE MICRO COUPAIT LES PHRASES. Corrigé dans `ecoute.ts` : trois
 *    secondes de silence, et non plus le jugement du navigateur.
 *
 * 3. LES CORRECTIONS FRANÇAISES ÉTAIENT DITES EN ANGLAIS. Corrigé dans
 *    `speech.ts` : la réplique est découpée, chaque passage part dans la
 *    voix de sa langue. D'où `parle()` ici, à la place de `speak()`.
 *
 * 4. LE COMPTE RENDU DISPARAISSAIT. Il est maintenant gardé, et l'écran
 *    le dit — la phrase de fin n'est pas décorative, c'est la réponse à
 *    « où est-ce que je le retrouve ? ».
 *
 * CHANTIER 112 — « Dire en français » : un tour écouté en français ; la
 * mise en forme du modèle (**gras**) n'est plus affichée ; le champ
 * clavier n'est plus écrasé par son bouton.
 *
 * CHANTIER 110 — LES MOTS QUI ONT COINCÉ PEUVENT PARTIR EN CARTES.
 * La carte « Mots rencontrés » devient « Tu veux les revoir ? » : une case
 * par mot, et la règle de `data/reprise.ts` (jamais de doublon).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { parle, nettoie } from './speech';
import { ReprendreMots } from './ReprendreMots';
import { ecoute, ecouteDisponible, tais, type Ecoute } from './ecoute';
import {
  bilanDeSeance, euros, tourDeParole, ErreurParler,
  type Bilan, type Budget, type Fiche, type Tour,
} from '../data/parler';

function horloge(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

type Mode = 'voix' | 'clavier';

export function ParlerSeance({
  fiche, debit, budget, exploitant, onFini, enJeu, onReprise,
}: {
  fiche: Fiche;
  enJeu: string[];
  onReprise: () => Promise<void>;
  debit: number;
  budget: Budget;
  exploitant: boolean;
  onFini: () => void;
}) {
  const [messages, setMessages] = useState<Tour[]>([]);
  const [saisie, setSaisie] = useState('');
  const [enVol, setEnVol] = useState(false);
  const [b, setB] = useState<Budget>(budget);
  const [secondes, setSecondes] = useState(0);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [tropCourt, setTropCourt] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>(ecouteDisponible ? 'voix' : 'clavier');
  const [ecoutant, setEcoutant] = useState(false);
  const [entendu, setEntendu] = useState('');
  /** Le prochain tour s'écoute en français. Revient à l'anglais après. */
  const [enFrancais, setEnFrancais] = useState(false);
  const session = useRef<Ecoute | null>(null);
  const fil = useRef<HTMLDivElement | null>(null);

  /*
   * Le chronomètre vit dans une référence autant que dans l'état : le
   * calcul de l'écart a besoin de la valeur courante, pas de celle que la
   * fermeture a capturée au dernier rendu.
   */
  const horodatage = useRef(0);
  /** Secondes déjà déclarées au serveur. L'écart part de là. */
  const declarees = useRef(0);

  useEffect(() => {
    if (bilan) return;
    const t = setInterval(() => {
      horodatage.current += 1;
      setSecondes(horodatage.current);
    }, 1000);
    return () => clearInterval(t);
  }, [bilan]);

  useEffect(() => {
    const d = fil.current;
    if (d) d.scrollTop = d.scrollHeight;
  }, [messages, enVol, entendu]);

  /* La voix ne survit pas à la sortie de l'écran. */
  useEffect(() => () => { tais(); session.current?.arrete(); }, []);

  /** L'écart depuis la dernière déclaration, et on avance le repère. */
  const ecart = useCallback(() => {
    const e = Math.max(0, horodatage.current - declarees.current);
    declarees.current = horodatage.current;
    return e;
  }, []);

  const envoie = useCallback(async (texte: string) => {
    const dit = texte.trim();
    if (!dit || enVol) return;

    const suite: Tour[] = [...messages, { role: 'user', content: dit }];
    setMessages(suite);
    setSaisie('');
    setEntendu('');
    setEnVol(true);
    setErreur(null);
    setDetail(null);

    try {
      const r = await tourDeParole(suite, fiche, ecart());
      setMessages([...suite, { role: 'assistant', content: r.texte }]);
      setB(r.budget);
      /* Anglais et français dans la même réplique, chacun dans sa voix. */
      parle(r.texte, debit);
    } catch (e) {
      setErreur(
        e instanceof ErreurParler && e.quotaEpuise
          ? 'Ton temps de parole est fini pour aujourd’hui. Il revient à minuit.'
          : 'La conversation ne répond pas. Réessaie dans un instant.',
      );
      setDetail(e instanceof ErreurParler ? e.detail ?? null : String(e));
    } finally {
      setEnVol(false);
    }
  }, [enVol, messages, fiche, debit, ecart]);

  /** Appuyer : on coupe la voix, on ouvre le micro. */
  const parleTour = useCallback(() => {
    if (enVol || ecoutant || b.fini) return;
    tais();
    setErreur(null);
    setEntendu('');
    setEcoutant(true);
    session.current = ecoute({
      langue: enFrancais ? 'fr-FR' : 'en-US',
      /* CHANTIER 115 — plus de coupure au silence : l'élève appuie pour envoyer. */
      manuel: true,
      onPartiel: setEntendu,
      onFini: (texte) => {
        setEcoutant(false);
        setEnFrancais(false);
        session.current = null;
        if (texte) void envoie(texte);
        else setEntendu('');
      },
      onErreur: (raison) => {
        setEcoutant(false);
        setEnFrancais(false);
        session.current = null;
        setErreur(
          raison === 'not-allowed'
            ? 'Le micro est refusé. Autorise-le dans les réglages du navigateur, ou passe au clavier.'
            : 'Le micro n’a pas marché. Tu peux réessayer, ou passer au clavier.',
        );
        if (raison === 'indisponible' || raison === 'not-allowed') setMode('clavier');
      },
    });
  }, [enVol, ecoutant, b.fini, envoie, enFrancais]);

  const relache = useCallback(() => {
    session.current?.arrete();
  }, []);

  const termine = useCallback(async () => {
    tais();
    session.current?.arrete();
    setEnVol(true);
    try {
      const r = await bilanDeSeance(messages, fiche, ecart(), horodatage.current);
      setBilan(r.bilan);
      setTropCourt(!!r.trop_court);
    } catch {
      setBilan({ corrections: [], mots: [] });
      setErreur('Le bilan n’a pas pu être établi. La séance est bien comptée.');
    } finally {
      setEnVol(false);
    }
  }, [messages, fiche, ecart]);

  /* ---------------- le compte rendu ---------------- */
  if (bilan) {
    return (
      <section className="parler" aria-label="Ta conversation">
        <h2 className="screen-title">Ta conversation</h2>
        <p className="seance-meta">
          {horloge(secondes)} · {messages.length} répliques · {b.minutes} min restantes
        </p>

        <div className="parler-carte">
          <p className="parler-kicker">Ce qui a coincé</p>
          {tropCourt || bilan.corrections.length === 0 ? (
            <p className="hint">
              {tropCourt
                ? 'La conversation était trop courte pour en tirer quelque chose d’honnête. Parle un peu plus longtemps la prochaine fois.'
                : 'Rien à reprendre cette fois. C’est rare, et c’est bon signe.'}
            </p>
          ) : (
            bilan.corrections.map((c, i) => (
              <div key={i} className={i ? 'seance-corr' : 'seance-corr premiere'}>
                <p className="seance-faux">{c.dit}</p>
                <p className="seance-juste">{c.juste}</p>
                <p className="seance-pourquoi">{c.pourquoi}</p>
              </div>
            ))
          )}
        </div>

        <ReprendreMots mots={bilan.mots} enJeu={enJeu} onReprise={onReprise} />

        {/*
          * La phrase la plus utile de l'écran : elle répond à la question
          * qu'on se pose en refermant un compte rendu qu'on vient de lire
          * en diagonale.
          */}
        <p className="hint seance-gardee">
          Cette conversation est gardée. Tu la retrouveras en entier —
          la transcription et ce compte rendu — dans <b>Parler ›
          Tes conversations</b>.
        </p>

        {exploitant && (
          <p className="seance-exploitant">
            Vue exploitant · {euros(b.coutJour)} aujourd’hui, {b.appels} appels.
          </p>
        )}

        <button className="btn parler-go" onClick={onFini}>Terminer</button>
      </section>
    );
  }

  /* ---------------- la séance en cours ---------------- */
  return (
    <section className="parler seance" aria-label="Conversation en cours">
      <div className="seance-tete">
        <b className="seance-chrono">{horloge(secondes)}</b>
        <span className="seance-reste">
          reste {b.minutes} min aujourd’hui
        </span>
        <button className="seance-stop" onClick={() => void termine()} disabled={enVol}>
          Terminer
        </button>
      </div>

      {exploitant && (
        <p className="seance-exploitant">
          Vue exploitant · {euros(b.coutJour)} aujourd’hui, {b.appels} appels.
        </p>
      )}

      <div className="seance-fil" ref={fil}>
        {messages.length === 0 && !ecoutant && (
          <p className="hint">
            {mode === 'voix'
              ? 'Appuie sur le micro et dis bonjour en anglais. Prends tout ton temps : rien ne part tant que tu n’as pas appuyé une seconde fois.'
              : 'Écris en anglais. La réponse est dite à voix haute.'}
          </p>
        )}
        {messages.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'seance-bulle moi' : 'seance-bulle lui'}>
            {m.role === 'user' ? m.content : nettoie(m.content)}
          </p>
        ))}
        {ecoutant && (
          <p className="seance-bulle moi encours">
            {entendu || '…'}
          </p>
        )}
        {enVol && <p className="seance-bulle lui attente">…</p>}
      </div>

      {erreur && <p className="seance-erreur">{erreur}</p>}
      {detail && <p className="seance-detail">{detail}</p>}

      {mode === 'voix' ? (
        <div className="seance-micro">
          <button
            className={`${ecoutant ? 'micro on' : 'micro'}${enFrancais ? ' fr' : ''}`}
            disabled={enVol || b.fini}
            onClick={() => { if (ecoutant) relache(); else parleTour(); }}
            aria-pressed={ecoutant}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
            </svg>
          </button>
          <p className="seance-consigne">
            {b.fini
              ? 'Temps de parole épuisé pour aujourd’hui.'
              : enVol
                ? 'Il réfléchit…'
                : ecoutant
                  ? (enFrancais
                    ? 'J’écoute en français — appuie quand tu as fini'
                    : 'J’écoute — appuie quand tu as fini')
                  : enFrancais
                    ? 'Appuie et parle en français'
                    : 'Appuie et parle'}
          </p>
          {!ecoutant && !b.fini && (
            <button
              className={`seance-langue${enFrancais ? ' on' : ''}`}
              onClick={() => setEnFrancais((v) => !v)}
              disabled={enVol}
              aria-pressed={enFrancais}
            >
              {enFrancais ? 'Revenir à l’anglais' : 'Dire en français'}
            </button>
          )}
          <button className="seance-bascule" onClick={() => setMode('clavier')}>
            Écrire plutôt
          </button>
        </div>
      ) : (
        <>
          <form
            className="seance-saisie"
            onSubmit={(e) => { e.preventDefault(); void envoie(saisie); }}
          >
            <input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Écris ici…"
              autoComplete="off"
              disabled={enVol || b.fini}
            />
            <button className="btn seance-envoyer" type="submit" disabled={enVol || b.fini || !saisie.trim()}>
              Envoyer
            </button>
          </form>
          {ecouteDisponible && (
            <button className="seance-bascule" onClick={() => setMode('voix')}>
              Parler plutôt
            </button>
          )}
        </>
      )}
    </section>
  );
}
