/**
 * Onglet « Mes progrès » : un encart, deux lignes, deux tiroirs — et un
 * écran.
 *
 * CHANTIER 63 — « MES MOTS » N'EST PLUS UN TIROIR
 *
 * L'encart « Mes mots » ouvrait une feuille montée du bas qui portait
 * deux anneaux, cinq tas, un sélecteur, deux courbes et quatre notes :
 * trois hauteurs d'écran dans une parenthèse. Il ouvre maintenant un
 * écran — `MesMots.tsx`, deux volets — et cet écran s'affiche À LA PLACE
 * de la table des matières, dans le même onglet.
 *
 * Pourquoi ici et pas dans `App.tsx` : l'écran reste un état de l'onglet
 * « Mes progrès ». La barre d'onglets ne bouge pas, ses quatre icônes
 * non plus, et `App.tsx` n'a pas une ligne à changer — donc rien à
 * redéployer de ce côté. Le retour est un chevron dans l'écran, au-dessus
 * du titre, à la place où la barre du haut l'aurait mis.
 *
 * Le calendrier et les paquets RESTENT des tiroirs. Chacun ne montre
 * qu'une chose et tient dans une feuille : les promouvoir en écrans
 * n'aurait ajouté que des allers-retours. On ne change de contenant que
 * là où le contenu a débordé.
 *
 * CHANTIER 51 — deux totaux au lieu d'un : ce qui tourne dans la charge
 * de travail d'aujourd'hui, puis tout ce qu'on possède, pauses comprises.
 * Les deux blocs vivent maintenant dans `MesMots.tsx`.
 *
 * CHANTIER 42 — l'écran prend la forme des Réglages. Trois encarts :
 * « Mes mots », « Mon calendrier », « Mes paquets ».
 *
 * Une différence avec les Réglages, et elle est volontaire : on vient
 * REGARDER cet écran, pas y agir. Un onglet de progrès entièrement
 * replié ne montrerait plus rien. « Mes mots » garde donc son nombre à
 * l'écran — c'est la raison d'ouvrir l'onglet.
 *
 * Tous les chiffres viennent du même endroit (`progressStats`) et le
 * calendrier comme les compteurs lisent la même liste de dates
 * (`streak.days`). C'est ce qui rend impossible qu'ils se contredisent.
 */
import { useEffect, useState } from 'react';
import type { Deck, Settings } from '../domain/types';
import { todayKey } from '../engine/session';
import type { Streak } from '../engine/streak';
import { firstDay, liveStreak, totalWorked, workedSet } from '../engine/streak';
import {
  dureeLabel, loadProgressStats, type ProgressStats,
} from './progressStats';
import { Anneau, MesMots } from './MesMots';
import { Ligne, Tiroir } from './tiroir';

const MOIS_NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];
/** La semaine commence le lundi : c'est un calendrier français. */
const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Quel tiroir est ouvert. Un seul à la fois, et aucun au départ. */
type Tiroirs = null | 'calendrier' | 'paquets';

const nb = (n: number) => n.toLocaleString('fr-FR');

/**
 * Le vert d'une barre d'avancement : clair au départ, profond à l'arrivée.
 *
 * La teinte redit la longueur au lieu de la répéter — à 8 %, un trait court
 * en vert soutenu se lirait comme une réussite. Interpolation en sRGB :
 * suffisante entre deux verts voisins, et sans dépendance.
 */
function vert(t: number): string {
  const a = [169, 220, 194];
  const b = [20, 104, 74];
  const k = Math.min(Math.max(t, 0), 1);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
}

interface Case {
  key: string;
  jour: number | null;
  fait: boolean;
  horsPeriode: boolean;
  aujourdhui: boolean;
}

