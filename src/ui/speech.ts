/**
 * Synthèse vocale.
 *
 * On passe par l'API du navigateur : gratuite, hors ligne sur la plupart des
 * appareils. Pour un usage commercial, il faudra un fournisseur sous licence ;
 * ce fichier est le seul point à remplacer.
 *
 * CHANTIER 106 — DEUX LANGUES DANS UNE MÊME RÉPLIQUE.
 *
 * Le partenaire parle anglais et corrige en français : « You go to the
 * beach yesterday? — Petite précision : au passé, on dit *went*. So, what
 * did you do there? » Prononcé d'un bloc par une voix anglaise, le
 * français devient une bouillie que l'élève n'identifie même pas comme du
 * français — et c'est précisément la phrase qui doit porter.
 *
 * `parle()` découpe donc le texte en passages, devine la langue de chacun,
 * et les fait dire par la voix qui convient. La synthèse du navigateur
 * enchaîne les énoncés dans l'ordre où on les lui donne : il n'y a rien à
 * orchestrer, juste à ne pas tout envoyer d'un coup dans la mauvaise voix.
 *
 * CHANTIER 112 — L'ANGLAIS ENTRE GUILLEMETS, ET PLUS D'ASTÉRISQUES.
 *   - Dans une correction (« Petite précision : on dit "my children win" »),
 *     la phrase est française, mais l'exemple cité est anglais. Il était
 *     lu par la voix française, avec l'accent. Tout passage entre
 *     guillemets est maintenant jugé À PART, et dit par la voix anglaise
 *     s'il est anglais.
 *   - Le modèle met parfois un mot en gras (**who**). La voix lisait
 *     « astérisque ». `nettoie()` retire toute mise en forme avant de
 *     parler, et avant d'afficher.
 */
let cached: SpeechSynthesisVoice[] = [];

function voices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return [];
  if (!cached.length) cached = speechSynthesis.getVoices();
  return cached;
}

if (typeof speechSynthesis !== 'undefined') {
  // Sur Chrome, la liste arrive de façon asynchrone.
  speechSynthesis.addEventListener('voiceschanged', () => {
    cached = speechSynthesis.getVoices();
  });
}

/**
 * CHANTIER 50 — le déverrouillage.
 *
 * Sur iPhone, la synthèse vocale refuse de parler tant que l'utilisateur
 * n'a pas touché l'écran au moins une fois : c'est une protection du
 * système contre les pages qui parlent toutes seules. On envoie donc une
 * phrase vide et sans volume au premier contact avec la page, quel qu'il
 * soit. Elle ne s'entend pas et ne retarde rien.
 */
let deverrouille = false;

function deverrouiller(): void {
  if (deverrouille || typeof speechSynthesis === 'undefined') return;
  deverrouille = true;
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    // Rien à rattraper : au pire, la première carte reste muette.
  }
}

if (typeof window !== 'undefined') {
  const opts = { once: true, capture: true } as const;
  window.addEventListener('pointerdown', deverrouiller, opts);
  window.addEventListener('keydown', deverrouiller, opts);
}

/** La meilleure voix disponible pour une langue. */
function voix(prefixe: string, exact: string): SpeechSynthesisVoice | undefined {
  const list = voices();
  return list.find((v) => v.lang === exact)
    ?? list.find((v) => v.lang?.replace('_', '-').startsWith(prefixe));
}

