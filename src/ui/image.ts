/**
 * Redimensionnement d'une image de paquet au format de la carte.
 *
 * 620 x 874 : le ratio A6 / carte postale (0,7095), qui est le format
 * d'export natif de Canva en 1240 x 1748. On stocke la moitié de cette
 * définition : à la taille réelle d'affichage, l'oeil n'y voit rien, et
 * le stockage local de la personne reste raisonnable.
 */
const CARD_W = 620;
const CARD_H = 874;

export function resizeToCardImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('lecture impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('format non reconnu'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = CARD_W;
        canvas.height = CARD_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas indisponible'));
        // Recadrage centré : on remplit la carte sans déformer.
        const scale = Math.max(CARD_W / img.width, CARD_H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (CARD_W - w) / 2, (CARD_H - h) / 2, w, h);
        let out = '';
        try { out = canvas.toDataURL('image/webp', 0.85); } catch { /* ignoré */ }
        if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', 0.85);
        resolve(out);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
