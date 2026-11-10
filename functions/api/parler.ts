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
 *
 * CHANTIER 406 — MOINS D'ATTENTE, MÊMES GARANTIES. Rien ne change dans ce que
 * le serveur REFUSE ; seul l'ordre dans lequel il ATTEND change :
 *   - le profil, le budget et la scène sont lus ENSEMBLE, et jugés ensuite
 *     dans le même ordre qu'avant (profil, accord, budget) ;
 *   - le filtre qui lit le message de l'élève tourne PENDANT l'appel au
 *     grand modèle. Si le message est écarté, la réponse du modèle est jetée
 *     et jamais montrée : l'élève reçoit la phrase fixe, comme avant. L'appel
 *     jeté a coûté quelques jetons : il est noté HORS QUOTA (l'élève ne perd
 *     pas de temps de parole) mais dans le plafond mensuel de l'app ;
 *   - l'écriture de la consommation, la relecture du budget et le filtre de
 *     SORTIE se font ensemble. Le filtre de sortie reste obligatoire avant
 *     d'afficher quoi que ce soit à un élève.
 * Chaque tour écrit une ligne `[parler]` dans les journaux Cloudflare avec la
 * durée de chaque étape, en millisecondes, pour mesurer au lieu de supposer.
 */
import {
  appelleClaude, consommationDepuis, enPause, json, modeleParler,
  noteConsommation, promptSysteme, quotaDe, utilisateurEtEmail,
  budgetDe, type Budget, type Contexte, type Fiche,
} from './_parler-commun';
import { sceneDeFiche } from './_parler-commun';
import {
  ficheVerifiee, journalise, modere, profilDe, reponseDeRepli, verdictProfil,
  type Categorie,
} from './_protection';

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

