/** Onglet « Paquets » : mon travail, ma collection, mon catalogue. */
import { useEffect, useMemo, useState } from 'react';
import type { Category, Classe, Deck, Level, Settings } from '../domain/types';
import {
  CLASSES, CLASSE_LABELS, LEVEL_LABELS,
  classeConvient, priceLabel,
} from '../domain/types';
import { CardBack } from './components';
import { artFor } from './deckImages';
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
  const [tranche, setTranche] = useState<number | null>(null);
  const [rayon, setRayon] = useState<string | null>(null);

  /*
   * Deux façons de regarder le catalogue, à ne jamais confondre :
   *
   * - la classe déclarée (`settings.classe`) est une identité. Elle range le
   *   catalogue en « pour ma classe » et « pour plus tard », et se mémorise.
   * - la consultation (`consult`) est un coup d'œil ailleurs : planchers
   *   exacts, plusieurs classes à la fois, jamais mémorisée.
   *
   * Le multi-choix n'existe que dans le second mode, et il s'annonce à
   * l'écran. Il se coche par CYCLE : cocher « Collège » prend les quatre
   * planchers 6e, 5e, 4e et 3e d'un coup. La seconde rangée de puces sert
   * à redescendre au plancher près quand on veut vraiment ce détail.
   *
   * Il reste un trou entre cycles — consulter « Lycée » ne montre pas un
   * paquet à plancher 3ème, qui conviendrait pourtant à un élève de 2nde.
   * Autant l'avouer à l'écran plutôt que le cacher.
   */
  const [consult, setConsult] = useState<Classe[]>([]);
  const [choixClasse, setChoixClasse] = useState(false);

  /*
   * Les filtres sont repliés par défaut.
   *
   * Trois rangées de puces au-dessus de la liste annonçaient surtout « il y a
   * beaucoup à régler ici » — alors que la plupart des visites ne règlent
   * rien et veulent juste voir les paquets. Le bouton porte l'état (combien
   * de critères sont en vigueur) ; le détail ne s'ouvre que si on le demande.
   */
  const [filtresOuverts, setFiltresOuverts] = useState(false);

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
    const art = artFor(s.deck.id, s.deck.name);
    return (
      <span
        className={`vign vign-draw${art ? ' vign-illus' : ''}`}
        style={{ width: w, height: h }}
      >
        <CardBack id={s.deck.id} name={s.deck.name} bare={!!art} />
        {art && <img src={art} alt="" className="vign-illus-img" />}
      </span>
    );
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

        <p className="rayon-label">En jeu</p>
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
    const jeu = mine.filter((s) => active.includes(s.deck.id));
    const pause = mine.filter((s) => !active.includes(s.deck.id));

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

        {jeu.length > 0 && (
          <>
            <p className="rayon-label on">En jeu — {jeu.length}</p>
            <div className="switchlist">{jeu.map(ligneInterrupteur)}</div>
          </>
        )}

        {pause.length > 0 && (
          <>
            <p className="rayon-label">En pause — {pause.length}</p>
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
    const enConsultation = consult.length > 0;

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

    /*
     * Le compte EXACT par plancher — celui de la consultation, qui ne cumule
     * pas. Il sert à ne proposer que des puces qui donneront quelque chose,
     * comme les tranches de prix plus bas le font déjà.
     *
     * Un paquet sans plancher n'entre dans aucun compte, et c'est le point :
     * il est invisible en consultation. Tant que la puce restait cliquable,
     * un paquet oublié en base donnait une liste vide sans qu'on sache
     * pourquoi. Maintenant la puce disparaît, et son absence se remarque.
     */
    const parClasseExact = new Map<Classe, number>();
    for (const s of tous) {
      const p = s.deck.classeFrom;
      if (p) parClasseExact.set(p, (parClasseExact.get(p) ?? 0) + 1);
    }

    // En consultation on prend les planchers EXACTEMENT cochés ; sinon tout
    // le catalogue, qu'on répartira ensuite entre ma classe et plus tard.
    const socle = enConsultation
      ? tous.filter((s) => !!s.deck.classeFrom && consult.includes(s.deck.classeFrom))
      : tous;

    // Comptes par tranche, calculés sur le socle et non sur le catalogue
    // entier : un filtre qui annonce « 3 » puis n'affiche rien mentirait.
    const comptes = new Map<number, number>();
    for (const s of socle) {
      const c = s.deck.priceCents ?? 0;
      comptes.set(c, (comptes.get(c) ?? 0) + 1);
    }

    const filtres = socle.filter((s) => {
      if (tranche !== null && (s.deck.priceCents ?? 0) !== tranche) return false;
      if (rayon !== null && s.deck.categoryId !== rayon) return false;
      return true;
    });

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

    function basculerConsultation(c: Classe) {
      setConsult((prev) =>
        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
      );
    }

    /*
     * Un cycle se coche entier et se décoche entier. On n'y met que les
     * planchers qui ont au moins un paquet : ajouter une classe vide
     * gonflerait le compte annoncé sans rien afficher.
     */
    function basculerCycle(cy: { classes: Classe[] }) {
      const dispo = cy.classes.filter((c) => (parClasseExact.get(c) ?? 0) > 0);
      const toutCoche = dispo.length > 0 && dispo.every((c) => consult.includes(c));
      setConsult((prev) => {
        const hors = prev.filter((c) => !cy.classes.includes(c));
        return toutCoche ? hors : [...hors, ...dispo];
      });
    }

    /** Les cycles dont une classe au moins est cochée : eux seuls s'affinent. */
    const cyclesOuverts = CYCLES.filter((cy) =>
      cy.classes.some((c) => consult.includes(c)),
    );

    /*
     * Ce que le bouton annonce. On compte les CRITÈRES, pas les puces : « 2 »
     * veut dire « deux réglages en vigueur », ce qui se retient. Trois classes
     * cochées dans un même cycle restent un seul critère — sinon le chiffre
     * grimperait sans rien dire de plus.
     *
     * C'est la contrepartie du repli : un filtre caché doit être annoncé,
     * faute de quoi on cherche pendant dix minutes pourquoi un paquet manque.
     */
    const nbFiltres =
      (consult.length > 0 ? 1 : 0) +
      (tranche !== null ? 1 : 0) +
      (rayon !== null ? 1 : 0);

    function effacerFiltres() {
      setConsult([]);
      setTranche(null);
      setRayon(null);
    }

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
                  setConsult([]);
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
                setConsult([]);
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
              Vous consultez {consult.map((c) => CLASSE_LABELS[c]).join(', ')}
            </p>
            <p className="hint">
              Ce sont les paquets dont le plancher tombe dans ce que vous avez
              coché, et non ceux de votre classe. Un paquet d’un cycle plus bas
              n’y figure pas, même s’il vous conviendrait.
            </p>
            <button className="btn ghost" onClick={() => setConsult([])}>
              {maClasse ? `Revenir à ma classe — ${CLASSE_LABELS[maClasse]}` : 'Revenir au catalogue'}
            </button>
          </div>
        )}

        <div className="filterbar">
          <button
            className={`filterbtn${filtresOuverts ? ' open' : ''}`}
            onClick={() => setFiltresOuverts((v) => !v)}
            aria-expanded={filtresOuverts}
          >
            <span>Filtres</span>
            {nbFiltres > 0 && <b>{nbFiltres}</b>}
            <i />
          </button>
          {nbFiltres > 0 && (
            <button className="filterclear" onClick={effacerFiltres}>
              Tout effacer
            </button>
          )}
        </div>

        {/*
          * Le panneau reste MONTÉ quand il est replié : c'est ce qui permet de
          * l'animer, et ce qui garde l'état des puces d'une ouverture à
          * l'autre. Le dépliage est en CSS (.filterfold), pas en JavaScript.
          */}
        <div className={`filterfold${filtresOuverts ? ' open' : ''}`}>
          <div className="filterpanel">
            <p className="flabel">Niveau scolaire</p>
            <div className="classechips">
              {CYCLES.map((cy) => {
                const dispo = cy.classes.filter((c) => (parClasseExact.get(c) ?? 0) > 0);
                const n = dispo.reduce((t, c) => t + (parClasseExact.get(c) ?? 0), 0);
                const coches = cy.classes.filter((c) => consult.includes(c));
                // Un cycle sans aucun paquet ne peut rien afficher : on ne le
                // propose pas. Sauf s'il est déjà coché — le retirer sous le
                // doigt enlèverait le moyen de le décocher.
                if (n === 0 && coches.length === 0) return null;
                return (
                  <button
                    key={cy.id}
                    className={coches.length > 0 ? 'on' : ''}
                    onClick={() => basculerCycle(cy)}
                  >
                    {cy.label} · {n}
                  </button>
                );
              })}
            </div>

            {cyclesOuverts.length > 0 && (
              <div className="classechips fine">
                {cyclesOuverts.flatMap((cy) => cy.classes).map((c) => {
                  const n = parClasseExact.get(c) ?? 0;
                  if (n === 0 && !consult.includes(c)) return null;
                  return (
                    <button
                      key={c}
                      className={consult.includes(c) ? 'on' : ''}
                      onClick={() => basculerConsultation(c)}
                    >
                      {CLASSE_LABELS[c]} · {n}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="flabel">Prix</p>
            <div className="pricefilters">
              {TRANCHES.map((t) => {
                const n = comptes.get(t.cents) ?? 0;
                if (n === 0) return null;
                return (
                  <button
                    key={t.cents}
                    className={tranche === t.cents ? 'on' : ''}
                    onClick={() => setTranche(tranche === t.cents ? null : t.cents)}
                  >
                    {t.label} <span>{n}</span>
                  </button>
                );
              })}
            </div>

            {categories.length > 1 && (
              <>
                <p className="flabel">Rayon</p>
                <div className="rayonfilters">
                  {[...categories].sort((a, b) => a.position - b.position).map((c) => (
                    <button
                      key={c.id}
                      className={rayon === c.id ? 'on' : ''}
                      onClick={() => setRayon(rayon === c.id ? null : c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

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
            <h2>{category ? category.name : 'Autres'}</h2>
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
