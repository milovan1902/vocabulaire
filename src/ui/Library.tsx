/** Écran d'accueil : la collection de paquets. */
import { useEffect, useRef, useState } from 'react';
import type { Category, Deck, Progress, Settings } from '../domain/types';
import { repository } from '../data/repository';
import { CardBack, paletteFor, Slider, Toggle } from './components';
import { imageFor } from './deckImages';
import { isDue, isNew } from '../engine/scheduler';
import { AccountPanel } from './AccountPanel';
import type { Auth } from './useAuth';

/**
 * Création de paquets par l'utilisateur.
 * Désactivée : la bibliothèque est un catalogue. Le code reste en place,
 * il suffit de repasser à true pour la réactiver.
 */
export const ALLOW_LOCAL_DECKS = false;

interface DeckSummary {
  deck: Deck;
  total: number;
  due: number;
  image: string | null;
}

export function Library({
  decks, installed, categories, settings, auth,
  onOpen, onCreate, onSettings, onAdd, onRemove, onHome,
}: {
  decks: Deck[];
  installed: string[];
  categories: Category[];
  settings: Settings;
  auth: Auth;
  /** Le second argument sert à faire voler la vignette jusqu'à l'écran suivant. */
  onOpen: (
    id: string,
    vol?: { image: string | null; from: DOMRect; total: number; due: number },
  ) => void;
  /** Création locale : masquée par défaut, voir ALLOW_LOCAL_DECKS. */
  onCreate: () => void;
  onSettings: (s: Settings) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onHome: () => void;
}) {
  const [rows, setRows] = useState<DeckSummary[]>([]);
  const [tab, setTab] = useState<'mine' | 'catalog'>('mine');
  /** Paquet en cours de retournement : l'ouverture attend la fin du geste. */
  const [flipping, setFlipping] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const now = Date.now();
      const cap = settings.newPerDay + settings.reviewsPerDay;
      const out: DeckSummary[] = [];
      for (const deck of decks) {
        const [cards, progress, image] = await Promise.all([
          repository.getCards(deck.id),
          repository.getProgress(deck.id),
          repository.getImage(deck.id),
        ]);
        // Un visuel fourni prend le relais quand la personne n'en a choisi aucun.
        const visuel = imageFor(deck.id, image);
        let due = 0;
        for (const c of cards) {
          const p: Progress | undefined = progress[c.id];
          if (!p || isNew(p) || isDue(p, now)) due++;
        }
        out.push({ deck, total: cards.length, due: Math.min(due, cap), image: visuel });
      }
      if (alive) setRows(out);
    })();
    return () => { alive = false; };
  }, [decks, settings.newPerDay, settings.reviewsPerDay]);

  async function exportBackup() {
    try {
      const data = await repository.exportAll();
      const payload = {
        format: 'vocab-backup',
        version: 3,
        date: new Date().toISOString(),
        data,
      };
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vocabulaire-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
    } catch (e) {
      alert('Sauvegarde impossible : ' + (e as Error).message);
    }
  }

  async function importBackup(file: File) {
    let payload: { format?: string; data?: Record<string, unknown>; date?: string };
    try {
      payload = JSON.parse(await file.text());
    } catch {
      alert("Fichier illisible : ce n'est pas une sauvegarde valide.");
      return;
    }
    if (payload.format !== 'vocab-backup' || !payload.data) {
      alert("Ce fichier n'est pas une sauvegarde de cette application.");
      return;
    }
    const when = (payload.date ?? '').slice(0, 10);
    if (!confirm(
      `Restaurer la sauvegarde du ${when} ?\n\n` +
      'Tous les paquets et la progression de cet appareil seront remplacés.',
    )) return;
    await repository.importAll(payload.data);
    alert('Sauvegarde restaurée.');
    // Rechargement complet : les réglages et le compteur du jour sont
    // relus depuis la sauvegarde, pas seulement la liste des paquets.
    location.reload();
  }

  /** Une carte de paquet, telle qu'elle apparaît dans « Mes paquets ». */
  function card({ deck, total, due, image }: DeckSummary) {
    const palette = paletteFor(deck.id);
    return (
      <button
        key={deck.id}
        className={`deckcard${flipping === deck.id ? ' flipping' : ''}`}
        style={{ ['--accent' as string]: palette.ink }}
        onClick={(e) => {
          /*
           * On transmet la position du visuel, pas celle de la carte
           * entière : c'est lui qui doit sembler décoller, sans le nom ni
           * le compteur qui l'entourent.
           */
          const dos = (e.currentTarget as HTMLElement).querySelector('.back');
          setFlipping(deck.id);
          onOpen(
            deck.id,
            dos ? { image, from: dos.getBoundingClientRect(), total, due } : undefined,
          );
        }}
      >
        <span className="stack">
          <span className="face">
            <span className="top">
              <span className="corner">{total}</span>
              <span className="suit" />
            </span>
            <span className="back">
              {image ? <img src={image} alt="" /> : <CardBack id={deck.id} name={deck.name} />}
            </span>
            <span className="name">{deck.name}</span>
            <span className="foot">
              <span>{due > 0 ? 'à réviser' : ''}</span>
              {due > 0
                ? <span className="due">{due}</span>
                : <span className="rest">à jour</span>}
            </span>
          </span>
        </span>
      </button>
    );
  }

  /**
   * Une carte de paquet vue du catalogue : le prix remplace le compteur de
   * révisions, et l'action ajoute à la collection au lieu d'ouvrir.
   */
  function catalogCard({ deck, total, image }: DeckSummary) {
    const palette = paletteFor(deck.id);
    const dedans = installed.includes(deck.id);
    const prix = deck.priceCents ? `${(deck.priceCents / 100).toFixed(2).replace('.', ',')} €` : 'Gratuit';
    return (
      <div key={deck.id} className="catitem">
        <button
          className="deckcard"
          style={{ ['--accent' as string]: palette.ink }}
          onClick={() => (dedans ? onOpen(deck.id) : onAdd(deck.id))}
        >
          <span className="stack">
            <span className="face">
              <span className="top">
                <span className="corner">{total}</span>
                <span className="suit" />
              </span>
              <span className="back">
                {image ? <img src={image} alt="" /> : <CardBack id={deck.id} name={deck.name} />}
              </span>
              <span className="name">{deck.name}</span>
              <span className="foot">
                <span>{prix}</span>
                {dedans && <span className="rest">ajouté</span>}
              </span>
            </span>
          </span>
        </button>
        {dedans ? (
          <button className="minibtn done" onClick={() => onRemove(deck.id)}>
            Retirer
          </button>
        ) : (
          <button className="minibtn" onClick={() => onAdd(deck.id)}>
            Ajouter
          </button>
        )}
      </div>
    );
  }

  /** La carte en pointillés qui crée un paquet, si la fonction est active. */
  function tile(_: null) {
    if (!ALLOW_LOCAL_DECKS) return null;
    return (
      <button className="deckcard add" onClick={onCreate}>
        <span className="stack">
          <span className="face">
            <span className="plus">+</span>
            <span className="name">Créer un paquet</span>
          </span>
        </span>
      </button>
    );
  }

  /**
   * Regroupement par rayon. L'ordre est celui que vous avez fixé ;
   * les paquets sans rayon sont rassemblés à la fin plutôt qu'oubliés.
   */
  function group(list: DeckSummary[]) {
    const out: Array<{ category: Category | null; items: DeckSummary[] }> = [];
    for (const category of [...categories].sort((a, b) => a.position - b.position)) {
      const items = list.filter((r) => r.deck.categoryId === category.id);
      if (items.length) out.push({ category, items });
    }
    const orphelins = list.filter(
      (r) => !r.deck.categoryId || !categories.some((c) => c.id === r.deck.categoryId),
    );
    if (orphelins.length) out.push({ category: null, items: orphelins });
    return out;
  }

  const mine = rows.filter((r) => installed.includes(r.deck.id));
  const sections = group(mine);
  const catalogue = group(rows);

  return (
    <>
      <div className="tabs" role="tablist">
        <button
          role="tab" aria-selected={tab === 'mine'}
          className={tab === 'mine' ? 'on' : ''}
          onClick={() => setTab('mine')}
        >
          Mes paquets
          {mine.length > 0 && <span className="tabcount">{mine.length}</span>}
        </button>
        <button
          role="tab" aria-selected={tab === 'catalog'}
          className={tab === 'catalog' ? 'on' : ''}
          onClick={() => setTab('catalog')}
        >
          Bibliothèque
          {rows.length > 0 && <span className="tabcount">{rows.length}</span>}
        </button>
      </div>

      {tab === 'mine' && (
        <>
          <p className="lead">
            {ALLOW_LOCAL_DECKS
              ? 'Chaque paquet garde sa propre progression. Ouvrez-en un pour réviser, ou créez-en un nouveau à partir de votre liste de mots.'
              : 'Chaque paquet garde sa propre progression. Ouvrez-en un pour commencer à réviser.'}
          </p>

          {mine.length === 0 && (
            <div className="empty">
              <p>Votre collection est vide.</p>
              <button className="btn ghost" onClick={() => setTab('catalog')}>
                Parcourir la bibliothèque
              </button>
            </div>
          )}

          {sections.map(({ category, items }) => (
            <section key={category?.id ?? '_autres'} className="rayon">
              {(category || sections.length > 1) && (
                <h2>{category ? category.name : 'Autres'}</h2>
              )}
              {category?.description && <p className="hint">{category.description}</p>}
              <div className="deckgrid">
                {items.map((row) => card(row))}
              </div>
            </section>
          ))}

          {ALLOW_LOCAL_DECKS && mine.length > 0 && (
            <div className="deckgrid">{tile(null)}</div>
          )}
        </>
      )}

      {tab === 'catalog' && (
        <>
          <p className="lead">
            Tous les paquets disponibles. Ajoutez ceux qui vous intéressent :
            ils rejoignent « Mes paquets » et leur progression démarre.
          </p>

          {!auth.session && (
            <p className="hint" style={{ marginBottom: 16 }}>
              Vous n’êtes pas connecté : seuls les paquets fournis avec
              l’application sont visibles ici. La connexion donne accès au
              catalogue complet.
            </p>
          )}

          {catalogue.map(({ category, items }) => (
            <section key={category?.id ?? '_autres'} className="rayon">
              {(category || catalogue.length > 1) && (
                <h2>{category ? category.name : 'Autres'}</h2>
              )}
              {category?.description && <p className="hint">{category.description}</p>}
              <div className="deckgrid">
                {items.map((row) => catalogCard(row))}
              </div>
            </section>
          ))}
        </>
      )}

      <details className="panelbox">
        <summary>Réglages généraux</summary>
        <div className="setting scope">
          <p className="hint" style={{ margin: 0 }}>
            Ces réglages s’appliquent à tous les paquets, sauf à ceux qui ont
            les leurs. Un paquet se particularise depuis son propre écran.
          </p>
        </div>
        <Slider
          label="Nouveaux mots par jour"
          hint="Chaque nouveau mot génère environ 5 révisions dans les semaines qui suivent."
          min={0} max={60} step={5} value={settings.newPerDay}
          onChange={(v) => onSettings({ ...settings, newPerDay: v })}
        />
        <Slider
          label="Révisions maximum par jour"
          min={20} max={200} step={10} value={settings.reviewsPerDay}
          onChange={(v) => onSettings({ ...settings, reviewsPerDay: v })}
        />
        <Slider
          label="Cartes par session"
          min={10} max={60} step={5} value={settings.cardsPerSession}
          onChange={(v) => onSettings({ ...settings, cardsPerSession: v })}
        />
        <Slider
          label="Vitesse de la voix"
          min={0.6} max={1.1} step={0.05} value={settings.speechRate}
          format={(v) => v.toFixed(2).replace('.', ',')}
          onChange={(v) => onSettings({ ...settings, speechRate: v })}
        />
        <div className="setting" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <Toggle
            label="Prononcer automatiquement à la réponse"
            checked={settings.autoSpeak}
            onChange={(v) => onSettings({ ...settings, autoSpeak: v })}
          />
          <Toggle
            label="Sens inverse : anglais → français"
            checked={settings.reversed}
            onChange={(v) => onSettings({ ...settings, reversed: v })}
          />
        </div>
      </details>

      <AccountPanel auth={auth} />

      <button className="btn ghost" onClick={exportBackup}>Enregistrer une sauvegarde</button>
      <button className="btn ghost" onClick={() => fileRef.current?.click()}>
        Restaurer une sauvegarde
      </button>
      <input
        ref={fileRef} type="file" accept="application/json,.json" hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void importBackup(f);
        }}
      />
      <p className="hint" style={{ marginTop: 12 }}>
        La progression est enregistrée sur cet appareil. Pour la retrouver ailleurs,
        exportez une sauvegarde ici et restaurez-la là-bas.
      </p>

      <button className="btn ghost" style={{ marginTop: 18 }} onClick={onHome}>
        Revoir la page d’accueil
      </button>
    </>
  );
}
