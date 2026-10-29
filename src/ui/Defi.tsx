import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { compareEcrit, type Verdict } from '../engine/reponse';
import { MOTS_DEFI, xpDefi, type MotDefi } from '../engine/defi';
import { demande } from './Dialogue';
import './defi.css';

/*
 * CHANTIER 357 — LE DÉFI ÉCLAIR (maquette 357, 3b · 3c · 3d).
 *
 * Le mot en français, la réponse en anglais à écrire avant la fin du chrono.
 * Pas de bouton « Afficher », pas d'auto-évaluation : l'application juge
 * (tolérance habituelle de l'écrit). Temps écoulé, ou application quittée
 * pendant le mot : raté. Le chrono s'arrête pendant la correction.
 *
 * Quitter en cours de route termine le défi avec les mots déjà faits (les
 * autres comptent ratés) — sauf si aucun mot n'a encore été répondu.
 */
type Resultat = Verdict | 'temps';

const ICONE_CHRONO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" />
  </svg>
);

/** La carte d'Aujourd'hui : à faire (sous le bouton principal) ou faite (tout en bas). */
export function DefiCarte({ etat, score, secondes, onOuvrir }: {
  etat: 'afaire' | 'fait';
  score: number;
  secondes: number;
  onOuvrir: () => void;
}) {
  if (etat === 'afaire') {
    return (
      <button className="defi-carte" onClick={onOuvrir}>
        <span className="defi-icone">{ICONE_CHRONO}</span>
        <span className="defi-carte-txt">
          <b>Défi éclair</b>
          <span>{MOTS_DEFI} mots que tu connais déjà, à écrire en {secondes} s chacun.</span>
        </span>
        <span className="defi-carte-xp">+{xpDefi(MOTS_DEFI)} XP</span>
      </button>
    );
  }
  const gain = xpDefi(score);
  return (
    <div className="defi-fait">
      <span className={`defi-pastille${gain ? '' : ' rate'}`} aria-hidden="true">{gain ? '✓' : '·'}</span>
      <span className="defi-fait-txt">Défi éclair : {score}/{MOTS_DEFI}</span>
      <span className="defi-fait-xp">{gain ? `+${gain} XP` : 'Nouveau défi demain'}</span>
    </div>
  );
}

function Confettis() {
  const pieces = useRef(Array.from({ length: 28 }, (_, k) => ({
    left: `${(k * 37) % 100}%`,
    background: ['var(--chalk)', 'var(--good)', 'var(--ink)', 'var(--bad)'][k % 4],
    animationDelay: `${(k % 7) * 0.08}s`,
    '--dx': `${((k % 5) - 2) * 18}px`,
    '--r': `${(k % 2 ? 1 : -1) * (300 + k * 13)}deg`,
  }) as CSSProperties)).current;
  return <span className="defi-confettis" aria-hidden="true">{pieces.map((st, k) => <i key={k} style={st} />)}</span>;
}

