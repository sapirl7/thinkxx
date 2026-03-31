/**
 * @thinkxx/sdk — Account deserialization and fetch helpers.
 *
 * RN-safe: manual little-endian parsing on Uint8Array-compatible buffers.
 * No @coral-xyz/anchor coder or Node-specific Buffer BigInt helpers.
 */

import { Connection, PublicKey, type GetProgramAccountsFilter } from '@solana/web3.js';
import { PROGRAM_ID } from '@thinkxx/config';
import { PlanMode, PlanState } from './client';
import type { PlanAccountData } from './client';
import { bytesEqual, bytesToHex, readI64LE, readU32LE, readU64LE } from './bytes';

// ─── Account Discriminators (from IDL) ───────────────────────────────────────

const PLAN_DISCRIMINATOR = Buffer.from([48, 175, 200, 230, 173, 125, 152, 245]);
const GUARDIAN_SET_DISCRIMINATOR = Buffer.from([126, 150, 210, 67, 132, 109, 221, 46]);
const CLAIM_DISCRIMINATOR = Buffer.from([113, 109, 47, 96, 242, 219, 61, 165]);

const DISCRIMINATOR_SIZE = 8;

// ─── Claim State Enum ────────────────────────────────────────────────────────

/** Claim lifecycle states — mirrors ClaimState on-chain. */
export enum ClaimState {
  Pending = 0,
  Approved = 1,
  Vetoed = 2,
  Finalized = 3,
  Cancelled = 4,
}

// ─── Parsed Account Types ────────────────────────────────────────────────────

/** Parsed GuardianSetAccount from on-chain data. */
export interface ParsedGuardianSet {
  plan: PublicKey;
  guardians: PublicKey[];
  quorum: number;
  updateDelay: bigint;
  bump: number;
}

/** Parsed ClaimAccount from on-chain data. */
export interface ParsedClaim {
  plan: PublicKey;
  claimant: PublicKey;
  state: ClaimState;
  startedAt: bigint;
  graceDeadline: bigint;
  approvals: PublicKey[];
  vetoes: PublicKey[];
  bump: number;
}

/**
 * Plan with its on-chain address and vault balance.
 * Note: `vaultLamports` equals `protectedLamports` (the total vault held amount).
 * `emergencyBucketLamports` is a subset cap of `protectedLamports`, not additive.
 */
export interface PlanWithAddress extends PlanAccountData {
  address: PublicKey;
  vaultLamports: bigint;
}

// ─── Buffer Reading Helpers (RN-safe) ────────────────────────────────────────

function readPubkey(data: Buffer, offset: number): PublicKey {
  return new PublicKey(data.subarray(offset, offset + 32));
}

function readI64(data: Buffer, offset: number): bigint {
  return readI64LE(data, offset);
}

function readU64(data: Buffer, offset: number): bigint {
  return readU64LE(data, offset);
}

function readU8(data: Buffer, offset: number): number {
  return data.readUInt8(offset);
}

/**
 * Read Borsh Option<Pubkey>: 1-byte tag + 32-byte pubkey if present.
 * Returns [value, bytesConsumed].
 */
function readOptionPubkey(data: Buffer, offset: number): [PublicKey | null, number] {
  const tag = readU8(data, offset);
  if (tag === 0) {
    return [null, 1];
  }
  return [readPubkey(data, offset + 1), 1 + 32];
}

/**
 * Read Borsh Vec<Pubkey>: 4-byte LE length + N × 32-byte pubkeys.
 * Returns [values, bytesConsumed].
 */
function readVecPubkey(data: Buffer, offset: number): [PublicKey[], number] {
  const len = readU32LE(data, offset);
  const keys: PublicKey[] = [];
  let pos = offset + 4;
  for (let i = 0; i < len; i++) {
    keys.push(readPubkey(data, pos));
    pos += 32;
  }
  return [keys, pos - offset];
}

// ─── Discriminator Validation ────────────────────────────────────────────────

