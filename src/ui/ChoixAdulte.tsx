/**
 * CHANTIER 317 — « JE SUIS ADULTE » : la confirmation, puis l'auto-évaluation.
 *
 * Cinq phrases, de la plus simple à la plus exigeante. Non = 0, Un peu = 1,
 * Oui = 2 : le total (0 à 10) donne le niveau. Le résultat se propose, il ne
 * s'impose pas : on peut choisir un autre niveau avant de valider. Pas de
 * nouveau test ensuite ; le niveau se change à la main dans les Réglages.
 */
import { useState, type CSSProperties } from 'react';
import type { NiveauAdulte } from '../domain/types';
import { NIVEAUX_ADULTE, NIVEAU_ADULTE_LABELS } from '../domain/types';

const QUESTIONS = [
  'Je comprends un menu, des panneaux ou un formulaire simple en anglais.',
  'Je peux me présenter et parler de mon travail ou de ma famille.',
  'Je me débrouille en voyage : hôtel, gare, restaurant, demander mon chemin.',
  'Je suis une conversation simple et je raconte ce que j’ai fait le week-end.',
  'Je comprends l’essentiel d’une série, d’une réunion ou d’un e-mail professionnel.',
];

const REPONSES: Array<[number, string]> = [[0, 'Non'], [1, 'Un peu'], [2, 'Oui']];

const DECRIT: Record<NiveauAdulte, string> = {
  A1: 'Les bases : se présenter, comprendre des phrases très simples.',
  A2: 'Se débrouiller dans les situations courantes, en phrases simples.',
  B1: 'Tenir une conversation sur la vie de tous les jours et raconter.',
  B2: 'Échanger avec aisance, y compris au travail.',
};

export function niveauDuScore(total: number): NiveauAdulte {
  if (total <= 3) return 'A1';
  if (total <= 5) return 'A2';
  if (total <= 7) return 'B1';
  return 'B2';
}

const choix = (on: boolean): CSSProperties => ({
  flex: 1, minHeight: 44, padding: '0 10px', borderRadius: 10, font: 'inherit', fontSize: 14, cursor: 'pointer',
  border: on ? '2px solid var(--chalk, currentColor)' : '1px solid var(--rule-strong, var(--rule, currentColor))',
  background: on ? 'color-mix(in srgb, var(--chalk, currentColor) 12%, transparent)' : 'transparent',
  color: 'inherit', fontWeight: on ? 600 : 400,
});

export function ChoixAdulte({ actuel, onChoisi }: {
  actuel?: NiveauAdulte | null;
  onChoisi: (n: NiveauAdulte) => void;
}) {
  const [etape, setEtape] = useState<'age' | 'questions' | 'resultat'>('age');
  const [majeur, setMajeur] = useState(!!actuel);
  const [rep, setRep] = useState<Array<number | null>>(() => QUESTIONS.map(() => null));
  const [retenu, setRetenu] = useState<NiveauAdulte | null>(actuel ?? null);

  const total = rep.reduce<number>((t, r) => t + (r ?? 0), 0);
  const complet = rep.every((r) => r !== null);

  if (etape === 'age') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="hint">
          Le mode adulte est fait pour se remettre à l’anglais hors du collège ou
          du lycée. Il ouvre des mises en situation de la vie d’adulte (travail,
          banque, logement) et calera tes paquets et tes conversations sur ton niveau.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, cursor: 'pointer' }}>
          <input type="checkbox" checked={majeur} onChange={(e) => setMajeur(e.target.checked)} style={{ width: 22, height: 22 }} />
          <span>J’ai 18 ans ou plus.</span>
        </label>
        <button className="btn" disabled={!majeur} onClick={() => setEtape('questions')}>
          Trouver mon niveau
        </button>
        {actuel && (
          <button className="btn ghost" onClick={() => setEtape('resultat')}>
            Garder mon niveau ({actuel})
          </button>
        )}
      </div>
    );
  }

  if (etape === 'questions') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p className="hint">Cinq phrases. Réponds sans réfléchir trop : tu pourras ajuster ensuite.</p>
        {QUESTIONS.map((q, i) => (
          <div key={q} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{i + 1}. {q}</p>
            <div role="group" aria-label={q} style={{ display: 'flex', gap: 8 }}>
              {REPONSES.map(([v, l]) => (
                <button
                  key={l}
                  aria-pressed={rep[i] === v}
                  style={choix(rep[i] === v)}
                  onClick={() => setRep((r) => r.map((x, j) => (j === i ? v : x)))}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          className="btn"
          disabled={!complet}
          onClick={() => { setRetenu(niveauDuScore(total)); setEtape('resultat'); }}
        >
          Voir mon niveau
        </button>
      </div>
    );
  }

  const n = retenu ?? 'A1';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0 }}>
        <b style={{ fontSize: 22 }}>{n}</b> · {NIVEAU_ADULTE_LABELS[n]}
      </p>
      <p className="hint">{DECRIT[n]}</p>
      <p className="hint" style={{ marginBottom: 0 }}>Pas tout à fait toi ? Choisis un autre niveau :</p>
      <div role="group" aria-label="Niveau" style={{ display: 'flex', gap: 8 }}>
        {NIVEAUX_ADULTE.map((x) => (
          <button key={x} aria-pressed={x === n} style={choix(x === n)} onClick={() => setRetenu(x)}>{x}</button>
        ))}
      </div>
      <button className="btn" onClick={() => onChoisi(n)}>Valider : niveau {n}</button>
    </div>
  );
}
