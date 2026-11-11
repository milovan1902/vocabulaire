/**
 * CHANTIER 281 / 283 — « En photo » : prendre la liste, la recadrer, la faire lire.
 *
 * Trois temps : choisir (appareil ou galerie) → recadrer (4 coins) →
 * lire. La photo n'est décomptée qu'une fois la liste lue : reprendre,
 * annuler ou une photo sans mots ne coûtent rien à l'élève.
 *
 * 283 — le compteur est lu par l'éditeur (l'onglet « En photo · reste 2 »
 * l'affiche) et passé ici. Une panne dit enfin sa cause.
 */
/* CHANTIER 358 — le tu et le vous : élève = tu, adulte = vous. */
import { tvp } from './ton';
import { useEffect, useRef, useState, type PointerEvent as PE } from 'react';
import { ErreurPhoto, lirePhoto, prepareImage, quotaDit, tourne, type EtatPhoto, type ModePhoto } from '../data/photoListe';

type Cadre = { x1: number; y1: number; x2: number; y2: number };
type Coin = 'hg' | 'hd' | 'bg' | 'bd';
const CADRE0: Cadre = { x1: 0.03, y1: 0.03, x2: 0.97, y2: 0.97 };
const ECART = 0.12;
const NOMBRES = [5, 10, 15, 20];
const COINS: Coin[] = ['hg', 'hd', 'bg', 'bd'];

