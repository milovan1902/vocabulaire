/**
 * CHANTIER 268 — LA BOUTIQUE DES APPARENCES (Réglages › Apparence).
 *
 * Le solde de crédits, les filtres, les apparences rangées par famille
 * avec une vignette et une ligne de description. Un appui ouvre la fiche :
 * description, et « Utiliser » ou « Échanger N crédits ».
 *
 * CHANTIER 275 — chercher et voir avant d'acheter (maquette « Boutique des apparences », 5a) :
 *   — un champ de recherche (sans tenir compte des accents ni des majuscules) ;
 *   — les familles en pastilles qui défilent, avec leur nombre, combinées à « Toutes / À moi / À gagner » ;
 *   — des vignettes plus parlantes (l'éventail, le bouton, le palier) ;
 *   — dans la fiche, un aperçu en trois écrans (Aujourd'hui, Révision, Semaine), dessiné avec les
 *     couleurs et la police de l'apparence.
 *
 * CHANTIER 276 — l'aperçu montre le vrai décor : « Aujourd'hui » et « Révision » de l'apparence,
 * figés, avec des données inventées (Vitrine.tsx, page /vitrine).
 *
 * Pas d'achat en euros pour l'instant (Google Play n'est pas branché).
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { Streak } from '../engine/streak';
import { bilan } from '../engine/xp';
import type { Theme } from './theme';
import { THEME_LABELS, setTheme, themeChoisi } from './theme';
import { FAMILLES, NOM_PALIER, PRIX, texteSur, type Article } from './boutique';
import { acheter, credits, possede } from './apparences';
import './boutique.css';

type Filtre = 'toutes' | 'moi' | 'gagner';
type Vue = 'auj' | 'rev';
const FILTRES: { cle: Filtre; libelle: string }[] = [
  { cle: 'toutes', libelle: 'Toutes' }, { cle: 'moi', libelle: 'À moi' }, { cle: 'gagner', libelle: 'À gagner' },
];
const VUES: { cle: Vue; libelle: string }[] = [
  { cle: 'auj', libelle: 'Aujourd’hui' }, { cle: 'rev', libelle: 'Révision' },
];
const TOUTES = '';

const nb = (n: number) => n.toLocaleString('fr-FR');
const simple = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** 160 à 220 crédits par semaine : on compte 190, soit environ 27 par jour. */
function delai(manque: number): string {
  if (manque <= 190) { const j = Math.max(1, Math.ceil(manque / 27)); return `environ ${j} jour${j > 1 ? 's' : ''}`; }
  const s = Math.round((manque / 190) * 2) / 2;
  return `environ ${String(s).replace('.', ',')} semaines`;
}

/** Les couleurs de l'apparence, en variables pour la vignette et l'aperçu. */
function couleurs(a: Article): CSSProperties {
  return {
    '--btq-fond': a.fond, '--btq-accent': a.accent, '--btq-encre': a.encre,
    '--btq-sur-accent': texteSur(a.accent), '--btq-police': a.police ? `${a.police}, var(--sans)` : 'var(--sans)',
    /* Le fond des panneaux de l'aperçu : un voile clair sur une encre claire (fond sombre), sombre sinon. */
    '--btq-panneau': texteSur(a.encre) === '#111111' ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.7)',
  } as CSSProperties;
}

function Vignette({ a }: { a: Article }) {
  return (
    <span className="btq-vign" style={couleurs(a)} aria-hidden="true">
      <b>Aujourd’hui</b>
      <i className="ligne" />
      <span className="eventail"><i /><i className="centre" /><i /></span>
      <em>Réviser</em>
      <small className="palier">{NOM_PALIER[a.palier]}</small>
    </span>
  );
}

/**
 * CHANTIER 276 — l'aperçu de la fiche : la vraie page « Aujourd'hui » ou « Révision » de
 * l'apparence (/vitrine, Vitrine.tsx), figée, avec des données inventées, affichée en réduction
 * dans un cadre. Un cadre par écran, chargé à la demande ; les couleurs de l'apparence en attendant.
 */
