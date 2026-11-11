import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../../functions/api/photo-liste';

/* 408 — la photo : redressement, garde-fou contre l'invention, mode « Un texte ». */
const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'x', ANTHROPIC_API_KEY: 'k', ADMIN_EMAILS: 'a@b.fr' } as never;

function reseau(reponseModele: string) {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'u1', email: 'a@b.fr' }), { status: 200 });
    if (u.includes('api.anthropic.com')) {
      return new Response(JSON.stringify({ content: [{ type: 'text', text: reponseModele }], usage: { input_tokens: 10, output_tokens: 10 } }), { status: 200 });
    }
    return new Response(init?.method === 'POST' ? null : '[]', { status: init?.method === 'POST' ? 201 : 200 });
  }));
}

async function envoie(corps: object) {
  const r = await onRequestPost({
    request: new Request('https://x/api/photo-liste', { method: 'POST', headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, body: JSON.stringify({ image: 'AAAA', type: 'image/jpeg', ...corps }) }),
    env,
  });
  return { statut: r.status, corps: (await r.json()) as Record<string, unknown> };
}

afterEach(() => vi.unstubAllGlobals());

describe('408 — la photo', () => {
  it('photo de travers : le modèle compte à l\'envers, le téléphone reçoit l\'angle horaire', async () => {
    reseau('SENS : 90');
    expect(await envoie({ mode: 'liste' })).toMatchObject({ statut: 409, corps: { angle: 270 } });
    reseau('SENS : 270');
    expect(await envoie({ mode: 'texte' })).toMatchObject({ statut: 409, corps: { angle: 90 } });
  });

  it('liste : un mot absent de la copie est écarté, et plus rien n\'est rendu si tout est inventé', async () => {
    reseau('SENS : 0\nLU\nthe kitchen | la cuisine\nto borrow | emprunter\nMOTS\nthe kitchen ; la cuisine\nto borrow ; emprunter\nwednesday ; mercredi');
    const ok = await envoie({ mode: 'liste' });
    expect((ok.corps.mots as Array<{ en: string }>).map((m) => m.en)).toEqual(['the kitchen', 'to borrow']);
    reseau('SENS : 0\nLU\nthe kitchen | la cuisine\nMOTS\nwednesday ; mercredi\npugsley ; pugsley');
    expect((await envoie({ mode: 'liste' })).statut).toBe(422);
  });

  it('texte : mots rendus tels qu\'écrits dans le texte, inventions écartées, nombre respecté', async () => {
    reseau('SENS : 0\nLU\nThe parents have got two children.\nMOTS\nparents ; parents\nchildren ; enfants\nuncle ; oncle\nhave ; avoir');
    const r = await envoie({ mode: 'texte', nombre: 3 });
    expect((r.corps.mots as Array<{ en: string }>).map((m) => m.en)).toEqual(['parents', 'children', 'have']);
  });

  it('texte illisible : AUCUN donne 422', async () => {
    reseau('SENS : 0\nAUCUN');
    expect((await envoie({ mode: 'texte' })).statut).toBe(422);
  });
});
