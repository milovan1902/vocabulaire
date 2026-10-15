/**
 * CHANTIER 276 — LA VITRINE DE LA BOUTIQUE (/vitrine?apparence=plage&ecran=revision).
 *
 * La fiche d'une apparence (Boutique.tsx) affiche cette page en réduction, dans un cadre :
 * le vrai écran « Aujourd'hui » ou « Révision », avec le vrai fond et le vrai décor de
 * l'apparence, mais FIGÉ (aucune animation) et avec des données INVENTÉES.
 *
 * Elle n'écrit rien : main.tsx ne lance ni les mesures, ni le stockage, ni la mise à jour,
 * l'apparence est posée par appliquerApercu (sans l'enregistrer), rien ne se synchronise,
 * et la page ne se touche pas (pointer-events: none).
 */
import { useEffect } from 'react';
import type { Card, Deck } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import type { Streak } from '../engine/streak';
import { shiftDay } from '../engine/streak';
import { todayKey, type SessionItem } from '../engine/session';
import { emptyProgress } from '../engine/scheduler';
import type { DeckMastery } from '../engine/mastery';
import type { DeckSummary } from './deckSummary';
import type { Budget } from '../data/parler';
import { FondAnime } from './FondAnime';
import { Defile } from './Defile';
import { Salle } from './Salle';
import { Today } from './Today';
import { Study } from './Study';

const rien = () => {};

function maitrise(percent: number, n: number): DeckMastery {
  const acquis = Math.round((n * percent) / 140);
  const cours = Math.round(n * 0.2);
  const presque = Math.round(n * 0.1);
  const reprendre = Math.round(n * 0.05);
  return { percent, counted: n, full: acquis, partial: false, breakdown: { decouvrir: Math.max(0, n - acquis - cours - presque - reprendre), reprendre, cours, presque, acquis } };
}

function paquet(id: string, name: string): Deck {
  return { id, name, categoryId: null, level: 'B1', classeFrom: '4e', builtin: true, hasImage: false, createdAt: 0, updatedAt: 0 };
}

const PAQUETS: DeckSummary[] = [
  { deck: paquet('vitrine-1', 'Irregular verbs'), total: 120, enJeu: 120, due: 12, resting: 60, themesSelected: 4, themesTotal: 4, image: null, mastery: maitrise(42, 120) },
  { deck: paquet('vitrine-2', 'College life'), total: 90, enJeu: 90, due: 15, resting: 20, themesSelected: 3, themesTotal: 3, image: null, mastery: maitrise(18, 90) },
  { deck: paquet('vitrine-3', 'Food & drinks'), total: 80, enJeu: 80, due: 7, resting: 50, themesSelected: 2, themesTotal: 2, image: null, mastery: maitrise(65, 80) },
];
const BUDGET: Budget = { minutes: 12, periode: 'semaine', fini: false, coutJour: 0, appels: 0 };
const APERCU = { rows: PAQUETS, budget: BUDGET };

/** Une semaine en cours : deux jours faits (avant-hier et hier), à 20 cartes. */
function serie(): Streak {
  const auj = todayKey();
  const days = [shiftDay(auj, -2), shiftDay(auj, -1)];
  return { lastDay: days[1], current: 2, best: 9, days, counts: { [days[0]]: 20, [days[1]]: 20 }, updatedAt: 0 };
}

const MOTS: Array<[string, string, string]> = [
  ['to bring', 'apporter', 'Bring your book tomorrow.'], ['to seek', 'chercher', 'They seek the truth.'],
  ['to forbid', 'interdire', 'Phones are forbidden here.'], ['to wear', 'porter', 'She wears a red coat.'],
  ['to lend', 'prêter', 'Can you lend me a pen?'], ['to hide', 'cacher', 'The cat hides under the bed.'],
  ['to shake', 'secouer', 'Shake the bottle first.'], ['to swear', 'jurer', 'I swear it is true.'],
  ['to bend', 'plier', 'Bend your knees.'], ['to bite', 'mordre', 'The dog does not bite.'],
  ['to dig', 'creuser', 'They dig a hole.'], ['to feed', 'nourrir', 'Feed the fish twice a day.'],
];
const FILE: SessionItem[] = MOTS.map(([en, fr, example], i) => {
  const card: Card = { id: `vitrine-c${i}`, en, fr, theme: 'Irregular verbs', example };
  return { card, progress: emptyProgress(card.id), wasNew: true };
});

/* Tout est figé : les animations sautent à leur dernière image, les transitions disparaissent. */
const FIGE = `*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; transition: none !important; }
html, body { overflow: hidden !important; }
body { pointer-events: none !important; user-select: none !important; }`;

export function Vitrine() {
  const ecran = new URLSearchParams(window.location.search).get('ecran') === 'revision' ? 'revision' : 'aujourdhui';

  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = FIGE;
    document.head.appendChild(s);
    document.title = 'Aperçu';
    return () => { s.remove(); };
  }, []);

  return (
    <>
      <FondAnime />
      <Defile />
      <Salle />
      {ecran === 'revision' ? (
        <div className="app">
          <div className="screen">
            <Study queue={FILE} image={null} settings={{ ...DEFAULT_SETTINGS, autoSpeak: false }} onGrade={async () => {}} onQuit={rien} onDone={rien} revele />
          </div>
        </div>
      ) : (
        <div className="app tabbed">
          <div className="screen">
            <Today
              decks={PAQUETS.map((r) => r.deck)}
              active={PAQUETS.map((r) => r.deck.id)}
              settings={DEFAULT_SETTINGS}
              streak={serie()}
              onReview={rien}
              onOpen={rien}
              onManage={rien}
              onCalendrier={rien}
              onParler={rien}
              onXp={rien}
              apercu={APERCU}
            />
          </div>
        </div>
      )}
    </>
  );
}