function Apercu({ a }: { a: Article }) {
  const [vue, setVue] = useState<Vue>('auj');
  const [pret, setPret] = useState<Record<string, boolean>>({});
  const cle = `${a.id}-${vue}`;
  const src = `/vitrine?apparence=${encodeURIComponent(a.id)}&ecran=${vue === 'rev' ? 'revision' : 'aujourdhui'}`;
  return (
    <div className="btq-apercu">
      <div className="btq-vues" role="tablist" aria-label="Aperçu">
        {VUES.map((v) => (
          <button key={v.cle} role="tab" aria-selected={vue === v.cle} className={vue === v.cle ? 'on' : ''} onClick={() => setVue(v.cle)}>{v.libelle}</button>
        ))}
      </div>
      <div className="btq-ecran" style={couleurs(a)}>
        <iframe
          key={cle}
          src={src}
          title={`Aperçu de ${THEME_LABELS[a.id]}`}
          tabIndex={-1}
          aria-hidden="true"
          loading="eager"
          className={pret[cle] ? 'pret' : ''}
          onLoad={() => window.setTimeout(() => setPret((p) => ({ ...p, [cle]: true })), 450)}
        />
        {!pret[cle] && <span className="btq-attente" aria-hidden="true">Aperçu…</span>}
      </div>
    </div>
  );
}

