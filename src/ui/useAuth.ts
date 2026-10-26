/**
 * Session et synchronisation.
 *
 * La connexion est facultative : sans compte, l'application fonctionne
 * exactement comme avant, en local. Se connecter ajoute la sauvegarde
 * en ligne et l'accès aux paquets achetés.
 */
import { mesure } from '../data/mesures';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, signInWithGoogle, signOut, type Session } from '../data/supabase';
import { syncAll, type SyncReport } from '../data/sync';
import { phraseErreur } from '../data/messageErreur';
import { repository } from '../data/repository';
import { oubliePersonne, visiteARefaire } from '../data/appareil';

/*
 * CHANTIER 327 — À QUI SONT LES DONNÉES DE CET APPAREIL ?
 *
 * Les données locales n'étaient rattachées à aucun compte : se connecter avec
 * un second compte Google affichait la progression du premier, et la
 * synchronisation la recopiait dans le second. On retient maintenant le
 * compte propriétaire. Si un AUTRE compte se connecte, l'appareil est vidé
 * avant de synchroniser : il se remplit ensuite avec les données en ligne du
 * nouveau compte. Une progression faite sans compte (aucun propriétaire) est
 * toujours rattachée au premier compte qui se connecte, comme avant.
 */
const PROPRIETAIRE = 'vocab:proprietaire';

/** 338 — l'appareil vient d'être vidé pour un autre compte (survit au rechargement). */
const CHANGE_COMPTE = 'vocab:compte-change';

/** Vrai si un AUTRE compte vient de prendre l'appareil (données locales vidées). */
async function rattache(userId: string): Promise<boolean> {
  const avant = localStorage.getItem(PROPRIETAIRE);
  const change = !!avant && avant !== userId;
  if (change) {
    await repository.importAll({});
    /*
     * 340 — listes VIDES, et non absentes. Absentes, le démarrage croyait à
     * une très ancienne version (« tout paquet présent est possédé ») et
     * mettait en jeu TOUT le catalogue téléchargé : les 11 paquets de lilou.
     */
    await repository.saveInstalled([]);
    await repository.saveActive([]);
    await repository.saveDeckJournal({});
    /* 334 — le prénom et le profil de la personne d'avant partent aussi. */
    oubliePersonne();
  }
  localStorage.setItem(PROPRIETAIRE, userId);
  return change;
}

/*
 * 334 — un compte tout neuf (aucune carte révisée en ligne) qui prend
 * l'appareil d'un autre : la première connexion guidée se relance. Un
 * compte déjà utilisé ailleurs retrouve ses données, sans visite.
 */
async function compteNeuf(userId: string): Promise<boolean> {
  const { count, error } = await supabase.from('progress').select('user_id', { count: 'exact', head: true }).eq('user_id', userId);
  return !error && count === 0;
}

export type SyncState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; at: number; report: SyncReport }
  | { status: 'error'; message: string };

export interface Auth {
  session: Session | null;
  email: string | null;
  loading: boolean;
  sync: SyncState;
  signIn(): Promise<void>;
  logOut(): Promise<void>;
  runSync(): Promise<void>;
}

export function useAuth(onDataChanged: () => void): Auth {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState<SyncState>({ status: 'idle' });

  /*
   * Le rappel est gardé dans une référence, pas dans les dépendances.
   * Sinon : la synchronisation recharge les paquets, ce qui recrée le
   * rappel, donc la fonction de synchronisation, donc relance l'effet —
   * une boucle sans fin qui laisse l'écran sur « Synchronisation… ».
   */
  const changed = useRef(onDataChanged);
  changed.current = onDataChanged;

  /** Évite deux synchronisations simultanées (clic pendant l'automatique). */
  const busy = useRef(false);

  const runSync = useCallback(async () => {
    if (busy.current) return;

    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    busy.current = true;
    setSync({ status: 'running' });
    try {
      /*
       * CHANTIER 338 — un autre compte prend l'appareil : on vide, puis on
       * RECHARGE avant de synchroniser. Sans ça, les paquets encore en
       * mémoire (ceux du compte d'avant) étaient réécrits sur l'appareil
       * puis envoyés au nouveau compte : 11 paquets sur un compte créé le
       * jour même.
       */
      if (await rattache(userId)) {
        try { sessionStorage.setItem(CHANGE_COMPTE, '1'); } catch { /* rien */ }
        /*
         * 339 — sans les paramètres de retour de Google (?code=…, #access_token=…).
         * reload() les gardait : au rechargement, la connexion était rejouée avec
         * un code déjà utilisé, elle échouait, et la session se perdait.
         */
        window.location.replace(window.location.origin + window.location.pathname);
        return;
      }
      let change = false;
      try { change = sessionStorage.getItem(CHANGE_COMPTE) === '1'; sessionStorage.removeItem(CHANGE_COMPTE); } catch { /* rien */ }
      const report = await syncAll(userId);
      if (change && !report.error && (await compteNeuf(userId))) visiteARefaire();
      if (report.error) {
        setSync({ status: 'error', message: report.error });
        return;
      }
      setSync({ status: 'done', at: Date.now(), report });
      changed.current();
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) void runSync();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // Première synchronisation juste après la connexion.
      if (event === 'SIGNED_IN' && next) { void runSync(); mesure('compte'); }
      if (event === 'SIGNED_OUT') setSync({ status: 'idle' });
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
    // runSync est stable (aucune dépendance) : cet effet ne doit tourner
    // qu'au montage, sous peine de relancer la synchronisation en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le retour du réseau est le bon moment pour rattraper.
  useEffect(() => {
    function onOnline() {
      if (session) void runSync();
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [session, runSync]);

  const signIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      setSync({ status: 'error', message: phraseErreur(e, 'connexion') });
    }
  }, []);

  /* 327 — on enregistre en ligne les dernières révisions avant de partir :
     si un autre compte se connecte ensuite, l'appareil sera vidé. */
  const logOut = useCallback(async () => {
    await runSync().catch(() => undefined);
    await signOut();
    setSession(null);
  }, [runSync]);

  return {
    session,
    email: session?.user.email ?? null,
    loading,
    sync,
    signIn,
    logOut,
    runSync,
  };
}
