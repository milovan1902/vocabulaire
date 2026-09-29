/**
 * CHANTIER 137 — supprimer son compte, côté téléphone.
 *
 * Le téléphone ne sait rien effacer lui-même en base : il demande à la
 * fonction Cloudflare, qui vérifie le jeton puis efface avec la clé de
 * service. Ensuite seulement, il vide l'appareil et ferme la session.
 */
import { supabase } from './supabase';
import { repository } from './repository';

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
    const d = (await r.json().catch(() => ({}))) as { erreur?: string };
    throw new Error(d.erreur ?? 'La suppression n’a pas abouti, réessaie dans un instant.');
  }

  /*
   * Le compte n'existe plus : on vide aussi l'appareil, sinon la
   * progression effacée en ligne resterait ici, et la prochaine connexion
   * la renverrait en base. `importAll({})` efface toutes les clés de
   * l'utilisateur local sans rien réécrire.
   */
  await repository.importAll({});
  await supabase.auth.signOut().catch(() => undefined);
}
