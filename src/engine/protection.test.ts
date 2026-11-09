/**
 * CHANTIER 402 — les règles d'accès à Parler, côté serveur.
 * Ce sont des fonctions pures : aucune clé, aucun réseau.
 */
import { describe, expect, it } from 'vitest';
import { verdictProfil, ficheVerifiee, reponseDeRepli, type Profil } from '../../functions/api/_protection';
import { securiteDe } from '../../functions/api/_parler-commun';

const base: Profil = { classe: '6e', adulte: null, majeurDeclareLe: null, accordParentalLe: null };

describe('verdictProfil', () => {
  it('refuse sans profil', () => {
    expect(verdictProfil(null)).toMatchObject({ ok: false, code: 'profil' });
  });
  it('refuse sans classe', () => {
    expect(verdictProfil({ ...base, classe: null })).toMatchObject({ ok: false, code: 'classe' });
  });
  it('refuse une classe inconnue (CM2)', () => {
    expect(verdictProfil({ ...base, classe: 'CM2' })).toMatchObject({ ok: false, code: 'classe' });
  });
  it('refuse un élève de 6e à 3e sans accord parental', () => {
    for (const c of ['6e', '5e', '4e', '3e']) {
      expect(verdictProfil({ ...base, classe: c })).toMatchObject({ ok: false, code: 'accord' });
    }
  });
  it('ouvre un élève de 6e à 3e avec l’accord daté', () => {
    for (const c of ['6e', '5e', '4e', '3e']) {
      expect(verdictProfil({ ...base, classe: c, accordParentalLe: '2026-11-09T10:00:00Z' })).toEqual({ ok: true });
    }
  });
  it('ouvre le lycée sans accord supplémentaire', () => {
    for (const c of ['2de', '1re', 'Tle']) {
      expect(verdictProfil({ ...base, classe: c })).toEqual({ ok: true });
    }
  });
  it('refuse un adulte qui n’a pas déclaré ses 18 ans', () => {
    expect(verdictProfil({ ...base, adulte: 'B1' })).toMatchObject({ ok: false, code: 'majeur' });
  });
  it('ouvre un adulte qui a déclaré ses 18 ans', () => {
    expect(verdictProfil({ ...base, adulte: 'B1', majeurDeclareLe: '2026-11-09T10:00:00Z' })).toEqual({ ok: true });
  });
});

describe('ficheVerifiee', () => {
  it('écrase la classe et le niveau d’adulte envoyés par le téléphone', () => {
    const f = ficheVerifiee({ classe: 'Tle', adulte: 'B2' }, { ...base, classe: '6e' });
    expect(f.classe).toBe('6e');
    expect(f.adulte).toBeUndefined();
  });
});

describe('securiteDe', () => {
  it('rend les règles des plus jeunes pour la 6e et la 5e', () => {
    expect(securiteDe(null, '6e')).toContain('PLUS JEUNES');
    expect(securiteDe(null, '5e')).toContain('PLUS JEUNES');
  });
  it('ne les rend pas à partir de la 4e', () => {
    expect(securiteDe(null, '4e')).not.toContain('PLUS JEUNES');
    expect(securiteDe(null, '4e')).toContain('enfant ou un adolescent');
  });
  it('rend les règles adultes à un adulte', () => {
    expect(securiteDe('B1', '6e')).toContain('un adulte');
  });
});

describe('reponseDeRepli', () => {
  it('donne les numéros d’aide en cas de détresse', () => {
    const t = reponseDeRepli('DETRESSE');
    for (const n of ['119', '3018', '3114', '112']) expect(t).toContain(n);
  });
  it('reste en anglais simple pour les autres catégories', () => {
    expect(reponseDeRepli('SEXE')).toContain('something else');
  });
});
