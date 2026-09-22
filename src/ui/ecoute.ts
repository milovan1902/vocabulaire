/**
 * L'écoute — la reconnaissance vocale du navigateur.
 *
 * CHANTIER 105 — LE MICRO.
 * CHANTIER 106 — LE MICRO QUI NE COUPE PLUS LA PAROLE.
 *
 * CE QUI N'ALLAIT PAS. La reconnaissance était ouverte en mode
 * `continuous = false`. Ce réglage laisse le NAVIGATEUR décider quand
 * l'élève a fini : il ferme la session au premier silence un peu net,
 * après environ une seconde et demie sur Android. Pour un adulte qui
 * parle sa langue, c'est juste. Pour un élève français qui cherche ses
 * mots en anglais, c'est une phrase coupée en deux — et la moitié perdue
 * part au modèle comme si elle était complète.
 *
 * CE QU'ON FAIT À LA PLACE. On ouvre la session en continu, et c'est NOUS
 * qui décidons de la fin, sur trois règles :
 *
 *   1. UN SILENCE DE TROIS SECONDES après quelque chose d'entendu ferme le
 *      tour. Trois secondes est long à la lecture et court à l'oral : c'est
 *      le temps d'un « euh… » et d'un mot retrouvé.
 *   2. LA SESSION QUI SE FERME TOUTE SEULE EST ROUVERTE. Android et Chrome
 *      coupent quoi qu'on dise, au bout de quelques secondes de silence ou
 *      d'une minute de parole. On relance, et ce qui avait été entendu est
 *      conservé : pour l'élève, rien ne s'est passé.
 *   3. DEUX GARDE-FOUS : quinze secondes sans un seul mot ferment le tour
 *      (le micro a été ouvert par mégarde), et deux minutes de parole le
 *      ferment aussi (le téléphone est resté ouvert dans une poche).
 *
 * Le reste est comme au 105 : tout vient du navigateur, rien n'est
 * facturé, aucun service tiers. Et l'anglais reste imposé — sans cela le
 * navigateur écoute dans la langue du système, et « I have a dog » se
 * transcrit « j'ai vedogue ».
 */

/* L'API n'est pas dans les types du DOM : on décrit le minimum employé. */
interface Reco {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: RecoEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface RecoEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

type RecoCtor = new () => Reco;

function constructeur(): RecoCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecoCtor;
    webkitSpeechRecognition?: RecoCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const ecouteDisponible = constructeur() !== null;

/**
 * Le silence qui vaut fin de tour, en millisecondes.
 *
 * C'est LE réglage de cet écran, et il se règle à l'oreille, pas au
 * raisonnement. Trop court, on coupe les phrases ; trop long, la réponse
 * se fait attendre et la conversation traîne. Trois secondes est le point
 * où un élève de cinquième finit de chercher son mot sans que l'attente
 * devienne pénible.
 */
export const SILENCE_DEFAUT = 3000;

/** Sans un mot entendu, on referme : le micro a été ouvert pour rien. */
const ATTENTE_MAX = 15_000;

/** Un tour de parole ne dure pas deux minutes. Au-delà, c'est un oubli. */
const TOUR_MAX = 120_000;

export interface Ecoute {
  /** Coupe l'écoute et rend ce qui a été entendu jusque-là. */
  arrete: () => void;
}

export function ecoute(
  { onPartiel, onFini, onErreur, silence = SILENCE_DEFAUT }: {
    onPartiel: (texte: string) => void;
    onFini: (texte: string) => void;
    onErreur: (raison: string) => void;
    /** Le silence qui clôt le tour. Par défaut `SILENCE_DEFAUT`. */
    silence?: number;
  },
): Ecoute {
  const C = constructeur();
  if (!C) {
    onErreur('indisponible');
    return { arrete: () => {} };
  }

  const r = new C();
  r.lang = 'en-US';
  /*
   * EN CONTINU, désormais. La fin du tour n'appartient plus au navigateur :
   * elle appartient au minuteur de silence ci-dessous. C'est le cœur du
   * correctif.
   */
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 1;

  /** Ce qui est définitivement reconnu, cumulé à travers les relances. */
  let acquis = '';
  /** Ce qui est encore en cours de reconnaissance, remplacé à chaque tour. */
  let partiel = '';
  let clos = false;
  /** Vrai quand la fermeture vient de nous — sinon on relance. */
  let ferme = false;
  let relances = 0;

  const debut = Date.now();
  let dernierSon = Date.now();
  let minuteur: ReturnType<typeof setInterval> | null = null;

  const texteEntendu = () => `${acquis} ${partiel}`.replace(/\s+/g, ' ').trim();

  const termine = () => {
    if (clos) return;
    clos = true;
    if (minuteur) clearInterval(minuteur);
    try { r.abort(); } catch { /* déjà close */ }
    onFini(texteEntendu());
  };

  /** Fermeture douce : on demande l'arrêt, `onend` rendra le texte. */
  const referme = () => {
    if (clos || ferme) return;
    ferme = true;
    try { r.stop(); } catch { termine(); }
  };

  r.onresult = (e) => {
    let enCours = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const t = res[0]?.transcript ?? '';
      if (res.isFinal) acquis += ` ${t}`;
      else enCours += t;
    }
    partiel = enCours;
    dernierSon = Date.now();
    onPartiel(texteEntendu());
  };

  r.onerror = (e) => {
    /*
     * `no-speech` et `aborted` ne sont pas des pannes : l'élève n'a rien
     * dit, ou il a coupé. Avec la relance automatique, `no-speech` est
     * même le cas ORDINAIRE — le moteur se plaint d'un silence que nous
     * jugeons, nous, tout à fait normal.
     */
    const raison = e.error ?? 'inconnue';
    if (raison === 'no-speech' || raison === 'aborted') return;
    onErreur(raison);
    termine();
  };

  r.onend = () => {
    if (clos) return;

    if (ferme) { termine(); return; }

    /*
     * Fin non demandée : le moteur a coupé de lui-même. On relance, et
     * l'élève ne voit rien. Les relances sont comptées — si le moteur
     * refuse de tenir, mieux vaut rendre ce qu'on a que boucler.
     */
    if (relances >= 20 || Date.now() - debut > TOUR_MAX) { termine(); return; }
    relances += 1;
    try { r.start(); } catch { termine(); }
  };

  minuteur = setInterval(() => {
    if (clos) return;
    const attente = Date.now() - dernierSon;
    const entendu = texteEntendu().length > 0;

    if (entendu && attente > silence) { referme(); return; }
    if (!entendu && Date.now() - debut > ATTENTE_MAX) { referme(); return; }
    if (Date.now() - debut > TOUR_MAX) referme();
  }, 250);

  try {
    r.start();
  } catch {
    onErreur('demarrage');
  }

  return { arrete: referme };
}

/** Coupe la voix de synthèse. L'élève qui parle passe avant. */
export function tais(): void {
  if (typeof speechSynthesis !== 'undefined') {
    try { speechSynthesis.cancel(); } catch { /* rien à couper */ }
  }
}
