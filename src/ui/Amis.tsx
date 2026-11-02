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
 * Classement : les XP gagnés depuis lundi. Il repart à zéro chaque semaine,
 * pour qu'un nouveau venu puisse y figurer.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '../domain/types';
import { PRENOM_MAX, nettoiePrenom } from '../domain/types';
import type { Streak } from '../engine/streak';
import { supabase } from '../data/supabase';
import {
  activerAmis, demanderAmi, desactiverAmis, listeAmis, publieAmis, repondreAmi, retirerAmi,
  type Ami, type Reponse,
} from '../data/amis';
import { demande } from './Dialogue';
import { estAdulte, tv } from './ton';
import './amis.css';

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

  const relire = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setVue('sanscompte'); return; }
    try {
      await publieAmis(streak, nettoiePrenom(settings.prenom), acquis);
      const l = await listeAmis();
      setListe(l);
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

  return (
    <div className="amis">
      <div className="amis-code">
        <span className="amis-kicker">{tv(a, 'Mon code ami', 'Mon code ami')}</span>
        <b>{moi?.code}</b>
        <button className="btn ghost" onClick={() => moi?.code && void partager(moi.code)}>Partager</button>
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
