import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { mergeCompanionSnapshot, operationKey, readCompanionRoster, readCompanionSnapshot, readRememberedCompanion, rememberCompanion, resolveCompanionId, type CompanionSnapshots } from '../lib/companionState.js';
import type { ApiResponse, CompanionSnapshot, CompanionAction, CompanionRosterSummary, CompanionSetup, PublicCompanion } from '../../../shared/contracts.js';
import type { CompanionActionValues } from '../components/companion/types.js';

type PendingOperation = { signature: string; id: string };
const browserStorage = () => {
  try { return globalThis.localStorage; } catch { return undefined; }
};

export default function useCompanion() {
  const [snapshots, setSnapshots] = useState<CompanionSnapshots>({});
  const [roster, setRoster] = useState<CompanionRosterSummary[]>([]);
  const [companionId, setCompanionId] = useState(() => readRememberedCompanion(browserStorage()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rosterError, setRosterError] = useState('');
  const [busyById, setBusyById] = useState<Record<string, string>>({});
  const mounted = useRef(true);
  const inFlight = useRef(new Set<string>());
  const pendingOperations = useRef(new Map<string, PendingOperation>());
  const pendingCreate = useRef<PendingOperation | null>(null);
  const selectedId = useRef(companionId);
  const refreshSequence = useRef(0);
  selectedId.current = companionId;

  const apply = useCallback((requestedId: string, next: CompanionSnapshot) => {
    if (mounted.current) setSnapshots((current) => mergeCompanionSnapshot(current, requestedId, next));
  }, []);

  const selectCompanion = useCallback((id: string) => {
    selectedId.current = id;
    rememberCompanion(browserStorage(), id);
    setCompanionId(id);
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const requestedId = selectedId.current;
    const sequence = ++refreshSequence.current;
    const [detailResult, rosterResult] = await Promise.allSettled([
      api.get<ApiResponse<CompanionSnapshot>>('/companions', { params: { id: requestedId }, signal }),
      api.get<ApiResponse<{ companions: CompanionRosterSummary[] }>>('/companions/roster', { signal }),
    ]);
    if (!mounted.current) return;

    if (detailResult.status === 'fulfilled') {
      const snapshot = readCompanionSnapshot(detailResult.value.data.data);
      if (snapshot) {
        apply(requestedId, snapshot);
        if (!inFlight.current.has(requestedId)) setErrors((current) => ({ ...current, [requestedId]: '' }));
      } else if (sequence === refreshSequence.current) {
        setErrors((current) => ({ ...current, [requestedId]: 'The companion response was incomplete. Try refreshing.' }));
      }
    } else {
      const requestError = detailResult.reason as { code?: string; response?: { data?: { error?: { message?: string } } } };
      if (sequence === refreshSequence.current && requestError.code !== 'ERR_CANCELED') {
        setErrors((current) => ({ ...current, [requestedId]: requestError.response?.data?.error?.message || 'Could not reach your companion. Try refreshing.' }));
      }
    }

    if (rosterResult.status === 'fulfilled') {
      const nextRoster = readCompanionRoster(rosterResult.value.data.data);
      if (nextRoster && sequence === refreshSequence.current) {
        setRoster(nextRoster);
        setRosterError('');
        if (selectedId.current === requestedId) {
          const resolvedId = resolveCompanionId(requestedId, nextRoster);
          if (resolvedId !== requestedId) selectCompanion(resolvedId);
        }
      } else if (!nextRoster && sequence === refreshSequence.current) {
        setRosterError('Could not refresh the companion list.');
      }
    } else {
      const requestError = rosterResult.reason as { code?: string };
      if (sequence === refreshSequence.current && requestError.code !== 'ERR_CANCELED') setRosterError('Could not refresh the companion list.');
    }
  }, [apply, selectCompanion]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => { if (!document.hidden && !inFlight.current.has(companionId)) void refresh(controller.signal); }, 12000);
    const onVisible = () => { if (!document.hidden && !inFlight.current.has(companionId)) void refresh(controller.signal); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [companionId, refresh]);

  async function act(action: CompanionAction['action'], values: CompanionActionValues = {}) {
    const targetId = selectedId.current;
    if (inFlight.current.has(targetId)) return false;
    inFlight.current.add(targetId);
    setBusyById((current) => ({ ...current, [targetId]: action }));
    setErrors((current) => ({ ...current, [targetId]: '' }));
    const signature = operationKey(targetId, action, values);
    const previous = pendingOperations.current.get(targetId);
    if (previous?.signature !== signature) pendingOperations.current.set(targetId, { signature, id: crypto.randomUUID() });
    const pending = pendingOperations.current.get(targetId)!;
    try {
      const response = await api.post<ApiResponse<CompanionSnapshot>>('/companions/actions', { action, ...values, companionId: targetId, operationId: pending.id });
      apply(targetId, response.data.data);
      if (pendingOperations.current.get(targetId)?.id === pending.id) pendingOperations.current.delete(targetId);
      return true;
    } catch (err) {
      const requestError = err as { response?: { data?: { error?: { message?: string } } } };
      if (mounted.current) setErrors((current) => ({ ...current, [targetId]: requestError.response?.data?.error?.message || 'Could not save this moment. Try again; your draft is still here.' }));
      return false;
    } finally {
      inFlight.current.delete(targetId);
      if (mounted.current) setBusyById((current) => ({ ...current, [targetId]: '' }));
    }
  }

  async function createCompanion(setup: CompanionSetup) {
    const createKey = '__create__';
    if (inFlight.current.has(createKey)) return false;
    inFlight.current.add(createKey);
    setBusyById((current) => ({ ...current, [createKey]: 'create' }));
    const signature = JSON.stringify(setup);
    if (pendingCreate.current?.signature !== signature) pendingCreate.current = { signature, id: crypto.randomUUID() };
    try {
      const response = await api.post<ApiResponse<{ id: string; companion: PublicCompanion }>>('/companions/roster', { ...setup, operationId: pendingCreate.current.id });
      const id = response.data.data.id;
      apply(id, { companion: response.data.data.companion, capabilities: snapshots[companionId]?.capabilities || { chat: false, portraits: false } });
      selectCompanion(id);
      pendingCreate.current = null;
      return true;
    } catch (err) {
      const requestError = err as { response?: { data?: { error?: { message?: string } } } };
      if (mounted.current) setErrors((current) => ({ ...current, [createKey]: requestError.response?.data?.error?.message || 'Could not hatch a new companion.' }));
      return false;
    } finally {
      inFlight.current.delete(createKey);
      if (mounted.current) setBusyById((current) => ({ ...current, [createKey]: '' }));
    }
  }

  const data = snapshots[companionId] || null;
  const busy = busyById[companionId] || busyById.__create__ || '';
  const error = errors[companionId] || errors.__create__ || '';
  return { ...data, roster, rosterError, companionId, selectCompanion, createCompanion, error, busy, act, refresh };
}
