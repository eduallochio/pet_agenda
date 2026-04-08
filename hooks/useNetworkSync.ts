import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadToSupabase } from '../services/syncService';
import { supabase } from '../services/supabase';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline' | 'unauthenticated';

const LAST_SYNC_KEY = 'lastSyncedAt';

export function useNetworkSync() {
  const [status, setStatus] = useState<SyncStatus>('pending');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const isSyncing = useRef(false);

  const trySync = async () => {
    if (isSyncing.current) return;

    // Verifica se está logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setStatus('unauthenticated');
      return;
    }

    isSyncing.current = true;
    setStatus('syncing');
    try {
      await uploadToSupabase();
      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNC_KEY, now);
      setLastSyncedAt(now);
      setStatus('synced');
    } catch {
      setStatus('pending');
    } finally {
      isSyncing.current = false;
    }
  };

  useEffect(() => {
    // Carrega último sync salvo
    AsyncStorage.getItem(LAST_SYNC_KEY).then(v => {
      if (v) setLastSyncedAt(v);
    });

    // Monitora conexão
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        trySync();
      } else {
        setStatus('offline');
      }
    });

    return () => unsubscribe();
  }, []);

  return { status, lastSyncedAt };
}
