/**
 * CHANTIER 281 — « En photo » : prendre la liste, la recadrer, la faire lire.
 *
 * Trois temps : choisir (appareil ou galerie) → recadrer (4 coins) →
 * lire. La photo n'est décomptée qu'une fois la liste lue : reprendre,
 * annuler ou une photo sans mots ne coûtent rien à l'élève.
 */
import { useEffect, useRef, useState, type PointerEvent as PE } from 'react';
import { ErreurPhoto, etatPhoto, lirePhoto, prepareImage, quotaDit, type EtatPhoto } from '../data/photoListe';

type Cadre = { x1: number; y1: number; x2: number; y2: number };
type Coin = 'hg' | 'hd' | 'bg' | 'bd';
const CADRE0: Cadre = { x1: 0.03, y1: 0.03, x2: 0.97, y2: 0.97 };
const ECART = 0.12;

export function PhotoListe({ onMots }: { onMots: (mots: Array<{ en: string; fr: string }>) => void }) {
  const [etat, setEtat] = useState<EtatPhoto | null>(null);
  const [ferme, setFerme] = useState<'compte' | 'ferme' | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [cadre, setCadre] = useState<Cadre>(CADRE0);
  const [lecture, setLecture] = useState(false);
  const [message, setMessage] = useState('');
  const appareil = useRef<HTMLInputElement>(null);
  const galerie = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const coin = useRef<Coin | null>(null);

  useEffect(() => {
    etatPhoto().then(setEtat).catch((e) => {
      if (e instanceof ErreurPhoto && (e.code === 'compte' || e.code === 'ferme')) setFerme(e.code);
      else setMessage('Le compteur de photos ne répond pas. Réessaie plus tard.');
    });
  }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  if (ferme) {
    return (
      <div className="field">
        <label>En photo</label>
        <p className="hint">
          {ferme === 'compte'
            ? 'Connecte-toi à ton compte pour faire lire une liste en photo.'
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

  async function envoie() {
    if (!image.current || lecture) return;
    setLecture(true);
    setMessage('');
    try {
      const { image: data, type } = await prepareImage(image.current, cadre);
      const r = await lirePhoto(data, type);
      setEtat(r.etat);
      setUrl(null);
      onMots(r.mots);
    } catch (e) {
      if (e instanceof ErreurPhoto) {
        if (e.etat) setEtat(e.etat);
        if (e.code === 'vide') setMessage('Aucun mot lu sur cette photo. Recadre plus près de la liste, ou reprends-la avec plus de lumière. Elle n’est pas comptée.');
        else if (e.code === 'quota') { setMessage(''); setUrl(null); }
        else setMessage('La lecture n’a pas abouti. La photo n’est pas comptée : réessaie dans un instant.');
      } else {
        setMessage('La photo n’a pas pu être préparée. Essaie avec une autre.');
      }
    } finally {
      setLecture(false);
    }
  }

  const coins: Coin[] = ['hg', 'hd', 'bg', 'bd'];

  return (
    <div className="field">
      <label>En photo</label>

      {!url && (
        <>
          <p className="hint">La page du cahier ou la fiche du prof, bien à plat. L’IA lit chaque mot anglais et sa traduction, puis tu relis.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
            <span style={{ display: 'flex', gap: 5, flex: 'none' }} aria-hidden="true">
              {Array.from({ length: etat?.max ?? 3 }, (_, i) => (
                <i key={i} style={{ display: 'block', width: 9, height: 9, borderRadius: 999, border: '1px solid var(--ink)', background: etat && i < etat.restantes ? 'var(--ink)' : 'transparent' }} />
              ))}
            </span>
            <span className="hint" style={{ margin: 0 }}>{etat ? quotaDit(etat) : 'Lecture du compteur…'}</span>
          </div>
          <button className="btn" disabled={!peut} onClick={() => appareil.current?.click()}>Prendre la photo de la liste</button>
          <button className="btn ghost" disabled={!peut} onClick={() => galerie.current?.click()}>Choisir dans la galerie</button>
        </>
      )}

      {url && (
        <>
          <p className="hint">Recadre sur la liste : glisse les coins. Ce qui reste dehors n’est pas lu.</p>
          <div ref={zone} style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', margin: '0 0 12px' }}>
            <img ref={image} src={url} alt="" draggable={false} style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '60vh', objectFit: 'contain' }} />
            <div style={{
              position: 'absolute', left: `${cadre.x1 * 100}%`, top: `${cadre.y1 * 100}%`,
              width: `${(cadre.x2 - cadre.x1) * 100}%`, height: `${(cadre.y2 - cadre.y1) * 100}%`,
              border: '2px solid #fff', borderRadius: 3, boxShadow: '0 0 0 9999px rgba(0,0,0,0.58)',
            }}>
              {coins.map((k) => (
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
                    background: 'radial-gradient(circle, #fff 0 7px, rgba(255,255,255,0.3) 8px 12px, transparent 13px)',
                  }}
                />
              ))}
            </div>
          </div>
          <button className="btn" disabled={lecture} onClick={() => void envoie()}>{lecture ? 'Lecture en cours…' : 'Envoyer'}</button>
          <button className="btn ghost" disabled={lecture} onClick={() => { setUrl(null); appareil.current?.click(); }}>Reprendre la photo</button>
          <button className="btn ghost" disabled={lecture} onClick={() => setUrl(null)}>Annuler</button>
          <p className="hint">La photo n’est comptée qu’une fois la liste lue.</p>
        </>
      )}

      {message && <p className="error">{message}</p>}
      <input ref={appareil} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { choisi(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={galerie} type="file" accept="image/*" hidden onChange={(e) => { choisi(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
