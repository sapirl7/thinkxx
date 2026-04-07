/**
 * Account parser tests — validates RN-safe Borsh deserialization
 * for PlanAccount, GuardianSetAccount, and ClaimAccount.
 *
 * Uses known buffer layouts built by hand to verify roundtrip correctness.
 */
import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { PlanMode, PlanState } from './client';
import type { PlanAccountData } from './client';
import {
  ClaimState,
  parsePlanAccount,
  parseGuardianSetAccount,
  parseClaimAccount,
} from './accounts';
import type { ParsedGuardianSet, ParsedClaim } from './accounts';
import { readI64LE, readU64LE, writeI64LE, writeU64LE } from './bytes';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const OWNER = new PublicKey('11111111111111111111111111111112');
const BENEFICIARY = new PublicKey('11111111111111111111111111111113');
const BACKUP = new PublicKey('11111111111111111111111111111114');
const GUARDIAN_1 = new PublicKey('11111111111111111111111111111115');
const GUARDIAN_2 = new PublicKey('11111111111111111111111111111116');
const CLAIMANT = new PublicKey('11111111111111111111111111111117');
const PLAN_PDA = new PublicKey('11111111111111111111111111111118');

// Account discriminators from IDL
const PLAN_DISC = Buffer.from([48, 175, 200, 230, 173, 125, 152, 245]);
const GS_DISC = Buffer.from([126, 150, 210, 67, 132, 109, 221, 46]);
const CLAIM_DISC = Buffer.from([113, 109, 47, 96, 242, 219, 61, 165]);

// ─── Buffer Builders ─────────────────────────────────────────────────────────

function writeU8(buf: Buffer, offset: number, value: number): number {
  buf.writeUInt8(value, offset);
  return offset + 1;
}

function writeI64(buf: Buffer, offset: number, value: bigint): number {
  writeI64LE(buf, offset, value);
  return offset + 8;
}

function writeU64(buf: Buffer, offset: number, value: bigint): number {
  writeU64LE(buf, offset, value);
  return offset + 8;
}

function writePubkey(buf: Buffer, offset: number, key: PublicKey): number {
  key.toBuffer().copy(buf, offset);
  return offset + 32;
}

function writeOptionPubkey(buf: Buffer, offset: number, key: PublicKey | null): number {
  if (key === null) {
    buf.writeUInt8(0, offset);
    return offset + 1;
  }
  buf.writeUInt8(1, offset);
  key.toBuffer().copy(buf, offset + 1);
  return offset + 1 + 32;
}

function writeVecPubkey(buf: Buffer, offset: number, keys: PublicKey[]): number {
  buf.writeUInt32LE(keys.length, offset);
  let pos = offset + 4;
  for (const key of keys) {
    pos = writePubkey(buf, pos, key);
  }
  return pos;
}

/** Build a PlanAccount buffer with known values. */
function buildPlanBuffer(opts: {
  mode?: PlanMode;
  state?: PlanState;
  backup?: PublicKey | null;
  planId?: bigint;
  inactivityDuration?: bigint;
  gracePeriod?: bigint;
  lastHeartbeat?: bigint;
  guardianQuorum?: number;
  createdAt?: bigint;
  updatedAt?: bigint;
  vaultAuthorityBump?: number;
  protectedLamports?: bigint;
  emergencyBucketLamports?: bigint;
  bump?: number;
}): Buffer {
  const buf = Buffer.alloc(300); // larger than needed to account for padding
  let offset = 0;

  // Discriminator
  PLAN_DISC.copy(buf, offset);
  offset += 8;

  offset = writePubkey(buf, offset, OWNER);
  offset = writeU64(buf, offset, opts.planId ?? 1000n);
  offset = writeU8(buf, offset, opts.mode ?? PlanMode.Medical);
  offset = writeU8(buf, offset, opts.state ?? PlanState.Active);
  offset = writePubkey(buf, offset, BENEFICIARY);
  offset = writeOptionPubkey(buf, offset, opts.backup ?? null);
  offset = writeI64(buf, offset, opts.inactivityDuration ?? 86400n);
  offset = writeI64(buf, offset, opts.gracePeriod ?? 3600n);
  offset = writeI64(buf, offset, opts.lastHeartbeat ?? 1710000000n);
  offset = writePubkey(buf, offset, PLAN_PDA); // guardian_set
  offset = writeU8(buf, offset, opts.guardianQuorum ?? 2);
  offset = writeI64(buf, offset, opts.createdAt ?? 1709000000n);
  offset = writeI64(buf, offset, opts.updatedAt ?? 1710000000n);
  offset = writeU8(buf, offset, opts.vaultAuthorityBump ?? 255);
  offset = writeU64(buf, offset, opts.protectedLamports ?? 5_000_000_000n);
  offset = writeU64(buf, offset, opts.emergencyBucketLamports ?? 500_000_000n);
  writeU8(buf, offset, opts.bump ?? 254);

  return buf;
}