export const onRequestPost = async ({ request, env, waitUntil }: Contexte): Promise<Response> => {
  const t0 = Date.now();
  const T: Record<string, number> = {};
  const marque = (k: string) => { T[k] = Date.now() - t0; };
  /* 407 — la durée PROPRE de chaque appel, pour estimer ce qu'aurait pris l'ancien déroulement, un à un. */
  const D: Record<string, number> = {};
  const chrono = <A,>(k: string, p: Promise<A>): Promise<A> => {
    const t = Date.now();
    return p.finally(() => { D[k] = Date.now() - t; });
  };
  const trace = (issue: string) => {
    const reel = T.fin ?? Date.now() - t0;
    /* Avant le 406, tout s'attendait à la suite : le total était la SOMME des étapes. */
    const seq = (T.auth ?? 0)
      + (D.profil ?? 0) + (D.budget ?? 0) + (D.scene ?? 0)
      + (D.f_entree ?? 0) + (D.modele ?? 0) + (D.note ?? 0) + (D.quota ?? 0) + (D.f_sortie ?? 0);
    console.log('[parler]', JSON.stringify({ issue, total: reel, seq_estime: seq, gain_estime: seq - reel, ...T, appels: D }));
  };

  const qui = await utilisateurEtEmail(request, env);
  marque('auth');
  if (!qui) return json({ erreur: 'compte requis' }, 401);
  const userId = qui.id;
  const q = quotaDe(qui.email, env);

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
   * 406 — LES TROIS LECTURES, ENSEMBLE. Elles ne dépendent que du compte.
   * Leurs résultats sont jugés plus bas dans l'ordre d'avant : profil
   * illisible (503), profil refusé (403), budget illisible (503), budget
   * épuisé (429).
   */
  const [rProfil, rBudget, rScene] = await Promise.allSettled([
    chrono('profil', profilDe(userId, env)),
    chrono('budget', Promise.all([consommationDepuis(userId, q.depuis, env), enPause(q, env)])),
    chrono('scene', sceneDeFiche(userId, corps.fiche, env)),
  ]);
  marque('lectures');

  /*
   * CHANTIER 139 / 402 — qui peut parler se décide sur le PROFIL DU SERVEUR
   * (classe, majorité déclarée, accord parental daté), jamais sur la fiche
   * envoyée par le téléphone. Profil illisible = refus.
   */
  if (rProfil.status === 'rejected') {
    console.error('profil illisible', String(rProfil.reason));
    return json({ erreur: 'le profil n’a pas pu être vérifié' }, 503);
  }
  const profil = rProfil.value;
  const v = verdictProfil(profil);
  if (!v.ok || !profil) {
    return json({ erreur: v.ok ? 'profil à déclarer' : v.erreur, code: v.ok ? 'profil' : v.code }, 403);
  }
  const fiche = ficheVerifiee(corps.fiche, profil);
  /* 402 — tout non-adulte passe par la modération. */
  const filtre = !profil.adulte;

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

  if (rBudget.status === 'rejected') {
    /*
     * Quota illisible : on refuse. Laisser passer l'appel serait ouvrir
     * le robinet pendant exactement la panne où l'on ne compte plus rien.
     */
    console.error('budget non vérifié', String(rBudget.reason));
    return json({ erreur: 'le budget n’a pas pu être vérifié' }, 503);
  }
  const [c0, pause] = rBudget.value;
  const budgetAvant: Budget = budgetDe(c0, q, pause);
  if (budgetAvant.fini) {
    return json({ erreur: budgetAvant.pause ? 'Parler en pause' : 'quota épuisé', budget: budgetAvant }, 429);
  }

  const modele = modeleParler(env);
  const scene = rScene.status === 'fulfilled' ? rScene.value : null;

  /*
   * 406 — LE FILTRE ET LE GRAND MODÈLE PARTENT ENSEMBLE. Le plafond du budget
   * a été vérifié juste au-dessus : rien n'est dépensé au-delà. Le filtre
   * d'entrée, plus rapide, est attendu en premier ; la réponse du modèle ne
   * sera lue que s'il laisse passer le message.
   */
  const dernier = [...messages].reverse().find((m) => m.role === 'user');
  /* Le prompt est construit AVANT de lancer quoi que ce soit : s'il échoue, aucun appel n'est parti. */
  const systeme = promptSysteme(fiche, scene);
  const entree = filtre && dernier ? chrono('f_entree', modere(dernier.content, env)) : null;
  /* Une promesse qu'on n'attend pas ne doit pas faire tomber la fonction. */
  entree?.catch(() => undefined);
  const appel = chrono('modele', appelleClaude(
    env,
    modele,
    systeme,
    messages,
    /*
     * 160 jetons : deux phrases et vingt-cinq mots tiennent dedans. Le
     * prompt le demande déjà, ce plafond le garantit — une consigne se
     * discute, une limite non. Et c'est la moitié de la facture de
     * sortie en moins.
     */
    /* 371 — une explication demande plus de place qu'une réplique. */
    fiche.phrases?.length ? 420 : 160,
  ));
  appel.catch(() => undefined);

  /*
   * 402 — LE MESSAGE DE L'ÉLÈVE, AVANT TOUTE RÉPONSE. Écarté, il n'est jamais
   * suivi d'une réponse du modèle : l'élève reçoit une phrase fixe, et ne perd
   * pas de temps de parole. Filtre en panne = refus.
   */
  if (entree) {
    let c: Categorie;
    try {
      c = await entree;
    } catch (e) {
      console.error('modération (message)', String(e));
      return json({ erreur: 'le filtre de sécurité n’a pas répondu' }, 503);
    }
    marque('filtre-entree');
    if (c !== 'OK') {
      await journalise(userId, 'message', c, profil.classe, env);
      /* L'appel lancé en parallèle a coûté : noté hors quota (l'élève n'y perd rien), dans le plafond du mois. */
      waitUntil?.(
        appel.then((r) => noteConsommation(userId, modele, r.usage, 0, env, true)).catch(() => undefined),
      );
      trace(`ecarte:${c}`);
      return json({ texte: reponseDeRepli(c), budget: budgetAvant, filtre: c });
    }
  }

  let resultat;
  try {
    resultat = await appel;
  } catch (e) {
    /*
     * Un appel qui échoue n'est pas facturé : on n'écrit rien. L'élève
     * garde son temps, ce qui est la seule issue juste.
     */
    console.error('appel au modèle', String(e));
    return json({ erreur: 'le service de conversation n’a pas répondu' }, 502);
  }
  marque('modele');

  /*
   * 406 — TROIS CHOSES ENSEMBLE : noter ce que l'appel a coûté, relire le
   * budget (après la note), et faire relire la réponse par le filtre. Le
   * temps, lui, est bien compté : l'appel a eu lieu.
   */
  const note = chrono('note', noteConsommation(userId, modele, resultat.usage, corps.secondes ?? 0, env));
  note.catch(() => undefined);
  /* La relecture du quota peut échouer après un appel réussi : alors on rend le budget d'avant. */
  const apres = note
    .then(() => chrono('quota', consommationDepuis(userId, q.depuis, env)))
    .then((c) => budgetDe(c, q), () => null);
  const sortie = filtre ? chrono('f_sortie', modere(resultat.texte, env)) : null;
  sortie?.catch(() => undefined);

  /*
   * 402 — LA RÉPONSE, AVANT L'ÉLÈVE. Si le filtre la refuse, elle est
   * remplacée par une phrase fixe. Filtre en panne = on ne montre rien.
   */
  let texte = resultat.texte;
  if (sortie) {
    try {
      const c = await sortie;
      if (c !== 'OK') {
        await journalise(userId, 'reponse', c, profil.classe, env);
        texte = reponseDeRepli(c === 'DETRESSE' ? 'AUTRE' : c);
      }
    } catch (e) {
      console.error('modération (réponse)', String(e));
      await note.catch(() => undefined);
      return json({ erreur: 'le filtre de sécurité n’a pas répondu' }, 503);
    }
    marque('filtre-sortie');
  }

  await note;
  const budget = (await apres) ?? budgetAvant;
  marque('fin');
  trace('ok');
  return json({ texte, budget });
};
