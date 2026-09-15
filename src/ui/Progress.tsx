/**
 * Onglet « Mes progrès » : un encart, deux lignes, deux écrans, un
 * tiroir.
 *
 * CHANTIER 64 — « MON CALENDRIER » DEVIENT UN ÉCRAN
 *
 * Même mouvement qu'au chantier 63 pour « Mes mots » : la ligne n'ouvre
 * plus une feuille montée du bas, elle affiche un écran à la place de la
 * table des matières, dans le même onglet. `MonCalendrier.tsx` en porte
 * le contenu — et remonte maintenant douze mois en arrière au moins, là
 * où le tiroir s'arrêtait au premier jour travaillé.
 *
 * « Mes paquets » RESTE un tiroir, et c'est un choix : c'est une liste
 * qu'on parcourt d'un coup d'œil, sans navigation interne ni mois à
 * feuilleter. La promouvoir en écran n'ajouterait qu'un aller-retour.
 * On ne change de contenant que là où le contenu a débordé.
 *
 * Comme au chantier 63, rien dans `App.tsx` : les deux écrans sont des
 * états de l'onglet, la barre d'onglets et ses quatre icônes ne bougent
 * pas.
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
import type { Streak } from '../engine/streak';
import { liveStreak } from '../engine/streak';
import {
  dureeLabel, loadProgressStats, type ProgressStats,
} from './progressStats';
import { Anneau, MesMots } from './MesMots';
import { MonCalendrier } from './MonCalendrier';
import { Ligne, Tiroir } from './tiroir';

const nb = (n: number) => n.toLocaleString('fr-FR');

/** Quel écran de détail est ouvert, à la place de la table des matières. */
type Sous = null | 'mots' | 'calendrier';

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
  const [sous, setSous] = useState<Sous>(null);
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

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
   * Les écrans de détail remplacent la table des matières. Le tiroir ne
   * peut pas être ouvert en même temps que l'un d'eux — on ne peut pas
   * l'atteindre depuis là — donc rien à refermer au passage.
   */
  if (sous === 'mots') {
    return <MesMots stats={stats} onRetour={() => setSous(null)} />;
  }
  if (sous === 'calendrier') {
    return <MonCalendrier streak={streak} onRetour={() => setSous(null)} />;
  }

  const serieJours = liveStreak(streak);

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
        <button className="progmots" onClick={() => setSous('mots')}>
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
          onClick={() => setSous('calendrier')}
        />
        {/* Même icône que l'onglet « Paquets » : c'est la même chose
            qu'on désigne, et deux dessins pour un objet se paieraient. */}
        <Ligne
          icone="/tab-paquets.png"
          titre="Mes paquets"
          sous="Où en est chacun, paquet par paquet."
          valeur={paquetsDits}
          onClick={() => setTiroirOuvert(true)}
        />
      </div>

      {tiroirOuvert && (
        <Tiroir titre="Mes paquets" onFermer={() => setTiroirOuvert(false)}>
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
