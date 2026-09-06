/**
 * Session et synchronisation.
 *
 * La connexion est facultative : sans compte, l'application fonctionne
 * exactement comme avant, en local. Se connecter ajoute la sauvegarde
 * en ligne et l'accès aux paquets achetés.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, signInWithGoogle, signOut, type Session } from '../data/supabase';
import { syncAll, type SyncReport } from '../data/sync';

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
      const report = await syncAll(userId);
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
      if (event === 'SIGNED_IN' && next) void runSync();
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
      setSync({ status: 'error', message: (e as Error).message });
    }
  }, []);

  const logOut = useCallback(async () => {
    await signOut();
    setSession(null);
  }, []);

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
