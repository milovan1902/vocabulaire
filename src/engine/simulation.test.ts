/**
 * BANC D'ESSAI — plusieurs mois d'activité simulés en quelques secondes.
 *
 * POURQUOI CE FICHIER. Les tests existants vérifient des fonctions une par
 * une, sur deux ou trois cartes. Les pannes qui restent ne sont pas là :
 * elles naissent de la DURÉE (une dette de révisions qui s'accumule pendant
 * six semaines), du PASSAGE DU TEMPS (minuit, changement de mois, semaine à
 * cheval sur le nouvel an) et des DEUX APPAREILS (téléphone puis
 * ordinateur, dans un ordre qu'on ne choisit pas). Aucune de ces trois
 * choses ne se voit sur un test à trois cartes.
 *
 * CE QU'IL FAIT. Il joue un élève : quatre paquets, cent vingt jours, des
 * jours sautés, des réponses imparfaites, deux appareils qui se
 * synchronisent en alternance. À chaque instant il vérifie les lois qui ne
 * doivent jamais être violées, et il IMPRIME un relevé de charge à la fin —
 * c'est ce relevé qui dit si l'application est vivable, ce qu'aucune
 * assertion ne sait dire.
 *
 * CE QU'IL NE FAIT PAS, ET IL FAUT LE SAVOIR. Il ne touche ni à
 * l'interface, ni à IndexedDB, ni à Supabase. Un bouton mort, un écran
 * blanc, une synchronisation qui échoue sur le réseau : rien de tout cela
 * n'apparaîtra ici. Ce banc teste le moteur — la mémoire, les quotas, les
 * courbes, les fusions.
 *
 * COMMENT LE LANCER :
 *     npx vitest run src/engine/simulation.test.ts
 * Le relevé s'imprime dans le terminal. C'est lui qu'il faut me renvoyer.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DEFAULT_SETTINGS, type Card, type DailyCounter, type Grade, type Progress, type Settings } from '../domain/types';
import { emptyProgress, review, isDue, isNew } from './scheduler';
import { buildSession, computeStats, freshCounter, rollDay, todayKey } from './session';
import { deckMastery, masteryOf, PLEIN, type MasteryBreakdown } from './mastery';
import { EMPTY_STREAK, record as noteJour, mergeStreak, shiftDay, type Streak } from './streak';
import { noteJalon, fusionnerJalons, courbe, type Jalon } from './jalons';
import { noteReleve, fusionnerReleves, serie, type Releve } from './paliers';
import { mergeCounters } from '../data/sync';

/* ------------------------------------------------------------------ *
 * Hasard reproductible
 *
 * `buildSession` brasse la file, et FSRS ajoute un flou aux intervalles :
 * les deux passent par Math.random. Sans graine, un échec sur cent
 * exécutions ne serait jamais reproduit, donc jamais corrigé. On remplace
 * Math.random pour toute la durée du banc.
 * ------------------------------------------------------------------ */
