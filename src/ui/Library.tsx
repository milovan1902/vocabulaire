/** Onglet « Paquets » : mon travail, ma collection, mon catalogue. */
import { useEffect, useMemo, useState } from 'react';
import type { Category, Classe, Deck, Level, Settings } from '../domain/types';
import {
  CLASSES, CLASSE_LABELS, LEVEL_LABELS,
  classeConvient, priceLabel,
} from '../domain/types';
import { DeckVign } from './components';
import { loadSummaries, type Charge, type DeckSummary } from './deckSummary';
import { masteryLabel } from '../engine/mastery';
import type { Auth } from './useAuth';

type Tab = 'travail' | 'collection' | 'catalogue';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'travail', label: 'Mon travail' },
  { id: 'collection', label: 'Ma collection' },
  { id: 'catalogue', label: 'Mon catalogue' },
];

/** Tranches du filtre de prix, en centimes. `null` = pas de filtre. */
const TRANCHES: Array<{ cents: number; label: string }> = [
  { cents: 0, label: 'Gratuits' },
  { cents: 200, label: '2 €' },
  { cents: 300, label: '3 €' },
  { cents: 500, label: '5 €' },
];

/**
 * Les cycles scolaires.
 *
 * Une puce de consultation = un cycle entier, jamais une classe isolée.
 * Sur des planchers exacts, « 6ème » et « 5ème » forment deux ensembles
 * disjoints : un élève de 4ème ne trouvait rien, et « Collège » ne montrait
 * que les quatre paquets d'un rayon qui portait le même nom par hasard.
 * Le cycle rassemble ses quatre planchers, ce qui est le sens réel de
 * « dès la 6ème ».
 */
const CYCLES: Array<{ id: string; label: string; classes: Classe[] }> = [
  { id: 'primaire', label: 'Primaire', classes: ['CM2'] },
  { id: 'college', label: 'Collège', classes: ['6e', '5e', '4e', '3e'] },
  { id: 'lycee', label: 'Lycée', classes: ['2de', '1re', 'Tle'] },
];

/**
 * L'état d'un jeu de filtres.
 *
 * `ouvert` est dedans et non à côté : le dépliage appartient au panneau, et
 * deux panneaux qui partagent leur ouverture s'ouvriraient l'un par l'autre
 * en changeant d'onglet.
 */
type Filtres = {
  consult: Classe[];
  rayon: string | null;
  /** Catalogue seulement : dans la collection tout est déjà payé. */
  tranche: number | null;
  ouvert: boolean;
};

const FILTRES_VIDES: Filtres = { consult: [], rayon: null, tranche: null, ouvert: false };

/**
 * Le nombre de CRITÈRES en vigueur, pas de puces.
 *
 * « 2 » veut dire « deux réglages en vigueur », ce qui se retient. Trois
 * classes cochées dans un même cycle restent un seul critère — sinon le
 * chiffre grimperait sans rien dire de plus.
 *
 * C'est la contrepartie du repli : un filtre caché doit être annoncé, faute
 * de quoi on cherche pendant dix minutes pourquoi un paquet manque.
 */
function nbCriteres(f: Filtres): number {
  return (f.consult.length > 0 ? 1 : 0)
    + (f.tranche !== null ? 1 : 0)
    + (f.rayon !== null ? 1 : 0);
}

/** Le plancher exact de chaque paquet d'un lot. Ne cumule pas. */
function comptesParClasse(lot: DeckSummary[]): Map<Classe, number> {
  const m = new Map<Classe, number>();
  for (const s of lot) {
    const p = s.deck.classeFrom;
    if (p) m.set(p, (m.get(p) ?? 0) + 1);
  }
  return m;
}

/** Le lot réduit aux planchers cochés. Rien de coché = tout le lot. */
function socleDe(lot: DeckSummary[], f: Filtres): DeckSummary[] {
  if (f.consult.length === 0) return lot;
  return lot.filter((s) => !!s.deck.classeFrom && f.consult.includes(s.deck.classeFrom));
}

/** Le socle réduit par les critères restants. */
function appliquer(socle: DeckSummary[], f: Filtres): DeckSummary[] {
  return socle.filter((s) => {
    if (f.tranche !== null && (s.deck.priceCents ?? 0) !== f.tranche) return false;
    if (f.rayon !== null && s.deck.categoryId !== f.rayon) return false;
    return true;
  });
}

