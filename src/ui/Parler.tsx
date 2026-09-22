/**
 * L'onglet « Parler » — ce qu'on règle AVANT d'ouvrir la bouche.
 *
 * CHANTIER 103 — LE CINQUIÈME ONGLET
 *
 * La conversation elle-même n'a pas d'écran à dessiner : c'est une voix, un
 * micro et un bouton pour raccrocher. Tout le travail est avant — de quoi
 * va-t-on parler, avec quels mots, pour combien de temps — et après, dans
 * le compte rendu. Cet écran est le « avant ».
 *
 * TROIS CARTES, DANS L'ORDRE DES QUESTIONS QU'ON SE POSE :
 *
 * 1. COMBIEN DE TEMPS AI-JE ? L'élève voit des minutes ; le serveur, le
 *    jour où il y en aura un, comptera des jetons. Les deux ne se croisent
 *    jamais à l'écran : « dix minutes par jour » est une promesse lisible,
 *    la facture est au caractère. La jauge est donc honnête pour lui et le
 *    plafond sûr pour l'exploitant.
 *
 * 2. QU'EST-CE QUE JE SAIS DÉJÀ ? Les mots passés au palier 100 cette
 *    semaine, tirés des paliers réels (voir `motsRecents`). C'est la carte
 *    qui rend l'abonnement défendable : aucune IA généraliste ne sait ce
 *    que cet élève vient d'apprendre.
 *
 * 3. DE QUOI PARLE-T-ON ? Dix thèmes au plus, choisis d'avance. Le niveau
 *    est rappelé en tête de cette carte, en lecture seule : c'est la classe
 *    déclarée dans les Réglages qui le fixe, jamais le modèle.
 *
 * CE QUE CET ÉCRAN NE FAIT PAS ENCORE. Il ne parle pas. Le bouton reste
 * éteint tant qu'aucun service de conversation n'est raccordé — `onParler`
 * absent. Un bouton qui ne fait rien est pire qu'un bouton éteint qui dit
 * pourquoi.
 *
 * POURQUOI localStorage ET NON LES RÉGLAGES. Les thèmes choisis et le temps
 * consommé aujourd'hui sont des préférences de séance, locales à
 * l'appareil, remises à zéro chaque nuit pour le second. Les passer par
 * `Settings` aurait voulu dire toucher `domain/types`, `sync.ts` et la
 * table `user_settings` — trois fichiers de la chaîne de synchronisation,
 * pour une donnée qui n'a pas à voyager. Le chantier 101 a assez montré ce
 * que coûte une erreur à cet endroit.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Classe, Deck, Settings } from '../domain/types';
import { CLASSE_LABELS } from '../domain/types';
import { motsRecents, type MotRecent } from './motsRecents';

/** Minutes de parole offertes par jour. Un seul endroit à changer. */
const BUDGET_MINUTES = 10;

/** Les thèmes proposés. Au plus dix retenus — voir `MAX_THEMES`. */
const THEMES = [
  'Me présenter', 'La famille', 'Le collège', 'Le sport', 'La musique',
  'Les voyages', 'La cuisine', 'Les animaux', 'Le cinéma', 'Les vacances',
  'La ville', 'La nature', 'Les copains', 'Le week-end',
];

const MAX_THEMES = 10;

/** Thèmes retenus, et secondes déjà parlées aujourd'hui. */
const CLE_THEMES = 'vocab:parler-themes';
const CLE_USAGE = 'vocab:parler-usage';

/**
 * Ce que l'IA s'autorise, par classe.
 *
 * La table est ici et non dans le prompt : c'est un choix pédagogique, il
 * se relit, et il doit s'afficher à l'élève avant la conversation. Un
 * réglage caché serait un réglage qu'on finit par oublier.
 */
const GRAMMAIRE: Record<Classe, string> = {
  CM2: 'présent, phrases courtes, questions simples',
  '6e': 'présent, questions simples, vocabulaire du quotidien',
  '5e': 'présent et prétérit, phrases reliées',
  '4e': 'présent, prétérit, futur, present perfect',
  '3e': 'tous les temps du collège, conditionnel',
  '2de': 'temps composés, opinions argumentées',
  '1re': 'nuances, hypothèses, sujets d’actualité',
  Tle: 'registre soutenu, abstraction, débat',
};

/** Le jour courant, en clé comparable — pas une heure, une date. */
function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Secondes déjà parlées aujourd'hui. Un autre jour remet à zéro. */
function usageDuJour(): number {
  try {
    const brut = localStorage.getItem(CLE_USAGE);
    if (!brut) return 0;
    const u = JSON.parse(brut) as { jour?: string; secondes?: number };
    return u.jour === aujourdhui() ? Math.max(0, u.secondes ?? 0) : 0;
  } catch {
    return 0;
  }
}

function themesRetenus(): string[] {
  try {
    const brut = localStorage.getItem(CLE_THEMES);
    if (!brut) return [];
    const t = JSON.parse(brut) as unknown;
    if (!Array.isArray(t)) return [];
    return t.filter((x): x is string => typeof x === 'string' && THEMES.includes(x));
  } catch {
    return [];
  }
}

