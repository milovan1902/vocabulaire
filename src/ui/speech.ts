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
