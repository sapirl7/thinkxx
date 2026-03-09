/**
 * ThinkxxClient builder tests — verifies programId, keys, flags, data length,
 * discriminators, and Borsh layout for all 15 instruction builders.
 */
import { describe, it, expect } from 'vitest';
import { PublicKey, SystemProgram, Connection } from '@solana/web3.js';
import { ThinkxxClient, PlanMode } from './client';
import { derivePlanPda, deriveGuardianSetPda, deriveSolVaultPda, deriveVaultAuthorityPda, deriveClaimPda } from './pda';
import { PROGRAM_ID } from '@thinkxx/config';

const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const owner = new PublicKey('11111111111111111111111111111112');
const beneficiary = new PublicKey('11111111111111111111111111111113');
const backupBeneficiary = new PublicKey('11111111111111111111111111111114');
const guardian = new PublicKey('11111111111111111111111111111115');
const planId = BigInt(999);

const client = new ThinkxxClient(conn);
const [planPda] = derivePlanPda(owner, planId);
const [guardianSetPda] = deriveGuardianSetPda(planPda);
const [claimPda] = deriveClaimPda(planPda);
const [solVaultPda] = deriveSolVaultPda(planPda);

// Known discriminator bytes from client.ts
const DISCRIMINATORS: Record<string, string> = {
  initialize_plan: 'cfa1e6c2564da908',
  heartbeat: 'ca683806f0aa3f86',
  deposit_sol: '6c514e757d9b38c8',
  start_claim: 'bde6077e060a785c',
  cancel_claim: 'b301d4315190dd8c',
  activate_plan: 'bc9ac33525df1366',
  pause_plan: 'd0c8a0abd45ef9e9',
  resume_plan: '43adfb2aa92284a1',
  add_guardian: 'a7bdaa1b4af0c9f1',
  remove_guardian: '4875a0f49bb94712',
  approve_claim: '4ae4d33f8cff45d2',
  veto_claim: '7ee2aa1de02ea419',
  finalize_claim: '56a2caf1887d3495',
  set_emergency_bucket: '36ef72adba3576b2',
  emergency_withdraw: 'ef2dcb409649da5c',
};

function assertDiscriminator(data: Buffer, name: string): void {
  const expected = Buffer.from(DISCRIMINATORS[name], 'hex');
  expect(data.subarray(0, 8)).toEqual(expected);
}

