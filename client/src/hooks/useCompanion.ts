import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import type { ApiResponse, CompanionSnapshot, CompanionAction, CompanionRosterSummary, CompanionSetup, PublicCompanion } from '../../../shared/contracts.js';
import type { CompanionActionValues } from '../components/companion/types.js';

export default function useCompanion() {
  const [data, setData] = useState<CompanionSnapshot | null>(null);
  const [roster, setRoster] = useState<CompanionRosterSummary[]>([]);
  const [companionId, setCompanionId] = useState(() => localStorage.getItem('yuu-mi:active-companion') || 'joe-and-focus');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const alive = useRef(true);
  const inFlight = useRef(false);
  const pendingOperation = useRef<{ signature: string; id: string } | null>(null);
  const pendingCreate = useRef<{ signature: string; id: string } | null>(null);
  const apply = useCallback((next: CompanionSnapshot) => {
    if (alive.current) setData((current) => !current || next.companion.revision >= current.companion.revision ? next : current);
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const [response, rosterResponse] = await Promise.all([
        api.get<ApiResponse<CompanionSnapshot>>('/companions', { params: { id: companionId }, signal }),
        api.get<ApiResponse<{ companions: typeof roster }>>('/companions/roster', { signal })
      ]);
      apply(response.data.data);
      if (alive.current) setRoster(rosterResponse.data.data.companions);
      if (alive.current && !inFlight.current) setError('');
    } catch (err) {
      if (alive.current && err.code !== 'ERR_CANCELED') setError(err.response?.data?.error?.message || 'Could not reach your companion. Try refreshing.');
    }
  }, [apply, companionId]);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    refresh(controller.signal);
    const timer = setInterval(() => { if (!document.hidden && !inFlight.current) refresh(controller.signal); }, 12000);
    const onVisible = () => { if (!document.hidden && !inFlight.current) refresh(controller.signal); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive.current = false; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);

  async function act(action: CompanionAction['action'], values: CompanionActionValues = {}) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(action);
    setError('');
    const signature = JSON.stringify({ action, ...values });
    if (pendingOperation.current?.signature !== signature) pendingOperation.current = { signature, id: crypto.randomUUID() };
    try {
      const response = await api.post<ApiResponse<CompanionSnapshot>>('/companions/actions', { action, ...values, companionId, operationId: pendingOperation.current.id });
      apply(response.data.data);
      pendingOperation.current = null;
      return true;
    } catch (err) {
      if (alive.current) setError(err.response?.data?.error?.message || 'Could not save this moment. Try again; your draft is still here.');
      return false;
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy('');
    }
  }
  const selectCompanion = (id: string) => { localStorage.setItem('yuu-mi:active-companion', id); setCompanionId(id); };
  async function createCompanion(setup: CompanionSetup) {
    if (inFlight.current) return false;
    inFlight.current = true; setBusy('create'); setError('');
    const signature = JSON.stringify(setup);
    if (pendingCreate.current?.signature !== signature) pendingCreate.current = { signature, id: crypto.randomUUID() };
    try {
      const response = await api.post<ApiResponse<{ id: string; companion: PublicCompanion }>>('/companions/roster', { ...setup, operationId: pendingCreate.current.id });
      selectCompanion(response.data.data.id);
      pendingCreate.current = null;
      return true;
    } catch (err) { if (alive.current) setError(err.response?.data?.error?.message || 'Could not hatch a new companion.'); return false; }
    finally { inFlight.current = false; if (alive.current) setBusy(''); }
  }
  return { ...data, roster, companionId, selectCompanion, createCompanion, error, busy, act, refresh };
}
