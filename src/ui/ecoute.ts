/**
 * L'écoute — la reconnaissance vocale du navigateur.
 *
 * CHANTIER 105 — LE MICRO.
 * CHANTIER 106 — LE MICRO QUI NE COUPE PLUS LA PAROLE.
 * CHANTIER 111 — LE MICRO QUI NE BÉGAIE PLUS.
 * CHANTIER 115 — C'EST L'ÉLÈVE QUI ENVOIE. Option `manuel` : aucun
 *   silence ne ferme plus le tour. Un appui ouvre le micro, un second
 *   appui l'arrête et envoie. Seul garde-fou : trois minutes de parole.
 * CHANTIER 112 — LE FRANÇAIS, SUR DEMANDE. Le navigateur n'écoute qu'UNE
 *   langue à la fois : réglé sur l'anglais, il transforme le français en
 *   bouillie. L'élève choisit « Dire en français » pour un tour ; ce tour
 *   s'écoute en français, puis le micro revient à l'anglais.
 *
 * LE BÉGAIEMENT (111). Sur Android, en mode continu, Chrome ne complète
 * pas un résultat : il en ajoute un NOUVEAU à chaque mot, qui contient
 * toute la phrase depuis le début, et le marque souvent « définitif ».
 * On recevait donc « yes », « yes I », « yes I play »… et on les mettait
 * bout à bout : « yes yes I yes I play ». Le texte gonflé partait tel quel
 * au modèle, et coûtait des jetons à chaque tour, puisque l'historique
 * est relu.
 *
 * Désormais, à chaque événement, on RECALCULE le texte de la session à
 * partir de tous ses résultats, et un résultat qui reprend le précédent
 * le REMPLACE au lieu de s'y ajouter. Sur ordinateur, où les résultats
 * sont de vrais morceaux successifs, rien ne change : ils s'enchaînent.
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
/** En mode manuel, l'élève décide ; on coupe seulement un micro oublié. */
const TOUR_MAX_MANUEL = 180_000;

export interface Ecoute {
  /** Coupe l'écoute et rend ce qui a été entendu jusque-là. */
  arrete: () => void;
}

export function ecoute(
  { onPartiel, onFini, onErreur, silence = SILENCE_DEFAUT, langue = 'en-US', manuel = false }: {
    onPartiel: (texte: string) => void;
    onFini: (texte: string) => void;
    onErreur: (raison: string) => void;
    /** Le silence qui clôt le tour. Par défaut `SILENCE_DEFAUT`. */
    silence?: number;
    /** 'en-US' par défaut ; 'fr-FR' pour un tour dit en français. */
    langue?: 'en-US' | 'fr-FR';
    /** Vrai : seul `arrete()` ferme le tour, jamais un silence. */
    manuel?: boolean;
  },
): Ecoute {
  const C = constructeur();
  if (!C) {
    onErreur('indisponible');
    return { arrete: () => {} };
  }

  const r = new C();
  r.lang = langue;
  /*
   * EN CONTINU, désormais. La fin du tour n'appartient plus au navigateur :
   * elle appartient au minuteur de silence ci-dessous. C'est le cœur du
   * correctif.
   */
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 1;

  /** Le texte des sessions précédentes (avant une relance automatique). */
  let acquis = '';
  /** Le texte de la session en cours, recalculé à chaque événement. */
  let partiel = '';
  let clos = false;
  /** Vrai quand la fermeture vient de nous — sinon on relance. */
  let ferme = false;
  let relances = 0;

  const debut = Date.now();
  const tourMax = manuel ? TOUR_MAX_MANUEL : TOUR_MAX;
  /* En manuel, chaque pause un peu longue fait couper le moteur : on relance plus souvent. */
  const relancesMax = manuel ? 80 : 20;
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
    /*
     * Toute la session, depuis le premier résultat, et non depuis
     * `resultIndex` : c'est la seule lecture juste sur Android comme
     * sur ordinateur.
     */
    const morceaux: string[] = [];
    for (let i = 0; i < e.results.length; i++) {
      morceaux.push(e.results[i][0]?.transcript ?? '');
    }
    partiel = fusionne(morceaux);
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
    if (relances >= relancesMax || Date.now() - debut > tourMax) { termine(); return; }
    /* La session se ferme : son texte passe dans l'acquis, la suivante repart à vide. */
    acquis = fusionne([acquis, partiel]);
    partiel = '';
    relances += 1;
    try { r.start(); } catch { termine(); }
  };

  minuteur = setInterval(() => {
    if (clos) return;
    const attente = Date.now() - dernierSon;
    const entendu = texteEntendu().length > 0;

    if (!manuel && entendu && attente > silence) { referme(); return; }
    if (!manuel && !entendu && Date.now() - debut > ATTENTE_MAX) { referme(); return; }
    if (Date.now() - debut > tourMax) referme();
  }, 250);

  try {
    r.start();
  } catch {
    onErreur('demarrage');
  }

  return { arrete: referme };
}

/** Forme de comparaison : minuscules, sans ponctuation ni espaces doubles. */
function norme(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9à-ÿœ' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Assemble des résultats successifs sans jamais répéter.
 *   - un morceau qui REPREND ce qu'on a (« yes I » puis « yes I play »)
 *     le remplace ;
 *   - un morceau déjà contenu dans ce qu'on a est ignoré ;
 *   - un morceau qui chevauche la fin (« I play » puis « play inside »)
 *     n'ajoute que la partie nouvelle ;
 *   - sinon, il s'ajoute à la suite.
 */
export function fusionne(morceaux: string[]): string {
  let texte = '';
  for (const brut of morceaux) {
    const m = brut.replace(/\s+/g, ' ').trim();
    if (!m) continue;
    const a = norme(texte);
    const b = norme(m);
    if (!a) { texte = m; continue; }
    if (b.startsWith(a)) { texte = m; continue; }
    if (a.includes(b)) continue;
    const motsA = a.split(' ');
    const motsB = m.split(' ');
    const motsBn = b.split(' ');
    let recouvre = 0;
    for (let k = Math.min(motsA.length, motsBn.length); k > 0; k--) {
      if (motsA.slice(-k).join(' ') === motsBn.slice(0, k).join(' ')) { recouvre = k; break; }
    }
    const reste = motsB.slice(recouvre).join(' ');
    if (reste) texte = `${texte} ${reste}`;
  }
  return texte.trim();
}

/** Coupe la voix de synthèse. L'élève qui parle passe avant. */
export function tais(): void {
  if (typeof speechSynthesis !== 'undefined') {
    try { speechSynthesis.cancel(); } catch { /* rien à couper */ }
  }
}
