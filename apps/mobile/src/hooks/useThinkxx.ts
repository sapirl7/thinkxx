import { useCallback, useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  ThinkxxClient,
  deriveGuardianSetPda,
  deriveClaimPda,
  type PlanSummary,
  type PlanAccountData,
  type GuardianSetData,
  type ClaimData,
} from '@thinkxx/sdk';
import { useWallet } from '../providers/WalletProvider';

/** Memoized SDK client bound to the active wallet connection. */
export function useThinkxxClient(): ThinkxxClient {
  const { connection } = useWallet();
  return useMemo(() => new ThinkxxClient(connection), [connection]);
}

export interface AsyncResource<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

/** Load every plan owned by the connected wallet. */
export function usePlans(): AsyncResource<PlanSummary[]> {
  const client = useThinkxxClient();
  const { publicKey } = useWallet();
  const [data, setData] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!publicKey) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await client.fetchPlansByOwner(publicKey));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [client, publicKey]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export interface PlanDetail {
  address: PublicKey;
  account: PlanAccountData;
  guardianSet: GuardianSetData | null;
  claim: ClaimData | null;
  vaultLamports: number;
}

/** Load a single plan plus its guardian set, active claim, and vault balance. */
export function usePlanDetail(planAddress: string | null): AsyncResource<PlanDetail | null> {
  const client = useThinkxxClient();
  const [data, setData] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!planAddress) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const planPda = new PublicKey(planAddress);
      const account = await client.fetchPlan(planPda);
      if (!account) {
        setData(null);
        setError('Plan account was not found on devnet.');
        return;
      }
      const [guardianSetPda] = deriveGuardianSetPda(planPda);
      const [claimPda] = deriveClaimPda(planPda);
      const [guardianSet, claim, vaultLamports] = await Promise.all([
        client.fetchGuardianSet(guardianSetPda),
        client.fetchClaim(claimPda),
        client.fetchVaultLamports(planPda),
      ]);
      setData({ address: planPda, account, guardianSet, claim, vaultLamports });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [client, planAddress]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