function checkDiscriminator(data: Buffer, expected: Buffer, accountName: string): void {
  const actual = data.subarray(0, DISCRIMINATOR_SIZE);
  if (!bytesEqual(actual, expected)) {
    throw new Error(
      `Invalid ${accountName} discriminator: expected ${bytesToHex(expected)}, got ${bytesToHex(actual)}`
    );
  }
}

// ─── Account Parsers ─────────────────────────────────────────────────────────

/**
 * Parse raw PlanAccount data into PlanAccountData.
 * Layout (after 8-byte discriminator):
 *   owner:                32
 *   plan_id:               8 (u64)
 *   mode:                  1
 *   state:                 1
 *   beneficiary:          32
 *   backup_beneficiary:   1 + 32 (Option<Pubkey>)
 *   inactivity_duration:   8 (i64)
 *   grace_period:           8 (i64)
 *   last_heartbeat:         8 (i64)
 *   guardian_set:          32
 *   guardian_quorum:        1 (u8)
 *   created_at:             8 (i64)
 *   updated_at:             8 (i64)
 *   vault_authority_bump:   1 (u8)
 *   protected_lamports:     8 (u64)
 *   emergency_bucket_lamports: 8 (u64)
 *   bump:                   1 (u8)
 */
export function parsePlanAccount(data: Buffer): PlanAccountData {
  checkDiscriminator(data, PLAN_DISCRIMINATOR, 'PlanAccount');

  let offset = DISCRIMINATOR_SIZE;

  const owner = readPubkey(data, offset);
  offset += 32;

  const planId = readU64(data, offset);
  offset += 8;

  const mode: PlanMode = readU8(data, offset) as PlanMode;
  offset += 1;

  const state: PlanState = readU8(data, offset) as PlanState;
  offset += 1;

  const beneficiary = readPubkey(data, offset);
  offset += 32;

  const [backupBeneficiary, optSize] = readOptionPubkey(data, offset);
  offset += optSize;

  const inactivityDuration = readI64(data, offset);
  offset += 8;

  const gracePeriod = readI64(data, offset);
  offset += 8;

  const lastHeartbeat = readI64(data, offset);
  offset += 8;

  const guardianSet = readPubkey(data, offset);
  offset += 32;

  const guardianQuorum = readU8(data, offset);
  offset += 1;

  const createdAt = readI64(data, offset);
  offset += 8;

  const updatedAt = readI64(data, offset);
  offset += 8;

  const vaultAuthorityBump = readU8(data, offset);
  offset += 1;

  const protectedLamports = readU64(data, offset);
  offset += 8;

  const emergencyBucketLamports = readU64(data, offset);
  offset += 8;

  const bump = readU8(data, offset);

  return {
    owner,
    planId,
    mode,
    state,
    beneficiary,
    backupBeneficiary,
    inactivityDuration,
    gracePeriod,
    lastHeartbeat,
    guardianSet,
    guardianQuorum,
    createdAt,
    updatedAt,
    vaultAuthorityBump,
    protectedLamports,
    emergencyBucketLamports,
    bump,
  };
}

/**
 * Parse raw GuardianSetAccount data.
 * Layout (after 8-byte discriminator):
 *   plan:       32
 *   guardians:  4 + N×32 (Vec<Pubkey>)
 *   quorum:     1 (u8)
 *   update_delay: 8 (i64)
 *   bump:       1 (u8)
 */
export function parseGuardianSetAccount(data: Buffer): ParsedGuardianSet {
  checkDiscriminator(data, GUARDIAN_SET_DISCRIMINATOR, 'GuardianSetAccount');

  let offset = DISCRIMINATOR_SIZE;

  const plan = readPubkey(data, offset);
  offset += 32;

  const [guardians, vecSize] = readVecPubkey(data, offset);
  offset += vecSize;

  const quorum = readU8(data, offset);
  offset += 1;

  const updateDelay = readI64(data, offset);
  offset += 8;

  const bump = readU8(data, offset);

  return { plan, guardians, quorum, updateDelay, bump };
}

