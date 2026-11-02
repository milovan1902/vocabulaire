/**
 * CHANTIER 390 — LES ÉCRANS DU DÉFI ENTRE AMIS (maquette 390).
 *
 *   — DuelRecu : le défi reçu, face à face (1a, écran 1) ;
 *   — DuelJeu : le jeu, avec les deux barres mot par mot (1a, écran 2) ;
 *   — DuelResultat : le podium (1b, écran 3), bouton de l'appli ;
 *   — DuelEnvoye : après avoir lancé un défi.
 *
 * Même mécanique que le défi éclair : le mot en français, la réponse à
 * écrire, 20 s par mot. Quitter l'application pendant un mot : raté. Un
 * défi ne change jamais les révisions.
 *
 * Tout s'affiche en plein écran, par-dessus la barre d'onglets.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { compareEcrit, type Verdict } from '../engine/reponse';
import { CLASSES, CLASSE_SHORT } from '../domain/types';
import { MOTS_DUEL, SECONDES_DUEL, scoreDe, tempsDe, tempsDit, type Coup, type Duel, type MotDuel } from '../data/duels';
import { tv } from './ton';
import './defi.css';
import './duel.css';

const classeDite = (r: number) => (r >= 0 && CLASSES[r] ? CLASSE_SHORT[CLASSES[r]] : '');
const initiale = (p: string) => (p.trim()[0] ?? '?').toUpperCase();

export function Plein({ children }: { children: ReactNode }) {
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = avant; };
  }, []);
  return createPortal(<div className="duel-plein" role="dialog" aria-modal="true">{children}</div>, document.body);
}

function Confettis() {
  const pieces = useRef(Array.from({ length: 28 }, (_, k) => ({
    left: `${(k * 37) % 100}%`,
    background: ['var(--chalk)', 'var(--good)', '#d9a520', 'var(--bad)'][k % 4],
    animationDelay: `${(k % 7) * 0.08}s`,
    '--dx': `${((k % 5) - 2) * 18}px`,
    '--r': `${(k % 2 ? 1 : -1) * (300 + k * 13)}deg`,
  }) as CSSProperties)).current;
  return <span className="defi-confettis" aria-hidden="true">{pieces.map((st, k) => <i key={k} style={st} />)}</span>;
}

/* ---------------- 1a · le défi reçu ---------------- */

export function DuelRecu({ duel, moi, maClasse, adulte, restants, onJouer, onPlusTard }: {
  duel: Duel; moi: string; maClasse: number; adulte: boolean; restants: number;
  onJouer: () => void; onPlusTard: () => void;
}) {
  const x2 = maClasse >= 0 && duel.classeDe > maClasse;
  return (
    <div className="duel">
      <div className="duel-haut">
        <button className="iconbtn" aria-label="Fermer" onClick={onPlusTard}>✕</button>
        <span className="defi-etiquette">Défi d’ami</span>
        <span className="duel-compte">{restants > 0 ? `${restants} payé${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''}` : 'sans XP'}</span>
      </div>
      <h2 className="duel-titre">{duel.prenom} {tv(adulte, 'te', 'vous')} défie !</h2>
      <div className="duel-vs">
        <span className="duel-joueur"><i className="duel-rond moi">{initiale(moi)}</i><b>{moi}</b><small>{classeDite(maClasse)}</small></span>
        <span className="duel-tampon" aria-hidden="true">VS</span>
        <span className="duel-joueur"><i className="duel-rond lui">{initiale(duel.prenom)}</i><b>{duel.prenom}</b><small>{classeDite(duel.classeDe)}</small></span>
      </div>
      <div className="duel-abattre">
        <small>Score à battre</small>
        <b>{duel.scoreDe}/{MOTS_DUEL} <span>en {tempsDit(duel.tempsDe)}</span></b>
      </div>
      {x2 && (
        <div className="duel-bonus">
          <b>×2</b>
          <span>{duel.prenom} est en classe au-dessus : <strong>40 XP</strong> {tv(adulte, 'si tu gagnes', 'si vous gagnez')}.</span>
        </div>
      )}
      <div className="duel-regles">
        <span>{MOTS_DUEL} mots{classeDite(duel.classeDe) ? <><br />de {classeDite(duel.classeDe)}</> : null}</span>
        <span>{SECONDES_DUEL} s<br />par mot</span>
        <span>Révisions<br />inchangées</span>
      </div>
      <div className="duel-ressort" />
      <button className="btn" onClick={onJouer}>Relever le défi</button>
      <button className="duel-lien" onClick={onPlusTard}>Plus tard · expire à minuit</button>
    </div>
  );
}