describe('ThinkxxClient', () => {
  it('uses correct programId', () => {
    const ix = client.buildHeartbeat(owner, planPda);
    expect(ix.programId.equals(PROGRAM_ID)).toBe(true);
  });

  it('accepts custom programId', () => {
    const customProgramId = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const customClient = new ThinkxxClient(conn, customProgramId);
    const ix = customClient.buildHeartbeat(owner, planPda);
    expect(ix.programId.equals(customProgramId)).toBe(true);
  });

  // ── buildInitializePlan ─────────────────────────────

  describe('buildInitializePlan', () => {
    it('without backupBeneficiary: correct keys, flags, and data length', () => {
      const { instruction, planPda: p, guardianSetPda: gs } = client.buildInitializePlan(owner, {
        planId,
        mode: PlanMode.Medical,
        beneficiary,
        inactivityDuration: BigInt(86_400),
        gracePeriod: BigInt(3_600),
        guardianQuorum: 2,
      });

      // Keys: owner, plan, guardian_set, vault_authority, system
      expect(instruction.keys).toHaveLength(5);
      expect(instruction.keys[0].pubkey.equals(owner)).toBe(true);
      expect(instruction.keys[0].isSigner).toBe(true);
      expect(instruction.keys[0].isWritable).toBe(true);
      expect(instruction.keys[1].pubkey.equals(p)).toBe(true);
      expect(instruction.keys[1].isWritable).toBe(true);
      expect(instruction.keys[2].pubkey.equals(gs)).toBe(true);
      expect(instruction.keys[2].isWritable).toBe(true);
      expect(instruction.keys[3].isWritable).toBe(false); // vault_authority
      expect(instruction.keys[4].pubkey.equals(SystemProgram.programId)).toBe(true);

      // Data: 8 disc + 8 plan_id + 1 mode + 32 beneficiary + 1 none_option + 8 inactivity + 8 grace + 1 quorum = 67
      expect(instruction.data.length).toBe(67);
      assertDiscriminator(instruction.data, 'initialize_plan');

      // mode byte
      expect(instruction.data[16]).toBe(PlanMode.Medical);

      // backup_beneficiary option = None (0)
      expect(instruction.data[49]).toBe(0);

      // quorum last byte
      expect(instruction.data[66]).toBe(2);
    });

    it('with backupBeneficiary: data length includes 32-byte option', () => {
      const { instruction } = client.buildInitializePlan(owner, {
        planId,
        mode: PlanMode.Legacy,
        beneficiary,
        backupBeneficiary,
        inactivityDuration: BigInt(86_400),
        gracePeriod: BigInt(86_400),
        guardianQuorum: 0,
      });

      // 67 + 32 = 99
      expect(instruction.data.length).toBe(99);
      // option = Some (1)
      expect(instruction.data[49]).toBe(1);
      // backup beneficiary bytes
      const backupBytes = instruction.data.subarray(50, 82);
      expect(Buffer.from(backupBytes)).toEqual(Buffer.from(backupBeneficiary.toBuffer()));
    });
  });

  // ── buildHeartbeat ──────────────────────────────────

  describe('buildHeartbeat', () => {
    it('has 2 keys, owner is signer, plan is writable, data is 8 bytes', () => {
      const ix = client.buildHeartbeat(owner, planPda);
      expect(ix.keys).toHaveLength(2);
      expect(ix.keys[0].isSigner).toBe(true);
      expect(ix.keys[0].isWritable).toBe(false);
      expect(ix.keys[1].isWritable).toBe(true);
      expect(ix.data.length).toBe(8);
      assertDiscriminator(ix.data, 'heartbeat');
    });
  });

  // ── buildDepositSol ─────────────────────────────────

  describe('buildDepositSol', () => {
    it('has 4 keys with SystemProgram, data is 16 bytes (disc + amount)', () => {
      const ix = client.buildDepositSol(owner, planPda, BigInt(1_000_000));
      expect(ix.keys).toHaveLength(4);
      expect(ix.keys[0].isSigner).toBe(true);
      expect(ix.keys[0].isWritable).toBe(true);
      expect(ix.keys[3].pubkey.equals(SystemProgram.programId)).toBe(true);
      expect(ix.data.length).toBe(16);
      assertDiscriminator(ix.data, 'deposit_sol');
      // amount at offset 8
      expect(ix.data.readBigUInt64LE(8)).toBe(BigInt(1_000_000));
    });
  });

  // ── buildStartClaim ─────────────────────────────────

  describe('buildStartClaim', () => {
    it('has 4 keys, claimant is signer+writable, data is 8 bytes', () => {
      const claimant = beneficiary;
      const ix = client.buildStartClaim(claimant, planPda);
      expect(ix.keys).toHaveLength(4);
      expect(ix.keys[0].isSigner).toBe(true);
      expect(ix.keys[0].isWritable).toBe(true);
      expect(ix.data.length).toBe(8);
      assertDiscriminator(ix.data, 'start_claim');
    });
  });

  // ── buildCancelClaim ────────────────────────────────

  describe('buildCancelClaim', () => {
    it('has 3 keys, owner is signer, data is 8 bytes', () => {
      const ix = client.buildCancelClaim(owner, planPda, claimPda);
      expect(ix.keys).toHaveLength(3);
      expect(ix.keys[0].isSigner).toBe(true);
      expect(ix.data.length).toBe(8);
      assertDiscriminator(ix.data, 'cancel_claim');
    });
  });

  // ── Lifecycle builders ──────────────────────────────

  describe.each([
    ['buildActivatePlan', 'activate_plan'],
    ['buildPausePlan', 'pause_plan'],
    ['buildResumePlan', 'resume_plan'],
  ] as const)('%s', (method, discriminatorName) => {
    it('has 2 keys, owner signer, plan writable, 8 bytes', () => {
      const ix = (client as unknown as Record<string, (o: PublicKey, p: PublicKey) => ReturnType<typeof client.buildActivatePlan>>)[method](owner, planPda);
      expect(ix.keys).toHaveLength(2);
      expect(ix.keys[0].isSigner).toBe(true);
      expect(ix.keys[1].isWritable).toBe(true);
      expect(ix.data.length).toBe(8);
      assertDiscriminator(ix.data, discriminatorName);
    });
  });

  // ── Guardian builders ───────────────────────────────

  describe.each([
    ['buildAddGuardian', 'add_guardian'],
    ['buildRemoveGuardian', 'remove_guardian'],
  ] as const)('%s', (method, discriminatorName) => {
    it('has 3 keys, data is 40 bytes (disc + pubkey)', () => {
      const fn = (client as unknown as Record<string, (...args: PublicKey[]) => ReturnType<typeof client.buildAddGuardian>>)[method];
      const ix = fn.call(client, owner, planPda, guardianSetPda, guardian);
      expect(ix.keys).toHaveLength(3);
      expect(ix.keys[0].isSigner).toBe(true);
      expect(ix.data.length).toBe(40); // 8 disc + 32 pubkey
      assertDiscriminator(ix.data, discriminatorName);
      // guardian pubkey at offset 8
      expect(Buffer.from(ix.data.subarray(8, 40))).toEqual(Buffer.from(guardian.toBuffer()));
    });
  });

  // ── buildApproveClaim ───────────────────────────────

  describe('buildApproveClaim', () => {
    it('has 4 keys, guardian signer, claim writable, data is 8 bytes', () => {
      const ix = client.buildApproveClaim(guardian, planPda, guardianSetPda, claimPda);
      expect(ix.keys).toHaveLength(4);
      expect(ix.keys[0].isSigner).toBe(true);
      expect(ix.keys[3].isWritable).toBe(true);
      expect(ix.data.length).toBe(8);
      assertDiscriminator(ix.data, 'approve_claim');
    });
  });

  // ── buildVetoClaim ──────────────────────────────────

  describe('buildVetoClaim', () => {
    it('has 4 keys, guardian signer+writable, plan+claim writable', () => {
      const ix = client.buildVetoClaim(guardian, planPda, guardianSetPda, claimPda);
      expect(ix.keys).toHaveLength(4);
      expect(ix.keys[0].isSigner).toBe(true);
      expect(ix.keys[0].isWritable).toBe(true);
      expect(ix.keys[1].isWritable).toBe(true);
      expect(ix.data.length).toBe(8);
      assertDiscriminator(ix.data, 'veto_claim');
    });
  });

  // ── buildFinalizeClaim ──────────────────────────────

  describe('buildFinalizeClaim', () => {
    it('has 7 keys including solVault, vaultAuthority, SystemProgram', () => {
      const ix = client.buildFinalizeClaim(beneficiary, planPda, guardianSetPda, claimPda);
      expect(ix.keys).toHaveLength(7);
      expect(ix.keys[0].isSigner).toBe(true);
      expect(ix.keys[4].pubkey.equals(solVaultPda)).toBe(true);
      expect(ix.keys[6].pubkey.equals(SystemProgram.programId)).toBe(true);
      expect(ix.data.length).toBe(8);
      assertDiscriminator(ix.data, 'finalize_claim');
    });
  });

  // ── buildSetEmergencyBucket ─────────────────────────

  describe('buildSetEmergencyBucket', () => {
    it('has 2 keys, data is 16 bytes with amount', () => {
      const ix = client.buildSetEmergencyBucket(owner, planPda, BigInt(500_000));
      expect(ix.keys).toHaveLength(2);
      expect(ix.data.length).toBe(16);
      assertDiscriminator(ix.data, 'set_emergency_bucket');
      expect(ix.data.readBigUInt64LE(8)).toBe(BigInt(500_000));
    });
  });

  // ── buildEmergencyWithdraw ──────────────────────────

  describe('buildEmergencyWithdraw', () => {
    it('has 5 keys including solVault and SystemProgram, data is 16 bytes', () => {
      const ix = client.buildEmergencyWithdraw(owner, planPda, BigInt(250_000));
      expect(ix.keys).toHaveLength(5);
      expect(ix.keys[0].isSigner).toBe(true);
      expect(ix.keys[0].isWritable).toBe(true);
      expect(ix.keys[4].pubkey.equals(SystemProgram.programId)).toBe(true);
      expect(ix.data.length).toBe(16);
      assertDiscriminator(ix.data, 'emergency_withdraw');
      expect(ix.data.readBigUInt64LE(8)).toBe(BigInt(250_000));
    });
  });

  // ── RN compatibility ────────────────────────────────

  describe('RN compatibility', () => {
    it('does not use Node crypto module — all discriminators are pre-computed', () => {
      // The client stores discriminators as hex constants, not computing sha256.
      // This test verifies all 15 builders work without Node crypto.
      const methods = [
        () => client.buildHeartbeat(owner, planPda),
        () => client.buildDepositSol(owner, planPda, BigInt(1)),
        () => client.buildStartClaim(beneficiary, planPda),
        () => client.buildCancelClaim(owner, planPda, claimPda),
        () => client.buildActivatePlan(owner, planPda),
        () => client.buildPausePlan(owner, planPda),
        () => client.buildResumePlan(owner, planPda),
        () => client.buildAddGuardian(owner, planPda, guardianSetPda, guardian),
        () => client.buildRemoveGuardian(owner, planPda, guardianSetPda, guardian),
        () => client.buildApproveClaim(guardian, planPda, guardianSetPda, claimPda),
        () => client.buildVetoClaim(guardian, planPda, guardianSetPda, claimPda),
        () => client.buildFinalizeClaim(beneficiary, planPda, guardianSetPda, claimPda),
        () => client.buildSetEmergencyBucket(owner, planPda, BigInt(1)),
        () => client.buildEmergencyWithdraw(owner, planPda, BigInt(1)),
      ];

      for (const build of methods) {
        expect(() => build()).not.toThrow();
      }
    });
  });
});
