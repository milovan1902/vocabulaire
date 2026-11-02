/**
 * Onglet « Mes progrès ».
 *
 * CHANTIER 387 — UN BANDEAU, QUATRE TUILES (maquette 387, 1a).
 * Même forme que les Réglages (379). En haut, les trois chiffres qu'on
 * vient chercher : les mots acquis (touche = Mes mots), la série
 * (touche = Mon calendrier), les XP (touche = Mes XP). Dessous, quatre
 * tuiles : Calendrier, Oral, Mes paquets, Mes amis. « Pourquoi ça
 * marche » part dans Réglages › Aide et info. « Mes amis » a sa propre
 * icône (deux personnes, bleu) : la silhouette seule reste à « Moi ».
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
 *
 * CHANTIER 121 — une ligne « Oral » ouvre l'écran des statistiques de
 * parole (`MaParole.tsx`), comme « Mes mots » et « Mon calendrier ».
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
import { MaParole } from './MaParole';
import { Tiroir } from './tiroir';
import { MesXp } from './MesXp';
import { xpTotal } from '../engine/xp';
/* CHANTIER 387 — le bandeau et les tuiles. */
import './reglages-familles.css';
import './progres-bandeau.css';
/* CHANTIER 392 — la pastille des défis reçus, aussi sur la tuile « Mes amis ». */
import { useNbDefisRecus } from './useDefisRecus';
/* CHANTIER 386 — les amis. */
import { Amis } from './Amis';
import { publieAmis, resumeAmis } from '../data/amis';
import { nettoiePrenom } from '../domain/types';

const nb = (n: number) => n.toLocaleString('fr-FR');

/** 387 — les icônes du bandeau et des tuiles (Lucide), comme les Réglages. */
const sv = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const ICONES = {
  serie: <svg {...sv}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>,
  xp: <svg {...sv}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  calendrier: <svg {...sv}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  oral: <svg {...sv}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></svg>,
  paquets: <svg {...sv}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>,
  amis: <svg {...sv}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
};

/** Quel écran de détail est ouvert, à la place de la table des matières. */
type Sous = null | 'mots' | 'calendrier' | 'parole';

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
  decks, active, settings, streak, ouvrir,
}: {
  /** Les paquets possédés : on rend compte de tout ce qu'on a, pas du seul jeu du jour. */
  decks: Deck[];
  /** Les paquets en jeu, parmi les précédents. Ils font le premier périmètre. */
  active: string[];
  settings: Settings;
  streak: Streak;
  /** CHANTIER 166 — ouvrir directement un écran de détail (depuis Aujourd'hui).
      CHANTIER 185 — ou le tiroir « Mes XP » (appui sur le niveau). */
  ouvrir?: 'calendrier' | 'xp' | null;
}) {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [sous, setSous] = useState<Sous>(ouvrir === 'calendrier' ? 'calendrier' : null);
  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  /* CHANTIER 185 — « Mes XP », venu des Réglages. */
  const [xpOuvert, setXpOuvert] = useState(ouvrir === 'xp');
  /* 386 — « Mes amis ». */
  const [amisOuvert, setAmisOuvert] = useState(false);
  const defisRecus = useNbDefisRecus();

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await loadProgressStats(decks, active, settings);
      if (alive) setStats(s);
    })();
    return () => { alive = false; };
  }, [decks, active, settings]);

  /* 386 — les amis voient les mêmes chiffres que cet écran : on les publie à chaque ouverture. */
  useEffect(() => {
    if (stats) void publieAmis(streak, nettoiePrenom(settings.prenom), stats.tout.acquis);
  }, [stats, streak, settings.prenom]);

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
  if (sous === 'parole') {
    return <MaParole onRetour={() => setSous(null)} />;
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
      {/* CHANTIER 186 — « Mes paquets » et « Mes XP » prennent la place de la liste. */}
      {!xpOuvert && !tiroirOuvert && !amisOuvert && (<>
      <h2 className="screen-title">Mes progrès</h2>

      {/* 387 — le bandeau : les trois chiffres, chacun ouvre son détail. */}
      <div className="progbandeau">
        <button className="progbandeau-mots" onClick={() => setSous('mots')}>
          <Anneau percent={tout.percent} taille={62} />
          <span className="progbandeau-txt">
            <small>Mes mots</small>
            <b>{nb(tout.acquis)} <em>acquis</em></b>
            <small>sur {nb(tout.mots)} · {nb(tout.enCours)} en cours</small>
          </span>
          <i aria-hidden="true">›</i>
        </button>
        <div className="progchips">
          <button className="progchip" onClick={() => setSous('calendrier')}>
            <span aria-hidden="true">{ICONES.serie}</span>
            <span><b>{serieDite}</b><small>{serieJours === 0 ? 'Mon calendrier' : 'de série'}</small></span>
          </button>
          <button className="progchip" onClick={() => setXpOuvert(true)}>
            <span aria-hidden="true">{ICONES.xp}</span>
            <span><b>{xpTotal(streak).toLocaleString('fr-FR')} XP</b><small>Mes XP</small></span>
          </button>
        </div>
      </div>

      <div className="regtuiles progtuiles">
        <button className="regtuile calendrier" onClick={() => setSous('calendrier')}>
          <span className="regtuile-icone" aria-hidden="true">{ICONES.calendrier}</span>
          <b>Calendrier</b>
          <small>Jours travaillés</small>
        </button>
        <button className="regtuile oral" onClick={() => setSous('parole')}>
          <span className="regtuile-icone" aria-hidden="true">{ICONES.oral}</span>
          <b>Oral</b>
          <small>Parole, fautes, aisance</small>
        </button>
        <button className="regtuile paquets" onClick={() => setTiroirOuvert(true)}>
          <span className="regtuile-icone" aria-hidden="true">{ICONES.paquets}</span>
          <b>Mes paquets</b>
          <small>{paquetsDits}</small>
        </button>
        {/* 387 — deux personnes : « Mes amis » ne partage plus l'icône de « Moi ». */}
        <button className="regtuile amis" onClick={() => setAmisOuvert(true)}>
          <span className="regtuile-icone" aria-hidden="true">{ICONES.amis}</span>
          {defisRecus > 0 && (
            <em className="tuile-pastille" aria-label={`${defisRecus} défi${defisRecus > 1 ? 's' : ''} à relever`}>{defisRecus}</em>
          )}
          <b>Mes amis</b>
          <small>{resumeAmis() || 'Code ami, classement'}</small>
        </button>
      </div>
      </>)}

      {amisOuvert && (
        <Tiroir titre="Mes amis" retour="Mes progrès" onFermer={() => setAmisOuvert(false)}>
          <Amis settings={settings} streak={streak} acquis={stats.tout.acquis} />
        </Tiroir>
      )}

      {xpOuvert && (
        <Tiroir titre="Mes XP" retour="Mes progrès" onFermer={() => setXpOuvert(false)}>
          <MesXp streak={streak} />
        </Tiroir>
      )}

      {tiroirOuvert && (
        <Tiroir titre="Mes paquets" retour="Mes progrès" onFermer={() => setTiroirOuvert(false)}>
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
