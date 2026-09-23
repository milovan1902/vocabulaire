/**
 * CHANTIER 110 — « Tu veux les revoir ? »
 *
 * La carte de fin de conversation : les mots qui ont posé problème, une case
 * par mot, et une phrase sous chacun qui dit ce qu'il deviendra. On décide
 * en connaissance de cause : rien n'est écrit avant d'avoir appuyé.
 *
 * La règle elle-même vit dans `data/reprise.ts`. Ce fichier ne fait que la
 * montrer, et la déclencher.
 */
import { useEffect, useState } from 'react';
import { analyse, verse, REPRISE_NOM, type Proposition, type Versement } from '../data/reprise';
import './reprise.css';

function note(p: Proposition): string {
  switch (p.statut.type) {
    case 'ramene': return `Déjà dans « ${p.statut.deckNom} » : il revient dans ta journée.`;
    case 'copie': return `« ${p.statut.deckNom} » est en pause : il rejoint le paquet de reprise.`;
    case 'nouveau': return 'Nouveau : il rejoint le paquet de reprise.';
    case 'deja': return 'Déjà dans le paquet de reprise.';
  }
}

export function ReprendreMots({
  mots, enJeu, quand, onReprise,
}: {
  mots: Array<{ en: string; fr: string }>;
  /** Paquets en jeu : c'est ce qui décide entre « ramener » et « copier ». */
  enJeu: string[];
  /** Date de la conversation, pour le thème des cartes créées. */
  quand?: string;
  /** Obtenir et mettre en jeu le paquet de reprise. Tenu par App. */
  onReprise: () => Promise<void>;
}) {
  const [props, setProps] = useState<Proposition[] | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState(false);
  const [fait, setFait] = useState<Versement | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    void analyse(mots, enJeu).then((p) => {
      if (!vivant) return;
      setProps(p);
      /* Tout est coché d'avance : on décoche ce qu'on sait déjà. */
      setCoches(new Set(p.filter((x) => x.statut.type !== 'deja').map((x) => x.en)));
    });
    return () => { vivant = false; };
    // L'analyse ne se refait pas à chaque rendu : seulement si la liste change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mots.map((m) => m.en).join('|')]);

  if (mots.length === 0) return null;

  const bascule = (en: string) => {
    setCoches((c) => {
      const s = new Set(c);
      if (s.has(en)) s.delete(en); else s.add(en);
      return s;
    });
  };

  const valide = async () => {
    if (!props) return;
    setEnCours(true);
    setErreur(null);
    try {
      const choisis = props.filter((p) => coches.has(p.en) && p.statut.type !== 'deja');
      const r = await verse(choisis, quand);
      if (r.ajoutes > 0 || r.ramenes > 0) await onReprise();
      setFait(r);
    } catch (e) {
      setErreur(`Les mots n’ont pas pu être ajoutés. ${String(e)}`);
    } finally {
      setEnCours(false);
    }
  };

  const n = props ? props.filter((p) => coches.has(p.en) && p.statut.type !== 'deja').length : 0;

  return (
    <div className="parler-carte reprise">
      <p className="parler-kicker">Tu veux les revoir ?</p>

      {!props ? (
        <p className="hint">Recherche dans tes paquets…</p>
      ) : fait ? (
        <p className="reprise-fait">
          {fait.ajoutes + fait.ramenes === 0
            ? 'Rien d’ajouté cette fois.'
            : [
                fait.ajoutes > 0 && `${fait.ajoutes} mot${fait.ajoutes > 1 ? 's' : ''} dans « ${REPRISE_NOM} »`,
                fait.ramenes > 0 && `${fait.ramenes} mot${fait.ramenes > 1 ? 's' : ''} ramené${fait.ramenes > 1 ? 's' : ''} depuis tes paquets`,
              ].filter(Boolean).join(', ') + '. Ils sont dans ta journée.'}
        </p>
      ) : (
        <>
          <p className="hint">
            Coche ceux que tu veux retravailler. Un mot que tu as déjà dans
            un paquet n’est jamais créé deux fois.
          </p>
          <div className="reprise-liste">
            {props.map((p) => {
              const grise = p.statut.type === 'deja';
              const on = !grise && coches.has(p.en);
              return (
                <label key={p.en} className={`reprise-ligne${grise ? ' grise' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={grise || enCours}
                    onChange={() => bascule(p.en)}
                  />
                  <span className="reprise-case" aria-hidden="true" />
                  <span className="reprise-mot">
                    <b>{p.en}</b>
                    <small>{p.fr}</small>
                    <em className={`reprise-note ${p.statut.type}`}>{note(p)}</em>
                  </span>
                </label>
              );
            })}
          </div>
          <button className="btn reprise-go" disabled={n === 0 || enCours} onClick={() => void valide()}>
            {enCours ? 'Ajout…' : n === 0 ? 'Aucun mot coché' : `Ajouter ${n} mot${n > 1 ? 's' : ''} à ma révision`}
          </button>
          {erreur && <p className="seance-erreur">{erreur}</p>}
        </>
      )}
    </div>
  );
}
