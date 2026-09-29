/**
 * `POST /api/mesure` — un événement d'usage anonyme.
 *
 * CHANTIER 147 — Pas de compte requis, aucune adresse IP gardée. Seuls les
 * événements de la liste ci-dessous sont acceptés : un appel forgé ne peut
 * pas remplir la table de n'importe quoi.
 */
import { json, type Contexte } from './_parler-commun';

const EVENEMENTS = new Set([
  'installation', 'ouverture', 'onboarding', 'onboarding_fini', 'revision', 'parler', 'compte',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const onRequestPost = async ({ request, env }: Contexte): Promise<Response> => {
  const brut = await request.text();
  if (brut.length > 500) return json({ erreur: 'trop long' }, 413);
  let c: { install?: string; evenement?: string; detail?: string };
  try { c = JSON.parse(brut); } catch { return json({ erreur: 'corps illisible' }, 400); }

  if (!c.install || !UUID.test(c.install)) return json({ erreur: 'identifiant invalide' }, 400);
  if (!c.evenement || !EVENEMENTS.has(c.evenement)) return json({ erreur: 'événement inconnu' }, 400);
  const detail = typeof c.detail === 'string' ? c.detail.replace(/[^a-z0-9_-]/gi, '').slice(0, 40) : null;

  const r = await fetch(env.SUPABASE_URL + '/rest/v1/app_mesure', {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({ install: c.install, evenement: c.evenement, detail }),
  });
  if (!r.ok) {
    console.error('mesure', r.status, await r.text());
    return json({ ok: false }, 502);
  }
  return json({ ok: true });
};
