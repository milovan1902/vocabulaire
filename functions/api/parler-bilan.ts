/**
 * `POST /api/parler-bilan` — le compte rendu de fin de séance.
 *
 * CHANTIER 104 — LE SEUL APPEL QUI MÉRITE LE GRAND MODÈLE
 *
 * Une séance fait deux sortes d'appels. Pendant la conversation, une
 * trentaine d'échanges courts où seule la VITESSE compte : un silence de
 * trois secondes tue l'illusion de parler à quelqu'un. À la fin, un seul
 * appel qui relit toute la transcription et en tire trois corrections et
 * cinq mots — un travail de lecture, de comparaison et de hiérarchie.
 *
 * C'est là, et seulement là, que le modèle le plus fort se justifie : la
 * lenteur ne se voit plus (l'élève a fini de parler, il attend un bilan) et
 * la qualité se voit, elle, parce que c'est le seul texte qu'il relira.
 *
 * Un appel par jour et par élève. Quelques centimes.
 *
 * LA SORTIE EST DU JSON, et c'est ce qui rend le bilan utilisable : les
 * mots retenus peuvent alors partir en cartes, et les erreurs incrémenter
 * la fiche d'élève. Un bilan en prose serait joli et mort.
 */
import {
  appelleClaude, consommationDuJour, json, minutesRestantes, modeleBilan,
  noteConsommation, noteSeance, promptSysteme, utilisateur,
  type Contexte, type Fiche,
} from './_parler-commun';

interface Requete {
  fiche: Fiche;
  /** La séance entière, dans l'ordre. */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Secondes depuis le dernier tour — l'écart, comme partout ailleurs. */
  secondes?: number;
  /** Durée totale de la séance, pour l'archive. Elle, c'est un total. */
  totalSecondes?: number;
}

export interface Bilan {
  corrections: Array<{ dit: string; juste: string; pourquoi: string; fois?: number }>;
  mots: Array<{ en: string; fr: string }>;
}

const CONSIGNE = `Tu relis une conversation orale en anglais entre un élève
français et son partenaire de conversation. L'élève est le rôle « user ».

Rends UNIQUEMENT un objet JSON, sans texte autour, sans balise de code :

{"corrections":[{"dit":"…","juste":"…","pourquoi":"…"}],"mots":[{"en":"…","fr":"…"}]}

corrections — TROIS au maximum, et moins s'il y a moins à dire. Tu retiens
ce qui REVIENT ou ce qui gêne la compréhension ; tu ignores les hésitations
et les fautes d'inattention. « dit » est la phrase fautive de l'élève,
telle qu'il l'a dite. « juste » est la même phrase corrigée. « pourquoi »
explique en FRANÇAIS, en une phrase de moins de vingt mots, sans jargon
grammatical inutile.

mots — CINQ au maximum : des mots ou expressions que l'élève a RENCONTRÉS
dans la conversation sans les maîtriser, et qui valent d'être appris. Jamais
un mot qu'il a déjà employé juste, jamais un mot de la liste qu'il connaît
déjà. « en » est la forme anglaise, « fr » la traduction française courte.

Si la conversation est trop courte pour dire quelque chose d'honnête, rends
des listes vides. Un bilan inventé est pire que pas de bilan.`;

/** Extrait l'objet JSON même si le modèle l'a enrobé. */
function litBilan(texte: string): Bilan {
  const vide: Bilan = { corrections: [], mots: [] };
  const debut = texte.indexOf('{');
  const fin = texte.lastIndexOf('}');
  if (debut < 0 || fin <= debut) return vide;
  try {
    const b = JSON.parse(texte.slice(debut, fin + 1)) as Partial<Bilan>;
    return {
      corrections: Array.isArray(b.corrections) ? b.corrections.slice(0, 3) : [],
      mots: Array.isArray(b.mots) ? b.mots.slice(0, 5) : [],
    };
  } catch {
    return vide;
  }
}

export const onRequestPost = async ({ request, env }: Contexte): Promise<Response> => {
  const userId = await utilisateur(request, env);
  if (!userId) return json({ erreur: 'compte requis' }, 401);

  let corps: Requete;
  try {
    corps = (await request.json()) as Requete;
  } catch {
    return json({ erreur: 'corps illisible' }, 400);
  }

  const messages = (corps.messages ?? []).slice(-40);
  if (messages.length < 4) {
    /*
     * Moins de deux échanges : il n'y a rien à relire. On ne dépense pas un
     * appel du grand modèle pour produire un bilan poli et creux.
     */
    return json({ bilan: { corrections: [], mots: [] }, trop_court: true });
  }

  /*
   * LE QUOTA N'EST PAS VÉRIFIÉ ICI, et c'est voulu : le bilan est la
   * contrepartie du temps déjà passé. Refuser le compte rendu à l'élève qui
   * vient d'épuiser ses dix minutes serait lui prendre son travail. Le
   * coût est écrit comme le reste, et un bilan par séance est borné par
   * construction.
   */
  const modele = modeleBilan(env);

  /*
   * La transcription est passée comme un seul message, et la conversation
   * est remise à plat : le modèle doit la LIRE, pas la continuer. Envoyée
   * telle quelle en rôles alternés, il répondrait à l'élève.
   */
  const transcription = messages
    .map((m) => `${m.role === 'user' ? 'ÉLÈVE' : 'PARTENAIRE'} : ${m.content}`)
    .join('\n');

  let resultat;
  try {
    resultat = await appelleClaude(
      env,
      modele,
      /*
       * Le prompt de la séance est rappelé en tête : il dit le niveau et les
       * mots travaillés, sans quoi le bilan corrigerait des tournures que
       * l'élève n'a pas encore vues.
       */
      `${promptSysteme(corps.fiche)}\n\n---\n\n${CONSIGNE}`,
      [{ role: 'user', content: transcription }],
      900,
      false,
    );
  } catch (e) {
    return json({ erreur: 'le bilan n’a pas pu être établi', detail: String(e) }, 502);
  }

  await noteConsommation(userId, modele, resultat.usage, corps.secondes ?? 0, env);

  const bilan = litBilan(resultat.texte);

  /*
   * CHANTIER 106 — ON RANGE LA SÉANCE.
   *
   * La transcription entière et le compte rendu partent en archive, sous
   * le compte de l'élève. C'est ce qui manquait pour répondre à « où puis-je
   * retrouver ma conversation ? » — et c'est aussi la seule source honnête
   * du volume réel d'une séance de dix minutes.
   */
  await noteSeance(userId, {
    secondes: corps.totalSecondes ?? corps.secondes ?? 0,
    repliques: messages.length,
    themes: corps.fiche?.themes ?? [],
    classe: corps.fiche?.classe ?? null,
    transcription: messages,
    corrections: bilan.corrections,
    mots: bilan.mots,
  }, env);

  try {
    const c = await consommationDuJour(userId, env);
    return json({
      bilan,
      budget: {
        minutes: minutesRestantes(c.ponderes, c.secondes),
        coutJour: Number(c.coutCentimes.toFixed(2)),
        appels: c.appels,
      },
    });
  } catch {
    /* Le bilan passe avant la jauge : on le rend sans elle. */
    return json({ bilan });
  }
};
