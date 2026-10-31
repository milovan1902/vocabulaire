import { useEffect, useState } from 'react';
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
  return (
    <div className="parler-carte">
      <div className="parler-tete">
        <p className="parler-kicker">{titre}</p>
        <button className="parler-lien" onClick={() => essaieVoix(l, choix || null, debit)}>Écouter ›</button>
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
            essaieVoix(l, uri, debit);
          }}
        >
          <option value="">Automatique (la plus naturelle)</option>
          {liste.map((v, i) => <option key={v.uri} value={v.uri}>{libelle(v, i)}</option>)}
        </select>
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
