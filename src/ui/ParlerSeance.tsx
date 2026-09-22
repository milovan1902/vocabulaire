/**
 * La séance de parole.
 *
 * CHANTIER 104 — le banc d'essai au clavier.
 * CHANTIER 105 — LE MICRO.
 *
 * L'élève appuie, parle, relâche : ce qu'il a dit part tel quel, et la
 * réponse se fait entendre. Les trois appels au serveur n'ont pas changé
 * d'une ligne — seule l'entrée a changé, comme annoncé.
 *
 * QUATRE DÉCISIONS :
 *
 * 1. UN APPUI POUR PARLER, PAS UNE ÉCOUTE PERMANENTE. Un micro toujours
 *    ouvert s'entend lui-même : il transcrit la voix de synthèse et
 *    l'élève se retrouve à converser avec l'écho. Un bouton dit qui a la
 *    parole, et c'est aussi ce qui rend la chose apprenable en une
 *    seconde.
 *
 * 2. CE QUI A ÉTÉ ENTENDU S'AFFICHE, et part sans confirmation. Demander
 *    « est-ce bien cela ? » à chaque tour tuerait le rythme ; mais l'élève
 *    voit sa phrase telle qu'elle a été comprise, et une transcription
 *    ratée se lit tout de suite. C'est un compromis, assumé : la fluidité
 *    d'abord, la justesse visible.
 *
 * 3. LA VOIX SE COUPE DÈS QU'ON APPUIE. Interrompre le partenaire est un
 *    droit dans une conversation, et un besoin pour un élève qui a
 *    compris avant la fin.
 *
 * 4. LE CLAVIER RESTE, en second. La reconnaissance est capricieuse sur
 *    iPhone et absente de quelques navigateurs : sans repli, l'écran
 *    serait inutilisable pour une part des élèves.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { speak } from './speech';
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
  fiche, debit, budget, exploitant, onFini,
}: {
  fiche: Fiche;
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

  const [mode, setMode] = useState<Mode>(ecouteDisponible ? 'voix' : 'clavier');
  const [ecoutant, setEcoutant] = useState(false);
  const [entendu, setEntendu] = useState('');
  const session = useRef<Ecoute | null>(null);
  const fil = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bilan) return;
    const t = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [bilan]);

  useEffect(() => {
    const d = fil.current;
    if (d) d.scrollTop = d.scrollHeight;
  }, [messages, enVol, entendu]);

  /* La voix ne survit pas à la sortie de l'écran. */
  useEffect(() => () => { tais(); session.current?.arrete(); }, []);

  const envoie = useCallback(async (texte: string) => {
    const dit = texte.trim();
    if (!dit || enVol) return;

    const suite: Tour[] = [...messages, { role: 'user', content: dit }];
    setMessages(suite);
    setSaisie('');
    setEntendu('');
    setEnVol(true);
    setErreur(null);

    try {
      const r = await tourDeParole(suite, fiche, secondes);
      setMessages([...suite, { role: 'assistant', content: r.texte }]);
      setB(r.budget);
      speak(r.texte, debit);
    } catch (e) {
      setErreur(
        e instanceof ErreurParler && e.quotaEpuise
          ? 'Ton temps de parole est fini pour aujourd’hui. Il revient à minuit.'
          : 'La conversation ne répond pas. Réessaie dans un instant.',
      );
    } finally {
      setEnVol(false);
    }
  }, [enVol, messages, fiche, secondes, debit]);

  /** Appuyer : on coupe la voix, on ouvre le micro. */
  const parle = useCallback(() => {
    if (enVol || ecoutant || b.fini) return;
    tais();
    setErreur(null);
    setEntendu('');
    setEcoutant(true);
    session.current = ecoute({
      onPartiel: setEntendu,
      onFini: (texte) => {
        setEcoutant(false);
        session.current = null;
        if (texte) void envoie(texte);
        else setEntendu('');
      },
      onErreur: (raison) => {
        setEcoutant(false);
        session.current = null;
        setErreur(
          raison === 'not-allowed'
            ? 'Le micro est refusé. Autorise-le dans les réglages du navigateur, ou passe au clavier.'
            : 'Le micro n’a pas marché. Tu peux réessayer, ou passer au clavier.',
        );
        if (raison === 'indisponible' || raison === 'not-allowed') setMode('clavier');
      },
    });
  }, [enVol, ecoutant, b.fini, envoie]);

  /** Relâcher : on ferme le micro, `onFini` enverra. */
  const relache = useCallback(() => {
    session.current?.arrete();
  }, []);

  const termine = useCallback(async () => {
    tais();
    session.current?.arrete();
    setEnVol(true);
    try {
      const r = await bilanDeSeance(messages, fiche, secondes);
      setBilan(r.bilan);
      setTropCourt(!!r.trop_court);
    } catch {
      setBilan({ corrections: [], mots: [] });
      setErreur('Le bilan n’a pas pu être établi. La séance est bien comptée.');
    } finally {
      setEnVol(false);
    }
  }, [messages, fiche, secondes]);

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

        {bilan.mots.length > 0 && (
          <div className="parler-carte">
            <p className="parler-kicker">Mots rencontrés</p>
            <div className="seance-mots">
              {bilan.mots.map((m) => (
                <span key={m.en} className="seance-mot">
                  <b>{m.en}</b>
                  <small>{m.fr}</small>
                </span>
              ))}
            </div>
            <p className="hint">
              Les verser dans un paquet à toi viendra au chantier suivant.
              En attendant, ils sont là, notés.
            </p>
          </div>
        )}

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
        <span className="seance-reste">{b.minutes} min restantes</span>
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
              ? 'Appuie sur le micro, dis bonjour en anglais, et relâche. La réponse se fait entendre.'
              : 'Écris en anglais. La réponse est dite à voix haute.'}
          </p>
        )}
        {messages.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'seance-bulle moi' : 'seance-bulle lui'}>
            {m.content}
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

      {mode === 'voix' ? (
        <div className="seance-micro">
          <button
            className={ecoutant ? 'micro on' : 'micro'}
            disabled={enVol || b.fini}
            /*
             * Appui maintenu, pointeur unifié : un seul jeu d'événements
             * pour le doigt, la souris et le stylet. `onPointerLeave`
             * ferme la session si le doigt glisse hors du bouton, sans
             * quoi le micro resterait ouvert.
             */
            onPointerDown={parle}
            onPointerUp={relache}
            onPointerLeave={() => { if (ecoutant) relache(); }}
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
                  ? 'J’écoute — relâche quand tu as fini.'
                  : 'Maintiens appuyé et parle'}
          </p>
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
              placeholder="Write in English…"
              autoComplete="off"
              lang="en"
              disabled={enVol || b.fini}
            />
            <button className="btn" type="submit" disabled={enVol || b.fini || !saisie.trim()}>
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
