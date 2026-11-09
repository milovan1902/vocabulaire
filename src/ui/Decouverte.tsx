/**
 * CHANTIER 394 — LES DÉCOUVERTES (maquette 394, 1b).
 *
 * Une bulle posée en bas de l'écran, sans voile, la première fois qu'on
 * ouvre une partie. « Compris » la ferme pour de bon (sur le compte), « i »
 * déplie le détail. Jamais deux bulles d'un coup : la seconde attend la
 * prochaine ouverture. Aucune pendant la visite de départ.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { estVue, marquerVue, visiteEnCours } from '../data/decouvertes';
import { tv } from './ton';
import { ExempleBilan, ExempleSeance } from './Visite';
import './visite.css';
import './decouverte.css';

export type IdDecouverte = 'parler' | 'paquets' | 'progres' | 'amis' | 'reglages' | 'defi-eclair' | 'defi-recu';

/** La bulle affichée en ce moment (une seule à la fois). */
let tenue: string | null = null;

type Contenu = { titre: string; corps: ReactNode; detail?: ReactNode };

function contenu(id: IdDecouverte, a: boolean): Contenu {
  switch (id) {
    case 'parler':
      return {
        titre: tv(a, 'Trois façons de parler', 'Trois façons de parler'),
        corps: (
          <>
            <span className="decouverte-mode discuter">
              <i aria-hidden="true" />
              <span><b>Discuter</b><small>{tv(a, 'Parle d’un sujet : te présenter, tes loisirs, ton week-end…', 'Parlez d’un sujet : vous présenter, vos loisirs, votre week-end…')}</small></span>
            </span>
            <span className="decouverte-mode scene">
              <i aria-hidden="true" />
              <span><b>Jouer une scène</b><small>{tv(a, 'Une mise en situation : au restaurant, à l’aéroport… Choisis-en une, ou laisse l’IA en inventer une.', 'Une mise en situation : au restaurant, à l’aéroport… Choisissez-en une, ou laissez l’IA en inventer une.')} <strong>Les scènes sont illimitées.</strong></small></span>
            </span>
            <span className="decouverte-mode comprendre">
              <i aria-hidden="true" />
              <span><b>Comprendre mes phrases</b><small>{tv(a, 'Les phrases et expressions sur lesquelles tu as buté en révision : l’IA te les explique, pas à pas.', 'Les phrases et expressions sur lesquelles vous avez buté en révision : l’IA vous les explique, pas à pas.')}</small></span>
            </span>
            <small className="decouverte-note">10 min offertes pour essayer · 10 min par jour avec l’abonnement</small>
          </>
        ),
        detail: (
          <div className="decouverte-exemple">
            <ExempleSeance prenom="Léa" a={a} />
            <ExempleBilan a={a} />
          </div>
        ),
      };
    case 'paquets':
      return {
        titre: tv(a, 'Tes paquets', 'Vos paquets'),
        corps: (
          <>
            <p>Les paquets <b>en jeu</b> {tv(a, 'font ta journée. Les autres sont', 'font votre journée. Les autres sont')} <b>en pause</b> : {tv(a, 'ta', 'votre')} progression est gardée.</p>
            <p>« Ajouter un paquet » ouvre le <b>catalogue</b> pour choisir un paquet, par niveau et par thème. {tv(a, 'Tu pourras aussi', 'Vous pourrez aussi')} <b>{tv(a, 'créer tes propres paquets', 'créer vos propres paquets')}</b> à la main ou <b>photographier une liste</b> {tv(a, 'de ton cahier avant un contrôle : l’application te fera réviser au bon rythme pour préparer tes interros !', 'avant un examen : l’application vous fera réviser au bon rythme pour être prêt le jour J.')}</p>
          </>
        ),
      };
    case 'progres':
      return {
        titre: tv(a, 'Tes progrès', 'Vos progrès'),
        corps: (
          <>
            <p>En haut, ce qui compte : {tv(a, 'tes', 'vos')} <b>mots acquis</b>, {tv(a, 'ta', 'votre')} <b>série</b> de jours et {tv(a, 'tes', 'vos')} <b>XP</b>. {tv(a, 'Touche', 'Touchez')} un chiffre pour le détail.</p>
            <p>20 cartes révisées dans la journée = <b>+20 XP</b> (30 le week-end). Les XP débloquent des apparences.</p>
          </>
        ),
        detail: (
          <p>Chaque mot passe d’un tas à l’autre : à reprendre, en cours, presque acquis, acquis. Une semaine complète du lundi au vendredi rapporte un bonus. Un week-end travaillé donne un gel, qui comble un jour manqué.</p>
        ),
      };
    case 'amis':
      return {
        titre: tv(a, 'Révise avec tes amis', 'Révisez avec vos proches'),
        corps: (
          <>
            <p>{tv(a, 'Donne ton', 'Donnez votre')} <b>code ami</b>, ou {tv(a, 'tape celui d’un camarade. Personne ne peut te trouver sans ton code.', 'tapez celui d’un proche. Personne ne peut vous trouver sans votre code.')}</p>
            <span className="decouverte-defi">
              <b>Défi</b>
              <small>5 mots, 20 s chacun. Le plus rapide gagne <strong>5 XP</strong> (10 contre une classe au-dessus). 3 défis par jour.</small>
            </span>
            <small className="decouverte-note">Pas de messages.{a ? '' : ' Avant 15 ans, un parent donne son accord.'}</small>
          </>
        ),
      };
    case 'reglages':
      return {
        titre: 'Deux choses à faire ici',
        corps: (
          <>
            <p><b>Moi › Connexion</b> : un compte Google, et {tv(a, 'ta progression te suit sur tous tes appareils.', 'votre progression vous suit sur tous vos appareils.')}</p>
            <p><b>Apparence et son</b> : {tv(a, 'tes crédits t’attendent pour choisir une apparence.', 'vos crédits vous attendent pour choisir une apparence.')}</p>
          </>
        ),
      };
    case 'defi-eclair':
      return {
        titre: tv(a, 'Ton premier défi éclair', 'Votre premier défi éclair'),
        corps: <p>Chaque jour, 5 mots {tv(a, 'que tu connais', 'que vous connaissez')} déjà, à écrire en anglais avant la fin du chrono. 5/5 = <b>+10 XP</b>, 4/5 = <b>+5 XP</b>.</p>,
      };
    case 'defi-recu':
      return {
        titre: tv(a, 'Ton premier défi reçu', 'Votre premier défi reçu'),
        corps: (
          <>
            <p>Ce sont les 5 mots de {tv(a, 'ton ami. Fais mieux que lui, ou aussi bien mais plus vite. Tu as', 'votre ami. Faites mieux, ou aussi bien mais plus vite. Vous avez')} jusqu’à minuit.</p>
            <p>Gagné : <b>5 XP</b> · nul ou perdu : <b>2 XP</b>. {tv(a, 'Tes', 'Vos')} révisions ne changent pas.</p>
          </>
        ),
      };
  }
}

