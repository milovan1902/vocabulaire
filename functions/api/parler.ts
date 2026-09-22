/**
 * `GET /api/parler` — où en est mon budget du jour ?
 * `POST /api/parler` — un tour de parole.
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
  appelleClaude, consommationDuJour, json, minutesRestantes, modeleParler,
  noteConsommation, PLAFOND_CENTIMES_JOUR, promptSysteme, utilisateur,
  type Env, type Fiche,
} from './_parler-commun';

/** Ce que l'écran reçoit. Aucun jeton ne figure ici : ce n'est pas son sujet. */
interface Budget {
  minutes: number;
  /** Vrai quand le quota du jour est épuisé. */
  fini: boolean;
  /**
   * Coût réel, pour la vue exploitant. En centimes d'euro, deux décimales.
   * L'écran ne le montre qu'à vous, derrière un drapeau local.
   */
  coutJour: number;
  appels: number;
}

/** Corps attendu d'un tour de parole. */
interface Requete {
  fiche: Fiche;
  /** L'historique de la séance, le dernier tour de l'élève inclus. */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Secondes écoulées depuis le début de la séance, pour le relevé. */
  secondes?: number;
}

function budgetDe(c: { ponderes: number; coutCentimes: number; appels: number }): Budget {
  const minutes = minutesRestantes(c.ponderes);
  return {
    minutes,
    fini: minutes <= 0 || c.coutCentimes >= PLAFOND_CENTIMES_JOUR,
    coutJour: Number(c.coutCentimes.toFixed(2)),
    appels: c.appels,
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userId = await utilisateur(request, env);
  if (!userId) return json({ erreur: 'compte requis' }, 401);

  const c = await consommationDuJour(userId, env);
  return json(budgetDe(c));
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userId = await utilisateur(request, env);
  if (!userId) return json({ erreur: 'compte requis' }, 401);

  let corps: Requete;
  try {
    corps = (await request.json()) as Requete;
  } catch {
    return json({ erreur: 'corps illisible' }, 400);
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
  const messages = corps.messages.slice(-40);

  const avant = await consommationDuJour(userId, env);
  const budgetAvant = budgetDe(avant);
  if (budgetAvant.fini) {
    return json({ erreur: 'quota du jour épuisé', budget: budgetAvant }, 429);
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
    return json({ erreur: 'le service de conversation n’a pas répondu', detail: String(e) }, 502);
  }

  await noteConsommation(userId, modele, resultat.usage, corps.secondes ?? 0, env);

  const apres = await consommationDuJour(userId, env);
  return json({ texte: resultat.texte, budget: budgetDe(apres) });
};
