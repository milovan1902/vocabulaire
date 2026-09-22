/**
 * La séance de parole — le banc d'essai.
 *
 * CHANTIER 104 — POURQUOI ON TAPE AVANT DE PARLER
 *
 * La voix demande une boucle à part entière : permission du micro,
 * reconnaissance, interruptions, les caprices d'iOS. C'est un chantier, et
 * il vient après. Or vous avez besoin de mesurer votre consommation
 * MAINTENANT — dix séances de dix minutes, pour connaître votre charge en
 * euros avant de promettre un abonnement.
 *
 * Cet écran fait exactement cela : la vraie fonction, le vrai prompt, le
 * vrai décompte de jetons, le vrai bilan. Seule l'entrée change — on tape
 * au lieu de parler. La réponse, elle, est DITE À VOIX HAUTE par la
 * synthèse qui prononce déjà vos cartes : l'oreille travaille dès
 * aujourd'hui.
 *
 * Ce qui se mesure ici est donc juste, à une nuance près, et il faut la
 * connaître : on tape des phrases plus longues qu'on n'en prononce. Votre
 * relevé sera un plafond, pas une moyenne — la bonne erreur à faire.
 *
 * Le jour où le micro arrive, il remplace le champ de saisie et rien
 * d'autre : les trois appels au serveur ne changent pas d'une ligne.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { speak } from './speech';
import {
  bilanDeSeance, euros, tourDeParole, ErreurParler,
  type Bilan, type Budget, type Fiche, type Tour,
} from '../data/parler';

/** mm:ss — le chronomètre de la séance. */
function horloge(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function ParlerSeance({
  fiche, debit, budget, exploitant, onFini,
}: {
  fiche: Fiche;
  /** La vitesse de la voix, réglée dans les Réglages. */
  debit: number;
  budget: Budget;
  /** Affiche le coût réel sous le chronomètre. Pour vous seul. */
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
  const fil = useRef<HTMLDivElement | null>(null);

  /* Le chronomètre tourne tant que le bilan n'est pas demandé. */
  useEffect(() => {
    if (bilan) return;
    const t = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [bilan]);

  /* Le fil suit la dernière réplique, sans jamais déplacer la page. */
  useEffect(() => {
    const d = fil.current;
    if (d) d.scrollTop = d.scrollHeight;
  }, [messages, enVol]);

  const envoie = useCallback(async () => {
    const texte = saisie.trim();
    if (!texte || enVol) return;

    const suite: Tour[] = [...messages, { role: 'user', content: texte }];
    setMessages(suite);
    setSaisie('');
    setEnVol(true);
    setErreur(null);

    try {
      const r = await tourDeParole(suite, fiche, secondes);
      setMessages([...suite, { role: 'assistant', content: r.texte }]);
      setB(r.budget);
      speak(r.texte, debit);
    } catch (e) {
      /*
       * Le tour de l'élève reste à l'écran : il a écrit, on ne lui efface
       * pas son travail parce que le réseau a hoqueté.
       */
      setErreur(
        e instanceof ErreurParler && e.quotaEpuise
          ? 'Ton temps de parole est fini pour aujourd’hui. Il revient à minuit.'
          : 'La conversation ne répond pas. Réessaie dans un instant.',
      );
    } finally {
      setEnVol(false);
    }
  }, [saisie, enVol, messages, fiche, secondes, debit]);

  const termine = useCallback(async () => {
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
        {messages.length === 0 && (
          <p className="hint">
            Dis bonjour, ou lance un sujet. Écris en anglais — la réponse est
            dite à voix haute.
          </p>
        )}
        {messages.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'seance-bulle moi' : 'seance-bulle lui'}>
            {m.content}
          </p>
        ))}
        {enVol && <p className="seance-bulle lui attente">…</p>}
      </div>

      {erreur && <p className="seance-erreur">{erreur}</p>}

      <form
        className="seance-saisie"
        onSubmit={(e) => { e.preventDefault(); void envoie(); }}
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
    </section>
  );
}