/**
 * Parse raw ClaimAccount data.
 * Layout (after 8-byte discriminator):
 *   plan:           32
 *   claimant:       32
 *   state:          1
 *   started_at:     8 (i64)
 *   grace_deadline: 8 (i64)
 *   approvals:      4 + N×32 (Vec<Pubkey>)
 *   vetoes:         4 + N×32 (Vec<Pubkey>)
 *   bump:           1 (u8)
 */
export function parseClaimAccount(data: Buffer): ParsedClaim {
  checkDiscriminator(data, CLAIM_DISCRIMINATOR, 'ClaimAccount');

  let offset = DISCRIMINATOR_SIZE;

  const plan = readPubkey(data, offset);
  offset += 32;

  const claimant = readPubkey(data, offset);
  offset += 32;

  const state: ClaimState = readU8(data, offset) as ClaimState;
  offset += 1;

  const startedAt = readI64(data, offset);
  offset += 8;

  const graceDeadline = readI64(data, offset);
  offset += 8;

  const [approvals, approvalsSize] = readVecPubkey(data, offset);
  offset += approvalsSize;

  const [vetoes, vetoesSize] = readVecPubkey(data, offset);
  offset += vetoesSize;

  const bump = readU8(data, offset);

  return { plan, claimant, state, startedAt, graceDeadline, approvals, vetoes, bump };
}

// ─── Fetch Helpers ───────────────────────────────────────────────────────────

/** Owner offset in PlanAccount: 8 (discriminator) */
const PLAN_OWNER_OFFSET = DISCRIMINATOR_SIZE;

/**
 * Fetch all plans owned by a specific wallet.
 * Uses memcmp filter at offset 8 (owner field, right after discriminator).
 * Results are sorted by updatedAt descending (most recently updated first).
 */
export async function fetchPlansByOwner(
  connection: Connection,
  owner: PublicKey,
): Promise<PlanWithAddress[]> {
  const filters: GetProgramAccountsFilter[] = [
    { memcmp: { offset: 0, bytes: PLAN_DISCRIMINATOR.toString('base64'), encoding: 'base64' } },
    { memcmp: { offset: PLAN_OWNER_OFFSET, bytes: owner.toBase58() } },
  ];

  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters,
    commitment: 'confirmed',
  });

  const plans: PlanWithAddress[] = [];

  for (const { pubkey, account } of accounts) {
    try {
      const parsed = parsePlanAccount(Buffer.from(account.data));
      // vaultLamports = protectedLamports (total vault balance).
      // emergencyBucketLamports is a subset cap, not additional funds.
      const vaultLamports = BigInt(parsed.protectedLamports);
      plans.push({ ...parsed, address: pubkey, vaultLamports });
    } catch {
      // Skip accounts that fail to parse (e.g., corrupted or wrong version)
    }
  }

  // Sort by updatedAt descending
  plans.sort((a, b) => {
    const diff = b.updatedAt - a.updatedAt;
    if (diff > 0n) return 1;
    if (diff < 0n) return -1;
    return 0;
  });

  return plans;
}

/**
 * Fetch a single plan by its PDA address.
 * Returns null if the account doesn't exist.
 */
export async function fetchPlan(
  connection: Connection,
  planPda: PublicKey,
): Promise<PlanAccountData | null> {
  const account = await connection.getAccountInfo(planPda, 'confirmed');
  if (!account) return null;
  return parsePlanAccount(Buffer.from(account.data));
}

/**
 * Fetch a guardian set by its PDA address.
 * Returns null if the account doesn't exist.
 */
export async function fetchGuardianSet(
  connection: Connection,
  guardianSetPda: PublicKey,
): Promise<ParsedGuardianSet | null> {
  const account = await connection.getAccountInfo(guardianSetPda, 'confirmed');
  if (!account) return null;
  return parseGuardianSetAccount(Buffer.from(account.data));
}

/**
 * Fetch a claim by its PDA address.
 * Returns null if the account doesn't exist (no active claim).
 */
export async function fetchClaim(
  connection: Connection,
  claimPda: PublicKey,
): Promise<ParsedClaim | null> {
  const account = await connection.getAccountInfo(claimPda, 'confirmed');
  if (!account) return null;
  return parseClaimAccount(Buffer.from(account.data));
}