/**
 * Le panneau de filtres, partagé par le catalogue et la collection.
 *
 * Il existe parce que les deux écrans doivent filtrer de la même façon : même
 * barre repliée, même compteur, même « Tout effacer », mêmes puces de cycle
 * qui ouvrent une seconde rangée de planchers, mêmes rayons. Deux panneaux
 * écrits séparément dérivent en une semaine — c'était déjà la leçon de
 * `DeckFace` au chantier 22.
 *
 * Ce qui reste propre à chaque écran :
 *
 *  - `avecPrix` — le catalogue seul. Dans la collection tout est déjà payé :
 *    le filtre ne trierait plus que par ce que chaque paquet a coûté.
 *  - `lot` — le catalogue compte sur le catalogue, la collection sur la
 *    collection. Un filtre qui annonce « 12 » dans un rayon où l'on ne
 *    possède que deux paquets serait un mensonge de plus.
 *  - l'état, tenu par l'appelant. Filtrer sa collection sur « Grammaire » ne
 *    doit pas filtrer le catalogue au passage.
 *
 * Une puce qui ne donnerait rien n'est pas proposée : sauf si elle est déjà
 * cochée — la retirer sous le doigt enlèverait le moyen de la décocher.
 */
function PanneauFiltres({
  lot, categories, filtres, avecPrix, onChange,
}: {
  lot: DeckSummary[];
  categories: Category[];
  filtres: Filtres;
  avecPrix: boolean;
  onChange: (f: Filtres) => void;
}) {
  const f = filtres;
  const parClasseExact = comptesParClasse(lot);
  const socle = socleDe(lot, f);

  const comptesPrix = new Map<number, number>();
  for (const s of socle) {
    const c = s.deck.priceCents ?? 0;
    comptesPrix.set(c, (comptesPrix.get(c) ?? 0) + 1);
  }

  const n = nbCriteres(f);

  function basculerConsultation(c: Classe) {
    onChange({
      ...f,
      consult: f.consult.includes(c) ? f.consult.filter((x) => x !== c) : [...f.consult, c],
    });
  }

  /*
   * Un cycle se coche entier et se décoche entier. On n'y met que les
   * planchers qui ont au moins un paquet : ajouter une classe vide
   * gonflerait le compte annoncé sans rien afficher.
   */
  function basculerCycle(cy: { classes: Classe[] }) {
    const dispo = cy.classes.filter((c) => (parClasseExact.get(c) ?? 0) > 0);
    const tout = dispo.length > 0 && dispo.every((c) => f.consult.includes(c));
    const hors = f.consult.filter((c) => !cy.classes.includes(c));
    onChange({ ...f, consult: tout ? hors : [...hors, ...dispo] });
  }

  /** Les cycles dont une classe au moins est cochée : eux seuls s'affinent. */
  const cyclesOuverts = CYCLES.filter((cy) => cy.classes.some((c) => f.consult.includes(c)));

  return (
    <>
      <div className="filterbar">
        <button
          className={`filterbtn${f.ouvert ? ' open' : ''}`}
          onClick={() => onChange({ ...f, ouvert: !f.ouvert })}
          aria-expanded={f.ouvert}
        >
          <span>Filtres</span>
          {n > 0 && <b>{n}</b>}
          <i />
        </button>
        {n > 0 && (
          <button
            className="filterclear"
            onClick={() => onChange({ ...FILTRES_VIDES, ouvert: f.ouvert })}
          >
            Tout effacer
          </button>
        )}
      </div>

      {/*
        * Le panneau reste MONTÉ quand il est replié : c'est ce qui permet de
        * l'animer, et ce qui garde l'état des puces d'une ouverture à
        * l'autre. Le dépliage est en CSS (.filterfold), pas en JavaScript.
        */}
      <div className={`filterfold${f.ouvert ? ' open' : ''}`}>
        <div className="filterpanel">
          <p className="flabel">Niveau scolaire</p>
          <div className="classechips">
            {CYCLES.map((cy) => {
              const dispo = cy.classes.filter((c) => (parClasseExact.get(c) ?? 0) > 0);
              const total = dispo.reduce((t, c) => t + (parClasseExact.get(c) ?? 0), 0);
              const coches = cy.classes.filter((c) => f.consult.includes(c));
              if (total === 0 && coches.length === 0) return null;
              return (
                <button
                  key={cy.id}
                  className={coches.length > 0 ? 'on' : ''}
                  onClick={() => basculerCycle(cy)}
                >
                  {cy.label} · {total}
                </button>
              );
            })}
          </div>

          {cyclesOuverts.length > 0 && (
            <div className="classechips fine">
              {cyclesOuverts.flatMap((cy) => cy.classes).map((c) => {
                const k = parClasseExact.get(c) ?? 0;
                if (k === 0 && !f.consult.includes(c)) return null;
                return (
                  <button
                    key={c}
                    className={f.consult.includes(c) ? 'on' : ''}
                    onClick={() => basculerConsultation(c)}
                  >
                    {CLASSE_LABELS[c]} · {k}
                  </button>
                );
              })}
            </div>
          )}

          {avecPrix && (
            <>
              <p className="flabel">Prix</p>
              <div className="pricefilters">
                {TRANCHES.map((t) => {
                  const k = comptesPrix.get(t.cents) ?? 0;
                  if (k === 0) return null;
                  return (
                    <button
                      key={t.cents}
                      className={f.tranche === t.cents ? 'on' : ''}
                      onClick={() => onChange({ ...f, tranche: f.tranche === t.cents ? null : t.cents })}
                    >
                      {t.label} <span>{k}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {categories.length > 1 && (
            <>
              <p className="flabel">Rayon</p>
              <div className="rayonfilters">
                {[...categories]
                  .sort((a, b) => a.position - b.position)
                  .map((c) => {
                    const k = socle.filter((s) => s.deck.categoryId === c.id).length;
                    if (k === 0 && f.rayon !== c.id) return null;
                    return (
                      <button
                        key={c.id}
                        className={f.rayon === c.id ? 'on' : ''}
                        onClick={() => onChange({ ...f, rayon: f.rayon === c.id ? null : c.id })}
                      >
                        {c.name} <span>{k}</span>
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function Library({
  decks, installed, active, categories, settings, auth,
  onOpen, onReview, onAdd, onRemove, onSetActive, onSearch, onSettings,
}: {
  decks: Deck[];
  /** Paquets possédés. */
  installed: string[];
  /** Paquets en jeu : eux seuls pèsent sur la charge du jour. */
  active: string[];
  categories: Category[];
  settings: Settings;
  auth: Auth;
  /**
   * Le second argument fait voler la vignette jusqu'à l'écran suivant.
   * Absent, l'ouverture est simplement instantanée.
   */
  onOpen: (
    id: string,
    vol?: { image: string | null; from: DOMRect; total: number; due: number },
  ) => void;
  onReview: (id: string) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onSetActive: (id: string, on: boolean) => void;
  onSearch: () => void;
  /** La classe déclarée est un réglage : elle s'écrit là où ils s'écrivent. */
  onSettings: (s: Settings) => void;
}) {
  const [charge, setCharge] = useState<Charge | null>(null);
  const [tab, setTab] = useState<Tab>('travail');

  /*
   * Deux jeux de filtres, un par onglet.
   *
   * Même panneau, deux états séparés : filtrer sa collection sur
   * « Grammaire » ne doit pas filtrer le catalogue au passage, sinon on
   * change d'onglet et on se croit dépossédé de la moitié de ses paquets.
   */
  const [fCatalogue, setFCatalogue] = useState<Filtres>(FILTRES_VIDES);
  const [fCollection, setFCollection] = useState<Filtres>(FILTRES_VIDES);

  /*
   * Deux façons de regarder le catalogue, à ne jamais confondre :
   *
   * - la classe déclarée (`settings.classe`) est une identité. Elle range le
   *   catalogue en « pour ma classe » et « pour plus tard », et se mémorise.
   * - la consultation (`fCatalogue.consult`) est un coup d'œil ailleurs :
   *   planchers exacts, plusieurs classes à la fois, jamais mémorisée.
   *
   * Le multi-choix n'existe que dans le second mode, et il s'annonce à
   * l'écran. Il se coche par CYCLE : cocher « Collège » prend les quatre
   * planchers 6e, 5e, 4e et 3e d'un coup. La seconde rangée de puces sert
   * à redescendre au plancher près quand on veut vraiment ce détail.
   *
   * Il reste un trou entre cycles — consulter « Lycée » ne montre pas un
   * paquet à plancher 3ème, qui conviendrait pourtant à un élève de 2nde.
   * Autant l'avouer à l'écran plutôt que le cacher.
   *
   * La barre « Ma classe » ne descend PAS dans la collection : ce n'est pas
   * un filtre mais un réglage d'identité, et une collection qu'on a
   * constituée soi-même n'a pas à être rangée en « pas encore pour vous ».
   */
  const [choixClasse, setChoixClasse] = useState(false);

  /*
   * Quel anneau a sa bulle ouverte. Un seul à la fois : deux explications
   * côte à côte ne se lisent pas, et l'anneau est assez petit pour qu'on
   * clique à côté sans le vouloir.
   */
  const [bulle, setBulle] = useState<string | null>(null);

  /*
   * La charge est calculée sur les seuls paquets en jeu : c'est la
   * définition même de « Mon travail ». Les autres n'ont pas à peser sur un
   * chiffre qui sert à s'engager.
   */
  const enJeu = useMemo(
    () => decks.filter((d) => active.includes(d.id)),
    [decks, active],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const c = await loadSummaries(decks, settings);
      if (alive) setCharge(c);
    })();
    return () => { alive = false; };
  }, [decks, settings]);

  const parId = useMemo(() => {
    const m = new Map<string, DeckSummary>();
    for (const s of charge?.summaries ?? []) m.set(s.deck.id, s);
    return m;
  }, [charge]);

  /** Charge propre aux paquets en jeu, recalculée à part des totaux. */
  const [engagement, setEngagement] = useState<{ load: number; min: number } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const c = await loadSummaries(enJeu, settings);
      if (alive) setEngagement({ load: c.steadyLoad, min: c.steadyMinutes });
    })();
    return () => { alive = false; };
  }, [enJeu, settings]);

  /**
   * La vignette d'un paquet, en trois états.
   *
   * Une image de carte entière l'emporte sur tout : elle a été fournie avec
   * l'application ou choisie par la personne, et on ne la recouvre pas.
   * À défaut, une illustration se pose dans le dos dessiné, dont les
   * losanges et le monogramme s'effacent. À défaut encore, le dos dessiné
   * reste tel qu'il est.
   */
  function vignette(s: DeckSummary, w: number, h: number) {
    if (s.image) {
      return <img src={s.image} alt="" style={{ width: w, height: h }} className="vign" />;
    }
    return <DeckVign id={s.deck.id} name={s.deck.name} image={null} w={w} h={h} />;
  }

  /**
   * L'anneau d'avancement.
   *
   * Ce qu'il mesure : ce que l'élève a validé. « Facile » remplit une carte
   * de moitié, « Bien » d'un quart, une carte ratée recule d'autant.
   *
   * Ce qu'il ne mesure PAS : la fin du travail. Une carte pleine revient
   * quand même, indéfiniment, à intervalles longs — c'est le principe de la
   * répétition espacée. Un anneau à cent pour cent qui laisserait croire le
   * contraire serait un mensonge ; la bulle le dit donc explicitement, et
   * c'est la raison d'être de ce bouton cliquable.
   */
  function avancement(s: DeckSummary) {
    const m = s.mastery;
    if (m.counted === 0) return null;

    const ouvert = bulle === s.deck.id;
    const plein = m.percent >= 100;
    // Périmètre du cercle de rayon 15 dans le repère 36×36 du SVG.
    const C = 2 * Math.PI * 15;

    return (
      <span className="avanc-wrap">
        <button
          className={`avanc${plein ? ' plein' : ''}`}
          aria-expanded={ouvert}
          aria-label={`Avancement ${masteryLabel(m.percent)} — en savoir plus`}
          onClick={() => setBulle(ouvert ? null : s.deck.id)}
        >
          <svg className="ring" viewBox="0 0 36 36" aria-hidden="true">
            <circle className="ring-bg" cx="18" cy="18" r="15" />
            <circle
              className="ring-fg"
              cx="18"
              cy="18"
              r="15"
              strokeDasharray={`${(C * Math.min(m.percent, 100)) / 100} ${C}`}
            />
          </svg>
          <b className="avanc-n">{masteryLabel(m.percent)}</b>
        </button>

        {ouvert && (
          <span className="avanc-bulle" role="note">
            {plein ? (
              <>
                <b>Le 100 % est indicatif.</b> Tant que le paquet reste ouvert
                dans votre espace de travail, il vous fera réviser son contenu
                à intervalles importants pour ne rien oublier. Seule la mise en
                pause de ce paquet arrêtera le travail sur ce dernier.
              </>
            ) : (
              <>
                {m.partial
                  ? `Sur les ${m.counted} mots des thèmes que vous avez retenus, et non sur le paquet entier.`
                  : `Sur les ${m.counted} mots du paquet.`}{' '}
                Un mot noté « Facile » avance de moitié, « Bien » d’un quart.
                Un mot raté recule.
                {m.full > 0 && (
                  <em>
                    {m.full} mot{m.full > 1 ? 's' : ''} au complet.
                  </em>
                )}
              </>
            )}
          </span>
        )}
      </span>
    );
  }

  function niveau(l: Level | null | undefined) {
    return l ? `${l} · ${LEVEL_LABELS[l]}` : null;
  }

  /**
   * Ouvre un paquet en faisant décoller sa vignette.
   *
   * On transmet la position du visuel seul, pas celle de la ligne entière :
   * c'est lui qui doit sembler se soulever, sans le nom ni le compteur qui
   * l'entourent.
   */
  function ouvrir(e: React.MouseEvent, s: DeckSummary) {
    const dos = (e.currentTarget as HTMLElement).querySelector('.vign');
    onOpen(
      s.deck.id,
      dos
        ? { image: s.image, from: dos.getBoundingClientRect(), total: s.total, due: s.due }
        : undefined,
    );
  }

  /* ---------------- Mon travail ---------------- */

  function vueTravail() {
    const rows = enJeu
      .map((d) => parId.get(d.id))
      .filter((s): s is DeckSummary => !!s)
      .sort((a, b) => b.due - a.due);
    const duJour = rows.reduce((n, s) => n + s.due, 0);
    const enPause = installed.filter((id) => !active.includes(id)).length;

    if (rows.length === 0) {
      return (
        <>
          <p className="lead">
            Aucun paquet en jeu. Mettez-en un depuis votre collection pour
            commencer à travailler.
          </p>
          <button className="btn" onClick={() => setTab('collection')}>
            Choisir un paquet
          </button>
        </>
      );
    }

    return (
      <>
        <div className="engage">
          <p className="label">Ce à quoi je m’engage</p>
          <div className="engage-n">
            <b>~{engagement?.load ?? duJour}</b>
            <span>cartes par jour<br />soit {engagement?.min ?? 1} min</span>
          </div>
          <p className="hint">
            {rows.length} paquet{rows.length > 1 ? 's' : ''} en jeu,{' '}
            {settings.newPerDay} nouveaux mots par jour.
          </p>
        </div>

        <p className="rayon-label on">
          En jeu <b className="rayon-n">{rows.length}</b>
        </p>
        <div className="worklist">
          {rows.map((s) => (
            <div key={s.deck.id} className="workrow">
              <button className="workrow-main" onClick={(e) => ouvrir(e, s)}>
                <span className="vign-wrap">
                  {vignette(s, 54, 76)}
                  {s.deck.classeFrom && (
                    <span className="classdot">{s.deck.classeFrom}</span>
                  )}
                  {s.due > 0 && <span className="vign-due">{s.due}</span>}
                </span>
                <span className="workrow-txt">
                  <b>{s.deck.name}</b>
                  <small>
                    {s.themesSelected < s.themesTotal
                      ? `${s.themesSelected} thèmes sur ${s.themesTotal}`
                      : `${s.themesTotal} thèmes`}
                    {' · '}{s.total} mots
                  </small>
                </span>
              </button>
              {avancement(s)}
              <button className="pausebtn" onClick={() => onSetActive(s.deck.id, false)}>
                Pause
              </button>
            </div>
          ))}
        </div>

        {duJour > 0 && (
          <button className="btn" onClick={() => onReview(rows[0].deck.id)}>
            Réviser {Math.min(rows[0].due, settings.cardsPerSession)} cartes
          </button>
        )}

        <button className="rowlink" onClick={() => setTab('collection')}>
          <span>Mettre un paquet en jeu</span>
          <span className="chev">›</span>
        </button>
        {enPause > 0 && (
          <p className="hint">
            {enPause} paquet{enPause > 1 ? 's' : ''} en pause, progression intacte.
          </p>
        )}
      </>
    );
  }

  /* ---------------- Ma collection ---------------- */

  function ligneInterrupteur(s: DeckSummary) {
    const on = active.includes(s.deck.id);
    return (
      <div key={s.deck.id} className={`switchrow${on ? '' : ' off'}`}>
        <button className="switchrow-main" onClick={(e) => ouvrir(e, s)}>
          {/*
            * La vignette gagne une enveloppe positionnée : sans elle, la
            * pastille se placerait par rapport à la ligne entière et
            * atterrirait n'importe où.
            */}
          <span className="vign-wrap">
            {vignette(s, 44, 62)}
            {s.deck.classeFrom && (
              <span className="classdot">{s.deck.classeFrom}</span>
            )}
          </span>
          <span className="switchrow-txt">
            <b>{s.deck.name}</b>
            <small>
              {s.resting > 0
                ? `${s.resting} mots en mémoire`
                : 'jamais commencé'}
              {on && s.due > 0 ? ` · ${s.due} dues` : ''}
              {s.mastery.percent > 0 && (
                <b className="small-pct">{masteryLabel(s.mastery.percent)}</b>
              )}
            </small>
          </span>
        </button>
        <button
          className={`switch${on ? ' on' : ''}`}
          role="switch"
          aria-checked={on}
          aria-label={on ? 'Mettre en pause' : 'Mettre en jeu'}
          onClick={() => onSetActive(s.deck.id, !on)}
        >
          <i />
        </button>
      </div>
    );
  }

  function vueCollection() {
    const mine = installed
      .map((id) => parId.get(id))
      .filter((s): s is DeckSummary => !!s);

    if (mine.length === 0) {
      return (
        <div className="empty">
          <p>Votre collection est vide.</p>
          <button className="btn ghost" onClick={() => setTab('catalogue')}>
            Parcourir le catalogue
          </button>
        </div>
      );
    }

    /*
     * Le même panneau que le catalogue, moins le prix.
     *
     * Ici tout est déjà payé : le filtre ne trierait plus que par ce que
     * chaque paquet a coûté, ce qui n'aide personne à travailler. Et l'état
     * en jeu / en pause ne prend pas cette place — il est déjà la structure
     * de la liste, deux sections qu'on lit d'un coup d'œil. Un filtre qui
     * redit ce que la page montre encombre le panneau sans rien trancher.
     */
    const retenus = appliquer(socleDe(mine, fCollection), fCollection);
    const jeu = retenus.filter((s) => active.includes(s.deck.id));
    const pause = retenus.filter((s) => !active.includes(s.deck.id));

    return (
      <>
        <p className="lead">
          Mettez en jeu ceux sur lesquels vous travaillez. Les autres attendent
          sans rien perdre.
        </p>

        {mine.length > 4 && (
          <button className="searchcue" onClick={onSearch}>
            <span className="loupe" aria-hidden="true" />
            Chercher un mot, un thème…
          </button>
        )}

        <PanneauFiltres
          lot={mine}
          categories={categories}
          filtres={fCollection}
          avecPrix={false}
          onChange={setFCollection}
        />

        {retenus.length === 0 && (
          <p className="hint">
            Aucun paquet de votre collection ne correspond à ce filtre.
          </p>
        )}

        {/*
          * « En jeu » et « En pause » restent les deux sections de la liste,
          * filtre ou pas. C'est la structure de l'écran, pas un tri : la
          * faire disparaître dès qu'un filtre s'applique ferait perdre le
          * seul repère de la page.
          */}
        {jeu.length > 0 && (
          <>
            <p className="rayon-label on">
              En jeu <b className="rayon-n">{jeu.length}</b>
            </p>
            <div className="switchlist">{jeu.map(ligneInterrupteur)}</div>
          </>
        )}

        {pause.length > 0 && (
          <>
            <p className="rayon-label">
              En pause <b className="rayon-n">{pause.length}</b>
            </p>
            <div className="switchlist">{pause.map(ligneInterrupteur)}</div>
          </>
        )}

        <p className="hint">
          Un paquet en pause ne compte pas dans la charge du jour et ne
          rappelle rien : le remettre en jeu reprend là où vous l’avez laissé.
        </p>
      </>
    );
  }

  /* ---------------- Mon catalogue ---------------- */

  /** Une ligne du catalogue. `plusTard` grise la ligne sans la rendre illisible. */
  function ligneCatalogue(s: DeckSummary, plusTard = false) {
    const aMoi = installed.includes(s.deck.id);
    const gratuit = !s.deck.priceCents;
    const n = niveau(s.deck.level);
    /*
     * Les cartes d'un paquet payant non acheté ne sont pas lisibles :
     * s.total vaut 0. Le nombre annoncé par la vitrine prend le relais —
     * il est fait pour être vu avant l'achat, c'est lui qui donne envie.
     */
    const mots = s.total || s.deck.cardCount || 0;
    return (
      <div key={s.deck.id} className={`catrow${plusTard ? ' later' : ''}`}>
        <button className="catrow-main" onClick={(e) => ouvrir(e, s)}>
          {/*
            * La classe descend sur le dos de carte, où elle se lit comme une
            * étiquette. Ce qui restait sous le nom disait la classe trois
            * fois — « collège », « dès la 6ème » — et le sujet du paquet se
            * perdait dedans. Ne reste que ce qui ne se déduit de nulle part :
            * le volume et le niveau.
            */}
          <span className="vign-wrap">
            {vignette(s, 54, 76)}
            {s.deck.classeFrom && (
              <span className="classdot">{s.deck.classeFrom}</span>
            )}
          </span>
          <span className="catrow-txt">
            <b>{s.deck.name}</b>
            <small>
              {mots} mots
              {n ? ` · ${n}` : ''}
            </small>
          </span>
        </button>
        {aMoi ? (
          gratuit && !s.deck.builtin ? (
            <button className="minibtn done" onClick={() => onRemove(s.deck.id)}>
              Retirer
            </button>
          ) : (
            <span className="ownedtag">À moi</span>
          )
        ) : (
          <button
            className={`minibtn${plusTard ? ' outline' : ''}`}
            onClick={() => onAdd(s.deck.id)}
          >
            {gratuit ? 'Obtenir' : priceLabel(s.deck.priceCents)}
          </button>
        )}
      </div>
    );
  }

  function vueCatalogue() {
    const tous = charge?.summaries ?? [];
    const maClasse = settings.classe;
    const enConsultation = fCatalogue.consult.length > 0;

    /*
     * Ce que chaque classe ouvre. Le compte est cumulatif, puisque le
     * plancher d'un paquet vaut aussi pour les classes suivantes : c'est ce
     * qui rend le choix lisible, passer de 5ème en 4ème fait gagner des
     * paquets et on le voit avant de choisir.
     */
    const parClasse = new Map<Classe, number>();
    for (const c of CLASSES) {
      parClasse.set(c, tous.filter((s) => classeConvient(s.deck.classeFrom, c)).length);
    }

    const filtres = appliquer(socleDe(tous, fCatalogue), fCatalogue);

    const pourMoi = enConsultation
      ? filtres
      : filtres.filter((s) => classeConvient(s.deck.classeFrom, maClasse));
    const plusTard = enConsultation
      ? []
      : filtres.filter((s) => !classeConvient(s.deck.classeFrom, maClasse));

    const groupes: Array<{ category: Category | null; items: DeckSummary[] }> = [];
    for (const category of [...categories].sort((a, b) => a.position - b.position)) {
      const items = pourMoi.filter((s) => s.deck.categoryId === category.id);
      if (items.length) groupes.push({ category, items });
    }
    const orphelins = pourMoi.filter(
      (s) => !s.deck.categoryId || !categories.some((c) => c.id === s.deck.categoryId),
    );
    if (orphelins.length) groupes.push({ category: null, items: orphelins });

    return (
      <>
        <button
          className="classbar"
          onClick={() => setChoixClasse((v) => !v)}
          aria-expanded={choixClasse}
        >
          <span className="label">Ma classe</span>
          <b>{maClasse ? CLASSE_LABELS[maClasse] : 'non déclarée'}</b>
          <span className="chg">{choixClasse ? 'Fermer' : 'Changer'}</span>
        </button>

        {choixClasse && (
          <div className="classpanel">
            <p className="hint">
              Le catalogue s’y règle. Rien ne se ferme : les paquets des
              classes suivantes restent visibles, plus bas.
            </p>
            {CLASSES.map((c) => (
              <button
                key={c}
                className={`classrow${maClasse === c ? ' on' : ''}`}
                onClick={() => {
                  onSettings({ ...settings, classe: c });
                  setFCatalogue((f) => ({ ...f, consult: [] }));
                  setChoixClasse(false);
                }}
              >
                <i />
                <span>{CLASSE_LABELS[c]}</span>
                <small>{parClasse.get(c) ?? 0} paquets</small>
              </button>
            ))}
            <button
              className="classrow plain"
              onClick={() => {
                onSettings({ ...settings, classe: null });
                setFCatalogue((f) => ({ ...f, consult: [] }));
                setChoixClasse(false);
              }}
            >
              <span>Voir tout le catalogue</span>
            </button>
          </div>
        )}

        {enConsultation && (
          <div className="consultbox">
            <p className="ttl">
              Vous consultez {fCatalogue.consult.map((c) => CLASSE_LABELS[c]).join(', ')}
            </p>
            <p className="hint">
              Ce sont les paquets dont le plancher tombe dans ce que vous avez
              coché, et non ceux de votre classe. Un paquet d’un cycle plus bas
              n’y figure pas, même s’il vous conviendrait.
            </p>
            <button
              className="btn ghost"
              onClick={() => setFCatalogue((f) => ({ ...f, consult: [] }))}
            >
              {maClasse ? `Revenir à ma classe — ${CLASSE_LABELS[maClasse]}` : 'Revenir au catalogue'}
            </button>
          </div>
        )}

        <PanneauFiltres
          lot={tous}
          categories={categories}
          filtres={fCatalogue}
          avecPrix
          onChange={setFCatalogue}
        />

        {/*
          * La pastille dit « 6e » quand la ligne disait « dès la 6ème ». Le
          * mot « dès » portait l'idée de plancher — qu'un paquet 6ème
          * convient aussi en 4ème. Plutôt qu'une notation à apprendre
          * (« 6e+ »), une phrase, une fois, en haut de la liste.
          */}
        <p className="hint dotnote">
          La pastille sur chaque carte est la classe <b>plancher</b> : le
          paquet convient à partir de là, pas seulement à cette classe.
        </p>

        {!auth.session && (
          <p className="hint">
            Vous n’êtes pas connecté : seuls les paquets fournis avec
            l’application sont visibles. La connexion donne accès au catalogue
            complet.
          </p>
        )}

        {pourMoi.length === 0 && plusTard.length === 0 && (
          <p className="hint">Aucun paquet ne correspond à ce filtre.</p>
        )}

        {groupes.map(({ category, items }) => (
          <section key={category?.id ?? '_autres'} className="rayon">
            <h2>
              {category ? category.name : 'Autres'}
              <b className="rayon-n">{items.length}</b>
            </h2>
            <div className="catlist">{items.map((s) => ligneCatalogue(s))}</div>
          </section>
        ))}

        {/*
          * « Pour plus tard » se ratait : un titre de la même taille que les
          * rayons, sous une liste qui semblait finie. Elle s'annonce
          * maintenant par un filet net et un compteur — on doit savoir qu'il
          * reste quelque chose en dessous avant d'arrêter de faire défiler.
          */}
        {plusTard.length > 0 && (
          <section className="rayon later-sec">
            <div className="later-head">
              <h2 className="later-h">Pour plus tard</h2>
              <span className="later-n">
                {plusTard.length} paquet{plusTard.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="hint">
              Après {maClasse ? CLASSE_LABELS[maClasse] : 'votre classe'}. Rien
              n’empêche de les prendre maintenant.
            </p>
            <div className="catlist">{plusTard.map((s) => ligneCatalogue(s, true))}</div>
          </section>
        )}

        <p className="hint">
          Un paquet obtenu arrive en pause : c’est vous qui le mettez en jeu.
        </p>
      </>
    );
  }

  const titres: Record<Tab, string> = {
    travail: 'Mon travail',
    collection: 'Ma collection',
    catalogue: 'Mon catalogue',
  };

  return (
    <>
      <h2 className="screen-title">{titres[tab]}</h2>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {charge === null ? (
        <p className="lead">Chargement…</p>
      ) : tab === 'travail' ? (
        vueTravail()
      ) : tab === 'collection' ? (
        vueCollection()
      ) : (
        vueCatalogue()
      )}
    </>
  );
}
