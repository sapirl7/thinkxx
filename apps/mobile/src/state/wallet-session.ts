import { loadJson, removeStoredValue, saveJson } from './storage';

const WALLET_SESSION_KEY = 'thinkxx.wallet.session';

export interface PersistedWalletSession {
  publicKeyBase58: string | null;
  authToken: string | null;
  walletUriBase: string | null;
  lastConnectedAt: number | null;
}

export const EMPTY_WALLET_SESSION: PersistedWalletSession = {
  publicKeyBase58: null,
  authToken: null,
  walletUriBase: null,
  lastConnectedAt: null,
};

export async function loadWalletSession(): Promise<PersistedWalletSession> {
  const stored = await loadJson<PersistedWalletSession>(WALLET_SESSION_KEY, true);
  return stored ?? EMPTY_WALLET_SESSION;
}

export async function persistWalletSession(session: PersistedWalletSession): Promise<void> {
  await saveJson(WALLET_SESSION_KEY, session, true);
}

export async function clearWalletSession(): Promise<void> {
  await removeStoredValue(WALLET_SESSION_KEY, true);
}