/** Build a GuardianSetAccount buffer. */
function buildGuardianSetBuffer(guardians: PublicKey[], quorum: number, updateDelay: bigint = 0n): Buffer {
  const buf = Buffer.alloc(300);
  let offset = 0;

  GS_DISC.copy(buf, offset);
  offset += 8;

  offset = writePubkey(buf, offset, PLAN_PDA);
  offset = writeVecPubkey(buf, offset, guardians);
  offset = writeU8(buf, offset, quorum);
  offset = writeI64(buf, offset, updateDelay);
  writeU8(buf, offset, 253);

  return buf;
}

/** Build a ClaimAccount buffer. */
function buildClaimBuffer(
  state: ClaimState,
  approvals: PublicKey[],
  vetoes: PublicKey[],
): Buffer {
  const buf = Buffer.alloc(500);
  let offset = 0;

  CLAIM_DISC.copy(buf, offset);
  offset += 8;

  offset = writePubkey(buf, offset, PLAN_PDA);
  offset = writePubkey(buf, offset, CLAIMANT);
  offset = writeU8(buf, offset, state);
  offset = writeI64(buf, offset, 1710100000n); // startedAt
  offset = writeI64(buf, offset, 1710186400n); // graceDeadline
  offset = writeVecPubkey(buf, offset, approvals);
  offset = writeVecPubkey(buf, offset, vetoes);
  writeU8(buf, offset, 252);

  return buf;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('parsePlanAccount', () => {
  it('parses a plan with all fields', () => {
    const buf = buildPlanBuffer({
      mode: PlanMode.Legacy,
      state: PlanState.Active,
      backup: BACKUP,
      planId: 42n,
      inactivityDuration: 2592000n,
      gracePeriod: 604800n,
      lastHeartbeat: 1710900000n,
      guardianQuorum: 3,
      createdAt: 1709000000n,
      updatedAt: 1710900000n,
      protectedLamports: 10_000_000_000n,
      emergencyBucketLamports: 1_000_000_000n,
    });

    const plan: PlanAccountData = parsePlanAccount(buf);

    expect(plan.owner.equals(OWNER)).toBe(true);
    expect(plan.planId).toBe(42n);
    expect(plan.mode).toBe(PlanMode.Legacy);
    expect(plan.state).toBe(PlanState.Active);
    expect(plan.beneficiary.equals(BENEFICIARY)).toBe(true);
    expect(plan.backupBeneficiary?.equals(BACKUP)).toBe(true);
    expect(plan.inactivityDuration).toBe(2592000n);
    expect(plan.gracePeriod).toBe(604800n);
    expect(plan.lastHeartbeat).toBe(1710900000n);
    expect(plan.guardianQuorum).toBe(3);
    expect(plan.createdAt).toBe(1709000000n);
    expect(plan.updatedAt).toBe(1710900000n);
    expect(plan.protectedLamports).toBe(10_000_000_000n);
    expect(plan.emergencyBucketLamports).toBe(1_000_000_000n);
  });

  it('parses a plan with no backup beneficiary', () => {
    const buf = buildPlanBuffer({ backup: null });
    const plan = parsePlanAccount(buf);
    expect(plan.backupBeneficiary).toBeNull();
    expect(plan.lastHeartbeat).toBe(1710000000n);
    expect(plan.createdAt).toBe(1709000000n);
    expect(plan.updatedAt).toBe(1710000000n);
  });

  it('parses Draft state', () => {
    const buf = buildPlanBuffer({ state: PlanState.Draft });
    expect(parsePlanAccount(buf).state).toBe(PlanState.Draft);
  });

  it('parses Paused state', () => {
    const buf = buildPlanBuffer({ state: PlanState.Paused });
    expect(parsePlanAccount(buf).state).toBe(PlanState.Paused);
  });

  it('parses ClaimPending state', () => {
    const buf = buildPlanBuffer({ state: PlanState.ClaimPending });
    expect(parsePlanAccount(buf).state).toBe(PlanState.ClaimPending);
  });

  it('parses all three modes', () => {
    for (const mode of [PlanMode.Medical, PlanMode.LegalRisk, PlanMode.Legacy]) {
      const buf = buildPlanBuffer({ mode });
      expect(parsePlanAccount(buf).mode).toBe(mode);
    }
  });

  it('rejects invalid discriminator', () => {
    const buf = buildPlanBuffer({});
    buf[0] = 0xff; // corrupt discriminator
    expect(() => parsePlanAccount(buf)).toThrow('Invalid PlanAccount discriminator');
  });
});

describe('parseGuardianSetAccount', () => {
  it('parses guardian set with 2 guardians', () => {
    const buf = buildGuardianSetBuffer([GUARDIAN_1, GUARDIAN_2], 2, 86400n);
    const gs: ParsedGuardianSet = parseGuardianSetAccount(buf);

    expect(gs.plan.equals(PLAN_PDA)).toBe(true);
    expect(gs.guardians).toHaveLength(2);
    expect(gs.guardians[0].equals(GUARDIAN_1)).toBe(true);
    expect(gs.guardians[1].equals(GUARDIAN_2)).toBe(true);
    expect(gs.quorum).toBe(2);
    expect(gs.updateDelay).toBe(86400n);
    expect(gs.bump).toBe(253);
  });

  it('parses empty guardian set', () => {
    const buf = buildGuardianSetBuffer([], 0);
    const gs = parseGuardianSetAccount(buf);

    expect(gs.guardians).toHaveLength(0);
    expect(gs.quorum).toBe(0);
  });

  it('parses max guardians (5)', () => {
    const keys = Array.from({ length: 5 }, (_, i) =>
      new PublicKey(Buffer.alloc(32, i + 10))
    );
    const buf = buildGuardianSetBuffer(keys, 3);
    const gs = parseGuardianSetAccount(buf);

    expect(gs.guardians).toHaveLength(5);
    expect(gs.quorum).toBe(3);
  });

  it('rejects invalid discriminator', () => {
    const buf = buildGuardianSetBuffer([], 0);
    buf[0] = 0xff;
    expect(() => parseGuardianSetAccount(buf)).toThrow('Invalid GuardianSetAccount discriminator');
  });
});

describe('parseClaimAccount', () => {
  it('parses pending claim with approvals and vetoes', () => {
    const buf = buildClaimBuffer(ClaimState.Pending, [GUARDIAN_1], []);
    const claim: ParsedClaim = parseClaimAccount(buf);

    expect(claim.plan.equals(PLAN_PDA)).toBe(true);
    expect(claim.claimant.equals(CLAIMANT)).toBe(true);
    expect(claim.state).toBe(ClaimState.Pending);
    expect(claim.startedAt).toBe(1710100000n);
    expect(claim.graceDeadline).toBe(1710186400n);
    expect(claim.approvals).toHaveLength(1);
    expect(claim.approvals[0].equals(GUARDIAN_1)).toBe(true);
    expect(claim.vetoes).toHaveLength(0);
    expect(claim.bump).toBe(252);
  });

  it('parses vetoed claim', () => {
    const buf = buildClaimBuffer(ClaimState.Vetoed, [], [GUARDIAN_2]);
    const claim = parseClaimAccount(buf);

    expect(claim.state).toBe(ClaimState.Vetoed);
    expect(claim.vetoes).toHaveLength(1);
    expect(claim.vetoes[0].equals(GUARDIAN_2)).toBe(true);
  });

  it('parses finalized claim', () => {
    const buf = buildClaimBuffer(ClaimState.Finalized, [GUARDIAN_1, GUARDIAN_2], []);
    const claim = parseClaimAccount(buf);

    expect(claim.state).toBe(ClaimState.Finalized);
    expect(claim.approvals).toHaveLength(2);
  });

  it('parses claim with no approvals or vetoes', () => {
    const buf = buildClaimBuffer(ClaimState.Pending, [], []);
    const claim = parseClaimAccount(buf);

    expect(claim.approvals).toHaveLength(0);
    expect(claim.vetoes).toHaveLength(0);
  });

  it('rejects invalid discriminator', () => {
    const buf = buildClaimBuffer(ClaimState.Pending, [], []);
    buf[0] = 0xff;
    expect(() => parseClaimAccount(buf)).toThrow('Invalid ClaimAccount discriminator');
  });

  it('parses accounts without Buffer BigInt helpers', () => {
    const originalReadU64 = Buffer.prototype.readBigUInt64LE;
    const originalReadI64 = Buffer.prototype.readBigInt64LE;
    const planBuffer = buildPlanBuffer({ planId: 77n, inactivityDuration: -1n });
    const claimBuffer = buildClaimBuffer(ClaimState.Pending, [GUARDIAN_1], []);

    Object.defineProperties(Buffer.prototype, {
      readBigUInt64LE: { value: undefined, configurable: true, writable: true },
      readBigInt64LE: { value: undefined, configurable: true, writable: true },
    });

    try {
      const plan = parsePlanAccount(planBuffer);
      const claim = parseClaimAccount(claimBuffer);

      expect(plan.planId).toBe(readU64LE(planBuffer, 40));
      expect(plan.inactivityDuration).toBe(-1n);
      expect(claim.startedAt).toBe(readI64LE(claimBuffer, 73));
    } finally {
      Object.defineProperties(Buffer.prototype, {
        readBigUInt64LE: { value: originalReadU64, configurable: true, writable: true },
        readBigInt64LE: { value: originalReadI64, configurable: true, writable: true },
      });
    }
  });
});
