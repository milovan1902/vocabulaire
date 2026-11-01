import { useEffect, useRef, useState } from 'react';
import './attente.css';
import { choisisVoix, essaieVoix, listeVoix, surVoix, voixChoisie, type LangueVoix, type VoixDispo } from './speech';

/*
 * CHANTIER 374 — choisir sa voix française et sa voix anglaise (Parler › Paramètres).
 * Les voix sont celles du téléphone ; « Écouter » les fait entendre avant de choisir.
 */
const ACCENT: Record<string, string> = {
  'en-US': 'américain', 'en-GB': 'britannique', 'en-AU': 'australien', 'en-CA': 'canadien', 'en-IN': 'indien',
  'en-IE': 'irlandais', 'en-ZA': 'sud-africain', 'en-NZ': 'néo-zélandais',
  'fr-FR': 'France', 'fr-CA': 'Québec', 'fr-BE': 'Belgique', 'fr-CH': 'Suisse',
};

/** « Google français », « fr-fr-x-frd-local »… : un nom lisible, numéroté. */
function libelle(v: VoixDispo, i: number): string {
  const accent = ACCENT[v.langue] ?? v.langue;
  const propre = /^[a-z]{2}-[a-z]{2}-x-/i.test(v.nom) ? '' : ` · ${v.nom.replace(/^(Microsoft|Google)\s+/i, '').replace(/\s*\(.*\)\s*$/, '')}`;
  return `Voix ${i + 1} · ${accent}${propre}`;
}

function Ligne({ l, titre, debit }: { l: LangueVoix; titre: string; debit: number }) {
  const [liste, setListe] = useState<VoixDispo[]>(() => listeVoix(l));
  const [choix, setChoix] = useState<string>(() => voixChoisie(l) ?? '');
  useEffect(() => surVoix(() => setListe(listeVoix(l))), [l]);
  const existe = !choix || liste.some((v) => v.uri === choix);
  /* 375 — la voix essayée n'a rien dit : on le dit, au lieu de laisser croire qu'elle sonne comme les autres. */
  const [muette, setMuette] = useState(false);
  /* 383 — la roue tourne entre le choix et le premier son : on voit que la voix se charge. */
  const [charge, setCharge] = useState(false);
  const essai = useRef(0);
  const essaie = (uri: string | null) => {
    const n = ++essai.current;
    const fini = () => { if (essai.current === n) setCharge(false); };
    setMuette(false);
    setCharge(true);
    essaieVoix(l, uri, debit, () => { fini(); if (essai.current === n) setMuette(true); }, fini);
    window.setTimeout(fini, 6000);
  };
  return (
    <div className="parler-carte">
      <div className="parler-tete">
        <p className="parler-kicker">{titre}</p>
        {charge
          ? <span className="attente-txt" role="status"><i className="roue" aria-hidden="true" />Chargement de la voix…</span>
          : <button className="parler-lien" onClick={() => essaie(choix || null)}>Écouter ›</button>}
      </div>
      {liste.length === 0 ? (
        <p className="hint">Aucune voix trouvée sur ce téléphone pour cette langue.</p>
      ) : (
        <select
          className="parler-voix"
          aria-label={titre}
          value={existe ? choix : ''}
          onChange={(e) => {
            const uri = e.target.value || null;
            setChoix(uri ?? '');
            choisisVoix(l, uri);
            essaie(uri);
          }}
        >
          <option value="">Automatique (la plus naturelle)</option>
          {liste.map((v, i) => <option key={v.uri} value={v.uri}>{libelle(v, i)}</option>)}
        </select>
      )}
      {muette && (
        <p className="hint voix-muette" role="status">
          Cette voix ne répond pas sur ce téléphone : elle n’est sans doute pas téléchargée. Tant qu’elle ne l’est pas,
          l’application prendra la voix par défaut.
        </p>
      )}
    </div>
  );
}

export function ChoixVoix({ debit }: { debit: number }) {
  return (
    <>
      <Ligne l="en" titre="Voix anglaise" debit={debit} />
      <Ligne l="fr" titre="Voix française" debit={0.95} />
      <p className="hint">
        Les voix sont celles du téléphone. Pour en avoir de plus naturelles : Paramètres Android › Synthèse vocale ›
        Services vocaux Google › installer les données vocales. La voix anglaise sert aussi pour les cartes.
      </p>
    </>
  );
}
