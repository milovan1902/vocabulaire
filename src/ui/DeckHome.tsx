/** Écran d'un paquet : statistiques, filtres de thème, réglages, actions. */
/* CHANTIER 358 — le tu et le vous : élève = tu, adulte = vous. */
import { tvp } from './ton';
import { useMemo, useState } from 'react';
/* CHANTIER 356 — boîtes de dialogue maison à la place de confirm() et alert(). */
import { demande, informe } from './Dialogue';
import type { Card, DeckOverride, Progress, Settings } from '../domain/types';
import type { LoadedDeck } from './useStore';
import { progressFor } from './useStore';
import { computeStats } from '../engine/session';
import { repository } from '../data/repository';
import { paletteFor, Slider, Toggle } from './components';
import { clearRemoteProgress } from '../data/sync';
import { phraseErreur } from '../data/messageErreur';
/* CHANTIER 369 — l'écran du paquet simplifié. */
import './deck-home.css';
import { dateLocale, etiquetteControle, isoLocal, jourPlus, joursAvant, motsFragiles, ramenerAuControle, resteControle, type DeckControle } from '../engine/controle';

const jourLong = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/*
 * CHANTIER 319 — LES MOTS DU PAQUET, À LIRE ET À CORRIGER.
 *
 * Jusqu'ici, un paquet créé ne se relisait qu'en jouant. Une faute vue en
 * révision ne se corrigeait nulle part. La liste complète est maintenant
 * ici, repliée comme les autres panneaux.
 *
 *  - Paquets du catalogue : lecture seule. Leur contenu vient du serveur et
 *    une correction locale serait écrasée à la synchronisation suivante.
 *  - Paquets créés : chaque mot se corrige d'un appui, ou se retire.
 *    L'IDENTIFIANT DE LA CARTE NE CHANGE PAS quand on corrige l'anglais :
 *    c'est lui qui porte la progression, qu'on garde. Retirer un mot
 *    retire aussi sa progression.
 *  - La synchronisation (chantier 303) recalcule l'empreinte du paquet :
 *    la correction suit le compte sur les autres appareils sans rien de plus.
 */
const cleMot = (t: string) => t.trim().toLowerCase();

