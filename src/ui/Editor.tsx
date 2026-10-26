/**
 * Création d'un paquet, ou ajout de mots à un paquet existant.
 *
 * CHANTIER 283 — l'écran de la maquette « Créer mon paquet » :
 *   1. le contrôle à préparer, et sa date (création seulement — 285) ;
 *   2. le nom (création seulement) ;
 *   3. les mots, « À la main » un par un (Entrée = Suivant, écoute de la
 *      prononciation) ou « En photo » (recadrage, lecture par l'IA).
 * Les mots lus sur une photo arrivent dans « Déjà dans le paquet », où
 * chacun se corrige d'un appui ou se retire.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Card, Deck } from '../domain/types';
import { repository } from '../data/repository';
import { ErreurPhoto, etatPhoto, type EtatPhoto } from '../data/photoListe';
import { PhotoListe } from './PhotoListe';
import { DeckVign } from './components';
import { PAPIERS_PERSO, PAPIER_DEFAUT } from './papierPerso';
import { speak } from './speech';
import { isoLocal, joursAvant, jourPlus, joursDePassage, type DeckControle } from '../engine/controle';

const RACCOURCIS = [3, 5, 7, 10, 14];
const jourCourt = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const jourLong = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export interface ParsedLine { en: string; fr: string; }

/**
 * Analyse une liste collée. Accepte virgule, point-virgule, tabulation
 * ou barre verticale — un copier-coller de tableur passe tel quel.
 */
export function parseWordList(text: string): { rows: ParsedLine[]; badLines: number[] } {
  const rows: ParsedLine[] = [];
  const badLines: number[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(/\t|;|,|\s\|\s|\|/);
    const en = parts[0]?.trim() ?? '';
    const fr = parts.slice(1).map((p) => p.trim()).filter(Boolean).join(', ');
    if (!en || !fr) { badLines.push(i + 1); return; }
    rows.push({ en, fr });
  });
  return { rows, badLines };
}

const MIN_MOTS = 4;
const THEME = 'Général';
const cle = (s: string) => s.trim().toLowerCase();

