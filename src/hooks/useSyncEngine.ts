import { useEffect, useState } from 'react';
import { syncEngine, SyncEngineStatus } from '../services/syncEngine';

export function useSyncEngine() {
  const [status, setStatus] = useState<SyncEngineStatus>(syncEngine.getStatus());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus({ ...newStatus });
    });
    return unsubscribe;
  }, []);

  const triggerSync = async () => {
    return await syncEngine.triggerSync();
  };

  return {
    ...status,
    triggerSync
  };
}
