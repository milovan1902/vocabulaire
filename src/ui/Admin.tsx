/**
 * CHANTIER 266 — LE TABLEAU DE BORD, marlotin.com/admin
 *
 * Une page à part, chargée seulement à cette adresse (voir main.tsx) : elle
 * ne monte ni l'application, ni les fonds animés. Les chiffres viennent de
 * `/api/admin`, qui refuse tout compte autre que celui de l'exploitant.
 *
 * Installations, actifs, retour et parcours : appareils anonymes
 * (`app_mesure`). Temps de parole et coût IA : comptes connectés
 * (`parler_usage`). Les filtres Jour / Semaine / Mois reprennent ceux de
 * « Mon évolution » (MesMots.tsx).
 *
 * CHANTIER 267 — Coût IA : une fois le grain choisi, on choisit LA période
 * (flèches ‹ › ou pastilles). Courbes marquées, montants, écart avec la
 * période d'avant et tableau « Par formule » suivent la période choisie.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { signInWithGoogle, signOut, supabase, type Session } from '../data/supabase';
import './admin.css';

type Grain = 'day' | 'week' | 'month';
type Periode = 7 | 30 | 90;

interface Point {
  debut: string; comptes: number; secondes: number; centimes: number;
  comptes_ab: number; secondes_ab: number; centimes_ab: number;
}
interface Kpi {
  installations: number; installations_avant: number; actifs: number;
  retour_cohorte: number; retour_revenus: number;
  entonnoir: { installation: number; onboarding: number; onboarding_fini: number; revision: number; compte: number };
}
interface Donnees {
  email: string; maj: string; prixAbonnement: number; plafondMois: number; nAbonnes: number;
  kpi: Record<string, Kpi>;
  actifs: { jour: string; n: number }[];
  parler: Partial<Record<Grain, Point[]>>;
  tranches: { t1: number; t2: number; t3: number; t4: number };
  plafondAtteint: number;
}
type Etat =
  | { t: 'chargement' }
  | { t: 'deconnecte' }
  | { t: 'refuse'; email: string | null }
  | { t: 'erreur'; message: string }
  | { t: 'ok'; d: Donnees };

const GRAINS: { cle: Grain; libelle: string }[] = [
  { cle: 'day', libelle: 'Jour' }, { cle: 'week', libelle: 'Semaine' }, { cle: 'month', libelle: 'Mois' },
];
const PERIODES: { cle: Periode; libelle: string }[] = [
  { cle: 7, libelle: '7 j' }, { cle: 30, libelle: '30 j' }, { cle: 90, libelle: '90 j' },
];
const N: Record<Grain, number> = { day: 30, week: 12, month: 6 };
const PAR: Record<Grain, string> = { day: 'par jour', week: 'par semaine', month: 'par mois' };
const PERIODE_EN_COURS: Record<Grain, string> = { day: 'aujourd’hui', week: 'cette semaine', month: 'ce mois-ci' };
/** Part d'un mois que représente une période : sert à ramener le prix de l'abonnement. */
const PART_MOIS: Record<Grain, number> = { day: 1 / 30, week: 7 / 30, month: 1 };
/** Au-delà, l'IA mange trop de l'abonnement : le chiffre passe en orange. */
const SEUIL_PART = 40;
const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const nb = (n: number, d = 0) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const eur = (n: number) => `${nb(n, 2)} €`;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const div = (a: number, b: number) => (b > 0 ? a / b : 0);

/** Les débuts des n dernières périodes, en UTC, comme `date_trunc` côté base (semaine = lundi). */
function debuts(g: Grain, n: number): string[] {
  const t = new Date();
  t.setUTCHours(0, 0, 0, 0);
  if (g === 'week') t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  if (g === 'month') t.setUTCDate(1);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(t);
    if (g === 'day') d.setUTCDate(d.getUTCDate() - i);
    else if (g === 'week') d.setUTCDate(d.getUTCDate() - 7 * i);
    else d.setUTCMonth(d.getUTCMonth() - i);
    out.push(iso(d));
  }
  return out;
}

