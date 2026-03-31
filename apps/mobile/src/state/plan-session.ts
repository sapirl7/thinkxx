import { loadJson, removeStoredValue, saveJson } from './storage';

const PLAN_SESSION_KEY = 'thinkxx.plan.session';

export interface PersistedPlanSession {
  walletOwner: string | null;
  selectedPlanPda: string | null;
  lastCreatedPlanPda: string | null;
  knownPlanPdas: string[];
}

export const EMPTY_PLAN_SESSION: PersistedPlanSession = {
  walletOwner: null,
  selectedPlanPda: null,
  lastCreatedPlanPda: null,
  knownPlanPdas: [],
};

export async function loadPlanSession(): Promise<PersistedPlanSession> {
  const stored = await loadJson<PersistedPlanSession>(PLAN_SESSION_KEY);
  return stored ?? EMPTY_PLAN_SESSION;
}

export async function persistPlanSession(session: PersistedPlanSession): Promise<void> {
  await saveJson(PLAN_SESSION_KEY, session);
}

export async function clearPlanSession(): Promise<void> {
  await removeStoredValue(PLAN_SESSION_KEY);
}

export function normalizePlanSessionForWallet(
  session: PersistedPlanSession,
  walletOwner: string | null,
): PersistedPlanSession {
  if (!walletOwner) {
    return EMPTY_PLAN_SESSION;
  }

  if (session.walletOwner && session.walletOwner !== walletOwner) {
    return {
      ...EMPTY_PLAN_SESSION,
      walletOwner,
    };
  }

  return {
    walletOwner,
    selectedPlanPda: session.selectedPlanPda,
    lastCreatedPlanPda: session.lastCreatedPlanPda,
    knownPlanPdas: Array.from(new Set(session.knownPlanPdas ?? [])),
  };
}