export function Parler({
  decks, active, settings, onReglages, onParler,
}: {
  decks: Deck[];
  /** Paquets en jeu : le vocabulaire dont la conversation peut se servir. */
  active: string[];
  settings: Settings;
  /** Aller régler sa classe. Le niveau ne se change pas depuis ici. */
  onReglages: () => void;
  /**
   * Démarrer la conversation. ABSENT tant qu'aucun service n'est raccordé :
   * le bouton reste alors éteint et l'écran le dit.
   */
  onParler?: (themes: string[]) => void;
}) {
  const [choisis, setChoisis] = useState<string[]>(themesRetenus);
  const [mots, setMots] = useState<MotRecent[]>([]);
  const [totalMots, setTotalMots] = useState(0);
  const [chargeMots, setChargeMots] = useState(true);

  const usage = useMemo(() => usageDuJour(), []);
  const resteSecondes = Math.max(0, BUDGET_MINUTES * 60 - usage);
  const resteMinutes = Math.round(resteSecondes / 60);
  const part = (100 * resteSecondes) / (BUDGET_MINUTES * 60);

  useEffect(() => {
    let vivant = true;
    setChargeMots(true);
    void motsRecents(decks, active).then((r) => {
      if (!vivant) return;
      setMots(r.mots);
      setTotalMots(r.total);
      setChargeMots(false);
    });
    return () => { vivant = false; };
  }, [decks, active]);

  const bascule = (t: string) => {
    setChoisis((prec) => {
      const suivant = prec.includes(t)
        ? prec.filter((x) => x !== t)
        : prec.length >= MAX_THEMES ? prec : [...prec, t];
      localStorage.setItem(CLE_THEMES, JSON.stringify(suivant));
      return suivant;
    });
  };

  const classe = settings.classe;
  const autres = Math.max(0, totalMots - mots.length);
  const plusDeTemps = resteSecondes <= 0;

  return (
    <section className="parler" aria-label="Parler anglais">
      <h2 className="screen-title">Parler anglais</h2>

      <div className="parler-carte">
        <div className="parler-tete">
          <p className="parler-kicker">Ton temps de parole</p>
          <em className="parler-note">remis à zéro à minuit</em>
        </div>
        <p className="parler-min">
          <b>{resteMinutes}</b>
          <span>
            minute{resteMinutes > 1 ? 's' : ''} disponible{resteMinutes > 1 ? 's' : ''} aujourd’hui
          </span>
        </p>
        <span className="parler-jauge" aria-hidden="true">
          <i style={{ width: `${part}%` }} />
        </span>
        <p className="hint">
          {usage === 0
            ? 'Tu n’as encore rien utilisé aujourd’hui.'
            : `Déjà ${Math.round(usage / 60)} minute${usage >= 120 ? 's' : ''} de parole aujourd’hui.`}
        </p>
      </div>

      <div className="parler-carte">
        <p className="parler-kicker">Tes mots de la semaine</p>
        {chargeMots ? (
          <p className="hint">Lecture de tes paliers…</p>
        ) : mots.length === 0 ? (
          <p className="hint">
            Aucun mot acquis pour l’instant dans tes paquets en jeu. Travaille
            quelques cartes : ce sont ces mots-là que la conversation
            emploiera, sans que tu aies à les chercher.
          </p>
        ) : (
          <>
            <div className="parler-mots">
              {mots.map((m) => (
                <span key={m.en} className="parler-mot" title={m.fr}>{m.en}</span>
              ))}
              {autres > 0 && <span className="parler-mot plus">+ {autres}</span>}
            </div>
            <p className="hint">
              Ils reviendront dans la conversation, sans que tu aies à les
              chercher.
            </p>
          </>
        )}
      </div>

      <div className="parler-carte">
        <div className="parler-tete">
          <p className="parler-kicker">De quoi parle-t-on ?</p>
          <em className="parler-compte">{choisis.length} / {MAX_THEMES}</em>
        </div>

        {classe ? (
          <p className="parler-niveau">
            <b>Niveau {CLASSE_LABELS[classe]}</b> — {GRAMMAIRE[classe]}.
          </p>
        ) : (
          <p className="parler-niveau">
            Classe non déclarée : la conversation restera simple.{' '}
            <button className="parler-lien" onClick={onReglages}>
              Choisir ma classe
            </button>
          </p>
        )}

        <div className="parler-themes">
          {THEMES.map((t) => {
            const on = choisis.includes(t);
            return (
              <button
                key={t}
                className={on ? 'on' : ''}
                aria-pressed={on}
                disabled={!on && choisis.length >= MAX_THEMES}
                onClick={() => bascule(t)}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <button
        className="btn parler-go"
        disabled={!onParler || plusDeTemps || choisis.length === 0}
        onClick={() => onParler?.(choisis)}
      >
        Commencer à parler
      </button>

      {!onParler ? (
        <p className="hint parler-pied">
          La conversation n’est pas encore raccordée : l’écran est en place,
          la voix viendra avec le service qui la portera. Tout ce qui est
          au-dessus est déjà réel — le temps, tes mots, tes thèmes.
        </p>
      ) : choisis.length === 0 ? (
        <p className="hint parler-pied">
          Choisis au moins un thème. Sans sujet, la conversation tourne à
          vide au bout de deux phrases.
        </p>
      ) : plusDeTemps ? (
        <p className="hint parler-pied">
          Ton temps de parole est fini pour aujourd’hui. Il revient à minuit.
        </p>
      ) : null}
    </section>
  );
}
