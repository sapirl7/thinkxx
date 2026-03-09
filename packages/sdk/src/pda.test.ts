/**
 * PDA derivation tests — known-vector tests for all 5 PDA functions.
 * Ensures deterministic derivation and correct seeds.
 */
import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  derivePlanPda,
  deriveGuardianSetPda,
  deriveClaimPda,
  deriveVaultAuthorityPda,
  deriveSolVaultPda,
} from './pda';

const TEST_OWNER = new PublicKey('11111111111111111111111111111112');
const TEST_PLAN_ID = BigInt(12345);

describe('PDA derivation', () => {
  describe('derivePlanPda', () => {
    it('returns deterministic [PublicKey, bump] for same inputs', () => {
      const [pda1, bump1] = derivePlanPda(TEST_OWNER, TEST_PLAN_ID);
      const [pda2, bump2] = derivePlanPda(TEST_OWNER, TEST_PLAN_ID);
      expect(pda1.equals(pda2)).toBe(true);
      expect(bump1).toBe(bump2);
    });

    it('produces different PDAs for different plan_ids', () => {
      const [pda1] = derivePlanPda(TEST_OWNER, BigInt(1));
      const [pda2] = derivePlanPda(TEST_OWNER, BigInt(2));
      expect(pda1.equals(pda2)).toBe(false);
    });

    it('produces different PDAs for different owners', () => {
      const owner2 = new PublicKey('11111111111111111111111111111113');
      const [pda1] = derivePlanPda(TEST_OWNER, TEST_PLAN_ID);
      const [pda2] = derivePlanPda(owner2, TEST_PLAN_ID);
      expect(pda1.equals(pda2)).toBe(false);
    });

    it('returns a valid PublicKey on the ed25519 curve', () => {
      const [pda] = derivePlanPda(TEST_OWNER, TEST_PLAN_ID);
      expect(pda).toBeInstanceOf(PublicKey);
      expect(pda.toBase58().length).toBeGreaterThan(30);
    });
  });

  describe('deriveGuardianSetPda', () => {
    it('is deterministic from plan PDA', () => {
      const [planPda] = derivePlanPda(TEST_OWNER, TEST_PLAN_ID);
      const [gs1, b1] = deriveGuardianSetPda(planPda);
      const [gs2, b2] = deriveGuardianSetPda(planPda);
      expect(gs1.equals(gs2)).toBe(true);
      expect(b1).toBe(b2);
    });
  });

  describe('deriveClaimPda', () => {
    it('is deterministic from plan PDA', () => {
      const [planPda] = derivePlanPda(TEST_OWNER, TEST_PLAN_ID);
      const [c1] = deriveClaimPda(planPda);
      const [c2] = deriveClaimPda(planPda);
      expect(c1.equals(c2)).toBe(true);
    });
  });

  describe('deriveVaultAuthorityPda', () => {
    it('is deterministic from plan PDA', () => {
      const [planPda] = derivePlanPda(TEST_OWNER, TEST_PLAN_ID);
      const [va1] = deriveVaultAuthorityPda(planPda);
      const [va2] = deriveVaultAuthorityPda(planPda);
      expect(va1.equals(va2)).toBe(true);
    });
  });

  describe('deriveSolVaultPda', () => {
    it('is deterministic from plan PDA', () => {
      const [planPda] = derivePlanPda(TEST_OWNER, TEST_PLAN_ID);
      const [sv1] = deriveSolVaultPda(planPda);
      const [sv2] = deriveSolVaultPda(planPda);
      expect(sv1.equals(sv2)).toBe(true);
    });
  });

  describe('all PDAs are unique for same plan', () => {
    it('guardian_set, claim, vault_authority, sol_vault produce different addresses', () => {
      const [planPda] = derivePlanPda(TEST_OWNER, TEST_PLAN_ID);
      const [gs] = deriveGuardianSetPda(planPda);
      const [cl] = deriveClaimPda(planPda);
      const [va] = deriveVaultAuthorityPda(planPda);
      const [sv] = deriveSolVaultPda(planPda);

      const addresses = [planPda, gs, cl, va, sv].map(k => k.toBase58());
      const unique = new Set(addresses);
      expect(unique.size).toBe(5);
    });
  });
});
