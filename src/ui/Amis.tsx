/**
 * CHANTIER 386 — « Mes amis », dans Mes progrès.
 *
 * On s'ajoute par un code ami de 6 caractères (K7M-2QP), donné de vive voix
 * ou par message. Pas de recherche par nom : personne ne peut trouver un
 * élève sans qu'il ait donné son code. Une demande s'accepte ou se refuse ;
 * un ami se retire à tout moment. Pas de messagerie.
 *
 * Avant 15 ans, un parent donne son accord sur le téléphone (son nom, une
 * case cochée) : il est enregistré avec sa date. Un adulte n'a rien à faire.
 *
 * CHANTIER 388 — un bouton « Copier » à côté de « Partager », et le champ
 * du code ami ne s'écrase plus contre le bouton « Ajouter ».
 *
 * CHANTIER 390 — les défis entre amis (maquette 390) : « Défier » sur la
 * ligne d'un ami, les défis du jour en tête de liste, le jeu en plein
 * écran (Duel.tsx). Règles et XP : supabase/390-duels.sql, barème 393.
 *
 * Classement : les XP gagnés depuis lundi. Il repart à zéro chaque semaine,
 * pour qu'un nouveau venu puisse y figurer.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '../domain/types';
import { PRENOM_MAX, classeRank, nettoiePrenom } from '../domain/types';
import type { Streak } from '../engine/streak';
import { supabase } from '../data/supabase';
import {
  activerAmis, demanderAmi, desactiverAmis, listeAmis, publieAmis, repondreAmi, retirerAmi,
  type Ami, type Reponse,
} from '../data/amis';
import { demande } from './Dialogue';
import { estAdulte, tv } from './ton';
import './amis.css';
/* CHANTIER 390 — les défis entre amis. */
import { todayKey } from '../engine/session';
import {
  DUELS_PAR_JOUR, MOTS_DUEL, SECONDES_DUEL, issue, jouerDuel, lancerDuel, listeDuels, tempsDit, tirerMotsDuel,
  type Coup, type Duel, type MotDuel,
} from '../data/duels';
import { DuelEnvoye, DuelJeu, DuelRecu, DuelResultat, Plein } from './Duel';

type Ecran = null
  | { t: 'recu'; d: Duel }
  | { t: 'relever'; d: Duel }
  | { t: 'lancer'; ami: { id: string; prenom: string }; mots: MotDuel[] }
  | { t: 'envoye'; prenom: string; coups: Coup[] }
  | { t: 'resultat'; d: Duel };

type Vue = 'charge' | 'sanscompte' | 'panne' | 'intro' | 'age' | 'parent' | 'actif';

const nb = (n: number) => n.toLocaleString('fr-FR');

