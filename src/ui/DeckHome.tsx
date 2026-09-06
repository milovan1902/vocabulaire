/** Écran d'un paquet : statistiques, filtres de thème, réglages, actions. */
import { useMemo, useRef } from 'react';
import type { DeckOverride, Settings } from '../domain/types';
import type { LoadedDeck } from './useStore';
import { progressFor } from './useStore';
import { computeStats } from '../engine/session';
import { repository } from '../data/repository';
import { paletteFor, Slider, Toggle } from './components';
import { resizeToCardImage } from './image';
import { clearRemoteProgress } from '../data/sync';

export function DeckHome({
  loaded, settings, overrides, counter, userId, general,
  onGeneral, onOverrides, onStart, onAddCards, onReload, onBackToLibrary,
}: {
  loaded: LoadedDeck;
  /** Réglages réellement appliqués : le général, corrigé du particulier. */
  settings: Settings;
  /** Réglages propres au paquet, null s'il suit le général. */
  overrides: DeckOverride | null;
  counter: { day: string; newSeen: number; reviewsDone: number };
  /** Réglages généraux, communs à tous les paquets. */
  general: Settings;
  onGeneral: (s: Settings) => void;
  onOverrides: (o: DeckOverride | null) => Promise<void>;
  onStart: (ignoreGoal: boolean) => void;
  onAddCards: () => void;
  onReload: () => void;
  onBackToLibrary: () => void;
  /** Identifiant du compte connecté, ou null en usage purement local. */
  userId: string | null;
}) {
  const { deck, cards, progress, themes, selectedThemes, image } = loaded;
  const particulier = overrides !== null;
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Modifier un curseur agit sur les réglages du paquet s'il en a,
   * sur les réglages généraux sinon. L'interrupteur en tête du panneau
   * dit lequel des deux est en cours d'édition.
   */
  function change(patch: Partial<Settings>) {
    if (particulier) {
      void onOverrides({ ...overrides, ...patch, updatedAt: Date.now() });
    } else {
      onGeneral({ ...general, ...patch });
    }
  }

  const visible = useMemo(
    () => cards.filter((c) => selectedThemes.includes(c.theme)),
    [cards, selectedThemes],
  );

  const stats = useMemo(
    () => computeStats(visible, (id) => progressFor(progress, id), settings, counter),
    [visible, progress, settings, counter],
  );

  const available = stats.newAvailable + stats.dueAvailable;
  const beyond = stats.newBeyondGoal + stats.dueBeyondGoal;

  async function toggleTheme(theme: string) {
    const next = selectedThemes.includes(theme)
      ? selectedThemes.filter((t) => t !== theme)
      : [...selectedThemes, theme];
    await repository.saveThemes(deck.id, next.length ? next : [theme]);
    onReload();
  }

  async function pickImage(file: File) {
    try {
      const dataUrl = await resizeToCardImage(file);
      await repository.saveImage(deck.id, dataUrl);
      const decks = await repository.listDecks();
      const target = decks.find((d) => d.id === deck.id);
      if (target) { target.hasImage = true; await repository.saveDecks(decks); }
      onReload();
    } catch (e) {
      alert("Image illisible : " + (e as Error).message);
    }
  }

  return (
    <>
      {/*
       * Le recto de la carte que l'on vient de retourner depuis la
       * bibliothèque. Sans lui, le retournement promettrait une face qui
       * n'existe pas. L'animation d'entrée reprend l'axe et la durée de
       * l'animation de sortie de la vignette : les deux moitiés se lisent
       * comme un seul geste.
       */}
      <div className="deckface" style={{ ['--accent' as string]: paletteFor(deck.id).ink }}>
        <div className="face">
          <span className="corner">{cards.length}</span>
          <b>{deck.name}</b>
          <span className="sub">
            {stats.dueAvailable + stats.newAvailable > 0
              ? `${stats.dueAvailable + stats.newAvailable} à voir aujourd’hui`
              : 'rien à réviser aujourd’hui'}
          </span>
          <span className="suit" />
        </div>
      </div>

      <div className="stats">
        <div className="stat"><b>{stats.newAvailable}</b><span>à découvrir</span></div>
        <div className="stat"><b>{stats.dueAvailable}</b><span>à réviser</span></div>
        <div className="stat"><b>{stats.resting}</b><span>en mémoire</span></div>
      </div>

      {themes.length > 1 && (
        <div className="rows">
          {themes.map((t) => {
            const on = selectedThemes.includes(t);
            return (
              <button key={t} className={`row ${on ? 'on' : 'off'}`} onClick={() => void toggleTheme(t)}>
                <span className="tick">{on ? '✓' : ''}</span>
                <span style={{ flex: 1 }}>{t}</span>
                <span className="n">{cards.filter((c) => c.theme === t).length}</span>
              </button>
            );
          })}
        </div>
      )}

      <details className="panelbox">
        <summary>Réglages</summary>
        <div className="setting scope">
          <Toggle
            label="Réglages propres à ce paquet"
            checked={particulier}
            onChange={(on) => {
              // En activant, on part des valeurs générales : rien ne change
              // visuellement, mais les modifications suivantes restent ici.
              void onOverrides(on ? { ...general, updatedAt: Date.now() } : null);
            }}
          />
          <p className="hint" style={{ margin: '7px 0 0' }}>
            {particulier
              ? 'Ce paquet a ses propres réglages. Les modifications ci-dessous ne touchent que lui.'
              : 'Ce paquet suit les réglages généraux. Les modifications ci-dessous s’appliquent à tous les paquets.'}
          </p>
        </div>
        <Slider
          label="Nouveaux mots par jour"
          hint="Chaque nouveau mot génère environ 5 révisions dans les semaines qui suivent."
          min={0} max={60} step={5} value={settings.newPerDay}
          onChange={(v) => change({ newPerDay: v })}
        />
        <Slider
          label="Révisions maximum par jour"
          hint="Plafond des mots déjà vus. Le surplus est reporté au lendemain."
          min={20} max={200} step={10} value={settings.reviewsPerDay}
          onChange={(v) => change({ reviewsPerDay: v })}
        />
        <Slider
          label="Cartes par session"
          hint="Pour découper la journée en plusieurs passages courts."
          min={10} max={60} step={5} value={settings.cardsPerSession}
          onChange={(v) => change({ cardsPerSession: v })}
        />
        <Slider
          label="Vitesse de la voix"
          min={0.6} max={1.1} step={0.05} value={settings.speechRate}
          format={(v) => v.toFixed(2).replace('.', ',')}
          onChange={(v) => change({ speechRate: v })}
        />
        <Slider
          label="Marge verticale du texte sur le visuel"
          hint="À ajuster si le cadre de votre image est plus épais ou plus fin."
          min={5} max={30} step={1} value={settings.panelInsetY}
          format={(v) => `${v} %`}
          onChange={(v) => change({ panelInsetY: v })}
        />
        <Slider
          label="Marge horizontale du texte"
          min={5} max={30} step={1} value={settings.panelInsetX}
          format={(v) => `${v} %`}
          onChange={(v) => change({ panelInsetX: v })}
        />
        <div className="setting" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <Toggle
            label="Prononcer automatiquement à la réponse"
            checked={settings.autoSpeak}
            onChange={(v) => change({ autoSpeak: v })}
          />
          <Toggle
            label="Sens inverse : anglais → français"
            checked={settings.reversed}
            onChange={(v) => change({ reversed: v })}
          />
        </div>
      </details>

      {available > 0 ? (
        <button className="btn" onClick={() => onStart(false)}>
          Réviser {Math.min(available, settings.cardsPerSession)} cartes
        </button>
      ) : stats.goalReached ? (
        <>
          <div className="goal">
            <b>Objectif du jour atteint.</b>
            <p>
              Il reste {beyond} carte{beyond > 1 ? 's' : ''} si vous voulez continuer.
              Sachez seulement que chaque carte prise en avance revient plus tard :
              en faire davantage aujourd’hui, c’est plus de révisions demain
              et les jours suivants.
            </p>
          </div>
          <button className="btn ghost" onClick={() => onStart(true)}>
            Continuer quand même ({Math.min(beyond, settings.cardsPerSession)} cartes)
          </button>
        </>
      ) : (
        <button className="btn" disabled>
          Rien à réviser aujourd’hui
        </button>
      )}

      <button className="btn ghost" onClick={() => fileRef.current?.click()}>
        {image ? 'Remplacer l’image du paquet' : 'Choisir une image pour ce paquet'}
      </button>
      <input
        ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void pickImage(f);
        }}
      />
      {image && (
        <button className="btn ghost" onClick={async () => {
          await repository.removeImage(deck.id);
          onReload();
        }}>
          Retirer l’image
        </button>
      )}

      <button className="btn ghost" onClick={onAddCards}>Ajouter des mots à ce paquet</button>

      <button className="btn ghost" onClick={async () => {
        const name = prompt('Nouveau nom du paquet :', deck.name);
        if (!name?.trim()) return;
        const decks = await repository.listDecks();
        const target = decks.find((d) => d.id === deck.id);
        if (target) { target.name = name.trim(); target.updatedAt = Date.now(); }
        await repository.saveDecks(decks);
        onReload();
      }}>
        Renommer ce paquet
      </button>

      <button className="btn ghost danger" onClick={async () => {
        const message = userId
          ? `Effacer la progression de « ${deck.name} » ?\n\n` +
            'Elle sera effacée sur tous vos appareils, pas seulement celui-ci.'
          : `Effacer la progression de « ${deck.name} » ?`;
        if (!confirm(message)) return;
        // L'ordre compte : si le serveur refuse, on ne veut pas avoir déjà
        // effacé en local une progression qu'il rapatrierait ensuite.
        if (userId) {
          try {
            await clearRemoteProgress(userId, deck.id);
          } catch (e) {
            alert(
              'Effacement impossible sur le serveur : ' + (e as Error).message +
              '\n\nRien n’a été modifié. Réessayez une fois connecté.',
            );
            return;
          }
        }
        await repository.saveProgress(deck.id, {});
        onReload();
      }}>
        Effacer la progression de ce paquet
      </button>

      {!deck.builtin && (
        <button className="btn ghost danger" onClick={async () => {
          if (!confirm(`Supprimer définitivement « ${deck.name} » ?`)) return;
          await repository.deleteDeck(deck.id);
          onBackToLibrary();
        }}>
          Supprimer ce paquet
        </button>
      )}
    </>
  );
}
