/**
 * L'écran « Oral » — les statistiques de parole.
 *
 * CHANTIER 121 — TROIS CHIFFRES, TIRÉS DE CE QUI EST DÉJÀ GARDÉ.
 * CHANTIER 404 — UNE ÉCHELLE AU CHOIX, TROIS COURBES.
 *
 *   1. Temps de parole (barres).
 *   2. Fautes par 10 minutes (courbe).
 *   3. L'aisance : répliques par minute (courbe).
 *
 *   Tout en haut, l'élève choisit l'échelle : 14 jours, 12 semaines ou 12 mois.
 *   Elle s'applique aux trois cartes. (« Tes fautes qui reviennent » a été
 *   retiré : peu parlant.)
 *
 * Tout vient de `parler_seance` : durée, répliques, corrections. Jamais de
 * la transcription, qui est effacée à 90 jours (chantier 118) — les
 * chiffres restent donc justes après le ménage. Le calcul vit dans
 * `engine/parole.ts`.
 *
 * Moins de trois conversations : seul le temps de parole s'affiche, avec
 * une phrase d'attente. Une courbe à deux points ne dit rien.
 */
/* CHANTIER 359 — le tu et le vous. */
import { tvp } from './ton';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
/* CHANTIER 359 — le temps de parole à l'échelle. */
import './parole-semaines.css';
import { supabase } from '../data/supabase';
import { duree } from '../data/parler';
import {
  NB, plusAncienJour, pointsAisance, pointsFautes, tranches,
  type Echelle, type JourParle, type LigneParole, type Point,
} from '../engine/parole';

const virgule = (n: number) => n.toFixed(1).replace('.', ',');

const CLE_ECHELLE = 'vocab:oral-echelle';
const ECHELLES: Echelle[] = ['jours', 'semaines', 'mois'];

function echelleChoisie(): Echelle {
  try {
    const v = localStorage.getItem(CLE_ECHELLE);
    if (v === 'jours' || v === 'semaines' || v === 'mois') return v;
  } catch { /* rien */ }
  return 'semaines';
}

/** Les mots de chaque échelle. */
const MOTS: Record<Echelle, {
  bouton: string; courant: string; gauche: (n: number) => string; droite: string;
  ilYa: (k: number) => string; note: string;
}> = {
  jours: {
    bouton: '14 jours', courant: 'aujourd’hui', droite: 'aujourd’hui',
    gauche: (n) => `il y a ${n - 1} j.`,
    ilYa: (k) => `il y a ${k} jour${k > 1 ? 's' : ''}`,
    note: 'jour par jour',
  },
  semaines: {
    bouton: '12 semaines', courant: 'cette semaine', droite: 'cette sem.',
    gauche: (n) => `il y a ${n - 1} sem.`,
    ilYa: (k) => `il y a ${k} semaine${k > 1 ? 's' : ''}`,
    note: 'semaine par semaine',
  },
  mois: {
    bouton: '12 mois', courant: 'ce mois-ci', droite: 'ce mois',
    gauche: (n) => `il y a ${n - 1} mois`,
    ilYa: (k) => `il y a ${k} mois`,
    note: 'mois par mois',
  },
};

/**
 * Une courbe 320 × 90. L'échelle part de zéro pour ne pas exagérer.
 * Seules les tranches qui ont un point sont reliées.
 */
function Courbe({ points, n, dernier }: { points: Point[]; n: number; dernier: Point }) {
  const vMax = Math.max(...points.map((p) => p.v), 1);
  const x = (i: number) => 8 + (i * 304) / Math.max(n - 1, 1);
  const y = (v: number) => 84 - (v / vMax) * 72;
  const trace = points.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  return (
    <svg className="parole-courbe" viewBox="0 0 320 90" aria-hidden="true">
      <line x1="0" y1="89" x2="320" y2="89" />
      {points.length > 1 && <polyline points={trace} />}
      {points.map((p) => (
        <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={p === dernier ? 4 : 2.5}
          className={p === dernier ? 'now' : ''} />
      ))}
    </svg>
  );
}