export function PhotoListe({ etat, onEtat, fermee, panne, onMots }: {
  etat: EtatPhoto | null;
  onEtat: (e: EtatPhoto) => void;
  fermee: 'compte' | 'ferme' | null;
  panne: string;
  onMots: (mots: Array<{ en: string; fr: string }>) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [cadre, setCadre] = useState<Cadre>(CADRE0);
  const [lecture, setLecture] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<ModePhoto>('liste');
  const [nombre, setNombre] = useState(10);
  const appareil = useRef<HTMLInputElement>(null);
  const galerie = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const coin = useRef<Coin | null>(null);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const cadreBox = { display: 'flex', flexDirection: 'column' as const, gap: 12, padding: 16, borderRadius: 16, border: '1px solid var(--rule)', margin: '0 0 16px' };

  if (fermee) {
    return (
      <div style={cadreBox}>
        <p className="hint" style={{ margin: 0 }}>
          {fermee === 'compte'
            ? tvp('Connecte-toi à ton compte (Réglages) pour faire lire une liste en photo.', 'Connectez-vous à votre compte (Réglages) pour faire lire une liste en photo.')
            : 'La lecture d’une liste en photo est réservée aux abonnés.'}
        </p>
      </div>
    );
  }

  const peut = !!etat && etat.restantes > 0 && !lecture;

  function choisi(f: File | undefined) {
    if (!f) return;
    setMessage('');
    setCadre(CADRE0);
    setUrl(URL.createObjectURL(f));
  }

  function bouge(e: PE<HTMLSpanElement>) {
    const k = coin.current, el = zone.current;
    if (!k || !el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setCadre((c) => ({
      x1: k[1] === 'g' ? Math.min(x, c.x2 - ECART) : c.x1,
      x2: k[1] === 'd' ? Math.max(x, c.x1 + ECART) : c.x2,
      y1: k[0] === 'h' ? Math.min(y, c.y2 - ECART) : c.y1,
      y2: k[0] === 'b' ? Math.max(y, c.y1 + ECART) : c.y2,
    }));
  }

  /** 408 — pivote la photo d'un quart de tour (sens horaire) ; le cadre repart de zéro. */
  async function pivote() {
    if (!url || lecture) return;
    try {
      const neuve = await tourne(url, 90);
      setCadre(CADRE0);
      setUrl(neuve);
    } catch {
      setMessage(tvp('La photo n’a pas pu être pivotée.', 'La photo n’a pas pu être pivotée.'));
    }
  }

  async function envoie() {
    if (!image.current || lecture) return;
    setLecture(true);
    setMessage('');
    try {
      const { image: data } = await prepareImage(image.current, cadre);
      /* 408 — photo de travers : le serveur dit de combien la tourner ; on la redresse ici et on renvoie (deux fois au plus). */
      let r;
      let envoi = data;
      let tenues = 0;
      for (;;) {
        try {
          r = await lirePhoto(envoi, 'image/jpeg', { mode, nombre });
          break;
        } catch (e) {
          if (!(e instanceof ErreurPhoto) || e.code !== 'sens' || !e.angle || tenues >= 2) throw e;
          tenues += 1;
          const droite = await tourne(`data:image/jpeg;base64,${envoi}`, e.angle);
          envoi = droite.slice(droite.indexOf(',') + 1);
        }
      }
      onEtat(r.etat);
      setUrl(null);
      onMots(r.mots);
    } catch (e) {
      if (e instanceof ErreurPhoto) {
        if (e.etat) onEtat(e.etat);
        if (e.code === 'vide') setMessage(mode === 'texte'
          ? tvp('Aucun texte anglais lu avec certitude. Recadre sur le texte, tourne la photo si besoin, ou reprends-la avec plus de lumière. Elle n’est pas comptée.', 'Aucun texte anglais lu avec certitude. Recadrez sur le texte, tournez la photo si besoin, ou reprenez-la avec plus de lumière. Elle n’est pas comptée.')
          : tvp('Aucun mot lu sur cette photo. Recadre plus près de la liste, tourne-la si besoin, ou reprends-la avec plus de lumière. Elle n’est pas comptée.', 'Aucun mot lu sur cette photo. Recadrez plus près de la liste, tournez-la si besoin, ou reprenez-la avec plus de lumière. Elle n’est pas comptée.'));
        else if (e.code === 'sens') setMessage(tvp('La photo est restée de travers. Pivote-la avec le bouton, puis renvoie-la. Elle n’est pas comptée.', 'La photo est restée de travers. Pivotez-la avec le bouton, puis renvoyez-la. Elle n’est pas comptée.'));
        else if (e.code === 'quota') setUrl(null);
        else setMessage(`La lecture n’a pas abouti (${e.message}). La photo n’est pas comptée.`);
      } else {
        setMessage(tvp('La photo n’a pas pu être préparée. Essaie avec une autre.', 'La photo n’a pas pu être préparée. Essayez avec une autre.'));
      }
    } finally {
      setLecture(false);
    }
  }

  const fichiers = (
    <>
      <input ref={appareil} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { choisi(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={galerie} type="file" accept="image/*" hidden onChange={(e) => { choisi(e.target.files?.[0]); e.target.value = ''; }} />
    </>
  );

  /* ---------------- Recadrage ---------------- */
  if (url) {
    return (
      <div style={cadreBox}>
      <div className="tabs" role="tablist" aria-label="Type de photo">
        <button role="tab" aria-selected={mode === 'liste'} className={mode === 'liste' ? 'on' : ''} disabled={lecture} onClick={() => setMode('liste')}>Une liste</button>
        <button role="tab" aria-selected={mode === 'texte'} className={mode === 'texte' ? 'on' : ''} disabled={lecture} onClick={() => setMode('texte')}>Un texte</button>
      </div>
      {mode === 'texte' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="hint" style={{ margin: 0 }}>Combien de mots ?</span>
          {NOMBRES.map((n) => (
            <button key={n} className={nombre === n ? 'btn' : 'btn ghost'} style={{ margin: 0, padding: '6px 12px', minWidth: 0 }} aria-pressed={nombre === n} disabled={lecture} onClick={() => setNombre(n)}>{n}</button>
          ))}
        </div>
      )}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <b>{mode === 'texte' ? 'Recadre sur le texte' : 'Recadre sur la liste'}</b>
          <span className="hint" style={{ margin: 0, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Glisse les coins</span>
        </div>
        <div ref={zone} style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
          <img ref={image} src={url} alt="" draggable={false} style={{ display: 'block', width: '100%', height: 'auto' }} />
          <div style={{
            position: 'absolute', left: `${cadre.x1 * 100}%`, top: `${cadre.y1 * 100}%`,
            width: `${(cadre.x2 - cadre.x1) * 100}%`, height: `${(cadre.y2 - cadre.y1) * 100}%`,
            border: '2px solid #f2b705', borderRadius: 3, boxShadow: '0 0 0 9999px rgba(10,16,30,0.62)',
          }}>
            {COINS.map((k) => (
              <span
                key={k}
                role="slider"
                aria-label="Coin du cadre"
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); coin.current = k; }}
                onPointerMove={bouge}
                onPointerUp={() => { coin.current = null; }}
                onPointerCancel={() => { coin.current = null; }}
                style={{
                  position: 'absolute',
                  top: k[0] === 'h' ? -20 : undefined, bottom: k[0] === 'b' ? -20 : undefined,
                  left: k[1] === 'g' ? -20 : undefined, right: k[1] === 'd' ? -20 : undefined,
                  width: 40, height: 40, borderRadius: 999, touchAction: 'none', cursor: 'grab',
                  background: 'radial-gradient(circle, #f2b705 0 7px, rgba(242,183,5,0.3) 8px 12px, transparent 13px)',
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" style={{ flex: 'none', margin: 0 }} disabled={lecture} onClick={() => void pivote()} aria-label="Pivoter la photo d’un quart de tour">⟳ Pivoter</button>
          <button className="btn ghost" style={{ flex: 1, margin: 0 }} disabled={lecture} onClick={() => setCadre(CADRE0)}>Reprendre</button>
          <button className="btn" style={{ flex: 1, margin: 0 }} disabled={lecture} onClick={() => void envoie()}>{lecture ? 'Lecture…' : 'Envoyer'}</button>
        </div>
        <button className="rowlink" disabled={lecture} onClick={() => setUrl(null)}><span>Annuler cette photo</span></button>
        <p className="hint" style={{ margin: 0, textAlign: 'center' }}>La photo n’est comptée qu’une fois la liste lue.</p>
        {message && <p className="error" style={{ margin: 0 }}>{message}</p>}
        {fichiers}
      </div>
    );
  }

  /* ---------------- Prise de vue ---------------- */
  return (
    <div style={cadreBox}>
      <div className="tabs" role="tablist" aria-label="Type de photo">
        <button role="tab" aria-selected={mode === 'liste'} className={mode === 'liste' ? 'on' : ''} disabled={lecture} onClick={() => setMode('liste')}>Une liste</button>
        <button role="tab" aria-selected={mode === 'texte'} className={mode === 'texte' ? 'on' : ''} disabled={lecture} onClick={() => setMode('texte')}>Un texte</button>
      </div>
      {mode === 'texte' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="hint" style={{ margin: 0 }}>Combien de mots ?</span>
          {NOMBRES.map((n) => (
            <button key={n} className={nombre === n ? 'btn' : 'btn ghost'} style={{ margin: 0, padding: '6px 12px', minWidth: 0 }} aria-pressed={nombre === n} disabled={lecture} onClick={() => setNombre(n)}>{n}</button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 150, padding: 16, borderRadius: 12, border: '1.5px dashed var(--rule-strong, var(--rule))', textAlign: 'center' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.7 }}>
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" />
        </svg>
        <p className="hint" style={{ margin: 0, maxWidth: '30ch' }}>
          {lecture ? (mode === 'texte' ? 'L’IA lit le texte…' : 'L’IA lit la liste…')
            : etat && etat.restantes <= 0 ? 'Plus de photo cette semaine. Les mots s’ajoutent toujours à la main.'
            : mode === 'texte' ? 'Un texte en anglais (livre, cahier, fiche). L’IA choisit les mots utiles et les traduit ; tu relis avant de garder.'
            : 'La page du cahier ou la fiche du prof, bien à plat. L’IA lit chaque mot anglais et sa traduction.'}
        </p>
      </div>
      <button className="btn" style={{ margin: 0 }} disabled={!peut} onClick={() => appareil.current?.click()}>Prendre la photo</button>
      <button className="rowlink" disabled={!peut} onClick={() => galerie.current?.click()}><span>Choisir dans la galerie</span><span className="chev">›</span></button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--rule)' }}>
        <span style={{ display: 'flex', gap: 5, flex: 'none' }} aria-hidden="true">
          {Array.from({ length: etat?.max ?? 3 }, (_, i) => (
            <i key={i} style={{ display: 'block', width: 9, height: 9, borderRadius: 999, border: '1px solid currentColor', background: etat && i < etat.restantes ? 'currentColor' : 'transparent' }} />
          ))}
        </span>
        <span className="hint" style={{ flex: 1, minWidth: 0, margin: 0 }}>
          {etat ? quotaDit(etat) : panne ? `Le compteur ne répond pas : ${panne}` : 'Lecture du compteur…'}
        </span>
      </div>
      {message && <p className="error" style={{ margin: 0 }}>{message}</p>}
      {fichiers}
    </div>
  );
}
