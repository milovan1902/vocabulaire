/**
 * L'écoute — la reconnaissance vocale du navigateur.
 *
 * CHANTIER 105 — LE MICRO
 *
 * Pendant de `speech.ts`, qui parle depuis le chantier 12. Même principe :
 * tout vient du navigateur, rien n'est facturé, aucun service tiers.
 *
 * POURQUOI UN MODULE À PART. L'API porte deux noms selon le navigateur
 * (`SpeechRecognition` chez les uns, `webkitSpeechRecognition` chez les
 * autres), elle n'est pas typée par TypeScript, et elle a des caprices —
 * une session s'arrête d'elle-même après un silence, et deux sessions
 * simultanées se marchent dessus. Tout cela est enfermé ici, pour que
 * l'écran n'ait qu'à dire « écoute » et « arrête ».
 *
 * CE QU'ELLE VAUT, HONNÊTEMENT : très correcte sur Android et sur Chrome,
 * capricieuse sur iPhone, absente de quelques navigateurs. D'où
 * `ecouteDisponible` — l'écran garde un clavier de secours, et ce n'est pas
 * une précaution théorique.
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

export interface Ecoute {
  /** Coupe l'écoute et rend ce qui a été entendu jusque-là. */
  arrete: () => void;
}

/**
 * Écoute l'élève parler anglais.
 *
 * `onPartiel` reçoit le texte en cours de reconnaissance — c'est lui qui
 * fait sentir que le micro entend quelque chose. `onFini` reçoit le texte
 * définitif, une seule fois, à la fin.
 *
 * L'ANGLAIS EST IMPOSÉ (`en-US`) : sans cela le navigateur écoute dans la
 * langue du système, et un élève français qui dit « I have a dog » se voit
 * transcrire « j'ai vedogue ». C'est le réglage qui fait toute la
 * différence entre un micro utile et un gadget.
 */
export function ecoute(
  { onPartiel, onFini, onErreur }: {
    onPartiel: (texte: string) => void;
    onFini: (texte: string) => void;
    onErreur: (raison: string) => void;
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
   * `continuous` faux : la session se termine d'elle-même au silence, ce
   * qui est exactement le tour de parole d'une conversation. En continu,
   * il faudrait deviner quand l'élève a fini.
   */
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 1;

  let acquis = '';
  let clos = false;

  r.onresult = (e) => {
    let partiel = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const t = res[0]?.transcript ?? '';
      if (res.isFinal) acquis += t;
      else partiel += t;
    }
    onPartiel((acquis + partiel).trim());
  };

  r.onerror = (e) => {
    /*
     * `no-speech` et `aborted` ne sont pas des pannes : l'élève n'a rien
     * dit, ou il a coupé. Les remonter comme erreurs affolerait l'écran
     * pour rien.
     */
    const raison = e.error ?? 'inconnue';
    if (raison === 'no-speech' || raison === 'aborted') return;
    onErreur(raison);
  };

  r.onend = () => {
    if (clos) return;
    clos = true;
    onFini(acquis.trim());
  };

  try {
    r.start();
  } catch {
    onErreur('demarrage');
  }

  return {
    arrete: () => {
      try { r.stop(); } catch { /* déjà arrêtée */ }
    },
  };
}

/** Coupe la voix de synthèse. L'élève qui parle passe avant. */
export function tais(): void {
  if (typeof speechSynthesis !== 'undefined') {
    try { speechSynthesis.cancel(); } catch { /* rien à couper */ }
  }
}