let graine = 20260917;
function rnd(): number {
  graine |= 0; graine = (graine + 0x6d2b79f5) | 0;
  let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const vraiRandom = Math.random;
beforeAll(() => { Math.random = rnd; });
afterAll(() => { Math.random = vraiRandom; });

/* ------------------------------------------------------------------ *
 * Le matériel : quatre paquets, comme une vraie bibliothèque
 * ------------------------------------------------------------------ */
interface Paquet {
  id: string;
  nom: string;
  cards: Card[];
  themes: string[];
}

function paquet(id: string, nom: string, combien: number, themes: string[]): Paquet {
  const cards: Card[] = [];
  for (let i = 0; i < combien; i++) {
    cards.push({
      id: `${id}-c${String(i).padStart(3, '0')}`,
      en: `word-${i}`,
      fr: `mot-${i}`,
      theme: themes[i % themes.length],
    } as Card);
  }
  return { id, nom, cards, themes };
}

const PAQUETS: Paquet[] = [
  paquet('voc5e', 'Mots 5e', 220, ['maison', 'école', 'ville']),
  paquet('gram5e', 'Structures 5e', 90, ['temps', 'questions']),
  paquet('verbes', 'Verbes irréguliers', 120, ['courants', 'rares']),
  paquet('phr6e', 'Phrases 6e', 60, ['politesse']),
];

/**
 * La difficulté propre de chaque mot, tirée une fois pour toutes.
 *
 * Un élève ne répond pas au hasard : certains mots lui résistent
 * durablement. Sans cette persistance, tout finirait acquis au même rythme
 * et le tas « à reprendre » — le seul intéressant — resterait vide.
 */
const DURETE = new Map<string, number>();
for (const p of PAQUETS) for (const c of p.cards) DURETE.set(c.id, rnd());

/** La note que donnerait l'élève. Moins de fautes à mesure qu'il revoit. */
function repond(cardId: string, progress: Progress): Grade {
  const dur = DURETE.get(cardId) ?? 0.5;
  const vu = Math.min(1, (progress.reps ?? 0) / 6);
  const rate = dur * (1 - 0.7 * vu);       // probabilité de se tromper
  const x = rnd();
  if (x < rate * 0.45) return 'again';
  if (x < rate) return 'hard';
  if (x < rate + (1 - rate) * 0.72) return 'good';
  return 'easy';
}

const REGLAGES: Settings = {
  ...DEFAULT_SETTINGS,
  newPerDay: 10,
  reviewsPerDay: 30,
  cardsPerSession: 30,
};

/* ------------------------------------------------------------------ *
 * Un appareil
 * ------------------------------------------------------------------ */
interface Appareil {
  nom: string;
  progress: Record<string, Progress>;
  counters: Record<string, DailyCounter>;
  streak: Streak;
  jalons: Jalon[];
  releves: Releve[];
}

function appareil(nom: string): Appareil {
  return { nom, progress: {}, counters: {}, streak: EMPTY_STREAK, jalons: [], releves: [] };
}

function progressionDe(a: Appareil, id: string, maintenant: Date): Progress {
  return a.progress[id] ?? emptyProgress(id, maintenant);
}

/** Les cinq tas, tous paquets confondus — ce que « Mes progrès » affiche. */
function tasGlobaux(a: Appareil): MasteryBreakdown {
  const total: MasteryBreakdown = { decouvrir: 0, reprendre: 0, cours: 0, presque: 0, acquis: 0 };
  for (const p of PAQUETS) {
    const b = deckMastery(p.cards, a.progress, p.themes).breakdown;
    total.decouvrir += b.decouvrir; total.reprendre += b.reprendre;
    total.cours += b.cours; total.presque += b.presque; total.acquis += b.acquis;
  }
  return total;
}

const TOTAL_CARTES = PAQUETS.reduce((n, p) => n + p.cards.length, 0);

/** Un anomalie relevée pendant la simulation : de quoi la rapporter. */
const anomalies: string[] = [];
function exige(condition: boolean, message: string): void {
  if (!condition) anomalies.push(message);
}

interface JourneeBilan {
  jour: string;
  cartes: number;
  nouveaux: number;
  revisions: number;
  passages: number;
  dette: number;      // révisions dues laissées de côté, tous paquets
  acquis: number;
}

/**
 * Une journée de travail sur un appareil.
 *
 * `travaille` à faux simule un jour sauté : rien n'est révisé, mais le
 * temps passe — c'est ainsi que la dette se forme et que la série casse.
 */
function journee(a: Appareil, debut: Date, travaille: boolean): JourneeBilan {
  const jour = todayKey(debut);
  let horloge = new Date(debut.getTime());
  let cartes = 0, nouveaux = 0, revisions = 0, passages = 0;

  if (travaille) {
    for (const p of PAQUETS) {
      const compteurAvant = rollDay(a.counters[p.id] ?? freshCounter(horloge), horloge);
      let compteur = compteurAvant;
      let tours = 0;

      for (;;) {
        const file = buildSession(
          p.cards,
          (id) => progressionDe(a, id, horloge),
          REGLAGES,
          compteur,
          horloge.getTime(),
          false,
        );
        if (!file.length) break;

        exige(
          file.length <= REGLAGES.cardsPerSession,
          `[${a.nom} ${jour} ${p.nom}] passage de ${file.length} cartes alors que le réglage en autorise ${REGLAGES.cardsPerSession}`,
        );
        const ids = new Set(file.map((i) => i.card.id));
        exige(
          ids.size === file.length,
          `[${a.nom} ${jour} ${p.nom}] la même carte apparaît deux fois dans un passage`,
        );

        for (const item of file) {
          const avant = item.progress;
          const note = repond(item.card.id, avant);
          const apres = review(avant, note, horloge);

          exige(
            apres.due > horloge.getTime(),
            `[${a.nom} ${jour}] ${item.card.id} replanifiée dans le passé après « ${note} »`,
          );
          exige(
            (apres.reps ?? 0) === (avant.reps ?? 0) + 1,
            `[${a.nom} ${jour}] ${item.card.id} : le compteur de passages n'a pas avancé`,
          );
          const m = masteryOf(apres);
          exige(
            m >= 0 && m <= PLEIN && m % 25 === 0,
            `[${a.nom} ${jour}] ${item.card.id} : palier hors barème (${m})`,
          );

          a.progress[item.card.id] = apres;
          compteur = item.wasNew
            ? { ...compteur, newSeen: compteur.newSeen + 1 }
            : { ...compteur, reviewsDone: compteur.reviewsDone + 1 };
          if (item.wasNew) nouveaux++; else revisions++;
          cartes++;
          horloge = new Date(horloge.getTime() + 9_000); // neuf secondes par carte
        }

        a.streak = noteJour(a.streak, todayKey(horloge));
        a.counters[p.id] = compteur;
        passages++;
        if (++tours > 60) {
          anomalies.push(`[${a.nom} ${jour} ${p.nom}] soixante passages dans la journée : la boucle ne se ferme pas`);
          break;
        }
      }

      const c = a.counters[p.id] ?? compteurAvant;
      exige(
        c.newSeen <= REGLAGES.newPerDay,
        `[${a.nom} ${jour} ${p.nom}] ${c.newSeen} nouveaux mots servis pour un quota de ${REGLAGES.newPerDay}`,
      );
      exige(
        c.reviewsDone <= REGLAGES.reviewsPerDay,
        `[${a.nom} ${jour} ${p.nom}] ${c.reviewsDone} révisions servies pour un quota de ${REGLAGES.reviewsPerDay}`,
      );
    }
  }

  // Fin de journée : on relève, comme le fait l'écran « Mes progrès ».
  const soir = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate(), 21, 30);
  const tas = tasGlobaux(a);
  exige(
    tas.decouvrir + tas.reprendre + tas.cours + tas.presque + tas.acquis === TOTAL_CARTES,
    `[${a.nom} ${jour}] les cinq tas font ${tas.decouvrir + tas.reprendre + tas.cours + tas.presque + tas.acquis} mots au lieu de ${TOTAL_CARTES} : des cartes se perdent en route`,
  );
  a.releves = noteReleve(a.releves, tas, jour);
  a.jalons = noteJalon(a.jalons, tas.acquis, jour.slice(0, 7));

  let dette = 0;
  for (const p of PAQUETS) {
    const st = computeStats(
      p.cards,
      (id) => progressionDe(a, id, soir),
      REGLAGES,
      rollDay(a.counters[p.id] ?? freshCounter(soir), soir),
      soir.getTime(),
    );
    dette += st.dueBeyondGoal;
  }

  return { jour, cartes, nouveaux, revisions, passages, dette, acquis: tas.acquis };
}

