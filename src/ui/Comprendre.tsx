import { useEffect, useState } from 'react';
import { tvp } from './ton';
import './comprendre.css';

/*
 * CHANTIER 371 — « JE NE COMPRENDS PAS » ET « COMPRENDRE MES PHRASES ».
 *
 * Pendant la révision, une phrase ou une expression qu'on ne comprend pas se
 * met de côté (pastille sur la carte retournée). Dans Parler, on en choisit
 * jusqu'à 3, et l'IA les explique en français. L'échange est gardé : une
 * phrase déjà expliquée rouvre son explication au lieu de revenir en attente.
 *
 * Tout est sur l'appareil (localStorage). La séance, elle, est aussi gardée
 * sur le serveur, dans « Mes conversations ».
 */
export interface PhraseAttente { id: string; en: string; fr: string; ajoute: number }
export interface Tour { role: 'user' | 'assistant'; content: string }
interface Comprise { en: string; fr: string; echange: Tour[]; le: number }

const ATTENTE = 'vocab:a-comprendre';
const COMPRISES = 'vocab:comprises';
export const EVT_COMPRENDRE = 'vocab:comprendre';

function lis<T>(cle: string, defaut: T): T {
  try { return (JSON.parse(localStorage.getItem(cle) ?? 'null') as T) ?? defaut; } catch { return defaut; }
}
function ecris(cle: string, v: unknown) {
  try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* rien */ }
  window.dispatchEvent(new Event(EVT_COMPRENDRE));
}

export const enAttente = (): PhraseAttente[] => lis<PhraseAttente[]>(ATTENTE, []);
const comprises = (): Record<string, Comprise> => lis<Record<string, Comprise>>(COMPRISES, {});

export function retireAttente(id: string) { ecris(ATTENTE, enAttente().filter((p) => p.id !== id)); }

/** Après une séance : chaque phrase traitée garde l'échange, et quitte la liste d'attente. */
export function noteComprises(phrases: PhraseAttente[], echange: Tour[]) {
  if (!phrases.length || echange.length < 2) return;
  const c = comprises();
  for (const p of phrases) c[p.id] = { en: p.en, fr: p.fr, echange: echange.slice(0, 60), le: Date.now() };
  ecris(COMPRISES, c);
  const ids = new Set(phrases.map((p) => p.id));
  ecris(ATTENTE, enAttente().filter((p) => !ids.has(p.id)));
}

function useVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const f = () => setV((x) => x + 1);
    window.addEventListener(EVT_COMPRENDRE, f);
    return () => window.removeEventListener(EVT_COMPRENDRE, f);
  }, []);
  return v;
}

/** L'échange gardé, en surimpression. */
function Explication({ id, c, onFermer }: { id: string; c: Comprise; onFermer: () => void }) {
  useVersion();
  /* CHANTIER 373 — on peut remettre la phrase dans la liste pour en rediscuter ; l'explication gardée reste. */
  const remise = enAttente().some((p) => p.id === id);
  return (
    <div className="cpr-fond" onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onFermer(); }}>
      <div className="cpr-feuille" role="dialog" aria-modal="true" aria-label="L’explication de cette phrase">
        <div className="cpr-tete">
          <span><b lang="en">{c.en}</b>{c.fr && <small>{c.fr}</small>}</span>
          <button className="cpr-fermer" aria-label="Fermer" onClick={onFermer}>✕</button>
        </div>
        <p className="cpr-date">Expliquée le {new Date(c.le).toLocaleDateString('fr-FR')}</p>
        <div className="cpr-fil">
          {c.echange.map((t, i) => <p key={i} className={t.role === 'user' ? 'moi' : 'ia'}>{t.content}</p>)}
        </div>
        <button
          className={`btn ghost cpr-remettre${remise ? ' on' : ''}`}
          aria-pressed={remise}
          onClick={() => {
            if (remise) retireAttente(id);
            else ecris(ATTENTE, [...enAttente(), { id, en: c.en, fr: c.fr, ajoute: Date.now() }]);
          }}
        >
          {remise ? '✓ Remise dans ma liste · annuler' : 'Remettre dans ma liste pour en rediscuter'}
        </button>
        {remise && <p className="hint cpr-remettre-note">{tvp('Tu la retrouveras dans Parler › Comprendre mes phrases.', 'Vous la retrouverez dans Parler › Comprendre mes phrases.')}</p>}
      </div>
    </div>
  );
}

/** La pastille de la carte retournée : met de côté, ou rouvre l'explication. */
export function PastilleComprendre({ id, en, fr }: { id: string; en: string; fr: string }) {
  useVersion();
  const [ouverte, setOuverte] = useState(false);
  const deja = comprises()[id];
  const attente = enAttente().some((p) => p.id === id);
  if (deja) {
    return (
      <>
        <button className="cpr-pastille vue" onClick={(e) => { e.stopPropagation(); setOuverte(true); }}>
          <i aria-hidden="true">?</i>Revoir l’explication
        </button>
        {ouverte && <Explication id={id} c={deja} onFermer={() => setOuverte(false)} />}
      </>
    );
  }
  return (
    <button
      className={`cpr-pastille${attente ? ' on' : ''}`}
      aria-pressed={attente}
      onClick={(e) => {
        e.stopPropagation();
        if (attente) retireAttente(id);
        else ecris(ATTENTE, [...enAttente(), { id, en, fr, ajoute: Date.now() }]);
      }}
    >
      {attente ? <>✓ Mise de côté</> : <><i aria-hidden="true">?</i>Je ne comprends pas</>}
    </button>
  );
}

/** Le choix des phrases à expliquer : jusqu'à 3, dans l'ordre où on les touche. */
export function ChoixComprendre({ choix, onChoix }: { choix: PhraseAttente[]; onChoix: (c: PhraseAttente[]) => void }) {
  useVersion();
  const liste = enAttente().slice().sort((a, b) => b.ajoute - a.ajoute);
  if (!liste.length) {
    return (
      <p className="hint">
        {tvp('Aucune phrase en attente. Pendant tes révisions, touche « ? Je ne comprends pas » sur une phrase retournée : elle viendra ici.', 'Aucune phrase en attente. Pendant vos révisions, touchez « ? Je ne comprends pas » sur une phrase retournée : elle viendra ici.')}
      </p>
    );
  }
  return (
    <>
      <div className="parler-tete">
        <p className="hint" style={{ margin: 0 }}>{tvp('Choisis jusqu’à 3 phrases, dans l’ordre où tu veux les voir.', 'Choisissez jusqu’à 3 phrases, dans l’ordre où vous voulez les voir.')}</p>
        <em className="parler-compte">{choix.length} / 3</em>
      </div>
      <div className="cpr-liste">
        {liste.map((p) => {
          const rang = choix.findIndex((x) => x.id === p.id);
          const on = rang >= 0;
          return (
            <div key={p.id} className={`cpr-ligne${on ? ' on' : ''}`}>
              <button
                className="cpr-ligne-main"
                aria-pressed={on}
                disabled={!on && choix.length >= 3}
                onClick={() => onChoix(on ? choix.filter((x) => x.id !== p.id) : [...choix, p])}
              >
                <span className="cpr-rang" aria-hidden="true">{on ? rang + 1 : ''}</span>
                <span className="cpr-txt"><b lang="en">{p.en}</b>{p.fr && <small>{p.fr}</small>}</span>
              </button>
              <button className="cpr-retirer" aria-label={`Retirer « ${p.en} » de la liste`} onClick={() => { onChoix(choix.filter((x) => x.id !== p.id)); retireAttente(p.id); }}>✕</button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function nombreEnAttente(): number { return enAttente().length; }