function grilleDuMois(
  annee: number,
  mois: number,
  faits: Set<string>,
  debut: string | null,
  aujourd: string,
): Case[] {
  const premier = new Date(annee, mois, 1);
  const decalage = (premier.getDay() + 6) % 7;
  const nbJours = new Date(annee, mois + 1, 0).getDate();

  const cases: Case[] = [];
  for (let i = 0; i < decalage; i++) {
    cases.push({ key: `vide-${i}`, jour: null, fait: false, horsPeriode: true, aujourdhui: false });
  }
  for (let d = 1; d <= nbJours; d++) {
    const key = todayKey(new Date(annee, mois, d));
    cases.push({
      key,
      jour: d,
      fait: faits.has(key),
      horsPeriode: key > aujourd || (!!debut && key < debut),
      aujourdhui: key === aujourd,
    });
  }
  return cases;
}

export function Progress({
  decks, active, settings, streak,
}: {
  /** Les paquets possédés : on rend compte de tout ce qu'on a, pas du seul jeu du jour. */
  decks: Deck[];
  /** Les paquets en jeu, parmi les précédents. Ils font le premier périmètre. */
  active: string[];
  settings: Settings;
  streak: Streak;
}) {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [moisRecule, setMoisRecule] = useState(0);
  const [tiroir, setTiroir] = useState<Tiroirs>(null);
  /** Vrai quand l'écran « Mes mots » est ouvert, à la place de la liste. */
  const [surMots, setSurMots] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadProgressStats(decks, active, settings);
      if (alive) setStats(s);
    })();
    return () => { alive = false; };
  }, [decks, active, settings]);

  if (!stats) return <p className="lead">Chargement…</p>;

  /*
   * L'écran « Mes mots » remplace la table des matières. Les deux tiroirs
   * ne peuvent pas être ouverts en même temps que lui — on ne peut pas
   * les atteindre depuis là — donc rien à refermer au passage.
   */
  if (surMots) {
    return <MesMots stats={stats} onRetour={() => setSurMots(false)} />;
  }

  const aujourd = todayKey();
  const faits = workedSet(streak);
  const debut = firstDay(streak);
  const serieJours = liveStreak(streak);
  const total = totalWorked(streak);

  /* Jusqu'où on peut remonter : le mois du premier jour travaillé. */
  const maintenant = new Date();
  const moisMin = debut
    ? (maintenant.getFullYear() - Number(debut.slice(0, 4))) * 12
      + (maintenant.getMonth() - (Number(debut.slice(5, 7)) - 1))
    : 0;
  const recul = Math.min(moisRecule, Math.max(moisMin, 0));
  const vue = new Date(maintenant.getFullYear(), maintenant.getMonth() - recul, 1);
  const cases = grilleDuMois(vue.getFullYear(), vue.getMonth(), faits, debut, aujourd);
  const faitsDuMois = cases.filter((c) => c.jour !== null && c.fait).length;

  /*
   * Ce que les deux lignes affichent à droite. « Série à lancer » est un
   * état, pas un vide : « 0 jour » se lirait comme une panne.
   */
  const serieDite = serieJours === 0
    ? 'Série à lancer'
    : `${serieJours} jour${serieJours > 1 ? 's' : ''}`;
  const paquetsDits = `${stats.rows.length} paquet${stats.rows.length > 1 ? 's' : ''}`;

  const { tout } = stats;

  return (
    <>
      <h2 className="screen-title">Mes progrès</h2>

      <div className="reglist">
        {/* L'encart des mots garde son nombre à l'écran : c'est la
            réponse qu'on venait chercher. Il compte TOUT ce qu'on
            possède — l'écran sépare ensuite les deux périmètres. */}
        <button className="progmots" onClick={() => setSurMots(true)}>
          <img src="/ico-mots.png" alt="" width={40} height={40} />
          <span>
            <span className="progmots-nom">Mes mots</span>
            <span className="progmots-ligne">
              <b>{nb(tout.acquis)}</b>
              <small>acquis</small>
            </span>
            <small>
              sur {nb(tout.mots)} mots au total
              {' · '}{nb(tout.enCours)} en cours
            </small>
          </span>
          <Anneau percent={tout.percent} taille={58} />
          <i aria-hidden="true">›</i>
        </button>

        <Ligne
          icone="/ico-calendrier.png"
          titre="Mon calendrier"
          sous="La série, et les jours travaillés."
          valeur={serieDite}
          onClick={() => setTiroir('calendrier')}
        />
        {/* Même icône que l'onglet « Paquets » : c'est la même chose
            qu'on désigne, et deux dessins pour un objet se paieraient. */}
        <Ligne
          icone="/tab-paquets.png"
          titre="Mes paquets"
          sous="Où en est chacun, paquet par paquet."
          valeur={paquetsDits}
          onClick={() => setTiroir('paquets')}
        />
      </div>

      {tiroir === 'calendrier' && (
        <Tiroir titre="Mon calendrier" onFermer={() => setTiroir(null)}>
          <div className="prog-compteurs">
            <span>
              <b>{serieJours}</b>
              <small>jour{serieJours > 1 ? 's' : ''} d’affilée</small>
            </span>
            <span>
              <b>{streak.best}</b>
              <small>meilleure série</small>
            </span>
            <span>
              <b>{total}</b>
              <small>jours travaillés</small>
            </span>
          </div>

          <div className="prog-moisbar">
            <button
              className="btn-rond"
              onClick={() => setMoisRecule((v) => Math.min(v + 1, Math.max(moisMin, 0)))}
              disabled={recul >= moisMin}
              aria-label="Mois précédent"
            >
              ‹
            </button>
            <b>{MOIS_NOMS[vue.getMonth()]} {vue.getFullYear()}</b>
            <button
              className="btn-rond"
              onClick={() => setMoisRecule((v) => Math.max(0, v - 1))}
              disabled={recul === 0}
              aria-label="Mois suivant"
            >
              ›
            </button>
          </div>

          <div className="prog-cal">
            {JOURS_COURTS.map((j, i) => (
              <small key={i} className="prog-cal-head">{j}</small>
            ))}
            {cases.map((c) => (
              <span
                key={c.key}
                className={
                  'prog-jour'
                  + (c.jour === null ? ' vide' : '')
                  + (c.fait ? ' on' : '')
                  + (c.horsPeriode && !c.fait ? ' hors' : '')
                  + (c.aujourdhui ? ' now' : '')
                }
              >
                {c.jour ?? ''}
              </span>
            ))}
          </div>
          <p className="hint">
            {faitsDuMois} jour{faitsDuMois > 1 ? 's' : ''} travaillé{faitsDuMois > 1 ? 's' : ''}
            {' '}en {MOIS_NOMS[vue.getMonth()]}
            {debut ? `, ${total} depuis le début` : ''}.
          </p>
        </Tiroir>
      )}

      {tiroir === 'paquets' && (
        <Tiroir titre="Mes paquets" onFermer={() => setTiroir(null)}>
          <div className="prog-liste">
            {stats.rows.map((r) => (
              <span key={r.deck.id} className="prog-ligne">
                <span className="prog-ligne-haut">
                  <b>{r.deck.name}</b>
                  {/* La pause se dit ici : sans quoi on cherche pourquoi ce
                      paquet ne bouge plus d'un mois sur l'autre. */}
                  {!r.enJeu && <em>en pause</em>}
                  <small>{nb(r.acquis)} / {nb(r.total)}</small>
                </span>
                <span className="prog-barre">
                  <i
                    style={{
                      width: `${Math.max(1.5, r.percent)}%`,
                      background: `linear-gradient(90deg, #a9dcc2, ${vert(r.percent / 60)})`,
                    }}
                  />
                </span>
              </span>
            ))}
          </div>

          <p className="hint prog-pied">
            {nb(stats.revisions)} cartes revues depuis le
            début, soit environ {dureeLabel(stats.minutes)} de travail. Le temps
            est déduit du nombre de cartes, jamais chronométré.
          </p>
        </Tiroir>
      )}
    </>
  );
}
