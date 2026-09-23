/**
 * Tes conversations — l'archive des séances.
 *
 * CHANTIER 106 — CE QUI MANQUAIT LE PLUS
 *
 * « Où puis-je retrouver la synthèse de mon échange ? » Nulle part : le
 * compte rendu s'affichait une fois, puis mourait avec l'écran. C'est
 * l'oubli le plus coûteux du chantier précédent, pour deux raisons qui
 * n'ont rien à voir l'une avec l'autre —
 *
 *   POUR L'ÉLÈVE, une correction lue une fois ne sert à rien. Ce qui
 *   travaille, c'est de relire trois jours plus tard la phrase qu'on
 *   avait ratée, et de voir qu'on ne la raterait plus.
 *
 *   POUR VOUS, c'est la seule mesure honnête de ce que consomme une
 *   séance. Le compteur en jetons vous donne un coût ; la transcription
 *   vous donne ce qu'il y avait dedans — combien de tours, quelle
 *   longueur, quel intérêt. C'est elle qui dira si dix minutes par jour
 *   est la bonne promesse.
 *
 * DEUX ÉTATS, UN SEUL FICHIER : la liste, et une conversation ouverte. Un
 * écran de plus dans la navigation pour trois lignes de contenu n'en
 * valait pas la peine.
 *
 * ON PEUT EFFACER. C'est la parole d'un enfant, enregistrée : elle doit
 * pouvoir partir sur un geste. Une confirmation, pas deux.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  duree, ErreurParler, mesSeances, oublieSeance, quand, type SeanceGardee,
} from '../data/parler';

type Etat = 'charge' | 'pret' | 'panne';

export function ParlerHistorique({ onRetour }: { onRetour: () => void }) {
  const [seances, setSeances] = useState<SeanceGardee[]>([]);
  const [etat, setEtat] = useState<Etat>('charge');
  const [ouverte, setOuverte] = useState<SeanceGardee | null>(null);
  const [aEffacer, setAEffacer] = useState<number | null>(null);
  const [pourquoi, setPourquoi] = useState<string | null>(null);

  const lit = useCallback(async () => {
    setEtat('charge');
    try {
      setSeances(await mesSeances());
      setEtat('pret');
      setPourquoi(null);
    } catch (e) {
      setPourquoi(e instanceof ErreurParler ? e.detail ?? e.message : String(e));
      setEtat('panne');
    }
  }, []);

  useEffect(() => { void lit(); }, [lit]);

  const efface = async (id: number) => {
    await oublieSeance(id);
    setSeances((s) => s.filter((x) => x.id !== id));
    setOuverte(null);
    setAEffacer(null);
  };

  /* ---------------- une conversation ouverte ---------------- */
  if (ouverte) {
    return (
      <section className="parler" aria-label="Une conversation">
        <button className="histo-retour" onClick={() => { setOuverte(null); setAEffacer(null); }}>
          ← Toutes mes conversations
        </button>

        <h2 className="screen-title">{quand(ouverte.finieLe)}</h2>
        <p className="seance-meta">
          {duree(ouverte.secondes)} · {ouverte.repliques} répliques
          {ouverte.themes.length > 0 && ` · ${ouverte.themes.join(', ')}`}
        </p>

        <div className="parler-carte">
          <p className="parler-kicker">Ce qui a coincé</p>
          {ouverte.corrections.length === 0 ? (
            <p className="hint">Rien n’avait été relevé ce jour-là.</p>
          ) : (
            ouverte.corrections.map((c, i) => (
              <div key={i} className={i ? 'seance-corr' : 'seance-corr premiere'}>
                <p className="seance-faux">{c.dit}</p>
                <p className="seance-juste">{c.juste}</p>
                <p className="seance-pourquoi">{c.pourquoi}</p>
              </div>
            ))
          )}
        </div>

        {ouverte.mots.length > 0 && (
          <div className="parler-carte">
            <p className="parler-kicker">Mots rencontrés</p>
            <div className="seance-mots">
              {ouverte.mots.map((m) => (
                <span key={m.en} className="seance-mot">
                  <b>{m.en}</b>
                  <small>{m.fr}</small>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="parler-carte">
          <p className="parler-kicker">Ce que tu as dit</p>
          {ouverte.transcription.length === 0 ? (
            <p className="hint">La transcription n’a pas été gardée pour cette séance.</p>
          ) : (
            <div className="histo-fil">
              {ouverte.transcription.map((t, i) => (
                <p
                  key={i}
                  className={t.role === 'user' ? 'seance-bulle moi' : 'seance-bulle lui'}
                >
                  {t.content}
                </p>
              ))}
            </div>
          )}
        </div>

        {aEffacer === ouverte.id ? (
          <div className="histo-confirme">
            <p>Effacer cette conversation ? Elle ne revient pas.</p>
            <div className="histo-confirme-actions">
              <button className="histo-annule" onClick={() => setAEffacer(null)}>
                Garder
              </button>
              <button className="histo-oublier" onClick={() => void efface(ouverte.id)}>
                Effacer
              </button>
            </div>
          </div>
        ) : (
          <button className="histo-oublier seul" onClick={() => setAEffacer(ouverte.id)}>
            Effacer cette conversation
          </button>
        )}
      </section>
    );
  }

  /* ---------------- la liste ---------------- */
  return (
    <section className="parler" aria-label="Tes conversations">
      <button className="histo-retour" onClick={onRetour}>← Parler</button>

      <h2 className="screen-title">Tes conversations</h2>

      {etat === 'charge' ? (
        <p className="hint">Lecture de tes conversations…</p>
      ) : etat === 'panne' ? (
        <>
          <p className="hint">
            Tes conversations ne sont pas joignables pour l’instant.{' '}
            <button className="parler-lien" onClick={() => void lit()}>Réessayer</button>
          </p>
          {pourquoi && <p className="seance-detail">{pourquoi}</p>}
        </>
      ) : seances.length === 0 ? (
        <div className="parler-carte">
          <p className="hint">
            Rien encore. Chaque conversation terminée se range ici, avec sa
            transcription et son compte rendu — c’est en les relisant à
            quelques jours d’écart qu’on voit ce qui a bougé.
          </p>
        </div>
      ) : (
        <div className="histo-liste">
          {seances.map((s) => (
            <button key={s.id} className="histo-ligne" onClick={() => setOuverte(s)}>
              <span className="histo-date">{quand(s.finieLe)}</span>
              <span className="histo-meta">
                {duree(s.secondes)} · {s.repliques} répliques
                {s.corrections.length > 0 && ` · ${s.corrections.length} correction${s.corrections.length > 1 ? 's' : ''}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