export function MaParole({ onRetour }: { onRetour: () => void }) {
  const [lignes, setLignes] = useState<LigneParole[] | null>(null);
  const [panne, setPanne] = useState(false);
  const [echelle, setEchelle] = useState<Echelle>(echelleChoisie);
  /* CHANTIER 360 — le temps parlé jour par jour, lu dans le compteur du temps de parole
     (vue parler_jour). Il remonte plus loin que les conversations gardées. null = indisponible. */
  const [parJour, setParJour] = useState<JourParle[] | null>(null);

  const choisit = (e: Echelle) => {
    setEchelle(e);
    try { localStorage.setItem(CLE_ECHELLE, e); } catch { /* rien */ }
  };

  useEffect(() => {
    let vivant = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { if (vivant) setLignes([]); return; }
      const { data, error } = await supabase
        .from('parler_seance')
        .select('finie_le,secondes,repliques,corrections,themes')
        .order('finie_le', { ascending: true })
        .limit(1000);
      if (!vivant) return;
      if (error) { setPanne(true); setLignes([]); return; }
      setLignes((data ?? []) as LigneParole[]);
      /* 404 — on lit assez loin pour l'échelle « 12 mois » ; les autres en prennent une part. */
      const depuis = plusAncienJour(new Date());
      /* 362 — la vue d'abord ; si elle n'est pas lisible, le compteur lui-même (une ligne par échange). */
      let jours: JourParle[] | null = null;
      const v = await supabase.from('parler_jour').select('jour,secondes').gte('jour', depuis);
      if (!v.error && v.data?.length) jours = v.data as JourParle[];
      else {
        if (v.error) console.warn('[oral] vue parler_jour illisible :', v.error.message);
        const t = await supabase.from('parler_usage').select('jour,secondes').gte('jour', depuis).limit(10000);
        if (t.error) console.warn('[oral] parler_usage illisible :', t.error.message);
        else if (t.data?.length) jours = t.data as JourParle[];
      }
      if (vivant && jours) setParJour(jours);
    })();
    return () => { vivant = false; };
  }, []);

  const n = NB[echelle];
  const mots = MOTS[echelle];

  const st = useMemo(() => {
    const L = (lignes ?? []).filter((l) => (l.secondes ?? 0) > 0);
    const T = tranches(L, parJour, echelle);
    return {
      n: L.length,
      T,
      fautes: pointsFautes(T),
      aisance: pointsAisance(T),
    };
  }, [lignes, parJour, echelle]);

  const entete = (
    <>
      <button className="sousecran-retour" onClick={onRetour}>
        <span aria-hidden="true">‹</span>
        Mes progrès
      </button>
      <h2 className="screen-title">Oral</h2>
    </>
  );

  if (!lignes) {
    return <section className="sousecran" aria-label="Oral">{entete}<p className="lead">Chargement…</p></section>;
  }

  /* 404 — la tranche en cours contre la moyenne des précédentes (tranches vides comprises). */
  const courante = st.T[n - 1];
  const moyenne = Math.round(st.T.slice(0, n - 1).reduce((s, w) => s + w.parle, 0) / (n - 1) / 60);
  const ecart = Math.round(courante.parle / 60) - moyenne;
  const maxT = Math.max(...st.T.map((w) => w.parle), 60);
  const aParle = st.T.some((w) => w.parle > 0);
  const haut = (sec: number) => (85 * sec) / maxT;
  const assez = st.n >= 3;

  const fDernier = st.fautes[st.fautes.length - 1];
  const fPremier = st.fautes[0];
  const aDernier = st.aisance[st.aisance.length - 1];
  const aPremier = st.aisance[0];

  return (
    <section className="sousecran" aria-label="Oral">
      {entete}
      <p className="hint parole-intro">
        {panne
          ? tvp('Les conversations n’ont pas pu être lues. Réessaie plus tard.', 'Les conversations n’ont pas pu être lues. Réessayez plus tard.')
          : st.n === 0
            ? tvp('Aucune conversation pour l’instant. Les chiffres apparaîtront ici après ta première séance dans Parler.', 'Aucune conversation pour l’instant. Les chiffres apparaîtront ici après votre première séance dans Parler.')
            : `${st.n} conversation${st.n > 1 ? 's' : ''} depuis le début.`}
      </p>

      {/* 404 — l'échelle de temps, valable pour toutes les cartes. */}
      <div className="parole-echelle" role="group" aria-label="Échelle de temps">
        {ECHELLES.map((e) => (
          <button key={e} type="button" aria-pressed={e === echelle} onClick={() => choisit(e)}>
            {MOTS[e].bouton}
          </button>
        ))}
      </div>

      {(st.n > 0 || aParle) && (
        <div className="parole-carte">
          <p className="parole-kicker">1 · Temps de parole</p>
          <p className="parole-chiffre">
            <b>{duree(courante.parle)}</b>
            <span>{mots.courant}</span>
          </p>
          {moyenne > 0 && (
            <p className={`parole-ecart${ecart >= 0 ? ' plus' : ''}`}>
              {ecart >= 0 ? '+' : '−'} {Math.abs(ecart)} min par rapport à la moyenne ({moyenne} min)
            </p>
          )}
          <div className="parole-semaines" style={{ '--n': n } as CSSProperties}
            role="img" aria-label={`Minutes parlées, ${mots.note} : ${st.T.map((w) => Math.round(w.parle / 60)).join(', ')}`}>
            {moyenne > 0 && <span className="parole-moy" style={{ bottom: `${haut(moyenne * 60)}%` }} aria-hidden="true"><small>moy.</small></span>}
            {st.T.map((w, i) => (
              <span key={w.cle} className={i === n - 1 ? 'now' : ''} style={{ '--h': `${w.parle > 0 ? Math.max(2, haut(w.parle)) : 0.8}%` } as CSSProperties}>
                {w.parle > 0 && <small>{Math.round(w.parle / 60)}</small>}
                <i />
              </span>
            ))}
          </div>
          <div className="parole-axe"><span>{mots.gauche(n)}</span><span>{mots.droite}</span></div>
          <p className="parole-note">En minutes, {mots.note}. Une barre deux fois plus haute = deux fois plus de minutes.</p>
        </div>
      )}

      {st.n > 0 && !assez && (
        <p className="hint">
          Les fautes et l’aisance s’afficheront à partir de trois conversations.
        </p>
      )}

      {assez && (
        <div className="parole-carte">
          <p className="parole-kicker">2 · Fautes par 10 minutes</p>
          {fDernier ? (
            <>
              <p className="parole-chiffre">
                <b>{virgule(fDernier.v)}</b>
                {fPremier && fPremier !== fDernier && (
                  <span className={fDernier.v <= fPremier.v ? 'mieux' : ''}>
                    contre {virgule(fPremier.v)} {mots.ilYa(n - 1 - fPremier.i)}
                  </span>
                )}
              </p>
              <Courbe points={st.fautes} n={n} dernier={fDernier} />
              <div className="parole-axe"><span>{mots.gauche(n)}</span><span>{mots.note}</span><span>{mots.droite}</span></div>
              <p className="parole-note">Le nombre de corrections ramené à 10 min. Plus la courbe descend, mieux c’est.</p>
            </>
          ) : (
            <p className="parole-note">Pas assez de parole sur cette période.</p>
          )}
        </div>
      )}

      {assez && (
        <div className="parole-carte">
          <p className="parole-kicker">3 · Aisance</p>
          {aDernier ? (
            <>
              <p className="parole-chiffre">
                <b>{virgule(aDernier.v)}</b>
                <span>répliques par minute</span>
                {aPremier && aPremier !== aDernier && (
                  <span className={aDernier.v >= aPremier.v ? 'mieux' : ''}>
                    contre {virgule(aPremier.v)} {mots.ilYa(n - 1 - aPremier.i)}
                  </span>
                )}
              </p>
              <Courbe points={st.aisance} n={n} dernier={aDernier} />
              <div className="parole-axe"><span>{mots.gauche(n)}</span><span>{mots.note}</span><span>{mots.droite}</span></div>
              <p className="parole-note">
                {tvp('Plus tu réponds vite', 'Plus vous répondez vite')}, plus l’échange ressemble à une vraie conversation. Plus la courbe monte, mieux c’est. Compté sur Discuter et les mises en scène.
              </p>
            </>
          ) : (
            <p className="parole-note">Pas assez de parole sur cette période.</p>
          )}
        </div>
      )}
    </section>
  );
}
