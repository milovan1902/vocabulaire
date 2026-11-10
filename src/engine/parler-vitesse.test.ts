/**
 * CHANTIER 406 — l'ordre des attentes dans `parler.ts`.
 *
 * Le réseau est simulé (Supabase, Anthropic) : on vérifie QUI démarre avant QUI,
 * et que les garanties de sécurité tiennent malgré le parallélisme.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../../functions/api/parler';

const env = {
  SUPABASE_URL: 'https://sb.test',
  SUPABASE_SERVICE_KEY: 'svc',
  ANTHROPIC_API_KEY: 'key',
};

interface Scenario {
  profil?: Record<string, unknown> | null;
  adulte?: boolean;
  sonnet?: string;
  haikuIn?: string;
  haikuOut?: string;
  haikuHs?: boolean;
}

let evenements: string[] = [];
let ecritures: Array<{ modele: string; secondes: number }> = [];
let appelsHaiku = 0;
let appelsSonnet = 0;

const dort = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rep = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'content-type': 'application/json' } });

function simule(s: Scenario) {
  const profil = s.profil === undefined
    ? [{ classe: '5e', adulte: s.adulte ? 'B1' : null, majeur_declare_at: s.adulte ? '2026-01-01T00:00:00Z' : null, accord_parental_at: s.adulte ? null : '2026-11-09T10:00:00Z' }]
    : (s.profil ? [s.profil] : []);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    const corps = init?.body ? JSON.parse(String(init.body)) : null;
    if (u.includes('/auth/v1/user')) { await dort(10); return rep({ id: 'u1', email: 'a@b.c' }); }
    if (u.includes('/rest/v1/parler_profil')) { evenements.push('profil:debut'); await dort(30); evenements.push('profil:fin'); return rep(profil); }
    if (u.includes('/rest/v1/rpc/parler_depense_depuis')) { evenements.push('depense:debut'); await dort(30); evenements.push('depense:fin'); return rep(0); }
    if (u.includes('/rest/v1/parler_idees')) { evenements.push('scene:debut'); await dort(30); evenements.push('scene:fin'); return rep([]); }
    if (u.includes('/rest/v1/parler_moderation')) return new Response(null, { status: 201 });
    if (u.includes('/rest/v1/parler_usage')) {
      if (init?.method === 'POST') { ecritures.push({ modele: corps.modele, secondes: corps.secondes }); evenements.push('note'); await dort(10); return new Response(null, { status: 201 }); }
      evenements.push('quota:debut'); await dort(30); evenements.push('quota:fin'); return rep([]);
    }
    if (u.includes('api.anthropic.com')) {
      if (String(corps.model).includes('haiku')) {
        appelsHaiku += 1;
        if (s.haikuHs) return rep({ error: 'panne' }, 500);
        const t = String(corps.messages[0].content);
        const sortie = t.includes('BADREPLY') || t.includes(s.sonnet ?? '#');
        evenements.push(sortie ? 'haiku-sortie:debut' : 'haiku-entree:debut');
        await dort(40);
        const mot = t.includes('flagme') ? (s.haikuIn ?? 'RENCONTRE') : sortie ? (s.haikuOut ?? 'OK') : 'OK';
        return rep({ content: [{ type: 'text', text: mot }], usage: { input_tokens: 5, output_tokens: 1 } });
      }
      appelsSonnet += 1;
      evenements.push('sonnet:debut');
      await dort(150);
      evenements.push('sonnet:fin');
      return rep({ content: [{ type: 'text', text: s.sonnet ?? 'Nice! What did you do?' }], usage: { input_tokens: 100, output_tokens: 10 } });
    }
    return rep({}, 404);
  }));
}

const demande = (message = 'hello') => new Request('https://x/api/parler', {
  method: 'POST',
  headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
  body: JSON.stringify({ fiche: { classe: '5e', grammaire: '', mots: [], themes: [] }, messages: [{ role: 'user', content: message }] }),
});

const appelle = (message?: string) => {
  const attentes: Promise<unknown>[] = [];
  const p = onRequestPost({ request: demande(message), env, waitUntil: (x) => { attentes.push(x); } });
  return { p, attentes };
};

beforeEach(() => {
  evenements = []; ecritures = []; appelsHaiku = 0; appelsSonnet = 0;
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const avant = (a: string, b: string) => evenements.indexOf(a) !== -1 && evenements.indexOf(a) < evenements.indexOf(b);

describe('406 — les lectures partent ensemble', () => {
  it('profil, budget et scène démarrent avant que le premier ait fini', async () => {
    simule({});
    const { p } = appelle();
    const r = await p;
    expect(r.status).toBe(200);
    for (const d of ['profil:debut', 'quota:debut', 'depense:debut']) {
      expect(avant(d, 'profil:fin')).toBe(true);
    }
  });
});

describe('406 — le filtre d\'entrée tourne pendant le grand modèle', () => {
  it('élève : le filtre démarre avant la fin du modèle, et la réponse passe', async () => {
    simule({});
    const { p } = appelle();
    const r = await p;
    const j = await r.json() as { texte: string };
    expect(j.texte).toBe('Nice! What did you do?');
    expect(avant('sonnet:debut', 'sonnet:fin')).toBe(true);
    expect(avant('haiku-entree:debut', 'sonnet:fin')).toBe(true);
    expect(ecritures).toHaveLength(1);
    expect(ecritures[0].modele).toBe('claude-sonnet-4-5');
  });

  it('message écarté : phrase fixe, jamais la réponse du modèle, coût noté HORS QUOTA sans temps retiré', async () => {
    simule({ sonnet: 'SECRET-MODEL-REPLY' });
    const { p, attentes } = appelle('flagme');
    const r = await p;
    const j = await r.json() as { texte: string; filtre?: string };
    expect(j.filtre).toBe('RENCONTRE');
    expect(j.texte).toContain('keep that private');
    expect(j.texte).not.toContain('SECRET-MODEL-REPLY');
    await Promise.all(attentes);
    expect(ecritures).toEqual([{ modele: 'idees:claude-sonnet-4-5', secondes: 0 }]);
  });

  it('filtre d\'entrée en panne : on refuse (503) et rien n\'est montré', async () => {
    simule({ haikuHs: true });
    const { p } = appelle();
    const r = await p;
    expect(r.status).toBe(503);
  });
});

describe('406 — le filtre de sortie reste obligatoire', () => {
  it('réponse refusée : remplacée par une phrase fixe, temps bien compté', async () => {
    simule({ sonnet: 'BADREPLY', haikuOut: 'SEXE' });
    const { p } = appelle();
    const r = await p;
    const j = await r.json() as { texte: string };
    expect(j.texte).toContain('something else');
    expect(j.texte).not.toContain('BADREPLY');
    expect(ecritures).toEqual([{ modele: 'claude-sonnet-4-5', secondes: 0 }]);
  });
});

describe('406 — les garanties d\'avant sont intactes', () => {
  it('sans accord parental : 403, aucun appel au modèle ni au filtre', async () => {
    simule({ profil: { classe: '5e', adulte: null, majeur_declare_at: null, accord_parental_at: null } });
    const { p } = appelle();
    const r = await p;
    expect(r.status).toBe(403);
    expect(((await r.json()) as { code: string }).code).toBe('accord');
    expect(appelsSonnet).toBe(0);
    expect(appelsHaiku).toBe(0);
  });

  it('adulte : pas de filtre, un seul appel au modèle', async () => {
    simule({ adulte: true });
    const { p } = appelle();
    const r = await p;
    expect(r.status).toBe(200);
    expect(appelsHaiku).toBe(0);
    expect(appelsSonnet).toBe(1);
  });

  it('aucun message : 400', async () => {
    simule({});
    const r = await onRequestPost({
      request: new Request('https://x/api/parler', { method: 'POST', headers: { authorization: 'Bearer t' }, body: JSON.stringify({ messages: [] }) }),
      env,
    });
    expect(r.status).toBe(400);
  });
});