export function Boutique({ streak, onTheme }: { streak: Streak; onTheme?: (t: Theme) => void }) {
  const xpBrut = bilan(streak).xp;
  const [theme, setThemeLocal] = useState<Theme>(themeChoisi());
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [famille, setFamille] = useState<string>(TOUTES);
  const [recherche, setRecherche] = useState('');
  const [ouverte, setOuverte] = useState<Article | null>(null);
  const [aide, setAide] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [, setTic] = useState(0);
  const solde = credits(xpBrut);

  useEffect(() => {
    if (!ouverte) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuverte(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [ouverte]);

  function utiliser(t: Theme) {
    setTheme(t);
    setThemeLocal(t);
    onTheme?.(t);
  }

  function echanger(a: Article) {
    if (!acheter(a.id, xpBrut)) return;
    utiliser(a.id);
    setTic((n) => n + 1);
    setOuverte(null);
    setMessage(`« ${THEME_LABELS[a.id]} » est à toi, pour ${nb(PRIX[a.palier])} crédits.`);
  }

  /* La recherche et « À moi / À gagner » d'abord : les pastilles comptent ce qui reste. */
  const q = simple(recherche.trim());
  const garde = (a: Article) =>
    (filtre === 'toutes' || (filtre === 'moi' ? possede(a.id) : !possede(a.id)))
    && (!q || simple(`${THEME_LABELS[a.id]} ${a.court}`).includes(q));
  const parFamille = FAMILLES.map((f) => ({ ...f, articles: f.articles.filter(garde) }));
  const totalTout = parFamille.reduce((n, f) => n + f.articles.length, 0);
  const visibles = parFamille.filter((f) => f.articles.length && (famille === TOUTES || f.nom === famille));
  const nbVisibles = visibles.reduce((n, f) => n + f.articles.length, 0);

  const fiche = ouverte && (() => {
    const a = ouverte;
    const prix = PRIX[a.palier];
    const aMoi = possede(a.id);
    const enCours = theme === a.id;
    return (
      <>
        <div className="btq-voile" onClick={() => setOuverte(null)} />
        <div className="btq-fiche" role="dialog" aria-modal="true" aria-label={THEME_LABELS[a.id]}>
          <span className="btq-poignee" aria-hidden="true" />
          <div className="btq-fiche-tete">
            <h3>{THEME_LABELS[a.id]}</h3>
            <small>{NOM_PALIER[a.palier]}{prix ? ` · ${nb(prix)} crédits` : ''}</small>
          </div>
          <Apercu key={a.id} a={a} />
          <p className="btq-fiche-txt">{a.long}</p>
          {enCours && <span className="btq-etat">Apparence en cours</span>}
          {!enCours && aMoi && (
            <button className="btq-principal" onClick={() => { utiliser(a.id); setOuverte(null); setMessage(null); }}>Utiliser</button>
          )}
          {!aMoi && solde >= prix && (
            <button className="btq-principal" onClick={() => echanger(a)}>Échanger {nb(prix)} crédits</button>
          )}
          {!aMoi && solde < prix && (
            <div className="btq-manque">
              <span className="btq-etat">{nb(prix)} crédits</span>
              <small>Il t’en manque {nb(prix - solde)} · {delai(prix - solde)}</small>
            </div>
          )}
          <button className="btq-fermer" onClick={() => setOuverte(null)}>Fermer</button>
        </div>
      </>
    );
  })();

  return (
    <div className="btq">
      <div className="btq-solde">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" />
        </svg>
        <span className="btq-solde-txt">
          <b>{nb(solde)} <small>crédits</small></b>
          <small>1 XP gagné = 1 crédit</small>
        </span>
        <button className="btq-lien" aria-expanded={aide} onClick={() => setAide((v) => !v)}>{aide ? 'Fermer' : 'Comment en gagner ?'}</button>
        {aide && (
          <ul className="btq-aide">
            <li>20 crédits par jour validé (20 cartes), 30 le week-end.</li>
            <li>Semaine à 5 / 5 : bonus le vendredi, +20, +40 puis +60.</li>
            <li>Tes crédits ne se perdent jamais.</li>
          </ul>
        )}
      </div>

      {message && <p className="btq-message" role="status">{message}</p>}

      <label className="btq-cherche">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher une apparence" aria-label="Chercher une apparence" />
        {recherche && <button className="btq-efface" aria-label="Effacer la recherche" onClick={() => setRecherche('')}>×</button>}
      </label>

      <div className="btq-familles" role="group" aria-label="Familles d’apparences">
        <button className={famille === TOUTES ? 'on' : ''} aria-pressed={famille === TOUTES} onClick={() => setFamille(TOUTES)}>Toutes <small>{totalTout}</small></button>
        {parFamille.map((f) => (
          <button key={f.nom} className={famille === f.nom ? 'on' : ''} aria-pressed={famille === f.nom} onClick={() => setFamille(f.nom)}>{f.nom} <small>{f.articles.length}</small></button>
        ))}
      </div>

      <div className="btq-ligne-filtres">
        <div className="btq-filtres" role="group" aria-label="Filtrer les apparences">
          {FILTRES.map((f) => (
            <button key={f.cle} className={filtre === f.cle ? 'on' : ''} aria-pressed={filtre === f.cle} onClick={() => setFiltre(f.cle)}>{f.libelle}</button>
          ))}
        </div>
        <small className="btq-compte">{nbVisibles} apparence{nbVisibles > 1 ? 's' : ''}</small>
      </div>

      {nbVisibles === 0 && (
        <p className="hint">{q ? 'Aucune apparence ne correspond.' : filtre === 'gagner' ? 'Tu as déjà toutes les apparences.' : 'Rien ici pour l’instant.'}</p>
      )}

      {visibles.map((f) => (
        <section key={f.nom} className="btq-famille">
          <h3>{f.nom}{f.articles[0].palier === 'libre' && <small>gratuites</small>}</h3>
          <div className="btq-grille">
            {f.articles.map((a) => {
              const aMoi = possede(a.id);
              const enCours = theme === a.id;
              const prix = PRIX[a.palier];
              return (
                <button key={a.id} className={`btq-carte${enCours ? ' on' : ''}`} aria-pressed={enCours} onClick={() => { setMessage(null); setOuverte(a); }}>
                  <Vignette a={a} />
                  <span className="btq-carte-txt">
                    <b>{THEME_LABELS[a.id]}</b>
                    <small>{a.court}</small>
                    {enCours
                      ? <em className="encours">● En cours</em>
                      : aMoi
                        ? <em className="amoi">✓ À toi</em>
                        : <em className={solde >= prix ? 'prix assez' : 'prix'}>{nb(prix)} crédits</em>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {fiche && createPortal(fiche, document.body)}
    </div>
  );
}