/* ================================================================== *
 * 1. Cent vingt jours sur un seul appareil
 * ================================================================== */
describe('banc d’essai — quatre mois de travail', () => {
  const tel = appareil('téléphone');
  const bilans: JourneeBilan[] = [];

  beforeAll(() => {
    let jour = new Date(2025, 10, 3, 18, 15); // lundi 3 novembre 2025, 18 h 15
    for (let i = 0; i < 120; i++) {
      // Un jour sur six est sauté : week-ends chargés, vacances, oublis.
      const travaille = rnd() > 0.17;
      const debut = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), 7 + Math.floor(rnd() * 14), Math.floor(rnd() * 60));
      bilans.push(journee(tel, debut, travaille));
      jour = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate() + 1, 18, 15);
    }
  });

  it('aucune loi du moteur n’a été violée en cent vingt jours', () => {
    expect(anomalies).toEqual([]);
  });

  it('le travail avance : des mots finissent acquis', () => {
    const fin = bilans[bilans.length - 1];
    expect(fin.acquis).toBeGreaterThan(0);
  });

  it('la dette de révisions ne s’emballe pas', () => {
    /*
     * Le vrai risque d'une application à quota : la dette grossit sans fin
     * et l'élève ne rattrape jamais. On regarde le dernier mois — si la
     * dette y dépasse dix jours de quota, le réglage par défaut condamne
     * l'élève, et c'est un défaut de conception, pas un bug de code.
     */
    const dernierMois = bilans.slice(-30).map((b) => b.dette);
    const pire = Math.max(...dernierMois);
    expect(pire).toBeLessThan(REGLAGES.reviewsPerDay * PAQUETS.length * 10);
  });

  it('la charge quotidienne reste tenable', () => {
    const jours = bilans.filter((b) => b.cartes > 0);
    const pire = Math.max(...jours.map((b) => b.cartes));
    // Quatre paquets, 10 + 30 chacun : 160 cartes au plus, jamais plus.
    expect(pire).toBeLessThanOrEqual((REGLAGES.newPerDay + REGLAGES.reviewsPerDay) * PAQUETS.length);
  });

  it('la série de jours suit les jours réellement travaillés', () => {
    const travailles = bilans.filter((b) => b.cartes > 0).map((b) => b.jour);
    expect(tel.streak.days.length).toBeLessThanOrEqual(30);
    for (const j of tel.streak.days) expect(travailles).toContain(j);
    expect(tel.streak.best).toBeGreaterThanOrEqual(tel.streak.current);
  });

  it('les relevés : un par jour, triés, sans doublon', () => {
    const jours = tel.releves.map((r) => r.jour);
    expect(new Set(jours).size).toBe(jours.length);
    expect([...jours].sort()).toEqual(jours);
    expect(serie(tel.releves, 'jour').length).toBeLessThanOrEqual(30);
    expect(serie(tel.releves, 'semaine').length).toBeLessThanOrEqual(12);
    expect(serie(tel.releves, 'mois').length).toBeLessThanOrEqual(12);
  });

  it('la courbe des mots acquis ne redescend jamais sans raison', () => {
    /*
     * Aucun paquet n'est supprimé dans cette simulation : un mois clos ne
     * peut donc que monter ou stagner. Une baisse signalerait un relevé
     * écrit sur des données incomplètes.
     */
    const c = courbe(tel.jalons, 12);
    for (let i = 1; i < c.length; i++) {
      expect(c[i].acquis).toBeGreaterThanOrEqual(c[i - 1].acquis);
    }
  });

  it('LE RELEVÉ — à renvoyer tel quel', () => {
    const actifs = bilans.filter((b) => b.cartes > 0);
    const total = actifs.reduce((n, b) => n + b.cartes, 0);
    const moyenne = total / Math.max(1, actifs.length);
    const pointe = actifs.reduce((m, b) => (b.cartes > m.cartes ? b : m), actifs[0]);
    const fin = bilans[bilans.length - 1];
    const tas = tasGlobaux(tel);

    const lignes = [
      '',
      '════════ RELEVÉ DE SIMULATION — 120 jours, 4 paquets, 490 mots ════════',
      `Jours travaillés         : ${actifs.length} / 120`,
      `Cartes notées            : ${total} (moyenne ${moyenne.toFixed(1)} par jour travaillé)`,
      `Temps estimé             : ${(moyenne * 9 / 60).toFixed(1)} min/jour  ·  pointe ${(pointe.cartes * 9 / 60).toFixed(0)} min le ${pointe.jour}`,
      `Passages par jour         : jusqu'à ${Math.max(...actifs.map((b) => b.passages))}`,
      `Dette de révisions (fin)  : ${fin.dette} cartes dues au-delà du quota`,
      `Dette maximale            : ${Math.max(...bilans.map((b) => b.dette))} cartes`,
      '',
      `Paliers à la fin           : à découvrir ${tas.decouvrir} · à reprendre ${tas.reprendre} · en cours ${tas.cours} · presque ${tas.presque} · acquis ${tas.acquis}`,
      `Série                      : ${tel.streak.current} jours en cours, record ${tel.streak.best}`,
      `Jalons mensuels            : ${tel.jalons.map((j) => `${j.month} = ${j.acquis}`).join(' · ')}`,
      '',
      'Dette semaine par semaine (une valeur = le dernier jour de la semaine) :',
      `  ${bilans.filter((_, i) => i % 7 === 6).map((b) => b.dette).join(' ')}`,
      'Mots acquis semaine par semaine :',
      `  ${bilans.filter((_, i) => i % 7 === 6).map((b) => b.acquis).join(' ')}`,
      anomalies.length ? `\n⚠ ${anomalies.length} ANOMALIES :\n  ${anomalies.slice(0, 20).join('\n  ')}` : '\n✓ aucune anomalie de moteur',
      '═══════════════════════════════════════════════════════════════════════',
      '',
    ];
    console.log(lignes.join('\n'));
    expect(actifs.length).toBeGreaterThan(80);
  });
});