export function Amis({ settings, streak, acquis }: { settings: Settings; streak: Streak; acquis: number }) {
  const a = estAdulte(settings);
  const [vue, setVue] = useState<Vue>('charge');
  const [liste, setListe] = useState<Ami[]>([]);
  const [prenom, setPrenom] = useState(nettoiePrenom(settings.prenom) ?? '');
  const [parent, setParent] = useState('');
  const [accord, setAccord] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ t: string; bon: boolean } | null>(null);
  const [gerer, setGerer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  /* 388 — « Copié » s'affiche deux secondes sur le bouton. */
  const [copie, setCopie] = useState(false);
  /* 390 — les défis. */
  const [duels, setDuels] = useState<Duel[]>([]);
  const [ecran, setEcran] = useState<Ecran>(null);
  const maClasse = classeRank(settings.classe);

  const relire = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setVue('sanscompte'); return; }
    try {
      await publieAmis(streak, nettoiePrenom(settings.prenom), acquis);
      const l = await listeAmis();
      setListe(l);
      /* 390 — sans le SQL 390, la liste des défis échoue : les amis marchent quand même. */
      try { setDuels(await listeDuels()); } catch { /* rien */ }
      setVue(l.find((x) => x.relation === 'moi')?.actif ? 'actif' : (v) => (v === 'charge' || v === 'actif' ? 'intro' : v));
    } catch {
      setVue('panne');
    }
  }, [streak, settings.prenom, acquis]);

  useEffect(() => { void relire(); }, [relire]);

  async function activer(quinzePlus: boolean, accordParent: string | null) {
    const p = nettoiePrenom(prenom);
    if (!p) return;
    setOccupe(true);
    try {
      /* Le prénom rejoint aussi les réglages (useStore écoute cet événement). */
      window.dispatchEvent(new CustomEvent('vocab:prenom', { detail: p }));
      await activerAmis(p, quinzePlus, accordParent);
      await publieAmis(streak, p, acquis);
      setListe(await listeAmis());
      setVue('actif');
    } catch {
      setVue('panne');
    } finally {
      setOccupe(false);
    }
  }

  function commencer() {
    if (!nettoiePrenom(prenom)) return;
    if (a) void activer(true, null);
    else setVue('age');
  }

  const PHRASES: Record<Reponse, [string, boolean]> = {
    envoyee: ['Demande envoyée. Elle s’affichera ici dès qu’elle sera acceptée.', true],
    ami: ['C’est fait : vous êtes amis.', true],
    inconnu: [tv(a, 'Aucun code ne correspond. Vérifie les 6 caractères.', 'Aucun code ne correspond. Vérifiez les 6 caractères.'), false],
    soi: [tv(a, 'C’est ton propre code.', 'C’est votre propre code.'), false],
    deja: ['Vous êtes déjà amis.', false],
    trop: ['Trop de demandes en attente. Attends qu’elles soient acceptées.', false],
    plein: ['La liste d’amis est pleine (100 au plus).', false],
    inactif: ['Les amis ne sont pas activés.', false],
    compte: ['Connexion nécessaire.', false],
  };

  async function ajouter() {
    if (!code.trim()) return;
    setOccupe(true);
    try {
      const r = await demanderAmi(code);
      const [t, bon] = PHRASES[r];
      setMessage({ t, bon });
      if (bon) setCode('');
      setListe(await listeAmis());
    } catch {
      setMessage({ t: 'Pas de réseau pour l’instant. Réessaie dans un moment.', bon: false });
    } finally {
      setOccupe(false);
    }
  }

  async function agir(fn: () => Promise<void>) {
    setOccupe(true);
    try { await fn(); setListe(await listeAmis()); } catch { setMessage({ t: 'Pas de réseau pour l’instant.', bon: false }); }
    finally { setOccupe(false); }
  }

  async function retirer(x: Ami) {
    if (!(await demande({ titre: `Retirer ${x.prenom} ?`, texte: 'Vous ne verrez plus vos progrès l’un de l’autre.', agir: 'Retirer', ton: 'danger' }))) return;
    void agir(() => retirerAmi(x.userId));
  }

  async function desactiver() {
    if (!(await demande({
      titre: 'Désactiver les amis ?',
      texte: tv(a, 'Tous tes amis et tes demandes seront effacés. Ton code ne marchera plus.', 'Tous vos amis et vos demandes seront effacés. Votre code ne marchera plus.'),
      agir: 'Désactiver', ton: 'danger',
    }))) return;
    setOccupe(true);
    try { await desactiverAmis(); setListe([]); setGerer(false); setVue('intro'); } catch { setVue('panne'); }
    finally { setOccupe(false); }
  }

  async function partager(c: string) {
    const texte = `Ajoute-moi comme ami dans Neuro Anglais avec mon code : ${c}`;
    try {
      if (navigator.share) { await navigator.share({ text: texte }); return; }
      await navigator.clipboard.writeText(c);
      setMessage({ t: 'Code copié.', bon: true });
    } catch { /* partage annulé */ }
  }

  async function copier(c: string) {
    try {
      await navigator.clipboard.writeText(c);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2000);
    } catch {
      setMessage({ t: 'Copie impossible sur cet appareil. Le code est affiché au-dessus.', bon: false });
    }
  }

  /* ---------------- 390 · les défis ---------------- */
  const auj = todayKey();
  const envoyes = duels.filter((d) => d.deMoi && d.jour === auj).length;
  const peutDefier = envoyes < DUELS_PAR_JOUR;
  const payesRestants = DUELS_PAR_JOUR - duels.filter((d) => !d.deMoi && d.joue && d.jour === auj && d.payeA).length;
  const completer = (c: Coup[]) => [...c, ...Array.from({ length: Math.max(0, MOTS_DUEL - c.length) }, () => ({ ok: false, ms: SECONDES_DUEL * 1000 }))];

  async function defier(x: { userId: string; prenom: string }) {
    if (!peutDefier) return;
    setOccupe(true);
    setMessage(null);
    try {
      const poses = duels.filter((d) => d.deMoi && d.jour === auj).flatMap((d) => d.mots);
      const mots = await tirerMotsDuel(poses);
      if (!mots.length) {
        setMessage({ t: tv(a, 'Il te faut au moins 5 mots déjà révisés pour lancer un défi.', 'Il vous faut au moins 5 mots déjà révisés pour lancer un défi.'), bon: false });
        return;
      }
      setEcran({ t: 'lancer', ami: { id: x.userId, prenom: x.prenom }, mots });
    } finally {
      setOccupe(false);
    }
  }

  async function finLancer(ami: { id: string; prenom: string }, mots: MotDuel[], coups: Coup[]) {
    try {
      const r = await lancerDuel(ami.id, mots, coups, maClasse);
      if (r !== 'ok') {
        setEcran(null);
        setMessage({ t: r === 'trop' ? '3 défis déjà envoyés aujourd’hui. Nouveaux défis demain.' : 'Ce défi n’a pas pu partir.', bon: false });
        return;
      }
      setEcran({ t: 'envoye', prenom: ami.prenom, coups });
      try { setDuels(await listeDuels()); } catch { /* rien */ }
    } catch {
      setEcran(null);
      setMessage({ t: 'Pas de réseau : le défi n’est pas parti.', bon: false });
    }
  }

  async function finRelever(d: Duel, coups: Coup[]) {
    try {
      const r = await jouerDuel(d.id, completer(coups), maClasse);
      const l = await listeDuels();
      setDuels(l);
      const maj = l.find((x) => x.id === d.id);
      if (maj?.joue) { setEcran({ t: 'resultat', d: maj }); return; }
      setEcran(null);
      setMessage({ t: r === 'expire' ? 'Ce défi a expiré à minuit.' : 'Ce défi n’a pas pu être enregistré.', bon: false });
    } catch {
      setEcran(null);
      setMessage({ t: 'Pas de réseau : le défi n’est pas enregistré.', bon: false });
    }
  }

  async function quitterJeu(e: Ecran, coups: Coup[]) {
    if (!e || (e.t !== 'lancer' && e.t !== 'relever')) return;
    if (!coups.length) { setEcran(e.t === 'relever' ? { t: 'recu', d: e.d } : null); return; }
    const oui = await demande({
      titre: 'Abandonner le défi ?',
      texte: e.t === 'lancer' ? 'Il ne sera pas envoyé.' : 'Les mots restants comptent ratés, et le défi est terminé.',
      agir: 'Abandonner', garder: 'Continuer le défi', ton: 'prudent',
    });
    if (!oui) return;
    if (e.t === 'lancer') setEcran(null);
    else void finRelever(e.d, coups);
  }

  if (vue === 'charge') return <p className="hint">Chargement…</p>;

  if (vue === 'sanscompte') {
    return (
      <p className="hint">
        {tv(a,
          'Les amis demandent un compte. Connecte-toi dans Réglages › Moi › Connexion, puis reviens ici.',
          'Les amis demandent un compte. Connectez-vous dans Réglages › Moi › Connexion, puis revenez ici.')}
      </p>
    );
  }

  if (vue === 'panne') {
    return (
      <div className="amis">
        <p className="hint">Les amis ne sont pas joignables pour l’instant.</p>
        <button className="btn ghost" onClick={() => { setVue('charge'); void relire(); }}>Réessayer</button>
      </div>
    );
  }

  if (vue === 'intro') {
    return (
      <div className="amis">
        <p className="amis-intro">
          {tv(a,
            'Ajoute des camarades avec leur code ami, et comparez vos progrès chaque semaine.',
            'Ajoutez des collègues ou des proches avec leur code ami, et comparez vos progrès chaque semaine.')}
        </p>
        <ul className="amis-partage">
          <li>{tv(a, 'Tes amis voient : ton prénom ou pseudo, ta série, tes XP de la semaine, tes mots acquis et ton défi éclair du jour.', 'Vos amis voient : votre prénom ou pseudo, votre série, vos XP de la semaine, vos mots acquis et votre défi éclair du jour.')}</li>
          <li>{tv(a, 'Ils ne voient jamais tes conversations, tes mots ni ton adresse e-mail.', 'Ils ne voient jamais vos conversations, vos mots ni votre adresse e-mail.')}</li>
          <li>Pas de messages entre amis.</li>
        </ul>
        <label className="amis-label" htmlFor="amis-prenom">{tv(a, 'Le nom que verront tes amis', 'Le nom que verront vos amis')}</label>
        <input
          id="amis-prenom" className="amis-champ" type="text" value={prenom} maxLength={PRENOM_MAX}
          onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom ou pseudo" autoComplete="nickname"
        />
        <button className="btn" disabled={!nettoiePrenom(prenom) || occupe} onClick={commencer}>Activer les amis</button>
      </div>
    );
  }

  if (vue === 'age') {
    return (
      <div className="amis">
        <p className="amis-question">As-tu 15 ans ou plus ?</p>
        <div className="amis-choix">
          <button className="btn" disabled={occupe} onClick={() => void activer(true, null)}>Oui</button>
          <button className="btn" onClick={() => setVue('parent')}>Non</button>
        </div>
        <button className="amis-lien" onClick={() => setVue('intro')}>‹ Retour</button>
      </div>
    );
  }

  if (vue === 'parent') {
    return (
      <div className="amis">
        <p className="amis-kicker">À remplir par ton parent</p>
        <p className="amis-intro">
          Avant 15 ans, un parent ou responsable légal doit donner son accord pour que son enfant ajoute des amis.
        </p>
        <ul className="amis-partage">
          <li>Seuls les camarades à qui votre enfant donne son code peuvent l’ajouter. Il accepte ou refuse chaque demande.</li>
          <li>Ses amis voient son prénom ou pseudo, sa série, ses XP de la semaine, ses mots acquis et son défi du jour.</li>
          <li>Aucune conversation, aucun message, aucune adresse n’est partagé.</li>
          <li>Les amis se désactivent à tout moment, depuis cet écran.</li>
        </ul>
        <label className="amis-label" htmlFor="amis-parent">Votre nom</label>
        <input
          id="amis-parent" className="amis-champ" type="text" value={parent} maxLength={60}
          onChange={(e) => setParent(e.target.value)} placeholder="Prénom et nom du parent" autoComplete="name"
        />
        <label className="amis-case">
          <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} />
          <span>Je suis le parent ou le responsable légal, et j’autorise mon enfant à utiliser les amis.</span>
        </label>
        <button className="btn" disabled={!accord || parent.trim().length < 3 || occupe} onClick={() => void activer(false, parent.trim())}>
          J’autorise
        </button>
        <button className="amis-lien" onClick={() => setVue('age')}>‹ Retour</button>
      </div>
    );
  }

  /* ---------------- actif ---------------- */
  const moi = liste.find((x) => x.relation === 'moi');
  const recues = liste.filter((x) => x.relation === 'recue');
  const envoyees = liste.filter((x) => x.relation === 'envoyee');
  const classement = liste
    .filter((x) => x.relation === 'moi' || x.relation === 'ami')
    .sort((x, y) => y.xpSemaine - x.xpSemaine || y.mots - x.mots);
  const seul = classement.length <= 1;
  const moiNom = moi?.prenom ?? nettoiePrenom(settings.prenom) ?? 'Moi';
  const aRelever = duels.filter((d) => !d.deMoi && !d.joue && d.jour === auj);
  const enAttente = duels.filter((d) => d.deMoi && !d.joue && d.jour === auj);
  const finis = duels.filter((d) => d.joue && d.jour === auj);
  const estAmi = (id: string) => liste.some((x) => x.userId === id && x.relation === 'ami');

  const plein = ecran && (
    <Plein>
      {ecran.t === 'recu' && (
        <DuelRecu duel={ecran.d} moi={moiNom} maClasse={maClasse} adulte={a} restants={payesRestants}
          onJouer={() => setEcran({ t: 'relever', d: ecran.d })} onPlusTard={() => setEcran(null)} />
      )}
      {ecran.t === 'relever' && (
        <DuelJeu key={ecran.d.id} mots={ecran.d.mots} moi={moiNom} adulte={a}
          adversaire={{ prenom: ecran.d.prenom, coups: ecran.d.coupsDe }}
          onFin={(c) => void finRelever(ecran.d, c)} onQuitter={(c) => void quitterJeu(ecran, c)} />
      )}
      {ecran.t === 'lancer' && (
        <DuelJeu key={ecran.mots.map((m) => m.en).join('|')} mots={ecran.mots} moi={moiNom} adulte={a} adversaire={null}
          onFin={(c) => void finLancer(ecran.ami, ecran.mots, c)} onQuitter={(c) => void quitterJeu(ecran, c)} />
      )}
      {ecran.t === 'envoye' && <DuelEnvoye prenom={ecran.prenom} coups={ecran.coups} adulte={a} onRetour={() => setEcran(null)} />}
      {ecran.t === 'resultat' && (
        <DuelResultat duel={ecran.d} moi={moiNom} adulte={a}
          peutRevanche={peutDefier && estAmi(ecran.d.autre)}
          onRevanche={() => { const d = ecran.d; setEcran(null); void defier({ userId: d.autre, prenom: d.prenom }); }}
          onRetour={() => setEcran(null)} />
      )}
    </Plein>
  );

  return (
    <div className="amis">
      {plein}
      <div className="amis-code">
        <span className="amis-kicker">{tv(a, 'Mon code ami', 'Mon code ami')}</span>
        <b>{moi?.code}</b>
        <div className="amis-code-actions">
          <button className="btn ghost" onClick={() => moi?.code && void copier(moi.code)} aria-live="polite">{copie ? 'Copié ✓' : 'Copier'}</button>
          <button className="btn ghost" onClick={() => moi?.code && void partager(moi.code)}>Partager</button>
        </div>
      </div>

      <div className="amis-ajout">
        <input
          className="amis-champ" type="text" value={code} maxLength={8}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setMessage(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') void ajouter(); }}
          placeholder="Code d’un ami" aria-label="Code d’un ami"
          autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="send"
        />
        <button className="btn" disabled={!code.trim() || occupe} onClick={() => void ajouter()}>Ajouter</button>
      </div>
      {message && <p className={`amis-message${message.bon ? ' bon' : ''}`} aria-live="polite">{message.t}</p>}

      {/* CHANTIER 390 — les défis du jour. */}
      {(aRelever.length > 0 || enAttente.length > 0 || finis.length > 0) && (
        <section className="amis-bloc">
          <div className="amis-bloc-tete">
            <p className="amis-kicker">Défis du jour</p>
            <small className="hint" style={{ margin: 0 }}>{envoyes}/{DUELS_PAR_JOUR} envoyés</small>
          </div>
          {aRelever.map((d) => (
            <div key={d.id} className="amis-defi recu">
              <span><b>{d.prenom} {tv(a, 'te', 'vous')} défie</b><small>{d.scoreDe}/{MOTS_DUEL} en {tempsDit(d.tempsDe)} · expire à minuit</small></span>
              <button className="btn" onClick={() => setEcran({ t: 'recu', d })}>Relever</button>
            </div>
          ))}
          {enAttente.map((d) => (
            <div key={d.id} className="amis-defi">
              <span><b>Défi envoyé à {d.prenom}</b><small>{d.scoreDe}/{MOTS_DUEL} en {tempsDit(d.tempsDe)} · en attente</small></span>
            </div>
          ))}
          {finis.map((d) => {
            const r = issue(d);
            return (
              <button key={d.id} className="amis-defi" onClick={() => setEcran({ t: 'resultat', d })}>
                <span><b>Contre {d.prenom}</b><small>{d.deMoi ? 'Défi lancé' : 'Défi relevé'}</small></span>
                <em className={r ?? ''}>{r === 'gagne' ? 'Gagné' : r === 'nul' ? 'Nul' : 'Perdu'} · +{d.xpMoi} XP</em>
              </button>
            );
          })}
        </section>
      )}

      {recues.length > 0 && (
        <section className="amis-bloc">
          <p className="amis-kicker">Demandes reçues</p>
          {recues.map((x) => (
            <div key={x.userId} className="amis-demande">
              <b>{x.prenom}</b>
              <div className="amis-choix">
                <button className="btn" disabled={occupe} onClick={() => void agir(() => repondreAmi(x.userId, true))}>Accepter</button>
                <button className="btn ghost" disabled={occupe} onClick={() => void agir(() => repondreAmi(x.userId, false))}>Refuser</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="amis-bloc">
        <div className="amis-bloc-tete">
          <p className="amis-kicker">Classement de la semaine</p>
          {!seul && <button className="amis-lien" onClick={() => setGerer((g) => !g)}>{gerer ? 'Terminé' : 'Gérer'}</button>}
        </div>
        <ol className="amis-classement">
          {classement.map((x, i) => (
            <li key={x.userId} className={x.relation === 'moi' ? 'moi' : ''}>
              <span className="amis-place">{i + 1}</span>
              <span className="amis-nom">
                <b>{x.relation === 'moi' ? `${x.prenom} (moi)` : x.prenom}</b>
                <small>
                  {x.serie ? `${x.serie} j de série` : 'pas de série'} · {nb(x.mots)} mots acquis · {x.defi === null ? 'défi à faire' : `défi ${x.defi}/5`}
                </small>
              </span>
              {/* 390 — défier un ami : 3 défis envoyés par jour. */}
              {!gerer && x.relation === 'ami' && (
                <button className="amis-defier" disabled={!peutDefier || occupe} onClick={() => void defier(x)}
                  aria-label={`Défier ${x.prenom}`}>Défier</button>
              )}
              {gerer && x.relation !== 'moi'
                ? <button className="amis-retirer" disabled={occupe} onClick={() => void retirer(x)}>Retirer</button>
                : <span className="amis-xp"><b>{nb(x.xpSemaine)}</b><small>XP</small></span>}
            </li>
          ))}
        </ol>
        {seul && (
          <p className="hint">
            {tv(a,
              'Personne encore. Donne ton code à un camarade, ou tape le sien au-dessus.',
              'Personne encore. Donnez votre code, ou tapez celui d’un proche au-dessus.')}
          </p>
        )}
        <p className="hint">XP gagnés depuis lundi. Le classement repart à zéro chaque semaine.</p>
        {!seul && (
          <p className="hint">
            {tv(a,
              'Défier : 5 mots que tu connais, 20 s par mot. Gagner rapporte 5 XP (10 contre une classe au-dessus), un nul ou une défaite 2, et lancer un défi relevé 2 de plus. 3 défis envoyés et 3 relevés par jour. Tes révisions ne changent pas.',
              'Défier : 5 mots que vous connaissez, 20 s par mot. Gagner rapporte 5 XP (10 contre une classe au-dessus), un nul ou une défaite 2, et lancer un défi relevé 2 de plus. 3 défis envoyés et 3 relevés par jour. Vos révisions ne changent pas.')}
          </p>
        )}
      </section>

      {envoyees.length > 0 && (
        <section className="amis-bloc">
          <p className="amis-kicker">En attente</p>
          {envoyees.map((x) => (
            <div key={x.userId} className="amis-demande">
              <span>{x.prenom}</span>
              <button className="amis-lien" disabled={occupe} onClick={() => void agir(() => retirerAmi(x.userId))}>Annuler</button>
            </div>
          ))}
        </section>
      )}

      <button className="amis-lien amis-desactiver" disabled={occupe} onClick={() => void desactiver()}>Désactiver les amis</button>
    </div>
  );
}
