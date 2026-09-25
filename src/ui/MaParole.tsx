/**
 * L'écran « Oral » — les statistiques de parole.
 *
 * CHANTIER 121 — QUATRE CHIFFRES, TIRÉS DE CE QUI EST DÉJÀ GARDÉ.
 *
 *   1. Temps de parole, mois par mois (six mois).
 *   2. Fautes par 10 minutes, semaine par semaine (huit semaines).
 *   3. Les fautes qui reviennent, sur les 30 derniers jours.
 *   4. L'aisance : répliques par minute, début contre maintenant.
 *
 * Tout vient de `parler_seance` : durée, répliques, corrections. Jamais de
 * la transcription, qui est effacée à 90 jours (chantier 118) — les
 * chiffres restent donc justes après le ménage. On ne lit que ces
 * colonnes, pas la transcription : plus léger, et on peut remonter loin.
 *
 * Moins de trois conversations : seul le temps de parole s'affiche, avec
 * une phrase d'attente. Une courbe à deux points ne dit rien.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../data/supabase';
import { duree } from '../data/parler';

type Correction = { dit: string; juste: string; pourquoi: string };
interface Ligne {
  finie_le: string;
  secondes: number | null;
  repliques: number | null;
  corrections: Correction[] | null;
}

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.',
  'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const J = 86_400_000;
const virgule = (n: number) => n.toFixed(1).replace('.', ',');

/** Le lundi de la semaine d'une date, à minuit. */
function lundi(d: Date): number {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.getTime();
}