function MotsDuPaquet({ deckId, cards, progress, modifiable, onReload }: {
  deckId: string;
  cards: Card[];
  progress: Record<string, Progress>;
  modifiable: boolean;
  onReload: () => void;
}) {
  const [filtre, setFiltre] = useState('');
  const [edite, setEdite] = useState<string | null>(null);
  const [en, setEn] = useState('');
  const [fr, setFr] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const f = cleMot(filtre);
  const liste = f
    ? cards.filter((c) => cleMot(c.en).includes(f) || cleMot(c.fr).includes(f))
    : cards;

  function ouvre(c: Card) {
    setEdite(c.id); setEn(c.en); setFr(c.fr); setErreur('');
  }

  async function enregistre(c: Card) {
    const e = en.trim(), t = fr.trim();
    if (!e || !t) { setErreur('Les deux champs sont nécessaires.'); return; }
    if (cards.some((x) => x.id !== c.id && cleMot(x.en) === cleMot(e))) {
      setErreur(`« ${e} » est déjà dans le paquet.`); return;
    }
    if (enCours) return;
    setEnCours(true);
    try {
      await repository.saveCards(deckId, cards.map((x) => (x.id === c.id ? { ...x, en: e, fr: t } : x)));
      setEdite(null);
      onReload();
    } catch (err) {
      setErreur(tvp('L’enregistrement a échoué. Réessaie.', 'L’enregistrement a échoué. Réessayez.'));
      console.error(err);
    } finally {
      setEnCours(false);
    }
  }

  async function retire(c: Card) {
    if (cards.length <= 1) { informe(tvp('Un paquet garde au moins un mot. Pour tout effacer, supprime le paquet.', 'Un paquet garde au moins un mot. Pour tout effacer, supprimez le paquet.')); return; }
    if (!(await demande({ titre: `Retirer « ${c.en} » du paquet ?`, texte: 'Sa progression sera effacée aussi.', agir: 'Retirer', ton: 'danger' }))) return;
    setEnCours(true);
    try {
      await repository.saveCards(deckId, cards.filter((x) => x.id !== c.id));
      if (progress[c.id]) {
        const p = { ...progress };
        delete p[c.id];
        await repository.saveProgress(deckId, p);
      }
      setEdite(null);
      onReload();
    } catch (err) {
      informe(tvp('Le retrait a échoué. Réessaie.', 'Le retrait a échoué. Réessayez.'), true);
      console.error(err);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <details className="panelbox">
      <summary>
        Les mots du paquet
        <span className="n" style={{ marginLeft: 8, fontWeight: 400, opacity: 0.75 }}>{cards.length}</span>
      </summary>
      <p className="hint">
        {modifiable
          ? tvp('Touche un mot pour le corriger. Sa progression est conservée.', 'Touchez un mot pour le corriger. Sa progression est conservée.')
          : 'Paquet du catalogue : les mots se consultent ici mais ne se modifient pas.'}
      </p>
      {cards.length > 12 && (
        <div className="field">
          <label htmlFor="dh-filtre">Chercher un mot</label>
          <input
            id="dh-filtre" type="search" value={filtre} placeholder="en anglais ou en français"
            autoCapitalize="off" autoCorrect="off" spellCheck={false}
            onChange={(e) => setFiltre(e.target.value)}
          />
        </div>
      )}
      {liste.length === 0 && <p className="hint">Aucun mot ne correspond.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 8px' }}>
        {liste.map((c) => {
          const i = cards.indexOf(c);
          if (edite === c.id) {
            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 12, borderRadius: 12, border: '2px solid currentColor' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`dh-en-${i}`}>En anglais</label>
                  <input
                    id={`dh-en-${i}`} type="text" value={en} autoFocus
                    autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="next"
                    onChange={(e) => { setEn(e.target.value); setErreur(''); }}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor={`dh-fr-${i}`}>En français</label>
                  <input
                    id={`dh-fr-${i}`} type="text" value={fr} enterKeyHint="done"
                    onChange={(e) => { setFr(e.target.value); setErreur(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void enregistre(c); } }}
                  />
                </div>
                {erreur && <p className="error" style={{ margin: '0 0 4px' }}>{erreur}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn" style={{ flex: 1, margin: 0 }} disabled={enCours || !en.trim() || !fr.trim()} onClick={() => void enregistre(c)}>Enregistrer</button>
                  <button className="btn ghost" style={{ flex: 1, margin: 0 }} disabled={enCours} onClick={() => setEdite(null)}>Annuler</button>
                </div>
                <button className="btn ghost danger" style={{ margin: 0 }} disabled={enCours} onClick={() => void retire(c)}>Retirer ce mot</button>
              </div>
            );
          }
          const contenu = (
            <>
              <span style={{ width: 24, fontSize: 11, opacity: 0.6, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, overflowWrap: 'anywhere' }}>{c.en}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, opacity: 0.75, overflowWrap: 'anywhere' }}>{c.fr}</span>
            </>
          );
          const cadre = { display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '6px 12px', borderRadius: 10, border: '1px solid var(--rule)' } as const;
          return modifiable ? (
            <button
              key={c.id} onClick={() => ouvre(c)} aria-label={`Corriger ${c.en}`}
              style={{ ...cadre, width: '100%', background: 'none', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
            >
              {contenu}
            </button>
          ) : (
            <div key={c.id} style={cadre}>{contenu}</div>
          );
        })}
      </div>
    </details>
  );
}

/*
 * CHANTIER 59 — DEUX ACTIONS RETIRÉES : L'IMAGE ET LE RENOMMAGE
 *
 * Elles datent du temps où les paquets étaient les vôtres, créés dans
 * l'application. Ils viennent maintenant du catalogue, et les deux
 * boutons ne pouvaient plus que faire des dégâts :
 *
 *  - « Choisir une image pour ce paquet » posait une image de carte
 *    ENTIÈRE, qui l'emporte sur tout — elle recouvrait donc le dos
 *    dessiné, son parchemin et son illustration, c'est-à-dire tout le
 *    système de reconnaissance des paquets bâti aux chantiers 52 à 58.
 *    Un geste, et la carte perdait sa place dans la liste.
 *  - « Renommer ce paquet » écrivait le nouveau nom en local seulement.
 *    Or c'est le NOM qui décide de l'illustration (`artFor`) et du
 *    parchemin (`papierFor`) : renommer un paquet lui faisait perdre les
 *    deux, silencieusement, et la prochaine synchronisation rapatriait
 *    l'ancien nom du serveur sans rien dire non plus.
 *
 * Ce qui reste : ajouter des mots, effacer la progression, supprimer un
 * paquet qu'on a créé soi-même. Trois gestes dont on répond.
 *
 * Ce que je n'ai PAS touché, et qui pourra suivre si vous le voulez :
 *  - `repository.saveImage` / `removeImage` et `resizeToCardImage`
 *    existent toujours et restent appelés par l'éditeur de paquet. Rien
 *    ne les invoque plus depuis cet écran.
 *  - Les images déjà choisies par le passé sont TOUJOURS EN BASE et
 *    toujours affichées — on ne peut simplement plus en poser de
 *    nouvelle, ni retirer l'ancienne. Si un paquet porte chez vous une
 *    image qui masque son illustration, dites-le-moi : c'est une ligne
 *    de SQL, pas un chantier.
 *  - Les deux curseurs « marge du texte sur le visuel » restent utiles :
 *    ils servent aux visuels livrés avec l'application.
 */

export function DeckHome({
  loaded, settings, overrides, counter, userId, general,
  onGeneral, onOverrides, onStart, onAddCards, onReload, onBackToLibrary, verrouille = false,
}: {
  /** CHANTIER 337 — paquet réservé aux abonnés, pas dans la collection : on le parcourt, on ne le révise pas. */
  verrouille?: boolean;
  loaded: LoadedDeck;
  /** Réglages réellement appliqués : le général, corrigé du particulier. */
  settings: Settings;
  /** Réglages propres au paquet, null s'il suit le général. */
  overrides: DeckOverride | null;
  counter: { day: string; newSeen: number; reviewsDone: number };
  /** Réglages généraux, communs à tous les paquets. */
  general: Settings;
  onGeneral: (s: Settings) => void;
  onOverrides: (o: DeckOverride | null) => Promise<void>;
  onStart: (ignoreGoal: boolean) => void;
  onAddCards: () => void;
  onReload: () => void;
  onBackToLibrary: () => void;
  /** Identifiant du compte connecté, ou null en usage purement local. */
  userId: string | null;
}) {
  const { deck, cards, progress, themes, selectedThemes } = loaded;
  const particulier = overrides !== null;

  /*
   * CHANTIER 289 — LE CONTRÔLE SE VOIT ET SE CHANGE ICI.
   * Paquets perso seulement. Avancer la date ramène aussi les mots déjà
   * programmés plus loin (même règle que `plafonner`) : sinon ils ne
   * reviendraient qu'après le contrôle.
   */
  const etiquette = etiquetteControle(deck);
  const ctrl = etiquette ? (deck as DeckControle).controle ?? null : null;
  const [dateCtrl, setDateCtrl] = useState(ctrl ?? isoLocal(jourPlus(7)));
  const [ctrlEnCours, setCtrlEnCours] = useState(false);
  /* CHANTIER 369 — l'écran « Détails et paramètres » du paquet. */
  const [details, setDetails] = useState(false);
  const resteCtrl = joursAvant(dateCtrl);
  const dateCtrlOk = resteCtrl >= 1 && resteCtrl <= 90;
  /* CHANTIER 291 — le bilan : la veille et le jour J, la liste des mots fragiles. */
  const resteJ = resteControle(deck);
  const bilan = resteJ !== null && resteJ <= 1;
  const fragiles = useMemo(() => (bilan ? motsFragiles(cards, progress) : []), [bilan, cards, progress]);

  async function enregistreControle(v: string | null) {
    if (ctrlEnCours) return;
    setCtrlEnCours(true);
    try {
      const list = await repository.listDecks();
      await repository.saveDecks(list.map((d) => (d.id === deck.id ? ({ ...d, controle: v, updatedAt: Date.now() } as DeckControle) : d)));
      if (v) {
        const resserre = Object.fromEntries(Object.entries(progress).map(([id, p]) => [id, ramenerAuControle(p, v)]));
        await repository.saveProgress(deck.id, resserre);
      }
      onReload();
    } catch (e) {
      informe(tvp('L’enregistrement a échoué. Réessaie.', 'L’enregistrement a échoué. Réessayez.'), true);
      console.error(e);
    } finally {
      setCtrlEnCours(false);
    }
  }

  /**
   * Modifier un curseur agit sur les réglages du paquet s'il en a,
   * sur les réglages généraux sinon. L'interrupteur en tête du panneau
   * dit lequel des deux est en cours d'édition.
   */
  function change(patch: Partial<Settings>) {
    if (particulier) {
      void onOverrides({ ...overrides, ...patch, updatedAt: Date.now() });
    } else {
      onGeneral({ ...general, ...patch });
    }
  }

  const visible = useMemo(
    () => cards.filter((c) => selectedThemes.includes(c.theme)),
    [cards, selectedThemes],
  );

  const stats = useMemo(
    () => computeStats(visible, (id) => progressFor(progress, id), settings, counter),
    [visible, progress, settings, counter],
  );

  const available = stats.newAvailable + stats.dueAvailable;
  const beyond = stats.newBeyondGoal + stats.dueBeyondGoal;

  async function toggleTheme(theme: string) {
    const next = selectedThemes.includes(theme)
      ? selectedThemes.filter((t) => t !== theme)
      : [...selectedThemes, theme];
    await repository.saveThemes(deck.id, next.length ? next : [theme]);
    onReload();
  }

  return (
    <>
      {/* CHANTIER 369 — l'écran du paquet : la carte, ses chiffres et 3 boutons. Le reste est derrière « Détails et paramètres ». */}
      {!details ? (
        <>
          {/*
           * Le recto de la carte que l'on vient de retourner depuis la
           * bibliothèque. Sans lui, le retournement promettrait une face qui
           * n'existe pas. L'animation d'entrée reprend l'axe et la durée de
           * l'animation de sortie de la vignette : les deux moitiés se lisent
           * comme un seul geste.
           */}
          <div className="deckface" style={{ ['--accent' as string]: paletteFor(deck.id).ink }}>
            <div className="face">
              <span className="corner">{cards.length}</span>
              <b>{deck.name}</b>
              <span className="sub">
                {stats.dueAvailable + stats.newAvailable > 0
                  ? `${stats.dueAvailable + stats.newAvailable} à voir aujourd’hui`
                  : 'rien à réviser aujourd’hui'}
              </span>
              <span className="suit" />
            </div>
          </div>

          <div className="stats">
            <div className="stat"><b>{stats.newAvailable}</b><span>à découvrir</span></div>
            <div className="stat"><b>{stats.dueAvailable}</b><span>à réviser</span></div>
            <div className="stat"><b>{stats.resting}</b><span>en mémoire</span></div>
          </div>
          {etiquette && (
            <p className="deck-ctrl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
              {etiquette}
            </p>
          )}
          {/* 337 — information neutre, sans incitation (politique Familles). */}
          {verrouille ? (
            <div className="goal" role="status">
              <b>Inclus dans l’abonnement.</b>
              <p>
                {tvp('Tu peux parcourir ses mots. La révision de ce paquet est réservée aux abonnés ; ton paquet offert t’attend dans le catalogue.', 'Vous pouvez parcourir ses mots. La révision de ce paquet est réservée aux abonnés ; votre paquet offert vous attend dans le catalogue.')}
              </p>
            </div>
          ) : available > 0 ? (
            <button className="btn" onClick={() => onStart(false)}>
              Réviser {Math.min(available, settings.cardsPerSession)} cartes
            </button>
          ) : stats.goalReached ? (
            <>
              <div className="goal">
                <b>Objectif du jour atteint.</b>
                <p>
                  Il reste {beyond} carte{beyond > 1 ? 's' : ''} {tvp('si tu veux continuer.', 'si vous voulez continuer.')}
                  Sache seulement que chaque carte prise en avance revient plus tard :
                  en faire davantage aujourd’hui, c’est plus de révisions demain
                  et les jours suivants.
                </p>
              </div>
              <button className="btn ghost" onClick={() => onStart(true)}>
                Continuer quand même ({Math.min(beyond, settings.cardsPerSession)} cartes)
              </button>
            </>
          ) : (
            <button className="btn" disabled>
              Rien à réviser aujourd’hui
            </button>
          )}
          <button className="btn ghost deck-details" onClick={() => { setDetails(true); window.scrollTo(0, 0); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>
            Détails et paramètres
          </button>
          <button className="btn ghost danger deck-effacer" onClick={async () => {
            if (!(await demande({
              titre: `Effacer la progression de « ${deck.name} » ?`,
              texte: userId
                ? tvp('Elle sera effacée sur tous tes appareils, pas seulement celui-ci.', 'Elle sera effacée sur tous vos appareils, pas seulement celui-ci.')
                : 'Les mots repartiront comme neufs.',
              agir: 'Effacer la progression',
              ton: 'danger',
            }))) return;
            // L'ordre compte : si le serveur refuse, on ne veut pas avoir déjà
            // effacé en local une progression qu'il rapatrierait ensuite.
            if (userId) {
              try {
                await clearRemoteProgress(userId, deck.id);
              } catch (e) {
                informe(
                  'Effacement impossible sur le serveur. ' + phraseErreur(e, 'effacement-progression') +
                  tvp(' Rien n’a été modifié. Réessaie une fois connecté.', ' Rien n’a été modifié. Réessayez une fois connecté.'),
                  true,
                );
                return;
              }
            }
            await repository.saveProgress(deck.id, {});
            onReload();
          }}>
            Effacer la progression de ce paquet
          </button>
        </>
      ) : (
        <>
          <div className="deck-details-tete">
            <button className="deck-retour" aria-label="Retour au paquet" onClick={() => { setDetails(false); window.scrollTo(0, 0); }}>‹</button>
            <span><b>{deck.name}</b><small>Détails et paramètres</small></span>
          </div>
          {/*
            * CHANTIER 180 — les sous-catégories se replient, comme « Réglages »
            * juste en dessous : la liste ne s'ouvre qu'au doigt. Le résumé dit
            * combien sont retenues, pour ne pas avoir à ouvrir pour vérifier.
            */}
          {themes.length > 1 && (
            <details className="panelbox souscat">
              <summary>
                Voir les sous-catégories
                <span className="n" style={{ marginLeft: 8, fontWeight: 400, opacity: 0.75 }}>
                  {selectedThemes.filter((t) => themes.includes(t)).length} / {themes.length}
                </span>
              </summary>
            <div className="rows">
              {themes.map((t) => {
                const on = selectedThemes.includes(t);
                return (
                  <button key={t} className={`row ${on ? 'on' : 'off'}`} onClick={() => void toggleTheme(t)}>
                    <span className="tick">{on ? '✓' : ''}</span>
                    <span style={{ flex: 1 }}>{t}</span>
                    <span className="n">{cards.filter((c) => c.theme === t).length}</span>
                  </button>
                );
              })}
            </div>
            </details>
          )}

          {!deck.builtin && (
            <details className="panelbox" open={!!ctrl}>
              <summary>
                Contrôle
                <span className="n" style={{ marginLeft: 8, fontWeight: 400, opacity: 0.75 }}>{etiquette ?? 'aucun'}</span>
              </summary>
              <p className="hint">
                {ctrl
                  ? `Prévu ${jourLong(dateLocale(ctrl))}. Les révisions de ce paquet sont resserrées jusque-là, et tout le paquet revient la veille.`
                  : tvp('Aucun contrôle prévu. Ajoute une date : l’appli resserre les révisions pour que les mots soient sus le jour J.', 'Aucun contrôle prévu. Ajoutez une date : l’appli resserre les révisions pour que les mots soient sus le jour J.')}
              </p>
              {bilan && (
                <div className="bilan">
                  <b>{fragiles.length === 0 ? 'Aucun mot fragile' : `${fragiles.length} mot${fragiles.length > 1 ? 's' : ''} fragile${fragiles.length > 1 ? 's' : ''}`}</b>
                  <p className="hint" style={{ margin: '4px 0 8px' }}>
                    {fragiles.length === 0
                      ? tvp('À ta dernière révision, tu as su tous les mots déjà vus.', 'À votre dernière révision, vous avez su tous les mots déjà vus.')
                      : tvp('Notés « À revoir » ou « Difficile » à ta dernière révision. Relis-les avant le contrôle.', 'Notés « À revoir » ou « Difficile » à votre dernière révision. Relisez-les avant le contrôle.')}
                  </p>
                  {fragiles.length > 0 && (
                    <div className="rows">
                      {fragiles.map((c) => (
                        <div key={c.id} className="row">
                          <span style={{ flex: 1 }}>{c.en}</span>
                          <span className="n">{c.fr}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="field">
                <label htmlFor="dh-controle">{ctrl ? 'Nouvelle date' : 'Date du contrôle'}</label>
                <input
                  id="dh-controle" type="date" value={dateCtrl}
                  min={isoLocal(jourPlus(1))} max={isoLocal(jourPlus(90))}
                  onChange={(e) => { if (e.target.value) setDateCtrl(e.target.value); }}
                />
              </div>
              {!dateCtrlOk && <p className="error">{tvp('Choisis une date entre demain et dans 3 mois.', 'Choisissez une date entre demain et dans 3 mois.')}</p>}
              <button className="btn" disabled={!dateCtrlOk || dateCtrl === ctrl || ctrlEnCours} onClick={() => void enregistreControle(dateCtrl)}>
                {ctrl ? 'Changer la date' : 'Ajouter ce contrôle'}
              </button>
              {ctrl && (
                <button className="btn ghost" disabled={ctrlEnCours} onClick={async () => { if (await demande({ titre: 'Retirer le contrôle ?', texte: 'Le paquet reprend le rythme normal.', agir: 'Retirer le contrôle' })) void enregistreControle(null); }}>
                  Retirer le contrôle
                </button>
              )}
            </details>
          )}

          <MotsDuPaquet
            key={deck.id}
            deckId={deck.id} cards={cards} progress={progress}
            modifiable={!deck.builtin} onReload={onReload}
          />

          <details className="panelbox">
            <summary>Réglages</summary>
            <div className="setting scope">
              <Toggle
                label="Réglages propres à ce paquet"
                checked={particulier}
                onChange={(on) => {
                  // En activant, on part des valeurs générales : rien ne change
                  // visuellement, mais les modifications suivantes restent ici.
                  void onOverrides(on ? { ...general, updatedAt: Date.now() } : null);
                }}
              />
              <p className="hint" style={{ margin: '7px 0 0' }}>
                {particulier
                  ? 'Ce paquet a ses propres réglages. Les modifications ci-dessous ne touchent que lui.'
                  : 'Ce paquet suit les réglages généraux. Les modifications ci-dessous s’appliquent à tous les paquets.'}
              </p>
            </div>
            <Slider
              label="Nouveaux mots par jour"
              hint="Chaque nouveau mot génère environ 5 révisions dans les semaines qui suivent."
              min={0} max={20} step={1} value={settings.newPerDay}
              onChange={(v) => change({ newPerDay: v })}
            />
            <Slider
              label="Révisions maximum par jour"
              hint="Plafond des mots déjà vus. Le surplus est reporté au lendemain."
              min={20} max={100} step={5} value={settings.reviewsPerDay}
              onChange={(v) => change({ reviewsPerDay: v })}
            />
            <Slider
              label="Cartes par session"
              hint="Pour découper la journée en plusieurs passages courts."
              min={10} max={100} step={5} value={settings.cardsPerSession}
              onChange={(v) => change({ cardsPerSession: v })}
            />
            <Slider
              label="Vitesse de la voix"
              min={0.6} max={1.1} step={0.05} value={settings.speechRate}
              format={(v) => v.toFixed(2).replace('.', ',')}
              onChange={(v) => change({ speechRate: v })}
            />
            <Slider
              label="Marge verticale du texte sur le visuel"
              hint="À ajuster si le cadre du visuel est plus épais ou plus fin."
              min={5} max={30} step={1} value={settings.panelInsetY}
              format={(v) => `${v} %`}
              onChange={(v) => change({ panelInsetY: v })}
            />
            <Slider
              label="Marge horizontale du texte"
              min={5} max={30} step={1} value={settings.panelInsetX}
              format={(v) => `${v} %`}
              onChange={(v) => change({ panelInsetX: v })}
            />
            <div className="setting" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <Toggle
                label="Prononcer automatiquement à la réponse"
                checked={settings.autoSpeak}
                onChange={(v) => change({ autoSpeak: v })}
              />
              <Toggle
                label="Sens inverse : anglais → français"
                checked={settings.reversed}
                onChange={(v) => change({ reversed: v })}
              />
            </div>
          </details>
          {!verrouille && <button className="btn ghost" onClick={onAddCards}>Ajouter des mots</button>}
          {!deck.builtin && (
            <button className="btn ghost danger" onClick={async () => {
              if (!(await demande({
                titre: `Supprimer « ${deck.name} » ?`,
                texte: 'Ses mots et leur progression seront effacés. On ne pourra pas les récupérer.',
                agir: 'Supprimer définitivement',
                ton: 'danger',
              }))) return;
              await repository.deleteDeck(deck.id);
              onBackToLibrary();
            }}>
              Supprimer ce paquet
            </button>
          )}
        </>
      )}
    </>
  );
}
