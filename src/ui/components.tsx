/** Petits composants partagés, sans logique métier. */
import type { ReactNode } from 'react';

/** Palette déterministe : un paquet garde toujours la même couleur. */
const PALETTES = [
  { ink: '#185FA5', mid: '#85B7EB', pale: '#E6F1FB' },
  { ink: '#0F6E56', mid: '#5DCAA5', pale: '#E1F5EE' },
  { ink: '#993C1D', mid: '#F0997B', pale: '#FAECE7' },
  { ink: '#534AB7', mid: '#AFA9EC', pale: '#EEEDFE' },
  { ink: '#993556', mid: '#ED93B1', pale: '#FBEAF0' },
  { ink: '#854F0B', mid: '#EF9F27', pale: '#FAEEDA' },
];

/**
 * La teinte des paquets illustrés.
 *
 * Un dos illustré ne prend pas la couleur de son paquet : le dessin porte
 * déjà la sienne, et deux systèmes de couleur sur quarante-cinq pixels se
 * neutralisent. Le fond s'efface donc au profit du sujet.
 */
export const NEUTRE = { ink: '#5b5347', mid: '#cfc7b5', pale: '#f4f1ea' };

export function paletteFor(id: string) {
  // Mélange FNV-1a : le multiplicateur 31 donnait la même couleur à des
  // identifiants proches, ce qui rendait deux paquets indistinguables.
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return PALETTES[h % PALETTES.length];
}

export function initialsOf(name: string): string {
  const words = name.replace(/[—–-]/g, ' ').split(/\s+/).filter((w) => /[a-zA-ZÀ-ÿ]/.test(w));
  return ((words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')).toUpperCase();
}

/**
 * Dos de carte dessiné, utilisé tant qu'aucune image n'a été choisie.
 *
 * Repère en 620 x 874, le même ratio A6 que les visuels importés : sans
 * cela, le dos dessiné et le dos photographique n'auraient pas la même
 * forme dans la grille.
 *
 * En mode `bare`, seuls les deux cadres subsistent : les losanges, le
 * disque et les initiales laissent la place à l'illustration que l'appelant
 * pose par-dessus. Le cadre intérieur, lui, ne bouge jamais — c'est lui qui
 * garantit que dos illustré et dos dessiné ont la même carrure dans la
 * liste, et c'est lui qui ménage la marge autour du sujet.
 */
export function CardBack({
  id, name, bare = false,
}: { id: string; name: string; bare?: boolean }) {
  const p = bare ? NEUTRE : paletteFor(id);
  return (
    <svg viewBox="0 0 620 874" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="10" y="10" width="600" height="854" rx="70" fill={p.pale} stroke={p.mid} strokeWidth="10" />
      <rect x="50" y="50" width="520" height="774" rx="50" fill="none" stroke={p.mid} strokeWidth="6" opacity="0.7" />
      {bare ? null : <>
      <g stroke={p.mid} strokeWidth="7" fill="none" opacity="0.85">
        <path d="M310 107 L520 437 L310 767 L100 437 Z" />
        <path d="M310 197 L450 437 L310 677 L170 437 Z" />
        <path d="M310 287 L380 437 L310 587 L240 437 Z" />
      </g>
      <circle cx="310" cy="437" r="130" fill={p.ink} />
      <text
        x="310" y="480" textAnchor="middle" fontSize="120" fontWeight="700" fill={p.pale}
        fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
      >
        {initialsOf(name)}
      </text>
      </>}
    </svg>
  );
}

export function Slider({
  label, hint, min, max, step, value, format, onChange,
}: {
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="setting">
      <label>{label}</label>
      {hint && <p className="hint">{hint}</p>}
      <div className="fl">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="val">{format ? format(value) : value}</span>
      </div>
    </div>
  );
}

export function Toggle({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <div className="screen">{children}</div>;
}
