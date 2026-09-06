/**
 * Tests de la fusion des réglages et du compteur du jour.
 * Ce sont des règles que rien ne signale quand elles se trompent :
 * l'utilisateur constate seulement que « ça ne suit pas ».
 */
import { describe, it, expect } from 'vitest';
import { mergeSettings, mergeCounters } from '../data/sync';
import { DEFAULT_SETTINGS, type DailyCounter, type Settings } from '../domain/types';

const AUJ = '2026-09-03';
const HIER = '2026-09-02';

function reglages(newPerDay: number, updatedAt: number): Settings {
  return { ...DEFAULT_SETTINGS, newPerDay, updatedAt };
}

describe('fusion des réglages', () => {
  it('le plus récemment modifié gagne, dans les deux sens', () => {
    const ancien = reglages(10, 1_000);
    const recent = reglages(40, 5_000);
    expect(mergeSettings(ancien, recent).newPerDay).toBe(40);
    expect(mergeSettings(recent, ancien).newPerDay).toBe(40);
  });

  it('un changement local récent n’est plus écrasé par le serveur', () => {
    // Le défaut d'origine : le serveur l'emportait toujours.
    const localModifieALInstant = reglages(30, Date.now());
    const serveurAncien = reglages(10, Date.now() - 100_000);
    expect(mergeSettings(localModifieALInstant, serveurAncien).newPerDay).toBe(30);
  });

  it('sans rien côté serveur, on garde le local', () => {
    const local = reglages(25, 500);
    expect(mergeSettings(local, null)).toBe(local);
  });

  it('à égalité d’horodatage, on garde le local', () => {
    expect(mergeSettings(reglages(10, 7_000), reglages(40, 7_000)).newPerDay).toBe(10);
  });

  it('des réglages jamais datés perdent face à un réglage daté', () => {
    const jamaisTouche = reglages(10, 0);
    const regleAilleurs = reglages(35, 1_000);
    expect(mergeSettings(jamaisTouche, regleAilleurs).newPerDay).toBe(35);
  });
});

describe('fusion du compteur du jour', () => {
  const c = (newSeen: number, reviewsDone: number, day = AUJ, synced?: DailyCounter['synced']): DailyCounter =>
    ({ day, newSeen, reviewsDone, synced });

  it('additionne le travail des deux appareils', () => {
    // 10 sur l'ordinateur, 5 sur le téléphone : l'objectif du jour est à 15.
    const r = mergeCounters(c(5, 3), c(10, 20), AUJ);
    expect(r.newSeen).toBe(15);
    expect(r.reviewsDone).toBe(23);
  });

  it('ne regonfle pas le compteur si l’on synchronise deux fois de suite', () => {
    const premiere = mergeCounters(c(5, 3), c(10, 20), AUJ);
    const seconde = mergeCounters(premiere, { day: AUJ, newSeen: premiere.newSeen, reviewsDone: premiere.reviewsDone }, AUJ);
    expect(seconde.newSeen).toBe(premiere.newSeen);
    expect(seconde.reviewsDone).toBe(premiere.reviewsDone);
  });

  it('ne compte que le travail fait depuis la dernière mise en commun', () => {
    const apres = mergeCounters(c(5, 3), c(10, 20), AUJ); // 15 / 23
    // Trois nouvelles cartes révisées ici, puis nouvelle synchronisation.
    const local: DailyCounter = { ...apres, newSeen: apres.newSeen + 3 };
    const r = mergeCounters(local, { day: AUJ, newSeen: 15, reviewsDone: 23 }, AUJ);
    expect(r.newSeen).toBe(18);
  });

  it('repart de zéro quand le serveur date d’hier', () => {
    const r = mergeCounters(c(4, 2), c(30, 90, HIER), AUJ);
    expect(r.newSeen).toBe(4);
    expect(r.reviewsDone).toBe(2);
  });

  it('adopte le compteur du serveur quand le local date d’hier', () => {
    const r = mergeCounters(c(30, 90, HIER), c(4, 2), AUJ);
    expect(r.newSeen).toBe(4);
    expect(r.day).toBe(AUJ);
  });

  it('rien nulle part : compteur vide daté d’aujourd’hui', () => {
    const r = mergeCounters(c(9, 9, HIER), c(9, 9, HIER), AUJ);
    expect(r).toEqual({ day: AUJ, newSeen: 0, reviewsDone: 0 });
  });

  it('premier appareil de la journée : rien à additionner', () => {
    const r = mergeCounters(c(7, 12), null, AUJ);
    expect(r.newSeen).toBe(7);
    expect(r.reviewsDone).toBe(12);
  });

  it('trois synchronisations d’affilée restent stables', () => {
    let local = c(6, 4);
    let serveur: DailyCounter = { day: AUJ, newSeen: 2, reviewsDone: 1 };
    for (let i = 0; i < 3; i++) {
      local = mergeCounters(local, serveur, AUJ);
      serveur = { day: AUJ, newSeen: local.newSeen, reviewsDone: local.reviewsDone };
    }
    expect(local.newSeen).toBe(8);
    expect(local.reviewsDone).toBe(5);
  });
});
