/**
 * L'écran « Mes mots », en deux volets.
 *
 * CHANTIER 63 — LE TIROIR DEVIENT UN ÉCRAN
 *
 * « Mes mots » avait raison d'être un tiroir quand il portait deux
 * nombres. Il portait au chantier 62 deux anneaux, cinq tas, un
 * sélecteur, deux courbes et quatre notes de lecture : plus de trois
 * hauteurs d'écran dans une feuille qui monte du bas. Un tiroir est une
 * parenthèse — on l'ouvre, on lit, on le referme. Ceci est une
 * destination, et une destination se visite.
 *
 * Trois décisions s'y lisent :
 *
 * 1. DEUX VOLETS, PAS UN LONG DÉFILEMENT. L'écran répond à deux
 *    questions qui n'ont pas la même forme : « où en sont mes mots
 *    aujourd'hui » (un état, cinq tas, une barre) et « est-ce que
 *    j'avance » (une évolution, quatre lignes, du temps). Les mettre
 *    bout à bout obligeait à faire défiler trois écrans pour voir la
 *    courbe ; côte à côte derrière deux pastilles, chacune tient d'un
 *    seul regard.
 *
 * 2. LE PREMIER VOLET EST L'ÉTAT. C'est la réponse qu'on venait
 *    chercher, et la seule qui existe dès le premier jour — la courbe,
 *    elle, se remplit avec le temps. Ouvrir sur un cadre d'attente
 *    serait ouvrir sur un vide.
 *
 * 3. LA COURBE GAGNE CE QUE LE TIROIR LUI REFUSAIT. 196 px de tracé au
 *    lieu de 100 : à cette hauteur, les quatre lignes se séparent enfin,
 *    et le jaune qui plafonne pendant que le vert monte se voit sans
 *    qu'on ait à le chercher. C'est la raison principale du chantier.
 *
 * Le sélecteur de volet est le `.themechoix` des Réglages, comme le
 * sélecteur de grain juste en dessous : deux pastilles à filet, l'or en
 * aplat sur l'active. Aucun geste nouveau n'est inventé ici.
 *
 * Rien de ce que le tiroir disait n'a été retiré : les deux périmètres,
 * les notes qui expliquent pourquoi « à découvrir » n'est pas tracé, la
 * courbe mensuelle héritée du chantier 34 — tout est là, rangé.
 */
import { useState } from 'react';
import { courbe, monthLabel } from '../engine/jalons';
import { GRAINS, labelDe, serie, type Grain, type Releve } from '../engine/paliers';
import { masteryLabel, STATUTS } from '../engine/mastery';
import type { Perimetre, ProgressStats } from './progressStats';

const nb = (n: number) => n.toLocaleString('fr-FR');

/** Périmètre du cercle de rayon 15 dans le repère 36×36 de l'anneau. */
const C = 2 * Math.PI * 15;

/**
 * Hauteur du tracé des paliers, en pixels, dans le volet « évolution ».
 *
 * Elle est ici et non seulement dans la feuille de style parce que la
 * valeur du dernier point est posée en pixels depuis le bas : le repère
 * du SVG fait 100 de haut, le tracé 196 de haut, et sans ce facteur
 * l'étiquette se décrocherait de sa ligne. Deux endroits, une valeur —
 * `.prog-courbe.haute svg` doit dire la même chose.
 */
const H_TRACE = 196;

/** L'anneau des mots acquis, avec son pourcentage au centre. */
export function Anneau({ percent, taille }: { percent: number; taille: number }) {
  return (
    <span className="progring" style={{ width: taille, height: taille }} aria-hidden="true">
      <svg className="ring" viewBox="0 0 36 36">
        <circle className="ring-bg" cx="18" cy="18" r="15" />
        <circle
          className="ring-fg"
          cx="18" cy="18" r="15"
          strokeDasharray={`${(C * Math.min(percent, 100)) / 100} ${C}`}
        />
      </svg>
      <b>{masteryLabel(percent)}</b>
    </span>
  );
}