/** « I am agree. » et « i am agree » sont la même faute. */
function cle(t: string): string {
  return t.toLowerCase().replace(/[.,!?;:«»"“”]/g, '').replace(/\s+/g, ' ').trim();
}

export function MaParole({ onRetour }: { onRetour: () => void }) {
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [panne, setPanne] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { if (vivant) setLignes([]); return; }
      const { data, error } = await supabase
        .from('parler_seance')
        .select('finie_le,secondes,repliques,corrections')
        .order('finie_le', { ascending: true })
        .limit(1000);
      if (!vivant) return;
      if (error) { setPanne(true); setLignes([]); return; }
      setLignes((data ?? []) as Ligne[]);
    })();
    return () => { vivant = false; };
  }, []);

  const st = useMemo(() => {
    const L = (lignes ?? []).filter((l) => (l.secondes ?? 0) > 0);
    const maintenant = new Date();

    /* 1. Six mois, le mois courant à droite. */
    const mois = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - 5 + i, 1);
      return { a: d.getFullYear(), m: d.getMonth(), sec: 0 };
    });
    for (const l of L) {
      const d = new Date(l.finie_le);
      const b = mois.find((x) => x.a === d.getFullYear() && x.m === d.getMonth());
      if (b) b.sec += l.secondes ?? 0;
    }
    const moisMax = Math.sqrt(Math.max(...mois.map((x) => x.sec), 60));

    /* 2. Huit semaines. Une semaine sans au moins une minute parlée ne compte pas. */
    const semaines = Array.from({ length: 8 }, (_, i) => ({
      debut: lundi(maintenant) - (7 - i) * 7 * J, sec: 0, fautes: 0,
    }));
    for (const l of L) {
      const w = lundi(new Date(l.finie_le));
      const b = semaines.find((x) => x.debut === w);
      if (b) { b.sec += l.secondes ?? 0; b.fautes += (l.corrections ?? []).length; }
    }
    const points = semaines
      .map((s, i) => ({ i, v: s.sec >= 60 ? (s.fautes * 600) / s.sec : null }))
      .filter((p): p is { i: number; v: number } => p.v !== null);

    /* 3. Trente jours. Deux fois au moins, sinon ce n'est pas une habitude. */
    const depuis = Date.now() - 30 * J;
    const tas = new Map<string, Correction & { fois: number }>();
    for (const l of L) {
      if (new Date(l.finie_le).getTime() < depuis) continue;
      for (const c of l.corrections ?? []) {
        const k = cle(c.dit);
        if (!k) continue;
        const t = tas.get(k);
        if (t) t.fois += 1; else tas.set(k, { ...c, fois: 1 });
      }
    }
    const recurrentes = [...tas.values()].filter((c) => c.fois >= 2)
      .sort((a, b) => b.fois - a.fois).slice(0, 3);

    /* 4. Moyenne des trois premières séances contre les trois dernières. */
    const rythme = (xs: Ligne[]) => {
      const sec = xs.reduce((s, l) => s + (l.secondes ?? 0), 0);
      const rep = xs.reduce((s, l) => s + (l.repliques ?? 0), 0);
      return sec > 0 ? (rep * 60) / sec : 0;
    };
    const aisanceDebut = rythme(L.slice(0, 3));
    const aisance = rythme(L.slice(-3));

    return { n: L.length, mois, moisMax, semaines, points, recurrentes, aisanceDebut, aisance };
  }, [lignes]);

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

  const ceMois = st.mois[5];
  const assez = st.n >= 3;

  /* La courbe : 320 × 90, l'échelle part de zéro pour ne pas exagérer. */
  const vMax = Math.max(...st.points.map((p) => p.v), 1);
  const x = (i: number) => 8 + (i * 304) / 7;
  const y = (v: number) => 84 - (v / vMax) * 72;
  const trace = st.points.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const premier = st.points[0];
  const dernier = st.points[st.points.length - 1];

  /* Le curseur d'aisance : 0 à 6 répliques par minute. */
  const pos = (v: number) => `${Math.min(100, (v / 6) * 100)}%`;

  return (
    <section className="sousecran" aria-label="Oral">
      {entete}
      <p className="hint parole-intro">
        {panne
          ? 'Les conversations n’ont pas pu être lues. Réessaie plus tard.'
          : st.n === 0
            ? 'Aucune conversation pour l’instant. Les chiffres apparaîtront ici après ta première séance dans Parler.'
            : `${st.n} conversation${st.n > 1 ? 's' : ''} depuis le début.`}
      </p>

      {st.n > 0 && (
        <div className="parole-carte">
          <p className="parole-kicker">1 · Temps de parole</p>
          <p className="parole-chiffre">
            <b>{duree(ceMois.sec)}</b>
            <span>en {MOIS_LONGS[ceMois.m]}</span>
          </p>
          <div className="parole-mois">
            {st.mois.map((m, i) => {
              const min = Math.round(m.sec / 60);
              return (
                <span key={`${m.a}-${m.m}`} className={i === 5 ? 'now' : ''}>
                  <small>{min > 0 ? min : ''}</small>
                  <i style={{ height: `${m.sec > 0 ? Math.max(6, (100 * Math.sqrt(m.sec)) / st.moisMax) : 2}%` }} />
                  <em>{MOIS_COURTS[m.m]}</em>
                </span>
              );
            })}
          </div>
          <p className="parole-note">En minutes, mois par mois.</p>
        </div>
      )}

      {st.n > 0 && !assez && (
        <p className="hint">
          Les fautes, les habitudes et l’aisance s’afficheront à partir de trois conversations.
        </p>
      )}

      {assez && (
        <div className="parole-carte">
          <p className="parole-kicker">2 · Fautes par 10 minutes</p>
          {dernier ? (
            <>
              <p className="parole-chiffre">
                <b>{virgule(dernier.v)}</b>
                {premier && premier !== dernier && (
                  <span className={dernier.v <= premier.v ? 'mieux' : ''}>
                    contre {virgule(premier.v)} il y a {8 - premier.i} semaine{8 - premier.i > 1 ? 's' : ''}
                  </span>
                )}
              </p>
              <svg className="parole-courbe" viewBox="0 0 320 90" aria-hidden="true">
                <line x1="0" y1="89" x2="320" y2="89" />
                {st.points.length > 1 && <polyline points={trace} />}
                {st.points.map((p) => (
                  <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={p === dernier ? 4 : 2.5}
                    className={p === dernier ? 'now' : ''} />
                ))}
              </svg>
              <div className="parole-axe"><span>il y a 8 sem.</span><span>semaine par semaine</span><span>cette sem.</span></div>
              <p className="parole-note">Le nombre de corrections ramené à 10 min. Plus la courbe descend, mieux c’est.</p>
            </>
          ) : (
            <p className="parole-note">Pas de conversation ces huit dernières semaines.</p>
          )}
        </div>
      )}

      {assez && (
        <div className="parole-carte">
          <p className="parole-kicker">3 · Tes fautes qui reviennent</p>
          {st.recurrentes.length === 0 ? (
            <p className="parole-note">Aucune faute répétée ces 30 derniers jours. Bravo.</p>
          ) : (
            <>
              <div className="parole-fautes">
                {st.recurrentes.map((c) => {
                  const k = cle(c.dit);
                  return (
                    <button key={k} onClick={() => setOuverte(ouverte === k ? null : k)}>
                      <span className="parole-faute">
                        <s>{c.dit}</s> → <i>{c.juste}</i>
                      </span>
                      <b>×{c.fois}</b>
                      {ouverte === k && c.pourquoi && <small>{c.pourquoi}</small>}
                    </button>
                  );
                })}
              </div>
              <p className="parole-note">Les corrections les plus fréquentes sur le dernier mois. Un appui ouvre l’explication.</p>
            </>
          )}
        </div>
      )}

      {assez && (
        <div className="parole-carte">
          <p className="parole-kicker">4 · Aisance</p>
          <p className="parole-chiffre">
            <b>{virgule(st.aisance)}</b>
            <span>répliques par minute</span>
          </p>
          <div className="parole-jauge" aria-hidden="true">
            <i className="rempli" style={{ width: pos(st.aisance) }} />
            <i className="depart" style={{ left: pos(st.aisanceDebut) }} />
            <i className="now" style={{ left: pos(st.aisance) }} />
          </div>
          <p className="parole-note">
            Au début : {virgule(st.aisanceDebut)}. Plus tu réponds vite, plus l’échange ressemble à une vraie conversation.
          </p>
        </div>
      )}
    </section>
  );
}