/* ================================================================== *
 * 2. Deux appareils — le cas du chantier 83
 * ================================================================== */
describe('banc d’essai — téléphone et ordinateur', () => {
  const tel = appareil('téléphone');
  const pc = appareil('ordinateur');

  beforeAll(() => {
    // Le téléphone travaille six semaines seul, l'ordinateur deux.
    let j = new Date(2026, 0, 5, 19, 0);
    for (let i = 0; i < 42; i++) {
      journee(tel, new Date(j.getFullYear(), j.getMonth(), j.getDate(), 19, 0), rnd() > 0.15);
      j = new Date(j.getFullYear(), j.getMonth(), j.getDate() + 1, 19, 0);
    }
    let k = new Date(2026, 1, 2, 9, 0);
    for (let i = 0; i < 14; i++) {
      journee(pc, new Date(k.getFullYear(), k.getMonth(), k.getDate(), 9, 0), rnd() > 0.3);
      k = new Date(k.getFullYear(), k.getMonth(), k.getDate() + 1, 9, 0);
    }
  });

  it('la fusion des relevés ne dépend pas de qui synchronise en premier', () => {
    const a = fusionnerReleves(tel.releves, pc.releves);
    const b = fusionnerReleves(pc.releves, tel.releves);
    expect(a).toEqual(b);
  });

  it('la fusion des relevés ne perd aucun jour', () => {
    const attendu = new Set([...tel.releves, ...pc.releves].map((r) => r.jour));
    const obtenu = fusionnerReleves(tel.releves, pc.releves);
    expect(obtenu.length).toBe(attendu.size);
    expect([...obtenu].map((r) => r.jour).sort()).toEqual(obtenu.map((r) => r.jour));
  });

  it('refusionner ne change plus rien (idempotence)', () => {
    const une = fusionnerReleves(tel.releves, pc.releves);
    expect(fusionnerReleves(une, une)).toEqual(une);
    expect(fusionnerReleves(une, tel.releves)).toEqual(une);

    const jal = fusionnerJalons(tel.jalons, pc.jalons);
    expect(fusionnerJalons(jal, jal)).toEqual(jal);
    expect(fusionnerJalons(jal, pc.jalons)).toEqual(jal);
  });

  it('les jalons fusionnés gardent le plus complet de chaque mois', () => {
    const jal = fusionnerJalons(tel.jalons, pc.jalons);
    expect(fusionnerJalons(pc.jalons, tel.jalons)).toEqual(jal);
    for (const mois of new Set([...tel.jalons, ...pc.jalons].map((j) => j.month))) {
      const t = tel.jalons.find((j) => j.month === mois)?.acquis ?? 0;
      const o = pc.jalons.find((j) => j.month === mois)?.acquis ?? 0;
      expect(jal.find((j) => j.month === mois)?.acquis).toBe(Math.max(t, o));
    }
  });

  it('un appareil vierge ne rabote pas l’historique de l’autre', () => {
    /*
     * C'est exactement la panne du chantier 83 vue de l'autre côté : si la
     * fusion prenait le relevé du PC (vide) pour le bon, l'ouverture de
     * l'ordinateur effacerait des mois d'histoire du téléphone.
     */
    const neuf = appareil('pc neuf');
    expect(fusionnerReleves(neuf.releves, tel.releves)).toEqual(
      fusionnerReleves(tel.releves, neuf.releves),
    );
    expect(fusionnerReleves(neuf.releves, tel.releves).length).toBe(tel.releves.length);
    expect(fusionnerJalons(neuf.jalons, tel.jalons)).toEqual(tel.jalons);
  });

  it('les séries de jours se réunissent sans doublon', () => {
    const f = mergeStreak(tel.streak, pc.streak);
    expect(new Set(f.days).size).toBe(f.days.length);
    expect(f.best).toBeGreaterThanOrEqual(Math.max(tel.streak.best, pc.streak.best));
    expect(mergeStreak(pc.streak, tel.streak).days).toEqual(f.days);
  });

  it('les compteurs du jour ne s’additionnent pas deux fois', () => {
    const aujourd = todayKey();
    const ici: DailyCounter = { day: aujourd, newSeen: 7, reviewsDone: 12 };
    const la: DailyCounter = { day: aujourd, newSeen: 3, reviewsDone: 20 };
    const f = mergeCounters(ici, la, aujourd);
    expect(f.newSeen).toBeLessThanOrEqual(REGLAGES.newPerDay);
    expect(f.newSeen).toBe(Math.max(ici.newSeen, la.newSeen));
    expect(f.reviewsDone).toBe(Math.max(ici.reviewsDone, la.reviewsDone));
    // Un compteur de la veille ne doit pas ressusciter.
    const hier: DailyCounter = { day: shiftDay(aujourd, -1), newSeen: 10, reviewsDone: 30 };
    expect(mergeCounters(hier, null, aujourd).newSeen).toBe(0);
  });
});

