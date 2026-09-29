/**
 * `POST /api/signaler` — signaler une réponse de la conversation.
 *
 * CHANTIER 142 — GOOGLE PLAY L'EXIGE POUR TOUTE IA GÉNÉRATIVE
 *
 * Une application qui produit du contenu par IA doit permettre de signaler
 * une réponse sans quitter l'app. Le signalement est rangé dans la table
 * `parler_signalement`, que l'exploitant relit depuis Supabase.
 *
 * Ce qui part : la réponse signalée, les six répliques qui la précèdent
 * (sans elles on ne peut pas juger), le motif, la classe. Rien d'autre.
 * L'identifiant vient du jeton, jamais du corps.
 */
import { json, jourUtc, utilisateur, type Contexte } from './_parler-commun';

const MOTIFS = new Set(['inapproprie', 'faux', 'blessant', 'autre']);
const MAX = 800;

interface Requete {
  reponse?: string;
  contexte?: Array<{ role: 'user' | 'assistant'; content: string }>;
  motif?: string;
  classe?: string | null;
}

export const onRequestPost = async ({ request, env }: Contexte): Promise<Response> => {
  const userId = await utilisateur(request, env);
  if (!userId) return json({ erreur: 'compte requis' }, 401);

  let c: Requete;
  try { c = (await request.json()) as Requete; } catch { return json({ erreur: 'corps illisible' }, 400); }

  const reponse = typeof c.reponse === 'string' ? c.reponse.slice(0, MAX) : '';
  if (!reponse) return json({ erreur: 'réponse manquante' }, 400);
  const motif = c.motif && MOTIFS.has(c.motif) ? c.motif : 'autre';
  const contexte = (Array.isArray(c.contexte) ? c.contexte : [])
    .slice(-6)
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX) }));

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/parler_signalement`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      jour: jourUtc(),
      motif,
      reponse,
      contexte,
      classe: typeof c.classe === 'string' ? c.classe.slice(0, 10) : null,
    }),
  });
  if (!r.ok) {
    console.error('signalement', r.status, await r.text());
    return json({ erreur: 'le signalement n’a pas pu être envoyé' }, 502);
  }
  return json({ ok: true });
};