export function Editor({
  mode, deck, existingCards, onCancel, onSaved,
}: {
  mode: 'create' | 'append';
  deck?: Deck;
  existingCards?: Card[];
  onCancel: () => void;
  onSaved: (deckId: string) => void;
}) {
  const [etape, setEtape] = useState<'controle' | 'nom' | 'mots'>(mode === 'create' ? 'controle' : 'mots');
  /* 285 — null = pas encore répondu ; la date au format AAAA-MM-JJ. */
  const [aControle, setAControle] = useState<boolean | null>(null);
  const [dateControle, setDateControle] = useState(isoLocal(jourPlus(7)));
  const [name, setName] = useState('');
  /* 286 — la couleur du dos. */
  const [papier, setPapier] = useState<string>(PAPIER_DEFAUT);
  const [saisie, setSaisie] = useState<'main' | 'photo'>('main');
  const [en, setEn] = useState('');
  const [fr, setFr] = useState('');
  const [mots, setMots] = useState<ParsedLine[]>([]);
  const [doublon, setDoublon] = useState('');
  const [lus, setLus] = useState(0);
  const [error, setError] = useState('');
  const [enCours, setEnCours] = useState(false);

  /* Le compteur de photos est lu ici : l'onglet « En photo » l'affiche. */
  const [etat, setEtat] = useState<EtatPhoto | null>(null);
  const [photoFermee, setPhotoFermee] = useState<'compte' | 'ferme' | null>(null);
  const [photoPanne, setPhotoPanne] = useState('');

  const refEn = useRef<HTMLInputElement>(null);
  const refFr = useRef<HTMLInputElement>(null);

  useEffect(() => {
    etatPhoto().then(setEtat).catch((e) => {
      if (e instanceof ErreurPhoto && (e.code === 'compte' || e.code === 'ferme')) setPhotoFermee(e.code);
      else setPhotoPanne(e instanceof Error ? e.message : String(e));
    });
  }, []);

  const deja = new Set([...(existingCards ?? []).map((c) => cle(c.en)), ...mots.map((m) => cle(m.en))]);
  const n = mots.length;
  const minimum = mode === 'create' ? MIN_MOTS : 1;
  const pret = n >= minimum;

  function suivant() {
    const e = en.trim(), f = fr.trim();
    if (!e) { refEn.current?.focus(); return; }
    if (!f) { refFr.current?.focus(); return; }
    if (deja.has(cle(e))) { setDoublon(e); return; }
    setMots((m) => [...m, { en: e, fr: f }]);
    setEn(''); setFr(''); setDoublon(''); setError('');
    refEn.current?.focus();
  }

  function ajouteLus(lusPhoto: ParsedLine[]) {
    const neufs = lusPhoto.filter((m) => !deja.has(cle(m.en)));
    setMots((m) => [...m, ...neufs]);
    setLus(neufs.length);
    setSaisie('main');
  }

  function corrige(i: number) {
    const m = mots[i];
    setMots((l) => l.filter((_, j) => j !== i));
    setEn(m.en); setFr(m.fr); setDoublon('');
    setSaisie('main');
    refEn.current?.focus();
  }

  async function save() {
    if (!pret || enCours) return;
    setEnCours(true);
    try {
      if (mode === 'create') {
        const id = `d${Date.now().toString(36)}`;
        const cards: Card[] = mots.map((r) => ({
          id: `${id}:${r.en.toLowerCase().replace(/\s+/g, '-')}`,
          en: r.en, fr: r.fr, theme: THEME,
        }));
        const decks = await repository.listDecks();
        const fiche: DeckControle = {
          id, name: name.trim(), builtin: false, hasImage: false,
          createdAt: Date.now(), updatedAt: Date.now(),
          controle: aControle ? dateControle : null,
          papier,
        };
        decks.push(fiche);
        await repository.saveDecks(decks);
        await repository.saveCards(id, cards);
        onSaved(id);
        return;
      }
      const target = deck!;
      const theme = existingCards?.[0]?.theme ?? THEME;
      const fresh: Card[] = mots.map((r) => ({
        id: `${target.id}:${r.en.toLowerCase().replace(/\s+/g, '-')}`,
        en: r.en, fr: r.fr, theme,
      }));
      await repository.saveCards(target.id, [...(existingCards ?? []), ...fresh]);
      onSaved(target.id);
    } catch (e) {
      setError('L’enregistrement a échoué. Réessaie.');
      console.error(e);
    } finally {
      setEnCours(false);
    }
  }

  const petit: CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.75 };

  /* ---------------- Étape 1 : le contrôle (285) ---------------- */
  const reste = joursAvant(dateControle);
  const dateOk = reste >= 1 && reste <= 90;
  if (etape === 'controle') {
    const passages = dateOk ? joursDePassage(reste) : [];
    return (
      <>
        <p className="hint" style={petit}>Étape 1 sur 3</p>
        <h2 className="screen-title" style={{ margin: '0 0 6px', fontSize: 28 }}>Un contrôle à préparer ?</h2>
        <p className="hint">L’appli resserre les révisions de ce paquet pour que les mots soient sus le jour J.</p>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={aControle === false} className={aControle === false ? 'on' : ''} onClick={() => setAControle(false)}>Non, à mon rythme</button>
          <button role="tab" aria-selected={aControle === true} className={aControle === true ? 'on' : ''} onClick={() => setAControle(true)}>Oui, un contrôle</button>
        </div>

        {aControle && (
          <>
            <p className="hint" style={{ ...petit, margin: '0 0 8px' }}>Le contrôle a lieu</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 12px' }}>
              {RACCOURCIS.map((j) => {
                const iso = isoLocal(jourPlus(j));
                const on = iso === dateControle;
                return (
                  <button
                    key={j}
                    onClick={() => setDateControle(iso)}
                    aria-pressed={on}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minHeight: 48, padding: '6px 12px', borderRadius: 12, border: on ? '2px solid currentColor' : '1px solid var(--rule)', background: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 14 }}>{jourCourt(jourPlus(j))}</span>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>dans {j} j</span>
                  </button>
                );
              })}
            </div>
            <div className="field">
              <label htmlFor="date-controle">Une autre date</label>
              <input
                id="date-controle" type="date" value={dateControle}
                min={isoLocal(jourPlus(1))} max={isoLocal(jourPlus(90))}
                onChange={(e) => { if (e.target.value) setDateControle(e.target.value); }}
              />
            </div>

            {dateOk ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 16px' }}>
                <p className="hint" style={{ ...petit, margin: '0 0 2px' }}>Le planning · {jourLong(jourPlus(reste))}</p>
                {passages.map((j, i) => (
                  <div key={j} style={{ display: 'grid', gridTemplateColumns: '90px minmax(0,1fr)', alignItems: 'center', gap: 10, minHeight: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--rule)' }}>
                    <span style={{ fontSize: 12, opacity: 0.75 }}>{j === 0 ? 'Aujourd’hui' : jourCourt(jourPlus(j))}</span>
                    <span style={{ fontSize: 14 }}>
                      {i === 0 ? 'Découverte de tous les mots' : j === reste - 1 ? 'Tout le paquet, la veille' : 'Les mots encore fragiles'}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '90px minmax(0,1fr)', alignItems: 'center', gap: 10, minHeight: 40, padding: '0 12px', borderRadius: 10, border: '2px solid currentColor' }}>
                  <span style={{ fontSize: 12 }}>{jourCourt(jourPlus(reste))}</span>
                  <b style={{ fontSize: 14 }}>Contrôle</b>
                </div>
                <p className="hint" style={{ margin: '4px 0 0' }}>Un mot bien su revient moins souvent, un mot raté plus vite. Après le contrôle, le paquet reprend le rythme normal.</p>
              </div>
            ) : (
              <p className="error">Choisis une date entre demain et dans 3 mois.</p>
            )}
          </>
        )}

        <button className="btn" disabled={aControle === null || (aControle && !dateOk)} onClick={() => setEtape('nom')}>Continuer ›</button>
        <button className="btn ghost" onClick={onCancel}>Annuler</button>
      </>
    );
  }

  /* ---------------- Étape 2 : le nom ---------------- */
  if (etape === 'nom') {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button className="rowlink" style={{ flex: 1, minWidth: 0 }} onClick={() => setEtape('controle')}><span>‹ {aControle ? `Contrôle ${jourCourt(jourPlus(reste))}` : 'Le contrôle'}</span></button>
          <span className="hint" style={{ ...petit, margin: 0, flex: 'none' }}>Étape 2 sur 3</span>
        </div>
        <div className="field">
          <label htmlFor="deckname">Nom du paquet</label>
          <p className="hint">Celui du contrôle, de la leçon ou du chapitre.</p>
          <input
            id="deckname" type="text" value={name} placeholder="Unit 4 — The house" autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) setEtape('mots'); }}
          />
        </div>

        <p className="hint" style={{ ...petit, margin: '0 0 10px' }}>Couleur du dos</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '0 0 22px' }}>
          <DeckVign id="apercu-perso" name={name.trim() || '?'} image={null} w={68} h={96} papier={papier} />
          <div role="radiogroup" aria-label="Couleur du dos" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 44px)', gap: 10 }}>
            {PAPIERS_PERSO.map((p) => {
              const on = p.id === papier;
              return (
                <button
                  key={p.id}
                  role="radio"
                  aria-checked={on}
                  aria-label={p.nom}
                  onClick={() => setPapier(p.id)}
                  style={{ width: 44, height: 44, padding: 0, borderRadius: 12, background: p.pale, border: `2px solid ${p.mid}`, boxShadow: on ? '0 0 0 2px var(--bg, #0f1a2f), 0 0 0 4px var(--chalk, currentColor)' : 'none', cursor: 'pointer' }}
                />
              );
            })}
          </div>
        </div>

        <button className="btn" disabled={!name.trim()} onClick={() => setEtape('mots')}>Ajouter les mots ›</button>
        <button className="btn ghost" onClick={onCancel}>Annuler</button>
      </>
    );
  }

  /* ---------------- Étape 3 : les mots ---------------- */
  const libellePhoto = etat ? (etat.illimite ? 'En photo · illimité' : etat.offert ? (etat.restantes ? 'En photo · offerte' : 'En photo') : `En photo · reste ${etat.restantes}`) : 'En photo';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {mode === 'create'
          ? <button className="rowlink" style={{ flex: 1, minWidth: 0 }} onClick={() => setEtape('nom')}><span>‹ {name.trim()}</span></button>
          : <span />}
        {mode === 'create' && <span className="hint" style={{ ...petit, margin: 0, flex: 'none' }}>Étape 3 sur 3</span>}
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={saisie === 'main'} className={saisie === 'main' ? 'on' : ''} onClick={() => setSaisie('main')}>À la main</button>
        <button role="tab" aria-selected={saisie === 'photo'} className={saisie === 'photo' ? 'on' : ''} onClick={() => setSaisie('photo')}>{libellePhoto}</button>
      </div>

      {saisie === 'photo' && (
        <PhotoListe
          etat={etat}
          onEtat={setEtat}
          fermee={photoFermee}
          panne={photoPanne}
          onMots={ajouteLus}
        />
      )}

      {saisie === 'main' && (
        <>
          {lus > 0 && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--rule-strong, var(--rule))', margin: '0 0 14px' }}>
              <p className="hint" style={{ flex: 1, margin: 0 }}>
                {lus} mot{lus > 1 ? 's' : ''} lu{lus > 1 ? 's' : ''} sur la photo. Relis-les : l’IA peut se tromper,
                surtout sur une écriture à la main. Touche un mot pour le corriger.
              </p>
              <button className="iconbtn" aria-label="Fermer" onClick={() => setLus(0)}>×</button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 10px' }}>
            <h2 className="screen-title" style={{ margin: 0, fontSize: 28 }}>Mot {n + 1}</h2>
            <span className="hint" style={{ margin: 0 }}>{n} mot{n > 1 ? 's' : ''}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 16, borderRadius: 16, border: '1px solid var(--rule)', margin: '0 0 16px' }}>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="mot-en">En anglais</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={refEn} id="mot-en" type="text" value={en} placeholder="the kitchen"
                  autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="next"
                  style={{ flex: 1, minWidth: 0 }}
                  onChange={(e) => { setEn(e.target.value); setDoublon(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (en.trim() && fr.trim()) suivant(); else refFr.current?.focus(); } }}
                />
                <button className="iconbtn" aria-label="Écouter" disabled={!en.trim()} onClick={() => speak(en.trim(), 1)} style={{ flex: 'none', width: 48, height: 48 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z" />
                    <path d="M16 9a5 5 0 0 1 0 6" /><path d="M19.4 18.4a9 9 0 0 0 0-12.8" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="mot-fr">En français</label>
              <input
                ref={refFr} id="mot-fr" type="text" value={fr} placeholder="la cuisine" enterKeyHint="next"
                onChange={(e) => setFr(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); suivant(); } }}
              />
            </div>
            {doublon && <p className="error" style={{ margin: '0 0 8px' }}>« {doublon} » est déjà dans le paquet.</p>}
            <button className="btn" disabled={!en.trim() || !fr.trim()} onClick={suivant} style={{ margin: 0 }}>Suivant ›</button>
          </div>
        </>
      )}

      {n > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 16px' }}>
          <p className="hint" style={{ ...petit, margin: '0 0 2px' }}>Déjà dans le paquet</p>
          {[...mots].map((m, i) => ({ m, i })).reverse().map(({ m, i }) => (
            <div key={`${m.en}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 4px 0 12px', borderRadius: 10, border: '1px solid var(--rule)' }}>
              <button
                onClick={() => corrige(i)}
                aria-label={`Corriger ${m.en}`}
                style={{ flex: 1, minWidth: 0, display: 'flex', gap: 10, alignItems: 'center', minHeight: 44, padding: 0, border: 0, background: 'none', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
              >
                <span style={{ width: 20, fontSize: 11, opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, overflowWrap: 'anywhere' }}>{m.en}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, opacity: 0.75, overflowWrap: 'anywhere' }}>{m.fr}</span>
              </button>
              <button className="iconbtn" aria-label={`Retirer ${m.en}`} onClick={() => setMots((l) => l.filter((_, j) => j !== i))} style={{ flex: 'none' }}>×</button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button className="btn" disabled={!pret || enCours} onClick={() => void save()}>
        {mode === 'create'
          ? (pret ? `Terminer le paquet · ${n} mots` : `Terminer le paquet · encore ${minimum - n}`)
          : (n ? `Ajouter ${n} mot${n > 1 ? 's' : ''} au paquet` : 'Ajouter au paquet')}
      </button>
      {mode === 'create' && <p className="hint" style={{ textAlign: 'center' }}>Il faut au moins {MIN_MOTS} mots. On peut en ajouter plus tard.</p>}
      <button className="btn ghost" onClick={onCancel}>Annuler</button>
    </>
  );
}
