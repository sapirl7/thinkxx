import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { ThinkxxClient, PlanMode, PlanState, ClaimState } from './client';

/** Serialize a PlanAccount exactly as the on-chain Borsh layout (state.rs). */
function encodePlanAccount(fields: {
  owner: PublicKey;
  planId: bigint;
  mode: number;
  state: number;
  beneficiary: PublicKey;
  backup: PublicKey | null;
  inactivity: bigint;
  grace: bigint;
  lastHeartbeat: bigint;
  guardianSet: PublicKey;
  quorum: number;
  createdAt: bigint;
  updatedAt: bigint;
  vaultBump: number;
  protectedLamports: bigint;
  emergencyLamports: bigint;
  bump: number;
}): Buffer {
  const parts: Buffer[] = [];
  parts.push(Buffer.alloc(8)); // discriminator
  parts.push(Buffer.from(fields.owner.toBuffer()));
  const u64 = (v: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(v); return b; };
  const i64 = (v: bigint) => { const b = Buffer.alloc(8); b.writeBigInt64LE(v); return b; };
  parts.push(u64(fields.planId));
  parts.push(Buffer.from([fields.mode]));
  parts.push(Buffer.from([fields.state]));
  parts.push(Buffer.from(fields.beneficiary.toBuffer()));
  if (fields.backup) {
    parts.push(Buffer.from([1]));
    parts.push(Buffer.from(fields.backup.toBuffer()));
  } else {
    parts.push(Buffer.from([0]));
  }
  parts.push(i64(fields.inactivity));
  parts.push(i64(fields.grace));
  parts.push(i64(fields.lastHeartbeat));
  parts.push(Buffer.from(fields.guardianSet.toBuffer()));
  parts.push(Buffer.from([fields.quorum]));
  parts.push(i64(fields.createdAt));
  parts.push(i64(fields.updatedAt));
  parts.push(Buffer.from([fields.vaultBump]));
  parts.push(u64(fields.protectedLamports));
  parts.push(u64(fields.emergencyLamports));
  parts.push(Buffer.from([fields.bump]));
  return Buffer.concat(parts);
}

describe('decodePlanAccount', () => {
  const owner = PublicKey.unique();
  const beneficiary = PublicKey.unique();
  const backup = PublicKey.unique();
  const guardianSet = PublicKey.unique();

  const data = encodePlanAccount({
    owner,
    planId: 42n,
    mode: PlanMode.LegalRisk,
    state: PlanState.Active,
    beneficiary,
    backup,
    inactivity: 604_800n,
    grace: 86_400n,
    lastHeartbeat: 1_700_000_000n,
    guardianSet,
    quorum: 2,
    createdAt: 1_699_000_000n,
    updatedAt: 1_699_500_000n,
    vaultBump: 254,
    protectedLamports: 5_000_000_000n,
    emergencyLamports: 1_000_000_000n,
    bump: 253,
  });

  it('round-trips every field at the correct offset', () => {
    const p = ThinkxxClient.decodePlanAccount(data);
    expect(p.owner.equals(owner)).toBe(true);
    expect(p.planId).toBe(42n);
    expect(p.mode).toBe(PlanMode.LegalRisk);
    expect(p.state).toBe(PlanState.Active);
    expect(p.beneficiary.equals(beneficiary)).toBe(true);
    expect(p.backupBeneficiary?.equals(backup)).toBe(true);
    expect(p.inactivityDuration).toBe(604_800n);
    expect(p.gracePeriod).toBe(86_400n);
    expect(p.lastHeartbeat).toBe(1_700_000_000n);
    expect(p.guardianSet.equals(guardianSet)).toBe(true);
    expect(p.guardianQuorum).toBe(2);
    expect(p.createdAt).toBe(1_699_000_000n);
    expect(p.updatedAt).toBe(1_699_500_000n);
    expect(p.vaultAuthorityBump).toBe(254);
    expect(p.protectedLamports).toBe(5_000_000_000n);
    expect(p.emergencyBucketLamports).toBe(1_000_000_000n);
    expect(p.bump).toBe(253);
  });

  it('decodes a None backup beneficiary', () => {
    const noBackup = encodePlanAccount({
      owner, planId: 1n, mode: PlanMode.Medical, state: PlanState.Draft,
      beneficiary, backup: null, inactivity: 86_400n, grace: 3_600n,
      lastHeartbeat: 0n, guardianSet, quorum: 0, createdAt: 0n, updatedAt: 0n,
      vaultBump: 1, protectedLamports: 0n, emergencyLamports: 0n, bump: 2,
    });
    const p = ThinkxxClient.decodePlanAccount(noBackup);
    expect(p.backupBeneficiary).toBeNull();
    expect(p.mode).toBe(PlanMode.Medical);
    expect(p.state).toBe(PlanState.Draft);
  });
});

describe('decodeClaim', () => {
  it('decodes claimant, state, deadlines and approval vec', () => {
    const plan = PublicKey.unique();
    const claimant = PublicKey.unique();
    const g1 = PublicKey.unique();
    const parts: Buffer[] = [];
    parts.push(Buffer.alloc(8)); // discriminator
    parts.push(Buffer.from(plan.toBuffer()));
    parts.push(Buffer.from(claimant.toBuffer()));
    parts.push(Buffer.from([ClaimState.Approved]));
    const i64 = (v: bigint) => { const b = Buffer.alloc(8); b.writeBigInt64LE(v); return b; };
    parts.push(i64(1_700_000_000n)); // started_at
    parts.push(i64(1_700_086_400n)); // grace_deadline
    const vecLen = Buffer.alloc(4); vecLen.writeUInt32LE(1); // approvals: 1
    parts.push(vecLen);
    parts.push(Buffer.from(g1.toBuffer()));
    parts.push(Buffer.alloc(4)); // vetoes: 0
    parts.push(Buffer.from([7])); // bump

    const claim = ThinkxxClient.decodeClaim(Buffer.concat(parts));
    expect(claim.claimant.equals(claimant)).toBe(true);
    expect(claim.state).toBe(ClaimState.Approved);
    expect(claim.graceDeadline).toBe(1_700_086_400n);
    expect(claim.approvals).toHaveLength(1);
    expect(claim.approvals[0].equals(g1)).toBe(true);
    expect(claim.vetoes).toHaveLength(0);
    expect(claim.bump).toBe(7);
  });
});