/* ================================================================== *
 * 3. Les bords du calendrier
 * ================================================================== */
describe('banc d’essai — les bords du calendrier', () => {
  it('une révision à minuit et demi compte pour le bon jour', () => {
    const tard = new Date(2026, 2, 14, 0, 30);
    expect(todayKey(tard)).toBe('2026-03-14');
    const veille = new Date(2026, 2, 13, 23, 50);
    expect(todayKey(veille)).toBe('2026-03-13');
    expect(shiftDay(todayKey(tard), -1)).toBe(todayKey(veille));
  });

  it('le passage à l’heure d’été ne saute pas un jour', () => {
    // En France, dimanche 29 mars 2026 à 2 h → 3 h.
    let j = '2026-03-27';
    const vus: string[] = [];
    for (let i = 0; i < 5; i++) { vus.push(j); j = shiftDay(j, 1); }
    expect(vus).toEqual(['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31']);
  });

  it('une semaine à cheval sur le nouvel an ne fait qu’un point', () => {
    const tas: MasteryBreakdown = { decouvrir: 0, reprendre: 0, cours: 0, presque: 0, acquis: 100 };
    let r: Releve[] = [];
    for (const jour of ['2026-12-29', '2026-12-31', '2027-01-01', '2027-01-03']) {
      r = noteReleve(r, { ...tas, acquis: tas.acquis + r.length }, jour);
    }
    // Ces quatre jours forment UNE semaine ISO (2026-S53) : un seul point.
    expect(serie(r, 'semaine').length).toBe(1);
    // …mais deux mois, donc deux points au grain mois.
    expect(serie(r, 'mois').length).toBe(2);
  });

  it('deux lectures de l’écran le même jour ne font qu’un relevé', () => {
    const tas: MasteryBreakdown = { decouvrir: 10, reprendre: 2, cours: 5, presque: 1, acquis: 40 };
    let r = noteReleve([], tas, '2026-05-04');
    r = noteReleve(r, { ...tas, acquis: 41 }, '2026-05-04');
    expect(r.length).toBe(1);
    expect(r[0].acquis).toBe(41);
  });

  it('les relevés sont plafonnés à deux ans', () => {
    let r: Releve[] = [];
    let jour = '2024-01-01';
    for (let i = 0; i < 900; i++) {
      r = noteReleve(r, { decouvrir: 0, reprendre: 0, cours: 0, presque: 0, acquis: i }, jour);
      jour = shiftDay(jour, 1);
    }
    expect(r.length).toBe(730);
    expect(r[r.length - 1].acquis).toBe(899);
  });

  it('un mois sans ouvrir l’application laisse un trou, pas un zéro', () => {
    let j: Jalon[] = [];
    j = noteJalon(j, 120, '2026-01');
    j = noteJalon(j, 190, '2026-04');
    expect(courbe(j).map((x) => x.month)).toEqual(['2026-01', '2026-04']);
  });
});