function enonce(texte: string, langue: string, rate: number): void {
  const u = new SpeechSynthesisUtterance(texte);
  u.lang = langue;
  u.rate = rate;
  const v = langue === 'fr-FR' ? voix('fr', 'fr-FR') : voix('en', 'en-US');
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

export function speak(text: string, rate: number): void {
  if (typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    enonce(text, 'en-US', rate);
  } catch {
    // Une voix absente ne doit jamais interrompre la révision.
  }
}

/* ------------------------------------------------------------------
   LA DÉTECTION DE LANGUE

   Pas de bibliothèque : deux listes de mots-outils et les accents. Sur
   des phrases de conversation scolaire, c'est fiable, et l'erreur est
   sans gravité — une phrase anglaise dite par la voix française reste
   compréhensible, elle est juste laide.

   Les mots retenus sont les plus fréquents et les moins ambigus. Les
   faux amis d'orthographe (« a », « the » contre « à », « le ») sont
   écartés : on ne garde que ce qui tranche.
   ------------------------------------------------------------------ */

const ACCENTS = /[àâäçéèêëîïôöùûüœ]/i;

const MOTS_FR = new Set([
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'au', 'aux', 'ce', 'cette',
  'et', 'ou', 'mais', 'donc', 'car', 'que', 'qui', 'quoi', 'dont',
  'pas', 'plus', 'très', 'bien', 'avec', 'pour', 'dans', 'sur', 'sans',
  'est', 'sont', 'était', 'sera', 'fait', 'dit', 'dire', 'faut',
  'petite', 'précision', 'mot', 'phrase', 'passé', 'présent', 'futur',
  'on dit', 'parce', 'quand', 'comme', 'tout', 'toute', 'ici', 'encore',
]);

const MOTS_EN = new Set([
  'the', 'and', 'you', 'your', 'i', 'is', 'are', 'was', 'were', 'be',
  'do', 'does', 'did', 'have', 'has', 'had', 'what', 'that', 'this',
  'with', 'for', 'about', 'can', 'could', 'would', 'should', 'like',
  'my', 'me', 'we', 'they', 'he', 'she', 'his', 'her', 'their',
  'to', 'of', 'in', 'on', 'at', 'so', 'but', 'not', 'very', 'really',
  'tell', 'know', 'think', 'want', 'good', 'nice', 'yesterday', 'today',
]);

function estFrancais(passage: string): boolean {
  if (ACCENTS.test(passage)) return true;
  const mots = passage.toLowerCase().match(/[a-zà-ÿ']+/g) ?? [];
  let fr = 0;
  let en = 0;
  for (const m of mots) {
    if (MOTS_FR.has(m)) fr += 1;
    if (MOTS_EN.has(m)) en += 1;
  }
  return fr > en;
}

/**
 * Retire la mise en forme que le modèle glisse parfois : gras, italique,
 * code, titres, puces. Exporté : l'écran l'emploie aussi pour l'affichage.
 */
export function nettoie(texte: string): string {
  return texte
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(«"“])\*([^*\n]+)\*(?=[\s).,!?;:»"”]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*#+\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/[*`#]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

const CITATION = /["“«]\s*([^"”»]+?)\s*["”»]/g;

/**
 * Une citation est jugée seule, sans les accents de la phrase autour :
 * « my children win » n'a aucun mot-outil français, elle part en anglais.
 * Dans une correction, ce qu'on cite est presque toujours de l'anglais.
 */
function langueCitation(c: string): Passage['langue'] {
  if (ACCENTS.test(c)) return 'fr-FR';
  const mots = c.toLowerCase().match(/[a-zà-ÿ']+/g) ?? [];
  let fr = 0;
  for (const m of mots) if (MOTS_FR.has(m) && !MOTS_EN.has(m)) fr += 1;
  return fr > mots.length / 2 ? 'fr-FR' : 'en-US';
}

/**
 * Coupe une phrase française autour de ses citations. Les guillemets
 * eux-mêmes ne sont pas prononcés.
 */
function autourDesCitations(p: string): Passage[] {
  const out: Passage[] = [];
  let dernier = 0;
  let m: RegExpExecArray | null;
  CITATION.lastIndex = 0;
  while ((m = CITATION.exec(p))) {
    const avant = p.slice(dernier, m.index).trim();
    if (avant) out.push({ texte: avant, langue: 'fr-FR' });
    out.push({ texte: m[1], langue: langueCitation(m[1]) });
    dernier = m.index + m[0].length;
  }
  const fin = p.slice(dernier).trim();
  if (fin) out.push({ texte: fin, langue: 'fr-FR' });
  return out.length ? out : [{ texte: p, langue: 'fr-FR' }];
}

/** Découpe en phrases, en gardant la ponctuation avec la phrase. */
function phrases(texte: string): string[] {
  return (texte.match(/[^.!?…]+[.!?…]*\s*/g) ?? [texte])
    .map((p) => p.trim())
    .filter(Boolean);
}

export interface Passage {
  texte: string;
  langue: 'fr-FR' | 'en-US';
}

/**
 * Le découpage, exporté pour être lisible et testable ailleurs.
 * Les phrases voisines de même langue sont recollées : une voix qui
 * repart à chaque point hache la réplique.
 */
export function passages(texte: string): Passage[] {
  const out: Passage[] = [];
  const pousse = ({ texte: t, langue }: Passage) => {
    const dernier = out[out.length - 1];
    if (dernier && dernier.langue === langue) dernier.texte += ` ${t}`;
    else out.push({ texte: t, langue });
  };
  for (const p of phrases(nettoie(texte))) {
    if (!estFrancais(p)) { pousse({ texte: p, langue: 'en-US' }); continue; }
    /* Une phrase française peut citer de l'anglais : on la découpe. */
    for (const x of autourDesCitations(p)) pousse(x);
  }
  return out;
}

/**
 * Dit une réplique qui peut mêler les deux langues.
 *
 * Le français est prononcé un peu moins vite que l'anglais : c'est une
 * correction, elle doit s'entendre. Un dixième suffit — au-delà, on a
 * l'air de parler à un enfant.
 */
export function parle(texte: string, rate: number): void {
  if (typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    for (const p of passages(texte)) {
      enonce(p.texte, p.langue, p.langue === 'fr-FR' ? rate * 0.9 : rate);
    }
  } catch {
    // Une voix absente ne doit jamais interrompre la conversation.
  }
}

export const speechAvailable = typeof speechSynthesis !== 'undefined';