/* ---------------- 1a · le jeu ---------------- */

type Resultat = Verdict | 'temps';

function Barre({ coups, en }: { coups: Array<Coup | undefined>; en?: number }) {
  return (
    <span className="duel-barre">
      {Array.from({ length: MOTS_DUEL }, (_, k) => {
        const c = coups[k];
        return <i key={k} className={c ? (c.ok ? 'ok' : 'ko') : k === en ? 'en-cours' : ''} />;
      })}
    </span>
  );
}

export function DuelJeu({ mots, moi, adversaire, adulte, onFin, onQuitter }: {
  mots: MotDuel[];
  moi: string;
  /** Celui dont on relève le défi, mot par mot. Absent quand on lance. */
  adversaire: { prenom: string; coups: Coup[] } | null;
  adulte: boolean;
  onFin: (coups: Coup[]) => void;
  onQuitter: (coups: Coup[]) => void;
}) {
  const n = mots.length;
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'question' | 'correction'>('question');
  const [saisie, setSaisie] = useState('');
  const [coups, setCoups] = useState<Coup[]>([]);
  const [verdict, setVerdict] = useState<Resultat | null>(null);
  const [restant, setRestant] = useState(SECONDES_DUEL * 1000);
  const refCoups = useRef<Coup[]>([]);
  const refDebut = useRef(Date.now());
  const refInput = useRef<HTMLInputElement>(null);
  const mot = mots[i];

  const repondre = useCallback((texte: string | null) => {
    if (phase !== 'question' || !mot) return;
    const ms = texte === null ? SECONDES_DUEL * 1000 : Math.min(SECONDES_DUEL * 1000, Date.now() - refDebut.current);
    const r: Resultat = texte === null ? 'temps' : compareEcrit(texte, mot.en, 'en');
    refCoups.current = [...refCoups.current, { ok: r === 'juste' || r === 'faute', ms }];
    setCoups(refCoups.current);
    setVerdict(r);
    setPhase('correction');
  }, [phase, mot]);
  const refRepondre = useRef(repondre);
  refRepondre.current = repondre;

  useEffect(() => {
    if (phase !== 'question') return undefined;
    refDebut.current = Date.now();
    setRestant(SECONDES_DUEL * 1000);
    refInput.current?.focus();
    const t = window.setInterval(() => {
      const reste = Math.max(0, SECONDES_DUEL * 1000 - (Date.now() - refDebut.current));
      setRestant(reste);
      if (reste === 0) refRepondre.current(null);
    }, 200);
    const cache = () => { if (document.hidden) refRepondre.current(null); };
    document.addEventListener('visibilitychange', cache);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', cache); };
  }, [phase, i]);

  function suivant() {
    if (i + 1 < n) { setI(i + 1); setSaisie(''); setVerdict(null); setPhase('question'); return; }
    onFin(refCoups.current);
  }

  function valider(e: FormEvent) {
    e.preventDefault();
    if (saisie.trim()) repondre(saisie);
  }

  /* Ce qu'on sait de l'adversaire : ses mots déjà passés par nous. */
  const siens = adversaire ? adversaire.coups.slice(0, coups.length) : [];
  const ecart = (() => {
    if (!adversaire || !coups.length) return null;
    const a = scoreDe(coups); const b = scoreDe(siens);
    const ta = tempsDe(coups); const tb = tempsDe(siens);
    if (a !== b) return a > b ? { bon: true, t: `${tv(adulte, 'Tu mènes', 'Vous menez')} : ${a} contre ${b}` } : { bon: false, t: `${adversaire.prenom} mène : ${b} contre ${a}` };
    if (Math.round(ta / 100) === Math.round(tb / 100)) return { bon: true, t: 'À égalité, à la seconde près' };
    return ta < tb
      ? { bon: true, t: `Même score, ${tempsDit(tb - ta)} d’avance` }
      : { bon: false, t: `Même score, ${tempsDit(ta - tb)} de retard` };
  })();

  if (!mot) return null;
  const ok = verdict === 'juste' || verdict === 'faute';

  return (
    <div className="duel">
      <div className="duel-haut">
        <button className="iconbtn" aria-label="Quitter le défi" onClick={() => onQuitter(refCoups.current)}>✕</button>
        <span className="defi-etiquette">{adversaire ? `${moi} vs ${adversaire.prenom}` : tv(adulte, 'Ton défi', 'Votre défi')}</span>
        <b className="duel-compte">{i + 1} / {n}</b>
      </div>

      <div className="duel-pistes">
        <div className="duel-piste">
          <b>{moi}</b>
          <Barre coups={coups} en={phase === 'question' ? i : undefined} />
          <b className="duel-temps">{tempsDit(tempsDe(coups))}</b>
        </div>
        {adversaire ? (
          <div className="duel-piste lui">
            <span>{adversaire.prenom}</span>
            <Barre coups={siens} />
            <span className="duel-temps">{tempsDit(tempsDe(siens))}</span>
          </div>
        ) : (
          <small className="duel-ecart">{tv(adulte, 'Tu fixes le score à battre.', 'Vous fixez le score à battre.')}</small>
        )}
        {ecart && <small className={`duel-ecart${ecart.bon ? ' bon' : ''}`}>{ecart.t}</small>}
      </div>

      {phase === 'question' ? (
        <>
          <div className="defi-mot duel-mot">
            <span>En anglais :</span>
            <b lang="fr">{mot.fr}</b>
          </div>
          <div className="defi-chrono" role="timer" aria-label={`${Math.ceil(restant / 1000)} secondes restantes`}>
            <div><span>Temps restant</span><b>{Math.ceil(restant / 1000)} s</b></div>
            <span className="defi-chrono-barre"><i className={restant < 5000 ? 'presse' : ''} style={{ width: `${(100 * restant) / (SECONDES_DUEL * 1000)}%` }} /></span>
          </div>
          <form className="defi-form" onSubmit={valider}>
            <input
              ref={refInput} className="defi-saisie" lang="en" value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="done"
              aria-label={`Traduction de « ${mot.fr} » en anglais`}
            />
            <button className="btn" type="submit" disabled={!saisie.trim()}>Valider</button>
          </form>
        </>
      ) : (
        <>
          <div className={`defi-correction duel-mot${ok ? ' ok' : ' ko'}`} role="status">
            <span className="defi-pastille grande" aria-hidden="true">{ok ? '✓' : '✕'}</span>
            <b className="defi-verdict">
              {verdict === 'juste' ? 'Réussi !' : verdict === 'faute' ? 'Réussi, à une lettre près' : verdict === 'temps' ? 'Temps écoulé' : 'Raté'}
            </b>
            <span className="defi-reponse" lang="en">{mot.en}</span>
          </div>
          <button className="btn" onClick={suivant} autoFocus>{i + 1 < n ? 'Mot suivant' : 'Voir le résultat'}</button>
        </>
      )}
    </div>
  );
}

