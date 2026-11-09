import { describe, expect, it } from 'vitest';
import { passages } from './speech';

describe('403 — la pause entre deux citations', () => {
  const texte = 'Pour la langue, on dit "Spanish" en anglais, pas "Spain". "Spain" est le pays, l\'Espagne.';

  it('garde le point entre les deux « Spain » (pas de « Spain Spain » d\'une traite)', () => {
    const p = passages(texte);
    const en = p.filter((x) => x.langue === 'en-US').map((x) => x.texte);
    expect(en.join(' ')).toContain('Spain. Spain');
  });

  it('ne dit toujours pas un « . » isolé', () => {
    const p = passages('Tu peux dire "I went".');
    expect(p.every((x) => /[\p{L}\p{N}]/u.test(x.texte))).toBe(true);
    expect(p[p.length - 1].texte).toBe('I went.');
  });
});
