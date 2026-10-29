import type { CSSProperties } from 'react';
import { CARTES_PAR_JOUR } from '../engine/xp';
import { NOM_NOTE, ORDRE_NOTES, compteNotes, retours, reussite, type BilanSession } from '../engine/bilan';
import './bilan.css';

/*
 * CHANTIER 356 — L'ÉCRAN DE FIN DE SESSION (maquette 2c).
 * Une session porte sur un paquet : c'est « le paquet du jour » qui est fini.
 * Les classes .done et .done h2 restent : les apparences les habillent déjà.
 */
const APERCU_RATES = 4;

export function BilanFin({
  bilan, paquet, dueDe, jour, cartesJour, suivant, onSuivant, onAujourdhui, onPaquet, onRevoir,
}: {
  bilan: BilanSession;
  paquet: string;
  /** La prochaine date de chaque carte, relue après la session. */
  dueDe?: (id: string) => number;
  jour: { valide: boolean; xp: number };
  cartesJour: number;
  suivant: { id: string; nom: string; cartes: number } | null;
  onSuivant: (id: string) => void;
  onAujourdhui: () => void;
  onPaquet: () => void;
  onRevoir: (ids: string[]) => void;
}) {
  const n = bilan.notes.length;
  const c = compteNotes(bilan);
  const pct = reussite(bilan);
  const rates = bilan.notes.filter((x) => x.note === 'again');
  const minutes = Math.round(bilan.duree / 60_000);
  const duree = minutes < 1 ? 'en moins d’une minute' : `en ${minutes} min`;
  const r = dueDe ? retours(bilan.notes.map((x) => dueDe(x.id))) : null;
  const totalR = r ? r.demain + r.semaine + r.plusTard : 0;

  return (
    <div className="done bilan">
      <div className="bilan-anneau" style={{ '--pct': `${pct}%` } as CSSProperties} role="img" aria-label={`${pct} % de réussite du premier coup`}>
        <div>
          <b>{pct} %</b>
          <span>de réussite</span>
        </div>
      </div>
      <h2>Paquet terminé pour aujourd’hui</h2>
      <p className="bilan-paquet">{paquet}</p>
      <p className="bilan-resume">
        {n} carte{n > 1 ? 's' : ''} revue{n > 1 ? 's' : ''} {duree}
      </p>

      <div className="bilan-chiffres">
        <div className="bilan-notes">
          <div className="bilan-barre" aria-hidden="true">
            {ORDRE_NOTES.filter((g) => c[g] > 0).map((g) => (
              <span key={g} className={`b-${g}`} style={{ flexGrow: c[g] }}></span>
            ))}
          </div>
          <ul className="bilan-legende">
            {ORDRE_NOTES.map((g) => (
              <li key={g}>
                <i className={`b-${g}`} aria-hidden="true"></i>
                {NOM_NOTE[g]} <b>{c[g]}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="bilan-xp">
          {jour.valide ? <b>+{jour.xp}</b> : <b>{Math.min(cartesJour, CARTES_PAR_JOUR)}/{CARTES_PAR_JOUR}</b>}
          <span>{jour.valide ? 'XP du jour' : 'cartes du jour'}</span>
        </div>
      </div>

      {rates.length > 0 && (
        <section className="bilan-bloc">
          <h3>Les mots ratés</h3>
          <dl className="bilan-mots">
            {rates.slice(0, APERCU_RATES).map((m) => (
              <div key={m.id}>
                <dt>{m.en}</dt>
                <dd>{m.fr}</dd>
              </div>
            ))}
          </dl>
          {rates.length > APERCU_RATES && (
            <p className="bilan-autres">
              et {rates.length - APERCU_RATES} autre{rates.length - APERCU_RATES > 1 ? 's' : ''}
            </p>
          )}
          <button className="btn ghost bilan-revoir" onClick={() => onRevoir(rates.map((m) => m.id))}>
            {rates.length > 1 ? `Revoir ces ${rates.length} mots maintenant` : 'Revoir ce mot maintenant'}
          </button>
        </section>
      )}

      {r && totalR > 0 && (
        <section className="bilan-bloc">
          <h3>Quand reviennent ces mots</h3>
          <div className="bilan-retours">
            <div><b className="r-demain">{r.demain}</b><span>d’ici demain</span></div>
            <div><b>{r.semaine}</b><span>dans la semaine</span></div>
            <div><b className="r-tard">{r.plusTard}</b><span>plus tard</span></div>
          </div>
          <div className="bilan-barre fine" aria-hidden="true">
            {r.demain > 0 && <span className="r-demain" style={{ flexGrow: r.demain }}></span>}
            {r.semaine > 0 && <span className="r-semaine" style={{ flexGrow: r.semaine }}></span>}
            {r.plusTard > 0 && <span className="r-tard" style={{ flexGrow: r.plusTard }}></span>}
          </div>
        </section>
      )}

      <div className="bilan-actions">
        {suivant ? (
          <>
            <button className="btn" onClick={() => onSuivant(suivant.id)}>
              Paquet suivant : {suivant.nom} ({suivant.cartes} carte{suivant.cartes > 1 ? 's' : ''})
            </button>
            <button className="btn ghost" onClick={onAujourdhui}>Revenir à aujourd’hui</button>
          </>
        ) : (
          <button className="btn" onClick={onAujourdhui}>Revenir à aujourd’hui</button>
        )}
        <button className="btn ghost" onClick={onPaquet}>Retour au paquet</button>
      </div>
    </div>
  );
}