/* ---------------- 1b · le podium ---------------- */

export function DuelResultat({ duel, moi, adulte, peutRevanche, onRevanche, onRetour }: {
  duel: Duel; moi: string; adulte: boolean; peutRevanche: boolean;
  onRevanche: () => void; onRetour: () => void;
}) {
  const sa = duel.deMoi ? duel.scoreDe : duel.scoreA ?? 0;
  const ta = duel.deMoi ? duel.tempsDe : duel.tempsA ?? 0;
  const sb = duel.deMoi ? duel.scoreA ?? 0 : duel.scoreDe;
  const tb = duel.deMoi ? duel.tempsA ?? 0 : duel.tempsDe;
  const ca = duel.deMoi ? duel.classeDe : duel.classeA ?? -1;
  const cb = duel.deMoi ? duel.classeA ?? -1 : duel.classeDe;
  const r = sa !== sb ? (sa > sb ? 'gagne' : 'perdu') : Math.round(ta / 100) === Math.round(tb / 100) ? 'nul' : ta < tb ? 'gagne' : 'perdu';
  const x2 = r === 'gagne' && ca >= 0 && cb > ca;
  const titre = r === 'gagne' ? `${tv(adulte, 'Tu as', 'Vous avez')} battu ${duel.prenom} !` : r === 'nul' ? 'Match nul !' : `${duel.prenom} l’emporte`;
  const sansXp = !duel.deMoi && duel.payeA === false;
  const detail = sansXp
    ? tv(adulte, 'Pas d’XP : tu as déjà 3 défis payés aujourd’hui.', 'Pas d’XP : vous avez déjà 3 défis payés aujourd’hui.')
    : [
      r === 'gagne' ? (x2 ? 'gagnant ×2 · classe au-dessus' : 'victoire') : r === 'nul' ? 'match nul' : 'pour avoir joué',
      duel.deMoi ? '+5 défi relevé' : '',
    ].filter(Boolean).join(' · ');
  const premier = { nom: r === 'perdu' ? duel.prenom : moi, s: r === 'perdu' ? sb : sa, t: r === 'perdu' ? tb : ta, moi: r !== 'perdu' };
  const second = { nom: r === 'perdu' ? moi : duel.prenom, s: r === 'perdu' ? sa : sb, t: r === 'perdu' ? ta : tb, moi: r === 'perdu' };

  return (
    <div className="duel duel-fin">
      {r === 'gagne' && <Confettis />}
      <h2 className="duel-titre grand">{titre}</h2>
      <div className={`duel-podium${r === 'nul' ? ' nul' : ''}`}>
        <div className="duel-marche deux">
          <i className={`duel-rond ${second.moi ? 'moi' : 'lui'}`}>{initiale(second.nom)}</i>
          <small>{second.s}/{MOTS_DUEL} · {tempsDit(second.t)}</small>
          <span>{r === 'nul' ? '1' : '2'}</span>
        </div>
        <div className="duel-marche un">
          <em>{r === 'nul' ? 'ÉGALITÉ' : 'GAGNANT'}</em>
          <i className={`duel-rond ${premier.moi ? 'moi' : 'lui'}`}>{initiale(premier.nom)}</i>
          <small><b>{premier.s}/{MOTS_DUEL} · {tempsDit(premier.t)}</b></small>
          <span>1</span>
        </div>
      </div>
      <div className="duel-gain">
        <b>+{duel.xpMoi} XP</b>
        <small>{detail}</small>
      </div>
      {sa === sb && r !== 'nul' && <p className="defi-note">Même score, départagés au temps.</p>}
      <div className="duel-ressort" />
      {peutRevanche && <button className="btn" onClick={onRevanche}>Revanche : défier {duel.prenom}</button>}
      <button className={peutRevanche ? 'duel-lien' : 'btn'} onClick={onRetour}>Revenir à Mes amis</button>
    </div>
  );
}

/* ---------------- après avoir lancé ---------------- */

export function DuelEnvoye({ prenom, coups, adulte, onRetour }: { prenom: string; coups: Coup[]; adulte: boolean; onRetour: () => void }) {
  return (
    <div className="duel duel-fin">
      <h2 className="duel-titre grand">Défi envoyé !</h2>
      <div className="duel-abattre">
        <small>{tv(adulte, 'Ton score', 'Votre score')}</small>
        <b>{scoreDe(coups)}/{MOTS_DUEL} <span>en {tempsDit(tempsDe(coups))}</span></b>
      </div>
      <p className="defi-note">
        {prenom} {tv(adulte, 'a jusqu’à minuit pour le relever. Tes XP arrivent dès qu’il est joué : +5 pour le défi relevé, plus la victoire ou la participation.', 'a jusqu’à minuit pour le relever. Vos XP arrivent dès qu’il est joué : +5 pour le défi relevé, plus la victoire ou la participation.')}
      </p>
      <div className="duel-ressort" />
      <button className="btn" onClick={onRetour}>Revenir à Mes amis</button>
    </div>
  );
}