export function Defi({ mots, secondes, onReponse, onFin, onQuitter }: {
  mots: MotDefi[];
  secondes: number;
  /** Chaque réponse, aussitôt : réussi = compte dans la journée ; raté = « à revoir ». */
  onReponse: (mot: MotDefi, juste: boolean) => void;
  /** Le score final, une seule fois. */
  onFin: (score: number) => void;
  onQuitter: () => void;
}) {
  const n = mots.length;
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'question' | 'correction' | 'fin'>('question');
  const [saisie, setSaisie] = useState('');
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [saisis, setSaisis] = useState<string[]>([]);
  const [restant, setRestant] = useState(secondes * 1000);
  const refRes = useRef<Resultat[]>([]);
  const refFini = useRef(false);
  const refInput = useRef<HTMLInputElement>(null);
  const mot = mots[i];

  const score = (r: Resultat[]) => r.filter((v) => v === 'juste' || v === 'faute').length;

  /* Les rappels du parent changent à chaque rendu : on lit toujours le dernier,
     sans relancer le chrono ni la sortie. */
  const refOnFin = useRef(onFin);
  refOnFin.current = onFin;
  const terminer = useCallback(() => {
    if (refFini.current || !refRes.current.length) return;
    refFini.current = true;
    refOnFin.current(score(refRes.current));
  }, []);

  const repondre = useCallback((texte: string | null) => {
    if (phase !== 'question' || !mot) return;
    const r: Resultat = texte === null ? 'temps' : compareEcrit(texte, mot.card.en, 'en');
    refRes.current = [...refRes.current, r];
    setResultats(refRes.current);
    setSaisis((s) => [...s, texte ?? '']);
    onReponse(mot, r === 'juste' || r === 'faute');
    setPhase('correction');
  }, [phase, mot, onReponse]);
  const refRepondre = useRef(repondre);
  refRepondre.current = repondre;

  /* Le chrono : il part à l'affichage du mot. */
  useEffect(() => {
    if (phase !== 'question') return undefined;
    const debut = Date.now();
    setRestant(secondes * 1000);
    refInput.current?.focus();
    const t = window.setInterval(() => {
      const reste = Math.max(0, secondes * 1000 - (Date.now() - debut));
      setRestant(reste);
      if (reste === 0) refRepondre.current(null);
    }, 200);
    /* Quitter l'application pendant le mot (pour chercher la réponse) : raté. */
    const cache = () => { if (document.hidden) refRepondre.current(null); };
    document.addEventListener('visibilitychange', cache);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', cache); };
  }, [phase, i, secondes]);

  /* Une sortie par le bouton retour du téléphone termine aussi le défi. */
  useEffect(() => () => terminer(), [terminer]);

  function suivant() {
    if (i + 1 < n) { setI(i + 1); setSaisie(''); setPhase('question'); return; }
    terminer();
    setPhase('fin');
  }

  async function quitter() {
    if (phase === 'fin') { onQuitter(); return; }
    const entame = refRes.current.length > 0;
    const oui = await demande({
      titre: 'Abandonner le défi ?',
      texte: entame
        ? 'Les mots restants comptent ratés, et le défi ne se refait pas aujourd’hui.'
        : 'Tu pourras le reprendre plus tard aujourd’hui.',
      agir: 'Abandonner',
      garder: 'Continuer le défi',
      ton: 'prudent',
    });
    if (!oui) return;
    terminer();
    onQuitter();
  }

  function valider(e: FormEvent) {
    e.preventDefault();
    if (saisie.trim()) repondre(saisie);
  }

  const total = score(resultats);
  const gain = xpDefi(total);

  if (phase === 'fin') {
    const titre = total === n ? 'Défi réussi !' : total === n - 1 ? 'Défi presque parfait' : 'Défi terminé';
    const pct = Math.round((100 * total) / n);
    return (
      <div className="defi">
        {total === n && <Confettis />}
        <div className="defi-resultat">
          <div className="bilan-anneau" style={{ '--pct': `${pct}%` } as CSSProperties} role="img" aria-label={`${total} mots sur ${n}`}>
            <div><b>{total}/{n}</b></div>
          </div>
          <h2>{titre}</h2>
          <p className="defi-gain">{gain ? `+${gain} XP` : 'Pas d’XP cette fois'}</p>
          <p className="defi-note">{total === n ? 'Nouveau défi demain.' : `5/5 rapporte +${xpDefi(n)} XP. Nouveau défi demain.`}</p>
        </div>
        <ul className="defi-liste">
          {mots.map((m, k) => {
            const ok = resultats[k] === 'juste' || resultats[k] === 'faute';
            return (
              <li key={m.card.id}>
                <span className={ok ? 'ok' : 'ko'} aria-label={ok ? 'Réussi' : 'Raté'}>{ok ? '✓' : '✕'}</span>
                <span>{m.card.en}</span>
                <span className="defi-fr">{m.card.fr}</span>
              </li>
            );
          })}
        </ul>
        {total < n && <p className="defi-note">Les mots ratés reviennent dans tes révisions. Les mots réussis gardent leur date.</p>}
        <button className="btn" onClick={onQuitter}>Revenir à aujourd’hui</button>
      </div>
    );
  }

  if (!mot) return null;
  const r = resultats[i];
  const ok = r === 'juste' || r === 'faute';

  return (
    <div className="defi">
      <div className="defi-haut">
        <button className="iconbtn" aria-label="Abandonner le défi" onClick={() => void quitter()}>✕</button>
        <span className="defi-etiquette">Défi éclair</span>
        <span className="defi-compte">{i + 1} / {n}</span>
      </div>
      <div className="defi-etapes" aria-hidden="true">
        {mots.map((m, k) => {
          const v = resultats[k];
          const cls = v === undefined ? (k === i ? 'en-cours' : '') : v === 'juste' || v === 'faute' ? 'ok' : 'ko';
          return <i key={m.card.id} className={cls} />;
        })}
      </div>

      {phase === 'question' ? (
        <>
          <div className="defi-mot">
            <span>En anglais :</span>
            <b lang="fr">{mot.card.fr}</b>
          </div>
          <div className="defi-chrono" role="timer" aria-label={`${Math.ceil(restant / 1000)} secondes restantes`}>
            <div><span>Temps restant</span><b>{Math.ceil(restant / 1000)} s</b></div>
            <span className="defi-chrono-barre"><i className={restant < 5000 ? 'presse' : ''} style={{ width: `${(100 * restant) / (secondes * 1000)}%` }} /></span>
          </div>
          <form className="defi-form" onSubmit={valider}>
            <input
              ref={refInput}
              className="defi-saisie"
              lang="en"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              aria-label={`Traduction de « ${mot.card.fr} » en anglais`}
            />
            <button className="btn" type="submit" disabled={!saisie.trim()}>Valider</button>
          </form>
        </>
      ) : (
        <>
          <div className={`defi-correction${ok ? ' ok' : ' ko'}`} role="status">
            <span className="defi-pastille grande" aria-hidden="true">{ok ? '✓' : '✕'}</span>
            <b className="defi-verdict">
              {r === 'juste' ? 'Réussi !' : r === 'faute' ? 'Réussi, à une lettre près' : r === 'temps' ? 'Temps écoulé' : 'Raté'}
            </b>
            <span className="defi-reponse" lang="en">{mot.card.en}</span>
            {saisis[i] && r !== 'juste' && <span className="defi-ecrit">Tu as écrit : <span lang="en">{saisis[i]}</span></span>}
            {!ok && <span className="defi-ecrit">Ce mot revient dans tes révisions.</span>}
          </div>
          <button className="btn" onClick={suivant} autoFocus>{i + 1 < n ? 'Mot suivant' : 'Voir le résultat'}</button>
        </>
      )}
    </div>
  );
}
