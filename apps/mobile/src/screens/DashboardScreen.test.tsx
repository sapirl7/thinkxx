/**
 * DashboardScreen tests — validates synthetic plan rendering
 * logic and empty state behavior (P2 fix #2).
 */

import { PublicKey } from '@solana/web3.js';

// ── Logic Under Test (extracted from DashboardScreen.tsx) ──

interface Plan {
  address: string;
  status: string;
}

function computeVisiblePlans(
  plans: Plan[],
  lastPlanAddress: string | null,
): Plan[] {
  if (plans.length > 0) {
    return plans;
  }
  if (lastPlanAddress) {
    return [
      {
        address: lastPlanAddress,
        status: 'Just Created',
      },
    ];
  }
  return [];
}

function formatBalance(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(4); // SOL has 9 decimals
}

function deriveShortAddress(publicKey: PublicKey | null): string | null {
  if (!publicKey) return null;
  const full = publicKey.toBase58();
  return `${full.slice(0, 4)}...${full.slice(-4)}`;
}

// ── Tests ──────────────────────────────────────────────

describe('DashboardScreen logic', () => {
  describe('computeVisiblePlans', () => {
    it('returns plans when list is non-empty', () => {
      const plans = [{ address: 'abc', status: 'Active' }];
      expect(computeVisiblePlans(plans, null)).toEqual(plans);
    });

    it('returns synthetic plan when list empty and lastPlanAddress exists', () => {
      const result = computeVisiblePlans([], 'test-plan-address');
      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('test-plan-address');
      expect(result[0].status).toBe('Just Created');
    });

    it('returns empty array when no plans and no lastPlanAddress', () => {
      expect(computeVisiblePlans([], null)).toEqual([]);
    });

    it('prioritizes real plans over synthetic', () => {
      const plans = [{ address: 'real', status: 'Active' }];
      const result = computeVisiblePlans(plans, 'synthetic');
      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('real');
    });
  });

  describe('formatBalance', () => {
    it('formats 5 SOL correctly', () => {
      expect(formatBalance(5_000_000_000)).toBe('5.0000');
    });

    it('formats 0 SOL', () => {
      expect(formatBalance(0)).toBe('0.0000');
    });

    it('formats fractional SOL', () => {
      expect(formatBalance(1_500_000)).toBe('0.0015');
    });
  });

  describe('deriveShortAddress', () => {
    it('returns null for null publicKey', () => {
      expect(deriveShortAddress(null)).toBeNull();
    });

    it('returns 4...4 format', () => {
      const pk = new PublicKey('11111111111111111111111111111112');
      const short = deriveShortAddress(pk);
      expect(short).toMatch(/^.{4}\.\.\..{4}$/);
    });
  });
});
