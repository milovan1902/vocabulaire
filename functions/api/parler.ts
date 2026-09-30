/**
 * `GET /api/parler` — où en est mon budget du jour ?
 * `POST /api/parler` — un tour de parole.
 *
 * CHANTIER 153 — le détail technique d'une panne reste dans les journaux
 * Cloudflare (console.error) ; il ne repart plus vers le téléphone.
 *
 * CHANTIER 144 — le budget suit la formule du compte (5 min/semaine ou
 * 10 min/jour) et le plafond mensuel de l'app. Voir `quotaDe`.
 *
 * CHANTIER 104 — LE SEUL POINT DE CONTACT AVEC LE MODÈLE
 *
 * Le téléphone n'appelle jamais l'IA : il appelle ceci. L'ordre des quatre
 * gestes n'est pas indifférent —
 *
 *   1. QUI ? le jeton Supabase est vérifié. Sans compte, rien.
 *   2. COMBIEN RESTE-T-IL ? le quota est lu AVANT l'appel. Épuisé, on
 *      refuse, et aucun jeton n'est dépensé.
 *   3. ON APPELLE.
 *   4. ON ÉCRIT CE QUE ÇA A COÛTÉ, puis on renvoie à l'élève le reste de
 *      son temps — en minutes, jamais en jetons.
 *
 * Inverser 2 et 3 serait la seule erreur vraiment coûteuse de ce fichier :
 * un plafond vérifié après coup n'est pas un plafond.
 */
import {
  appelleClaude, consommationDepuis, enPause, json, modeleParler,
  noteConsommation, promptSysteme, quotaDe, utilisateurEtEmail,
  budgetDe, type Budget, type Contexte, type Fiche,
} from './_parler-commun';
import { voixOuverte } from './_parler-commun';

/** Corps attendu d'un tour de parole. */
interface Requete {
  fiche: Fiche;
  /** L'historique de la séance, le dernier tour de l'élève inclus. */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /**
   * CHANTIER 106 — secondes écoulées DEPUIS LE TOUR PRÉCÉDENT, et non
   * depuis le début de la séance. C'est ce qui rend la somme du jour
   * égale au temps réellement parlé, donc le compteur honnête.
   */
  secondes?: number;
}

export const onRequestGet = async ({ request, env }: Contexte): Promise<Response> => {
  const qui = await utilisateurEtEmail(request, env);
  if (!qui) return json({ erreur: 'compte requis' }, 401);
  const q = quotaDe(qui.email, env);

  try {
    const [c, pause] = await Promise.all([consommationDepuis(qui.id, q.depuis, env), enPause(q, env)]);
    return json(budgetDe(c, q, pause));
  } catch (e) {
    /* La jauge s'affiche en panne plutôt qu'en plein — et elle dit pourquoi. */
    console.error('budget illisible', String(e));
    return json({ erreur: 'budget illisible' }, 503);
  }
};

export const onRequestPost = async ({ request, env }: Contexte): Promise<Response> => {
  const qui = await utilisateurEtEmail(request, env);
  if (!qui) return json({ erreur: 'compte requis' }, 401);
  const userId = qui.id;
  const q = quotaDe(qui.email, env);

  let corps: Requete;
  try {
    corps = (await request.json()) as Requete;
  } catch {
    return json({ erreur: 'corps illisible' }, 400);
  }

  /* CHANTIER 139 — pas de conversation avant la 4e, même par appel direct. */
  if (!voixOuverte(corps.fiche?.classe)) {
    return json({ erreur: 'la conversation s’ouvre à partir de la 4e' }, 403);
  }

  if (!Array.isArray(corps.messages) || corps.messages.length === 0) {
    return json({ erreur: 'aucun message' }, 400);
  }

  /*
   * L'historique est BORNÉ à quarante tours. Une séance de dix minutes en
   * compte une trentaine ; au-delà, c'est qu'une séance ne s'est pas
   * terminée proprement, et il n'y a aucune raison de faire payer un
   * historique qui n'en finit pas.
   *
   * À noter, puisque la question revient : l'historique ne s'accumule PAS
   * d'un jour sur l'autre. Chaque séance repart de zéro — il n'y a donc
   * rien à remettre à zéro chaque mois. Ce qui traverse les séances, c'est
   * la fiche d'élève, de taille fixe.
   */
  /*
   * CHANTIER 111 — CHAQUE MESSAGE EST BORNÉ, lui aussi. Un tour d'élève
   * dépasse rarement trois cents caractères ; un micro qui bégaie
   * (« yes yes I yes I play… ») ou une poche restée ouverte peut en
   * envoyer des milliers, et on les repaie à chaque tour suivant puisque
   * l'historique est relu. Au-delà de 800 caractères, on garde la FIN :
   * c'est la phrase la plus complète.
   */
  const MAX_CAR = 800;
  const messages = corps.messages.slice(-40).map((m) =>
    typeof m.content === 'string' && m.content.length > MAX_CAR
      ? { ...m, content: m.content.slice(-MAX_CAR) }
      : m,
  );

  let budgetAvant: Budget;
  try {
    const [c, pause] = await Promise.all([consommationDepuis(userId, q.depuis, env), enPause(q, env)]);
    budgetAvant = budgetDe(c, q, pause);
  } catch (e) {
    /*
     * Quota illisible : on refuse. Laisser passer l'appel serait ouvrir
     * le robinet pendant exactement la panne où l'on ne compte plus rien.
     */
    console.error('budget non vérifié', String(e));
    return json({ erreur: 'le budget n’a pas pu être vérifié' }, 503);
  }
  if (budgetAvant.fini) {
    return json({ erreur: budgetAvant.pause ? 'Parler en pause' : 'quota épuisé', budget: budgetAvant }, 429);
  }

  const modele = modeleParler(env);

  let resultat;
  try {
    resultat = await appelleClaude(
      env,
      modele,
      promptSysteme(corps.fiche),
      messages,
      /*
       * 160 jetons : deux phrases et vingt-cinq mots tiennent dedans. Le
       * prompt le demande déjà, ce plafond le garantit — une consigne se
       * discute, une limite non. Et c'est la moitié de la facture de
       * sortie en moins.
       */
      160,
    );
  } catch (e) {
    /*
     * Un appel qui échoue n'est pas facturé : on n'écrit rien. L'élève
     * garde son temps, ce qui est la seule issue juste.
     */
    console.error('appel au modèle', String(e));
    return json({ erreur: 'le service de conversation n’a pas répondu' }, 502);
  }

  await noteConsommation(userId, modele, resultat.usage, corps.secondes ?? 0, env);

  /*
   * La relecture du quota peut échouer après un appel réussi. Le tour de
   * parole, lui, a bien eu lieu : on le rend avec le budget d'avant
   * plutôt que de transformer une réponse en panne.
   */
  try {
    const apres = await consommationDepuis(userId, q.depuis, env);
    return json({ texte: resultat.texte, budget: budgetDe(apres, q) });
  } catch {
    return json({ texte: resultat.texte, budget: budgetAvant });
  }
};