/**
 * Un périmètre de mots : son titre, son anneau, ses cinq tas.
 *
 * La barre et la liste des statuts sont celles de « Aujourd'hui », aux
 * mêmes classes et dans le même ordre (`STATUTS`, dans `engine/mastery`) :
 * ce que l'accueil montre pour un paquet, ce bloc le montre pour un
 * ensemble de paquets, et les couleurs veulent dire la même chose.
 */
function BlocMots({ titre, p, note }: { titre: string; p: Perimetre; note: string }) {
  const tas = STATUTS.map((s) => ({ ...s, n: p.tas[s.cle] })).filter((s) => s.n > 0);

  return (
    <div className="prog-perim">
      <p className="rayon-label">{titre}</p>
      <div className="prog-tete">
        <div className="prog-grand">
          <span className="label">Mots acquis</span>
          <b>{nb(p.acquis)}</b>
        </div>
        <Anneau percent={p.percent} taille={58} />
      </div>
      <p className="hint">{note}</p>

      {tas.length > 0 && (
        <>
          <span className="statbar" aria-hidden="true">
            {tas.map((s) => (
              <i key={s.cle} className={s.classe} style={{ width: `${(100 * s.n) / p.mots}%` }} />
            ))}
          </span>
          <span className="statlist">
            {tas.map((s) => (
              <span key={s.cle} className="statline">
                <i className={s.classe} />
                <span>{s.libelle}</span>
                <b>{nb(s.n)}</b>
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  );
}

/*
 * Les quatre paliers tracés : tous sauf « à découvrir ».
 *
 * « À découvrir » compte les mots jamais présentés — sur un paquet neuf,
 * presque tout. Tracé avec les autres, il impose une échelle où « à
 * reprendre » (quelques dizaines) devient une ligne plate collée au
 * filet, et où l'on ne voit plus rien du travail. C'est un stock, pas un
 * progrès, et la barre empilée de l'autre volet le montre déjà.
 *
 * Le nom de la classe de tracé se déduit de celui du statut — `st-acquis`
 * donne `tr-acquis` — afin que `engine/mastery.ts` reste la seule liste
 * des cinq tas. Une deuxième table aurait fini par donner un autre ordre
 * ou une autre couleur, et deux lectures d'un même vert.
 */
const LIGNES = STATUTS.filter((s) => s.cle !== 'decouvrir');

/**
 * L'évolution des paliers, au grain choisi.
 *
 * L'ÉCHELLE NE PART PAS DE ZÉRO EN HAUT : le sommet du cadre est le plus
 * grand des quatre nombres affichés, recalculé à chaque changement de
 * grain. C'est ce qui rend les quatre lignes comparables entre elles —
 * une échelle fixée sur le total des mots les aplatirait toutes.
 */
function CourbePaliers({ releves }: { releves: Releve[] }) {
  const [grain, setGrain] = useState<Grain>('semaine');
  const points = serie(releves, grain);

  /*
   * Le sélecteur n'apparaît qu'une fois deux relevés en magasin. Avant,
   * les trois vues donnent le même point unique : trois boutons qui ne
   * changent rien sont une promesse en trop.
   */
  const choixUtile = releves.length >= 2;

  const selecteur = (
    <div className="themechoix prog-grain">
      {GRAINS.map((g) => (
        <button
          key={g.cle}
          className={grain === g.cle ? 'on' : ''}
          aria-pressed={grain === g.cle}
          onClick={() => setGrain(g.cle)}
        >
          {g.libelle}
        </button>
      ))}
    </div>
  );

  if (points.length < 2) {
    return (
      <>
        {choixUtile && selecteur}
        <div className="prog-courbe attente haute">
          <p className="hint">
            {choixUtile
              ? 'Pas encore deux relevés à ce grain. Essayez « Jour », ou revenez dans quelques semaines.'
              : 'Le premier relevé est fait. Revenez demain : chaque jour travaillé ajoute une mesure, et la courbe se dessinera d’elle-même.'}
          </p>
        </div>
        <div className="prog-courbe-axe">
          <small>aujourd’hui</small>
          <small>{releves.length} relevé{releves.length > 1 ? 's' : ''}</small>
        </div>
        <p className="hint prog-perim-note">
          Le palier d’un mot dit où il en est, jamais quand il y est arrivé :
          le passé d’avant le premier relevé ne peut pas être reconstitué.
        </p>
      </>
    );
  }

  const max = Math.max(
    1,
    ...points.flatMap((r) => LIGNES.map((s) => r[s.cle])),
  );
  const x = (i: number) => (320 * i) / (points.length - 1);
  const y = (v: number) => 96 - (88 * v) / max;

  const trace = (cle: (typeof LIGNES)[number]['cle']) =>
    points
      .map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r[cle]).toFixed(1)}`)
      .join(' ');

  /*
   * Au plus quatre libellés sous l'axe. La vue « jour » porte jusqu'à
   * trente points : trente dates dans la largeur d'un téléphone se
   * chevauchent et ne se lisent plus. On garde les bornes et deux repères
   * au tiers.
   */
  const indices = points.length <= 4
    ? points.map((_, i) => i)
    : [0, 1, 2, 3].map((k) => Math.round((k * (points.length - 1)) / 3));

  const dernier = points[points.length - 1];

  return (
    <>
      {selecteur}

      <div className="prog-courbe haute">
        <svg viewBox="0 0 320 100" preserveAspectRatio="none" aria-hidden="true">
          {LIGNES.map((s) => (
            <path
              key={s.cle}
              className={`tr ${s.classe.replace('st-', 'tr-')}`}
              d={trace(s.cle)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {/* Le dernier nombre de la ligne « acquis » : c'est celui qu'on
            vient chercher, et le seul qu'on puisse poser sans encombrer.
            La position remonte du repère 100 à la hauteur réelle. */}
        <b
          className="prog-courbe-n fin"
          style={{
            left: '100%',
            bottom: `${(H_TRACE * (100 - y(dernier.acquis))) / 100 + 7}px`,
          }}
        >
          {nb(dernier.acquis)}
        </b>
      </div>
      <div className="prog-courbe-axe">
        {indices.map((i) => (
          <small key={points[i].jour}>{labelDe(points[i].jour, grain)}</small>
        ))}
      </div>

      <span className="statlist">
        {LIGNES.map((s) => (
          <span key={s.cle} className="statline">
            <i className={s.classe} />
            <span>{s.libelle}</span>
            <b>{nb(dernier[s.cle])}</b>
          </span>
        ))}
      </span>

      <p className="hint prog-perim-note">
        Les mots <b>à découvrir</b> ne sont pas tracés : ce sont les mots
        jamais présentés, un stock et non un progrès, et leur nombre écrase
        les quatre autres lignes. Le volet « Mes cinq tas » les compte.
      </p>
      <p className="hint">
        La courbe suit tous les paquets, pauses comprises : un mot acquis
        reste acquis. Chaque point est l’état à la fin de sa période, pas une
        moyenne — et un jour sans ouverture ne laisse pas de point.
      </p>
    </>
  );
}

/**
 * La courbe mensuelle des mots acquis, conservée.
 *
 * Elle porte le passé noté depuis le chantier 34, que les relevés
 * quotidiens ne peuvent pas inventer : ils ont commencé au chantier 62.
 * Le jour où la série quotidienne couvrira le même terrain, ce bloc
 * pourra partir — le retirer aujourd'hui effacerait de l'écran le seul
 * historique réel.
 */
function CourbeMensuelle({ jalons }: { jalons: ProgressStats['jalons'] }) {
  const points = courbe(jalons);
  if (points.length < 2) return null;

  const maxCourbe = Math.max(...points.map((p) => p.acquis), 1);
  const xy = points.map((p, i) => ({
    ...p,
    x: points.length > 1 ? (320 * i) / (points.length - 1) : 160,
    y: 96 - (88 * p.acquis) / maxCourbe,
  }));
  const trace = xy.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="prog-perim">
      <p className="rayon-label">Les mots acquis, mois par mois</p>
      <div className="prog-courbe">
        <svg viewBox="0 0 320 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={`${trace} L320 96 L0 96 Z`} className="aire" />
          <path d={trace} className="trait" vectorEffect="non-scaling-stroke" />
        </svg>
        {xy.map((p) => (
          <b
            key={p.month}
            className="prog-courbe-n"
            style={{
              left: `${Math.min(94, Math.max(6, (100 * p.x) / 320))}%`,
              bottom: `${100 - p.y + 7}px`,
            }}
          >
            {p.acquis}
          </b>
        ))}
      </div>
      <div className="prog-courbe-axe">
        {xy.map((p) => <small key={p.month}>{monthLabel(p.month)}</small>)}
      </div>
      <p className="hint prog-perim-note">
        Le relevé mensuel, tenu depuis plus longtemps que celui des cinq
        paliers. Il ne compte que les mots acquis.
      </p>
    </div>
  );
}

type Volet = 'tas' | 'evolution';

const VOLETS: { cle: Volet; libelle: string }[] = [
  { cle: 'tas', libelle: 'Mes cinq tas' },
  { cle: 'evolution', libelle: 'Mon évolution' },
];

export function MesMots({
  stats, onRetour,
}: {
  stats: ProgressStats;
  /** Remonter à « Mes progrès ». Le retour est dans l'écran : la barre
      d'onglets reste en place, on n'est jamais prisonnier. */
  onRetour: () => void;
}) {
  const [volet, setVolet] = useState<Volet>('tas');

  const { charge, tout } = stats;
  const enPause = stats.paquetsEnPause > 0;

  /*
   * La phrase sous chaque anneau. Elle dit le périmètre — combien de mots,
   * dans combien de paquets — et non le chiffre de l'anneau, qui est déjà
   * à l'écran juste au-dessus.
   */
  const noteCharge = charge.paquets === 0
    ? 'Aucun paquet en jeu : votre charge de travail est vide. Remettez-en un en jeu depuis l’onglet Paquets.'
    : `Sur ${nb(charge.mots)} mots en jeu, dans ${charge.paquets} paquet${charge.paquets > 1 ? 's' : ''}.`
      + ` ${nb(charge.enCours)} sont en cours d’apprentissage.`;

  const noteTout = `Sur ${nb(tout.mots)} mots au total, dans ${tout.paquets} paquet${tout.paquets > 1 ? 's' : ''}`
    + ` — dont ${nb(stats.motsEnPause)} mots dans ${stats.paquetsEnPause} paquet${stats.paquetsEnPause > 1 ? 's' : ''} en pause.`;

  return (
    <section className="sousecran" aria-label="Mes mots">
      <button className="sousecran-retour" onClick={onRetour}>
        <span aria-hidden="true">‹</span>
        Mes progrès
      </button>
      <h2 className="screen-title">Mes mots</h2>

      <div className="themechoix prog-volets">
        {VOLETS.map((v) => (
          <button
            key={v.cle}
            className={volet === v.cle ? 'on' : ''}
            aria-pressed={volet === v.cle}
            onClick={() => setVolet(v.cle)}
          >
            {v.libelle}
          </button>
        ))}
      </div>

      {volet === 'tas' ? (
        <>
          {/*
            * Les paquets en jeu d'abord : c'est le vocabulaire que la
            * charge d'« Aujourd'hui » fait tourner, donc le seul des deux
            * totaux qu'un travail de la journée peut faire bouger.
            */}
          <BlocMots
            titre={enPause ? 'Dans ma charge de travail' : 'Mes paquets en jeu'}
            p={charge}
            note={noteCharge}
          />

          {enPause ? (
            <BlocMots titre="Tout compris, pauses incluses" p={tout} note={noteTout} />
          ) : (
            <p className="hint prog-perim-note">
              Aucun paquet en pause : votre charge de travail couvre tout
              votre vocabulaire, et ce total est donc le seul.
            </p>
          )}

          <p className="hint prog-perim-note">
            À ne pas confondre avec le nombre de l’onglet « Aujourd’hui » :
            celui-là compte les cartes <b>à revoir ce matin</b>, pas les mots
            travaillés. Il est bien plus petit, et il change chaque jour.
          </p>
        </>
      ) : (
        <>
          <div className="prog-perim">
            <p className="rayon-label">Où en sont mes mots</p>
            <CourbePaliers releves={stats.releves} />
          </div>
          <CourbeMensuelle jalons={stats.jalons} />
        </>
      )}
    </section>
  );
}
