/**
 * CHANTIER 137 — supprimer son compte, côté téléphone.
 *
 * Le téléphone ne sait rien effacer lui-même en base : il demande à la
 * fonction Cloudflare, qui vérifie le jeton puis efface avec la clé de
 * service. Ensuite seulement, il vide l'appareil et ferme la session.
 */
import { supabase } from './supabase';
import { repository } from './repository';
import { appareilNeuf } from './appareil';

export async function supprimeCompte(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const jeton = data.session?.access_token;
  if (!jeton) throw new Error('Tu n’es plus connecté : reconnecte-toi, puis recommence.');

  let r: Response;
  try {
    r = await fetch('/api/compte', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${jeton}` },
    });
  } catch {
    throw new Error('Pas de connexion internet : la suppression demande d’être en ligne.');
  }
  if (!r.ok) {
    /* 330 — sans réponse JSON (erreur de Cloudflare), on garde le début du texte reçu. */
    const brut = await r.text().catch(() => '');
    let d: { erreur?: string; etape?: string; code?: string | null } = {};
    try { d = JSON.parse(brut); } catch { /* pas du JSON */ }
    /* 328 — l'étape qui bloque est gardée dans le message : elle part au suivi des
       erreurs (app_erreur, origine « compte »). L'élève lit toujours une phrase simple. */
    const etape = d.etape ? ` [${d.etape}${d.code ? ` ${d.code}` : ''}]` : ` [http ${r.status} ${brut.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)}]`;
    throw new Error((d.erreur ?? 'La suppression n’a pas abouti, réessaie dans un instant.') + etape);
  }

  /*
   * Le compte n'existe plus : on vide aussi l'appareil, sinon la
   * progression effacée en ligne resterait ici, et la prochaine connexion
   * la renverrait en base. `importAll({})` efface toutes les clés de
   * l'utilisateur local sans rien réécrire.
   */
  await repository.importAll({});
  /* 334 — l'appareil redevient neuf : au rechargement, l'accueil puis la visite. */
  appareilNeuf();
  await supabase.auth.signOut().catch(() => undefined);
}
