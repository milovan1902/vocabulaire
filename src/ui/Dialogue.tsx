import { useEffect, useRef, useState } from 'react';
import './dialogue.css';

/*
 * CHANTIER 356 — LES BOÎTES DE DIALOGUE MAISON.
 *
 * Remplacent confirm() et alert() : la fenêtre grise du système, en anglais
 * sur certains téléphones, et sans rapport avec l'apparence choisie.
 *
 *   demande({ titre, texte, agir, garder, ton })  →  Promise<boolean>
 *     prudent : l'action sûre (garder) en or, l'autre en contour — quitter une session ;
 *     danger  : « Annuler » d'abord, l'action en rouge — tout ce qui est définitif ;
 *     neutre  : l'action en or, « Annuler » en contour.
 *   informe(texte, erreur)  →  un bandeau au-dessus des onglets, qui part seul.
 *
 * Sans hôte monté (écran d'accueil, administration), on retombe sur la
 * fenêtre du système : rien ne reste sans réponse.
 */
export type Ton = 'prudent' | 'danger' | 'neutre';
export interface Question {
  titre: string;
  texte?: string;
  /** L'action demandée : la réponse « oui ». */
  agir: string;
  /** Le refus : « Annuler » par défaut. */
  garder?: string;
  ton?: Ton;
}
type EnAttente = Question & { repondre: (oui: boolean) => void };
type Bandeau = { id: number; texte: string; erreur: boolean };

let afficheQuestion: ((q: EnAttente) => void) | null = null;
let afficheBandeau: ((b: Bandeau) => void) | null = null;
let numero = 0;

export function demande(q: Question): Promise<boolean> {
  const hote = afficheQuestion;
  if (!hote) return Promise.resolve(window.confirm(q.texte ? `${q.titre}\n\n${q.texte}` : q.titre));
  return new Promise((repondre) => hote({ ...q, repondre }));
}

export function informe(texte: string, erreur = false): void {
  const hote = afficheBandeau;
  if (!hote) { window.alert(texte); return; }
  numero += 1;
  hote({ id: numero, texte, erreur });
}

export function Dialogues() {
  const [q, setQ] = useState<EnAttente | null>(null);
  const [b, setB] = useState<Bandeau | null>(null);
  const refPremier = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    /* Une nouvelle question remplace l'ancienne : l'ancienne vaut « non ». */
    afficheQuestion = (n) => setQ((avant) => { avant?.repondre(false); return n; });
    afficheBandeau = setB;
    return () => { afficheQuestion = null; afficheBandeau = null; };
  }, []);

  useEffect(() => {
    if (!b) return undefined;
    const t = window.setTimeout(() => setB(null), b.erreur ? 6500 : 4000);
    return () => window.clearTimeout(t);
  }, [b]);

  useEffect(() => {
    if (!q) return undefined;
    refPremier.current?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      q.repondre(false);
      setQ(null);
    };
    addEventListener('keydown', touche);
    return () => removeEventListener('keydown', touche);
  }, [q]);

  function fermer(oui: boolean) {
    if (!q) return;
    q.repondre(oui);
    setQ(null);
  }

  const ton: Ton = q?.ton ?? 'neutre';
  const garder = q && (
    <button
      key="garder"
      ref={ton === 'neutre' ? undefined : refPremier}
      className={`btn${ton === 'prudent' ? '' : ' ghost'}`}
      onClick={() => fermer(false)}
    >
      {q.garder ?? 'Annuler'}
    </button>
  );
  const agir = q && (
    <button
      key="agir"
      ref={ton === 'neutre' ? refPremier : undefined}
      className={`btn${ton === 'prudent' ? ' ghost' : ''}${ton === 'danger' ? ' dlg-danger' : ''}`}
      onClick={() => fermer(true)}
    >
      {q.agir}
    </button>
  );

  return (
    <>
      {q && (
        <div className="dlg-fond" onClick={(e) => { if (e.target === e.currentTarget) fermer(false); }}>
          <div
            className="dlg"
            role={ton === 'danger' ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby="dlg-titre"
            aria-describedby={q.texte ? 'dlg-texte' : undefined}
          >
            <h2 id="dlg-titre">{q.titre}</h2>
            {q.texte && <p id="dlg-texte">{q.texte}</p>}
            <div className="dlg-actions">{ton === 'neutre' ? [agir, garder] : [garder, agir]}</div>
          </div>
        </div>
      )}
      {b && (
        <div key={b.id} className={`bandeau${b.erreur ? ' erreur' : ''}`} role={b.erreur ? 'alert' : 'status'}>
          <span className="bandeau-pastille" aria-hidden="true">{b.erreur ? '!' : '✓'}</span>
          <span className="bandeau-texte">{b.texte}</span>
          <button className="bandeau-ok" onClick={() => setB(null)}>OK</button>
        </div>
      )}
    </>
  );
}
