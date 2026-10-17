/**
 * CHANTIER 281 — le client de la liste en photo.
 *
 * Comme Parler : le téléphone ne connaît ni la clé ni le quota. Il envoie
 * une image déjà recadrée et réduite, et reçoit des mots.
 */
import { supabase } from './supabase';

export interface EtatPhoto {
  restantes: number;
  max: number;
  /** Dernier jour de la semaine en cours, AAAA-MM-JJ. */
  jusquau: string;
  /** 287 — compte administrateur : pas de plafond. */
  illimite?: boolean;
}

export type CodePhoto = 'compte' | 'ferme' | 'quota' | 'vide' | 'panne';

export class ErreurPhoto extends Error {
  code: CodePhoto;
  etat?: EtatPhoto;
  constructor(message: string, code: CodePhoto, etat?: EtatPhoto) {
    super(message);
    this.name = 'ErreurPhoto';
    this.code = code;
    this.etat = etat;
  }
}

async function appelle<T>(corps?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new ErreurPhoto('compte requis', 'compte');

  const r = await fetch('/api/photo-liste', {
    method: corps ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${t}`, ...(corps ? { 'content-type': 'application/json' } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const d = (await r.json().catch(() => ({}))) as { erreur?: string; etat?: EtatPhoto };
  if (r.status === 401) throw new ErreurPhoto('compte requis', 'compte');
  if (r.status === 403) throw new ErreurPhoto('réservé aux abonnés', 'ferme');
  if (r.status === 429) throw new ErreurPhoto('quota épuisé', 'quota', d.etat);
  if (r.status === 422) throw new ErreurPhoto('aucun mot lu', 'vide', d.etat);
  if (!r.ok) throw new ErreurPhoto(`${d.erreur ?? 'erreur'} · ${r.status}`, 'panne');
  /* 283 — une réponse sans JSON (route absente, page de l'appli renvoyée à la place) est une panne. */
  if (!d || typeof d !== 'object' || Object.keys(d).length === 0) throw new ErreurPhoto(`route /api/photo-liste absente · ${r.status}`, 'panne');
  return d as T;
}

export function etatPhoto(): Promise<EtatPhoto> {
  return appelle<EtatPhoto>();
}

export function lirePhoto(image: string, type: string): Promise<{ mots: Array<{ en: string; fr: string }>; etat: EtatPhoto }> {
  return appelle({ image, type });
}

/** « dimanche 18 octobre » */
export function dateDit(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

export function quotaDit(e: EtatPhoto): string {
  if (e.illimite) return 'Photos illimitées (compte administrateur).';
  if (e.restantes <= 0) return `Les ${e.max} photos de la semaine sont faites. Elles reviennent lundi.`;
  return `Il reste ${e.restantes} photo${e.restantes > 1 ? 's' : ''} à faire jusqu’au ${dateDit(e.jusquau)}.`;
}

/**
 * Recadre puis réduit dans le téléphone : l'élève n'a rien à régler.
 * 1 568 px au plus sur le grand côté, ~1,15 Mpx au plus : au-delà, l'IA
 * réduit d'elle-même et on paierait l'envoi pour rien.
 * `cadre` en fractions de l'image (0 → 1).
 */
export async function prepareImage(
  img: HTMLImageElement,
  cadre: { x1: number; y1: number; x2: number; y2: number },
): Promise<{ image: string; type: string }> {
  const W = img.naturalWidth, H = img.naturalHeight;
  const sx = cadre.x1 * W, sy = cadre.y1 * H;
  const sw = Math.max(1, (cadre.x2 - cadre.x1) * W), sh = Math.max(1, (cadre.y2 - cadre.y1) * H);
  const k = Math.min(1, 1568 / Math.max(sw, sh), Math.sqrt(1_150_000 / (sw * sh)));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * k);
  c.height = Math.round(sh * k);
  const ctx = c.getContext('2d');
  if (!ctx) throw new ErreurPhoto('canvas indisponible', 'panne');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', 0.85);
  return { image: url.slice(url.indexOf(',') + 1), type: 'image/jpeg' };
}