function libelle(debut: string, g: Grain): string {
  const [, m, j] = debut.split('-').map(Number);
  return g === 'month' ? MOIS[m - 1] : `${j} ${MOIS[m - 1]}`;
}

/** Numéro de semaine ISO (lundi → dimanche) d'un lundi au format AAAA-MM-JJ. */
function numSemaine(debut: string): number {
  const d = new Date(`${debut}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3);
  const an = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round((d.getTime() - an.getTime()) / 864e5 / 7 - ((an.getUTCDay() + 6) % 7) / 7 + 3 / 7);
}

/** Libellés d'une période choisie : pastille courte, titre long, fin de phrase. */
function nomPeriode(debut: string, g: Grain): { court: string; long: string; bas: string } {
  const [a, m, j] = debut.split('-').map(Number);
  if (g === 'month') return { court: MOIS[m - 1], long: `${MOIS_LONG[m - 1]} ${a}`, bas: `en ${MOIS_LONG[m - 1]}` };
  if (g === 'week') {
    const n = numSemaine(debut);
    const fin = new Date(`${debut}T00:00:00Z`);
    fin.setUTCDate(fin.getUTCDate() + 6);
    return { court: `S${n}`, long: `Semaine ${n} · ${j} ${MOIS[m - 1]} – ${fin.getUTCDate()} ${MOIS[fin.getUTCMonth()]}`, bas: `semaine ${n}` };
  }
  const jour = JOURS[new Date(`${debut}T00:00:00Z`).getUTCDay()];
  return { court: `${j} ${MOIS[m - 1]}`, long: `${jour} ${j} ${MOIS[m - 1]} ${a}`, bas: `le ${j} ${MOIS[m - 1]}` };
}

/** « +12 % vs sept. » (ou en points) ; vide s'il n'y a pas de période d'avant comparable. */
function ecart(v: number[], i: number, avant: string, points = false): string {
  if (i < 1) return '';
  const a = v[i - 1], b = v[i];
  if (!points && a <= 0) return '';
  const r = Math.round(points ? b - a : (100 * (b - a)) / a);
  return `${r > 0 ? '+' : r < 0 ? '−' : '±'}${nb(Math.abs(r))} ${points ? 'pt' : '%'} vs ${avant}`;
}

/** Le choix de LA période : ‹ libellé › + pastilles défilantes. */
function ChoixPeriode({ debutsP, g, sel, onChange }: {
  debutsP: string[]; g: Grain; sel: number; onChange: (i: number) => void;
}) {
  const bande = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bande.current;
    const a = el?.querySelector<HTMLElement>('button.on');
    if (el && a) el.scrollLeft = a.offsetLeft - el.offsetLeft - el.clientWidth / 2 + a.offsetWidth / 2;
  }, [g, sel]);
  const der = debutsP.length - 1;
  return (
    <div className="adm-periode">
      <div className="adm-periode-ligne">
        <div className="adm-pas">
          <button aria-label="Période précédente" disabled={sel <= 0} onClick={() => onChange(sel - 1)}>‹</button>
          <span aria-live="polite">{nomPeriode(debutsP[sel], g).long}</span>
          <button aria-label="Période suivante" disabled={sel >= der} onClick={() => onChange(sel + 1)}>›</button>
        </div>
        {sel === der
          ? <span className="adm-encours">en cours</span>
          : <button className="adm-lien" onClick={() => onChange(der)}>Revenir à {PERIODE_EN_COURS[g]}</button>}
      </div>
      <div className="adm-puces" ref={bande}>
        {debutsP.map((dp, i) => (
          <button key={dp} className={i === sel ? 'on' : ''} aria-pressed={i === sel} onClick={() => onChange(i)}>
            {nomPeriode(dp, g).court}
          </button>
        ))}
      </div>
    </div>
  );
}

/** La série complète : une période sans conversation vaut zéro, elle ne disparaît pas. */
function serie(points: Point[] | undefined, g: Grain): Point[] {
  const par = new Map((points ?? []).map((p) => [p.debut, p]));
  return debuts(g, N[g]).map((debut) => {
    const p = par.get(debut);
    return {
      debut,
      comptes: Number(p?.comptes ?? 0), secondes: Number(p?.secondes ?? 0), centimes: Number(p?.centimes ?? 0),
      comptes_ab: Number(p?.comptes_ab ?? 0), secondes_ab: Number(p?.secondes_ab ?? 0), centimes_ab: Number(p?.centimes_ab ?? 0),
    };
  });
}

function Choix<T extends string | number>({ options, valeur, onChange }: {
  options: { cle: T; libelle: string }[]; valeur: T; onChange: (v: T) => void;
}) {
  return (
    <div className="adm-choix">
      {options.map((o) => (
        <button key={String(o.cle)} className={o.cle === valeur ? 'on' : ''} aria-pressed={o.cle === valeur} onClick={() => onChange(o.cle)}>
          {o.libelle}
        </button>
      ))}
    </div>
  );
}

function Courbe({ titre, valeurs, libelles, fin, note, seuil, ton, sel, ecartTxt }: {
  titre: string; valeurs: number[]; libelles: string[]; fin: string; note?: string; seuil?: number; ton?: 'alerte' | 'bon';
  sel?: number; ecartTxt?: string;
}) {
  const max = Math.max(1e-9, ...valeurs, seuil ?? 0) * 1.1;
  const x = (i: number) => (valeurs.length > 1 ? (320 * i) / (valeurs.length - 1) : 160);
  const y = (v: number) => 96 - (88 * v) / max;
  const d = valeurs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const indices = libelles.length <= 4
    ? libelles.map((_, i) => i)
    : [0, 1, 2, 3].map((k) => Math.round((k * (libelles.length - 1)) / 3));
  return (
    <div className="adm-courbe">
      <div className="adm-courbe-tete"><span>{titre}</span><b className={ton ?? ''}>{fin}</b></div>
      {ecartTxt !== undefined && <small className="adm-ecart">{ecartTxt}</small>}
      <div className="adm-trace">
        <svg viewBox="0 0 320 100" preserveAspectRatio="none" aria-hidden="true">
          {seuil !== undefined && (
            <path className="seuil" d={`M0 ${y(seuil).toFixed(1)} L320 ${y(seuil).toFixed(1)}`} vectorEffect="non-scaling-stroke" />
          )}
          <path className="aire" d={`${d} L320 100 L0 100 Z`} />
          {sel !== undefined && (
            <path className="repere" d={`M${x(sel).toFixed(1)} 0 L${x(sel).toFixed(1)} 100`} vectorEffect="non-scaling-stroke" />
          )}
          <path className="trait" d={d} vectorEffect="non-scaling-stroke" />
        </svg>
        {sel !== undefined && (
          <i className="adm-point" style={{ left: `${(100 * x(sel)) / 320}%`, top: `${y(valeurs[sel])}%` }} />
        )}
      </div>
      <div className="adm-axe">{indices.map((i) => <small key={i}>{libelles[i]}</small>)}</div>
      {note && <p className="adm-note">{note}</p>}
    </div>
  );
}

function Tableau({ d }: { d: Donnees }) {
  const [periode, setPeriode] = useState<Periode>(30);
  const [grainParole, setGrainParole] = useState<Grain>('week');
  const [grainIA, setGrainIA] = useState<Grain>('month');
  /** Période choisie par grain (indice dans la série ; le dernier = en cours). Gardée quand on change de grain. */
  const [selIA, setSelIA] = useState<Record<Grain, number>>({ day: N.day - 1, week: N.week - 1, month: N.month - 1 });

  const k = d.kpi[String(periode)];
  const mois = serie(d.parler.month, 'month');
  const ceMois = mois[mois.length - 1];

  const diff = k.installations - k.installations_avant;
  const retour = k.retour_cohorte > 0 ? `${Math.round((100 * k.retour_revenus) / k.retour_cohorte)} %` : '—';

  const parJour = new Map(d.actifs.map((a) => [a.jour, Number(a.n)]));
  const jours = debuts('day', periode).map((j) => parJour.get(j) ?? 0);
  const maxJour = Math.max(1, ...jours);

  const e = k.entonnoir;
  const etapes: [string, number][] = [
    ['Installation', e.installation], ['Accueil commencé', e.onboarding], ['Accueil terminé', e.onboarding_fini],
    ['Première révision', e.revision], ['Compte créé', e.compte],
  ];

  const sP = serie(d.parler[grainParole], grainParole);
  const libP = sP.map((p) => libelle(p.debut, grainParole));
  const moy = sP.map((p) => div(p.secondes / 60, p.comptes));
  const tot = sP.map((p) => p.secondes / 60);

  const sI = serie(d.parler[grainIA], grainIA);
  const libI = sI.map((p) => libelle(p.debut, grainIA));
  const charges = sI.map((p) => p.centimes / 100);
  const prixPeriode = d.prixAbonnement * PART_MOIS[grainIA];
  const part = sI.map((p) => div(100 * div(p.centimes_ab / 100, d.nAbonnes), prixPeriode));
  const sel = Math.min(sI.length - 1, Math.max(0, selIA[grainIA]));
  const choisir = (i: number) => setSelIA((s) => ({ ...s, [grainIA]: Math.min(sI.length - 1, Math.max(0, i)) }));
  const debutsI = sI.map((p) => p.debut);
  const nomSel = nomPeriode(debutsI[sel], grainIA);
  const avant = sel > 0 ? nomPeriode(debutsI[sel - 1], grainIA).court : '';
  const partSel = part[sel];
  const der = sI[sel];
  const gratuits = der.comptes - der.comptes_ab;

  const t = d.tranches;
  const tranches: [string, number, boolean][] = [
    ['< 0,50 €', t.t1, false], ['0,50 – 1,50 €', t.t2, false], ['1,50 – 3 €', t.t3, false], ['> 3 €', t.t4, true],
  ];
  const maxTr = Math.max(1, ...tranches.map((x) => x[1]));

  const maj = new Date(d.maj).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="adm-page">
      <header className="adm-tete">
        <div>
          <a className="adm-retour" href="/">← Retour à l’application</a>
          <h1>Tableau de bord</h1>
          <p className="adm-sous">{d.email} · données au {maj} · <button className="adm-lien" onClick={() => window.location.reload()}>actualiser</button></p>
        </div>
        <Choix options={PERIODES} valeur={periode} onChange={setPeriode} />
      </header>

      <section className="adm-kpis">
        <div className="adm-kpi"><span>Installations</span><b>{nb(k.installations)}</b>
          <small className={diff > 0 ? 'plus' : ''}>{diff >= 0 ? '+' : ''}{nb(diff)} vs période précédente</small></div>
        <div className="adm-kpi"><span>Actifs ({periode} j)</span><b>{nb(k.actifs)}</b><small>appareils ouverts au moins 1 fois</small></div>
        <div className="adm-kpi"><span>Retour à J+7</span><b>{retour}</b><small>sur {nb(k.retour_cohorte)} installation{k.retour_cohorte > 1 ? 's' : ''}</small></div>
        <div className="adm-kpi"><span>Parler · min / compte</span><b>{nb(div(ceMois.secondes / 60, ceMois.comptes), 1)}</b><small>ce mois-ci</small></div>
        <div className="adm-kpi"><span>Coût IA du mois</span><b>{eur(ceMois.centimes / 100)}</b><small>plafond : {nb(d.plafondMois)} €</small></div>
        <div className="adm-kpi eteint"><span>Ventes du mois</span><b>—</b><small>après immatriculation</small></div>
      </section>

      <section className="adm-deux">
        <div className="adm-bloc">
          <div className="adm-bloc-tete"><h2>Appareils actifs par jour</h2><span className="adm-label">{periode} derniers jours</span></div>
          <div>
            <div className="adm-barres" aria-hidden="true">
              {jours.map((v, i) => <i key={i} title={`${v} appareil${v > 1 ? 's' : ''}`} style={{ height: `${Math.max(4, Math.round((100 * v) / maxJour))}%` }} />)}
            </div>
            <div className="adm-axe"><small>il y a {periode} j</small><small>aujourd’hui</small></div>
          </div>
        </div>
        <div className="adm-bloc">
          <h2>Parcours des nouveaux élèves</h2>
          <div className="adm-etapes">
            {etapes.map(([nom, n]) => {
              const pct = Math.round(div(100 * n, e.installation));
              return (
                <div key={nom} className="adm-etape">
                  <div><span>{nom}</span><span>{nb(n)} · {pct} %</span></div>
                  <div className="adm-jauge"><i style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="adm-bloc">
        <div className="adm-bloc-tete"><h2>Temps de parole</h2><Choix options={GRAINS} valeur={grainParole} onChange={setGrainParole} /></div>
        <div className="adm-deux">
          <Courbe titre={`Minutes par compte actif, ${PAR[grainParole]}`} valeurs={moy} libelles={libP}
            fin={`${nb(moy[moy.length - 1], 1)} min`} note="Moyenne sur les comptes qui ont parlé au moins une fois dans la période." />
          <Courbe titre={`Minutes totales, ${PAR[grainParole]}`} valeurs={tot} libelles={libP}
            fin={`${nb(tot[tot.length - 1])} min`} note="Tous comptes confondus, gratuits et abonnés." />
        </div>
      </section>

      <section className="adm-bloc">
        <div className="adm-bloc-tete"><h2>Coût IA</h2><Choix options={GRAINS} valeur={grainIA} onChange={setGrainIA} /></div>
        <ChoixPeriode debutsP={debutsI} g={grainIA} sel={sel} onChange={choisir} />
        <div className="adm-deux">
          <Courbe titre={`Charges IA totales, ${PAR[grainIA]}`} valeurs={charges} libelles={libI}
            fin={eur(charges[sel])} sel={sel} ecartTxt={ecart(charges, sel, avant)} note="Abonnés et gratuits. Facture de l’IA, hors Cloudflare et Supabase." />
          <Courbe titre="Coût par abonné, en % de l’abonnement" valeurs={part} libelles={libI} seuil={SEUIL_PART}
            fin={d.nAbonnes ? `${Math.round(partSel)} %` : '—'} ton={partSel > SEUIL_PART ? 'alerte' : 'bon'}
            sel={sel} ecartTxt={d.nAbonnes ? ecart(part, sel, avant, true) : ''}
            note={`Abonnement à ${eur(d.prixAbonnement)} / mois, ramené à la période. Pointillés : seuil d’alerte de ${SEUIL_PART} %.`} />
        </div>
        <div className="adm-deux">
          <div className="adm-table">
            <span className="adm-label">Par formule · {sel === sI.length - 1 ? PERIODE_EN_COURS[grainIA] : nomSel.bas}</span>
            <div className="adm-ligne titres"><span>Formule</span><span>Comptes</span><span>Min moy.</span><span>Coût moy.</span></div>
            <div className="adm-ligne">
              <span>Abonnés · 10 min/jour<small>total {eur(der.centimes_ab / 100)}</small></span>
              <span>{nb(d.nAbonnes)}</span><span>{nb(div(der.secondes_ab / 60, d.nAbonnes), 1)}</span><span>{eur(div(der.centimes_ab / 100, d.nAbonnes))}</span>
            </div>
            <div className="adm-ligne">
              <span>Gratuit · 5 min/sem.<small>total {eur((der.centimes - der.centimes_ab) / 100)} · comptes actifs</small></span>
              <span>{nb(gratuits)}</span><span>{nb(div((der.secondes - der.secondes_ab) / 60, gratuits), 1)}</span><span>{eur(div((der.centimes - der.centimes_ab) / 100, gratuits))}</span>
            </div>
          </div>
          <div className="adm-bloc" style={{ gap: 8 }}>
            <span className="adm-label">Abonnés par coût · ce mois-ci</span>
            {tranches.map(([nom, n, haut]) => (
              <div key={nom} className="adm-tranche">
                <span>{nom}</span>
                <div className="adm-jauge"><i className={haut ? 'alerte' : ''} style={{ width: `${Math.round((100 * n) / maxTr)}%` }} /></div>
                <span>{nb(n)}</span>
              </div>
            ))}
            <p className="adm-note">{nb(d.plafondAtteint)} abonné{d.plafondAtteint > 1 ? 's ont' : ' a'} atteint le plafond de 10 min/jour ce mois-ci.</p>
          </div>
        </div>
      </section>

      <section className="adm-bloc">
        <h2>Ventes</h2>
        <div className="adm-vide">
          <span>Pas encore de ventes.</span>
          <span>Apparaîtront ici après l’immatriculation et l’ouverture des abonnements Google Play.</span>
        </div>
      </section>

      <p className="adm-note">Installations, actifs et parcours : appareils anonymes. Temps de parole et coût IA : comptes connectés. « Abonnés » = comptes à 10 min/jour (PARLER_ILLIMITE) tant que les abonnements ne sont pas branchés.</p>
    </div>
  );
}

export default function Admin() {
  const [etat, setEtat] = useState<Etat>({ t: 'chargement' });

  const charge = useCallback(async (session: Session | null) => {
    if (!session) { setEtat({ t: 'deconnecte' }); return; }
    try {
      const r = await fetch('/api/admin', { headers: { authorization: `Bearer ${session.access_token}` }, cache: 'no-store' });
      if (r.status === 401) { setEtat({ t: 'deconnecte' }); return; }
      if (r.status === 403) {
        const b = (await r.json().catch(() => ({}))) as { email?: string };
        setEtat({ t: 'refuse', email: b.email ?? session.user.email ?? null });
        return;
      }
      if (!r.ok) {
        const b = (await r.json().catch(() => ({}))) as { erreur?: string };
        throw new Error(b.erreur ?? `erreur ${r.status}`);
      }
      setEtat({ t: 'ok', d: (await r.json()) as Donnees });
    } catch (err) {
      setEtat({ t: 'erreur', message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => {
    document.title = 'Tableau de bord — Neuro Anglais';
    void supabase.auth.getSession().then(({ data }) => charge(data.session));
    const { data } = supabase.auth.onAuthStateChange((evt, s) => {
      if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') void charge(s);
    });
    return () => data.subscription.unsubscribe();
  }, [charge]);

  if (etat.t === 'ok') return <main className="adm"><Tableau d={etat.d} /></main>;

  return (
    <main className="adm">
      <div className="adm-centre">
        <h1>Tableau de bord</h1>
        {etat.t === 'chargement' && <p className="adm-sous">Chargement…</p>}
        {etat.t === 'deconnecte' && (
          <>
            <p className="adm-sous">Réservé à l’exploitant. Connecte-toi avec contact@marlotin.com.</p>
            <button className="adm-bouton" onClick={() => void signInWithGoogle()}>Se connecter avec Google</button>
          </>
        )}
        {etat.t === 'refuse' && (
          <>
            <p className="adm-sous">Accès réservé. Tu es connecté avec {etat.email ?? 'un autre compte'}.</p>
            <button className="adm-bouton" onClick={() => void signOut()}>Changer de compte</button>
          </>
        )}
        {etat.t === 'erreur' && (
          <>
            <p className="adm-sous">{etat.message}</p>
            <button className="adm-bouton" onClick={() => window.location.reload()}>Réessayer</button>
          </>
        )}
        <a className="adm-retour" href="/">← Retour à l’application</a>
      </div>
    </main>
  );
}
