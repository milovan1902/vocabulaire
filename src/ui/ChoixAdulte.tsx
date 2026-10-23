/**
 * CHANTIER 317 — « JE SUIS ADULTE » : la confirmation, puis l'auto-évaluation.
 * CHANTIER 318 — et une vérification : 12 mots en QCM, trois par niveau.
 *   Le niveau du QCM = le plus haut niveau réussi (2 bonnes sur 3), tous les
 *   niveaux en dessous réussis aussi. Le niveau proposé est la moyenne des
 *   deux, arrondie vers le bas : en cas de doute, on commence plus simple.
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

/** 318 — la bonne réponse est toujours la première ; l'ordre affiché est mélangé (fixe). */
const QCM: Array<{ niv: NiveauAdulte; fr: string; choix: [string, string, string, string] }> = [
  { niv: 'A1', fr: 'la maison', choix: ['house', 'horse', 'mouse', 'hose'] },
  { niv: 'A1', fr: 'acheter', choix: ['to buy', 'to bring', 'to build', 'to borrow'] },
  { niv: 'A1', fr: 'hier', choix: ['yesterday', 'tomorrow', 'today', 'weekday'] },
  { niv: 'A2', fr: 'emprunter', choix: ['to borrow', 'to lend', 'to owe', 'to spend'] },
  { niv: 'A2', fr: 'le loyer', choix: ['the rent', 'the rate', 'the fee', 'the loan'] },
  { niv: 'A2', fr: 'en retard', choix: ['late', 'later', 'lately', 'last'] },
  { niv: 'B1', fr: 'un entretien d’embauche', choix: ['a job interview', 'a job offer', 'a work meeting', 'a career fair'] },
  { niv: 'B1', fr: 'se plaindre', choix: ['to complain', 'to explain', 'to remain', 'to obtain'] },
  { niv: 'B1', fr: 'malgré', choix: ['despite', 'beside', 'unless', 'whereas'] },
  { niv: 'B2', fr: 'le préavis (avant de quitter un logement)', choix: ['the notice', 'the warning', 'the advice', 'the notion'] },
  { niv: 'B2', fr: 's’en sortir, faire face', choix: ['to cope', 'to cover', 'to carry on', 'to catch up'] },
  { niv: 'B2', fr: 'une échéance, une date limite', choix: ['a deadline', 'a delay', 'a timeline', 'a headline'] },
];
const ORDRES = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 1, 2, 0], [0, 2, 1, 3]];

/** Le plus haut niveau réussi (2 bonnes sur 3), sans trou en dessous. -1 = aucun. */
export function niveauDuQcm(bonnes: boolean[]): number {
  let n = -1;
  for (let i = 0; i < NIVEAUX_ADULTE.length; i++) {
    const ok = QCM.filter((q, j) => q.niv === NIVEAUX_ADULTE[i] && bonnes[j]).length;
    if (ok >= 2) n = i; else break;
  }
  return n;
}

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
  const [etape, setEtape] = useState<'age' | 'questions' | 'qcm' | 'resultat'>('age');
  /* 318 — l'indice choisi pour chaque mot du QCM (dans l'ordre d'origine), null = pas répondu. */
  const [qcm, setQcm] = useState<Array<number | null>>(() => QCM.map(() => null));
  const [qi, setQi] = useState(0);
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
          onClick={() => setEtape('qcm')}
        >
          Continuer : 12 mots à reconnaître
        </button>
      </div>
    );
  }

  if (etape === 'qcm') {
    const q = QCM[qi];
    const ordre = ORDRES[qi % ORDRES.length];
    const repondre = (k: number | null) => {
      const suite = qcm.map((x, j) => (j === qi ? k : x));
      setQcm(suite);
      if (qi + 1 < QCM.length) { setQi(qi + 1); return; }
      const auto = NIVEAUX_ADULTE.indexOf(niveauDuScore(total));
      const verif = Math.max(0, niveauDuQcm(suite.map((x) => x === 0)));
      setRetenu(NIVEAUX_ADULTE[Math.floor((auto + verif) / 2)]);
      setEtape('resultat');
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="hint" style={{ margin: 0 }}>Mot {qi + 1} sur {QCM.length} · choisis la traduction anglaise.</p>
        <p style={{ margin: 0, fontSize: 22 }}><b>{q.fr}</b></p>
        <div role="group" aria-label={`Traduction de ${q.fr}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {ordre.map((k) => (
            <button key={k} style={choix(false)} onClick={() => repondre(k)}>{q.choix[k]}</button>
          ))}
        </div>
        <button className="btn ghost" onClick={() => repondre(null)}>Je ne sais pas</button>
      </div>
    );
  }

  const n = retenu ?? 'A1';
  const bonnes = qcm.filter((x) => x === 0).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0 }}>
        <b style={{ fontSize: 22 }}>{n}</b> · {NIVEAU_ADULTE_LABELS[n]}
      </p>
      <p className="hint">{DECRIT[n]}</p>
      {qcm.some((x) => x !== null) && (
        <p className="hint">Mots reconnus : {bonnes} sur {QCM.length}. Le niveau tient compte de tes réponses et de ces mots.</p>
      )}
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