/* ================================================================== *
 * 4. Le moteur de mémoire, sur la longueur
 * ================================================================== */
describe('banc d’essai — FSRS sur deux ans', () => {
  it('une carte toujours « bien » s’espace sans jamais reculer', () => {
    let p = emptyProgress('x', new Date(2026, 0, 1, 18));
    let horloge = new Date(2026, 0, 1, 18);
    let precedent = 0;
    const intervalles: number[] = [];
    for (let i = 0; i < 25; i++) {
      p = review(p, 'good', horloge);
      const jours = (p.due - horloge.getTime()) / 86_400_000;
      intervalles.push(Math.round(jours * 10) / 10);
      if (i > 4) expect(jours).toBeGreaterThanOrEqual(precedent * 0.6);
      precedent = jours;
      horloge = new Date(p.due + 3_600_000); // révisée une heure après l'échéance
    }
    // Plafond posé à 365 jours dans scheduler.ts : il doit tenir.
    expect(Math.max(...intervalles)).toBeLessThanOrEqual(366);
    expect(masteryOf(p)).toBe(PLEIN);
  });

  it('une carte ratée revient vite et son palier recule', () => {
    let p = emptyProgress('y', new Date(2026, 0, 1, 18));
    const t = new Date(2026, 0, 1, 18);
    p = review(p, 'easy', t);
    p = review(p, 'easy', new Date(p.due));
    const haut = masteryOf(p);
    const rate = review(p, 'again', new Date(p.due));
    expect(masteryOf(rate)).toBeLessThan(haut);
    expect(rate.due - p.due).toBeLessThan(86_400_000 * 2);
    expect(isDue(rate, rate.due + 1)).toBe(true);
    expect(isNew(rate)).toBe(false);
  });

  it('un mot jamais vu ne compte pas comme « à reprendre »', () => {
    const cartes = PAQUETS[3].cards;
    const b = deckMastery(cartes, {}, PAQUETS[3].themes).breakdown;
    expect(b.decouvrir).toBe(cartes.length);
    expect(b.reprendre).toBe(0);
  });
});
