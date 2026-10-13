/**
 * `GET /api/admin` — les chiffres du tableau de bord.
 *
 * CHANTIER 266 — RÉSERVÉ À L'EXPLOITANT
 *
 * 1. QUI ? le jeton Supabase est vérifié, puis l'e-mail comparé à
 *    ADMIN_EMAILS (variable Cloudflare, `contact@marlotin.com` par défaut).
 *    Tout autre compte reçoit 403, sans aucun chiffre.
 * 2. LES CHIFFRES sont calculés par Supabase (fonction `admin_tableau`) :
 *    additionner ici des dizaines de milliers de lignes dépasserait le
 *    temps de calcul d'une fonction Cloudflare.
 * 3. « ABONNÉS » = les adresses de PARLER_ILLIMITE (10 min/jour), tant que
 *    les abonnements Google Play ne sont pas branchés.
 */
import { json, plafondMoisCentimes, utilisateurEtEmail, type Contexte, type Env } from './_parler-commun';

type EnvAdmin = Env & { ADMIN_EMAILS?: string; PRIX_ABONNEMENT_EUROS?: string };

const liste = (s: string | undefined): string[] =>
  (s ?? '').split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);

export const onRequestGet = async ({ request, env }: Contexte): Promise<Response> => {
  const e = env as EnvAdmin;
  const u = await utilisateurEtEmail(request, e);
  if (!u) return json({ erreur: 'compte requis' }, 401);

  const admins = liste(e.ADMIN_EMAILS || 'contact@marlotin.com');
  if (!u.email || !admins.includes(u.email.toLowerCase())) {
    return json({ erreur: 'accès réservé', email: u.email }, 403);
  }

  const r = await fetch(`${e.SUPABASE_URL}/rest/v1/rpc/admin_tableau`, {
    method: 'POST',
    headers: {
      apikey: e.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${e.SUPABASE_SERVICE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_illimites: liste(e.PARLER_ILLIMITE) }),
  });
  if (!r.ok) {
    console.error('admin', r.status, await r.text());
    return json({ erreur: 'lecture des statistiques impossible (fonction admin_tableau installée ?)' }, 502);
  }

  const d = (await r.json()) as Record<string, unknown>;
  const prix = Number(e.PRIX_ABONNEMENT_EUROS);
  const rep = json({
    ...d,
    email: u.email,
    maj: new Date().toISOString(),
    prixAbonnement: Number.isFinite(prix) && prix > 0 ? prix : 4.99,
    plafondMois: plafondMoisCentimes(e) / 100,
  });
  rep.headers.set('cache-control', 'no-store');
  return rep;
};