export function Decouverte({ id, vus, adulte, actions }: {
  id: IdDecouverte;
  /** `Settings.vus` du compte. */
  vus: string[] | undefined;
  adulte: boolean;
  /** Un bouton de plus à gauche de « Compris » (« Me connecter »…). Il ferme aussi la bulle. */
  actions?: { libelle: string; onClick: () => void };
}) {
  const [ouverte, setOuverte] = useState(false);
  const [plus, setPlus] = useState(false);
  const deja = estVue(id, vus);

  useEffect(() => {
    if (deja || visiteEnCours()) return undefined;
    const t = window.setTimeout(() => {
      if (tenue === null || tenue === id) { tenue = id; setOuverte(true); }
    }, 500);
    return () => {
      window.clearTimeout(t);
      if (tenue === id) tenue = null;
    };
  }, [id, deja]);

  if (!ouverte || deja) return null;

  const fermer = () => {
    marquerVue(id);
    setOuverte(false);
    if (tenue === id) tenue = null;
  };
  const c = contenu(id, adulte);
  const voir = id === 'parler' ? 'Voir un exemple' : null;

  return (
    <div className="decouverte" role="dialog" aria-label={c.titre}>
      <div className="decouverte-tete">
        <b>{c.titre}</b>
        {c.detail && !voir && (
          <button className="decouverte-i" aria-label="Plus d’informations" aria-expanded={plus} onClick={() => setPlus((v) => !v)}>i</button>
        )}
      </div>
      {c.corps}
      {plus && c.detail}
      <div className={`decouverte-actions${voir || actions ? ' deux' : ''}`}>
        {voir && c.detail && (
          <button className="btn ghost" onClick={() => setPlus((v) => !v)}>{plus ? 'Masquer l’exemple' : voir}</button>
        )}
        {actions && (
          <button className="btn ghost" onClick={() => { fermer(); actions.onClick(); }}>{actions.libelle}</button>
        )}
        <button className="btn" onClick={fermer}>Compris</button>
      </div>
    </div>
  );
}
