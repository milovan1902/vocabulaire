/** Création d'un paquet, ou ajout de mots à un paquet existant. */
import { useState } from 'react';
import type { Card, Deck } from '../domain/types';
import { repository } from '../data/repository';

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

export function Editor({
  mode, deck, existingCards, onCancel, onSaved,
}: {
  mode: 'create' | 'append';
  deck?: Deck;
  existingCards?: Card[];
  onCancel: () => void;
  onSaved: (deckId: string) => void;
}) {
  const [name, setName] = useState('');
  const [theme, setTheme] = useState(mode === 'create' ? 'Général' : '');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [warned, setWarned] = useState(false);

  async function save() {
    const themeName = theme.trim() || 'Général';
    const { rows, badLines } = parseWordList(text);

    if (!rows.length) {
      setError(
        'Aucun mot lisible. Chaque ligne doit contenir le mot anglais, ' +
        'puis le français, séparés par une virgule.',
      );
      return;
    }
    if (badLines.length && !warned) {
      setError(
        `${badLines.length} ligne(s) sans séparateur : ligne ${badLines.slice(0, 6).join(', ')}` +
        `${badLines.length > 6 ? '…' : ''}. Corrigez-les, ou appuyez à nouveau pour enregistrer sans elles.`,
      );
      setWarned(true);
      return;
    }

    if (mode === 'create') {
      if (!name.trim()) { setError('Donnez un nom au paquet.'); return; }
      const id = `d${Date.now().toString(36)}`;
      const cards: Card[] = rows.map((r) => ({
        id: `${id}:${r.en.toLowerCase().replace(/\s+/g, '-')}`,
        en: r.en, fr: r.fr, theme: themeName,
      }));
      const decks = await repository.listDecks();
      decks.push({
        id, name: name.trim(), builtin: false, hasImage: false,
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      await repository.saveDecks(decks);
      await repository.saveCards(id, cards);
      onSaved(id);
      return;
    }

    // Ajout : on ignore les doublons déjà présents.
    const target = deck!;
    const seen = new Set((existingCards ?? []).map((c) => c.en.toLowerCase()));
    const fresh: Card[] = rows
      .filter((r) => !seen.has(r.en.toLowerCase()))
      .map((r) => ({
        id: `${target.id}:${r.en.toLowerCase().replace(/\s+/g, '-')}`,
        en: r.en, fr: r.fr, theme: themeName,
      }));
    await repository.saveCards(target.id, [...(existingCards ?? []), ...fresh]);
    onSaved(target.id);
  }

  return (
    <>
      {mode === 'create' && (
        <div className="field">
          <label htmlFor="deckname">Nom du paquet</label>
          <input
            id="deckname" type="text" value={name} placeholder="Verbes à particule"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="theme">Thème</label>
        <p className="hint">Sert à filtrer les révisions depuis l’écran du paquet.</p>
        <input
          id="theme" type="text" value={theme} placeholder="Général"
          onChange={(e) => setTheme(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="words">Les mots</label>
        <p className="hint">
          Un mot par ligne, anglais puis français, séparés par une virgule,
          un point-virgule ou une tabulation.
        </p>
        <textarea
          id="words" value={text}
          onChange={(e) => { setText(e.target.value); setWarned(false); setError(''); }}
          placeholder={'homework, devoirs\nlocker, casier\nto borrow, emprunter'}
        />
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn" onClick={() => void save()}>
        {mode === 'create' ? 'Créer le paquet' : 'Ajouter au paquet'}
      </button>
      <button className="btn ghost" onClick={onCancel}>Annuler</button>
    </>
  );
}
