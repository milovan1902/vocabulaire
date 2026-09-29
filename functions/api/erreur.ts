/**
 * `POST /api/erreur` — une erreur JavaScript relevée sur un téléphone.
 *
 * CHANTIER 145 — Pas de compte requis : une erreur peut survenir avant la
 * connexion. Aucun identifiant, aucune adresse IP n'est enregistré.
 *
 * Une même erreur (même message, même endroit) ne fait qu'UNE ligne par
 * jour, avec un compteur : mille élèves qui tombent sur le même bug font
 * une ligne « 1000 fois », pas mille lignes.
 *
 * Alerte par e-mail à la PREMIÈRE apparition du jour d'une erreur, si
 * RESEND_API_KEY et ALERTE_EMAIL sont posés dans Cloudflare. Sinon, rien
 * n'est envoyé et la table suffit.
 */
import { json, type Env } from './_parler-commun';

interface EnvErreur extends Env {
  RESEND_API_KEY?: string;
  ALERTE_EMAIL?: string;
}

interface Requete {
  message?: string;
  pile?: string;
  origine?: string;
  page?: string;
  navigateur?: string;
}

const coupe = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '');

async function empreinte(texte: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
  return [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost = async ({ request, env }: { request: Request; env: EnvErreur }): Promise<Response> => {
  const brut = await request.text();
  if (brut.length > 6000) return json({ erreur: 'trop long' }, 413);
  let c: Requete;
  try { c = JSON.parse(brut) as Requete; } catch { return json({ erreur: 'corps illisible' }, 400); }

  const message = coupe(c.message, 300);
  if (!message) return json({ erreur: 'message manquant' }, 400);
  const pile = coupe(c.pile, 1500);
  const signature = await empreinte(message + '|' + (pile.split('\n')[1] ?? ''));

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/app_erreur_note`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_signature: signature,
      p_message: message,
      p_pile: pile,
      p_origine: coupe(c.origine, 30),
      p_page: coupe(c.page, 200),
      p_navigateur: coupe(c.navigateur, 200),
    }),
  });
  if (!r.ok) {
    console.error('suivi erreur', r.status, await r.text());
    return json({ ok: false }, 502);
  }
  const nouvelle = (await r.json()) === true;

  if (nouvelle && env.RESEND_API_KEY && env.ALERTE_EMAIL) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'Ma Parole <onboarding@resend.dev>',
        to: env.ALERTE_EMAIL,
        subject: `Erreur Ma Parole : ${message.slice(0, 80)}`,
        text: `Nouvelle erreur aujourd'hui.\n\nMessage : ${message}\nPage : ${coupe(c.page, 200)}\nOrigine : ${coupe(c.origine, 30)}\nNavigateur : ${coupe(c.navigateur, 200)}\n\n${pile}\n\nDétail et compteur : Supabase → Table Editor → app_erreur.`,
      }),
    }).catch((e) => console.error('alerte e-mail', String(e)));
  }
  return json({ ok: true });
};
