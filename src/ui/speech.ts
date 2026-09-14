/**
 * Synthèse vocale.
 *
 * On passe par l'API du navigateur : gratuite, hors ligne sur la plupart des
 * appareils. Pour un usage commercial, il faudra un fournisseur sous licence ;
 * ce fichier est le seul point à remplacer.
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
 * système contre les pages qui parlent toutes seules. Tant que l'anglais
 * n'était prononcé qu'au moment où l'on appuie sur « Afficher la
 * réponse », la question ne se posait pas — le geste et la voix étaient
 * le même événement.
 *
 * À l'envers, l'anglais se dit maintenant à la PRÉSENTATION de la carte,
 * c'est-à-dire sans qu'on ait rien touché : la toute première carte
 * d'une session resterait muette.
 *
 * On envoie donc une phrase vide et sans volume au premier contact avec
 * la page, quel qu'il soit. Elle ne s'entend pas et ne retarde rien ;
 * elle sert seulement à ce que le système considère la permission comme
 * donnée. Sur les autres appareils, elle est sans effet.
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

export function speak(text: string, rate: number): void {
  if (typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = rate;
    const list = voices();
    const voice =
      list.find((v) => v.lang === 'en-US') ?? list.find((v) => v.lang?.startsWith('en'));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  } catch {
    // Une voix absente ne doit jamais interrompre la révision.
  }
}

export const speechAvailable = typeof speechSynthesis !== 'undefined';
