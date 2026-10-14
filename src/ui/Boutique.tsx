/**
 * CHANTIER 268 — LA BOUTIQUE DES APPARENCES (Réglages › Apparence).
 *
 * Le solde de crédits, trois filtres, les apparences rangées par famille
 * avec une vignette et une ligne de description. Un appui ouvre la fiche :
 * description, et « Utiliser » ou « Échanger N crédits ». Remplace la
 * grille de boutons et le long paragraphe du chantier 168.
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
const FILTRES: { cle: Filtre; libelle: string }[] = [
  { cle: 'toutes', libelle: 'Toutes' }, { cle: 'moi', libelle: 'À moi' }, { cle: 'gagner', libelle: 'À gagner' },
];

const nb = (n: number) => n.toLocaleString('fr-FR');

/** 160 à 220 crédits par semaine : on compte 190, soit environ 27 par jour. */
function delai(manque: number): string {
  if (manque <= 190) { const j = Math.max(1, Math.ceil(manque / 27)); return `environ ${j} jour${j > 1 ? 's' : ''}`; }
  const s = Math.round((manque / 190) * 2) / 2;
  return `environ ${String(s).replace('.', ',')} semaines`;
}

function Vignette({ a, grande = false }: { a: Article; grande?: boolean }) {
  const style = {
    '--btq-fond': a.fond, '--btq-accent': a.accent, '--btq-encre': a.encre,
    '--btq-sur-accent': texteSur(a.accent), '--btq-police': a.police ? `${a.police}, var(--sans)` : 'var(--sans)',
  } as CSSProperties;
  return (
    <span className={`btq-vign${grande ? ' grande' : ''}`} style={style} aria-hidden="true">
      <b>Aujourd’hui</b>
      <i />
      {grande && <i className="court" />}
      <em>Réviser</em>
    </span>
  );
}

export function Boutique({ streak, onTheme }: { streak: Streak; onTheme?: (t: Theme) => void }) {
  const xpBrut = bilan(streak).xp;
  const [theme, setThemeLocal] = useState<Theme>(themeChoisi());
  const [filtre, setFiltre] = useState<Filtre>('toutes');
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

  const familles = FAMILLES.map((f) => ({
    ...f,
    articles: f.articles.filter((a) => filtre === 'toutes' || (filtre === 'moi' ? possede(a.id) : !possede(a.id))),
  })).filter((f) => f.articles.length);

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
          <Vignette a={a} grande />
          <div className="btq-fiche-tete">
            <h3>{THEME_LABELS[a.id]}</h3>
            <small>{NOM_PALIER[a.palier]}{prix ? ` · ${nb(prix)} crédits` : ''}</small>
          </div>
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

      <div className="btq-filtres" role="group" aria-label="Filtrer les apparences">
        {FILTRES.map((f) => (
          <button key={f.cle} className={filtre === f.cle ? 'on' : ''} aria-pressed={filtre === f.cle} onClick={() => setFiltre(f.cle)}>{f.libelle}</button>
        ))}
      </div>

      {familles.length === 0 && <p className="hint">{filtre === 'gagner' ? 'Tu as déjà toutes les apparences.' : 'Rien ici pour l’instant.'}</p>}

      {familles.map((f) => (
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
