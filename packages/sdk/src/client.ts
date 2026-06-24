import { Connection, PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { PROGRAM_ID } from '@thinkxx/config';
import { derivePlanPda, deriveGuardianSetPda, deriveSolVaultPda, deriveVaultAuthorityPda, deriveClaimPda } from './pda';

const INSTRUCTION_DISCRIMINATORS = {
  initialize_plan: Buffer.from('cfa1e6c2564da908', 'hex'),
  heartbeat: Buffer.from('ca683806f0aa3f86', 'hex'),
  deposit_sol: Buffer.from('6c514e757d9b38c8', 'hex'),
  start_claim: Buffer.from('bde6077e060a785c', 'hex'),
  cancel_claim: Buffer.from('b301d4315190dd8c', 'hex'),
  activate_plan: Buffer.from('bc9ac33525df1366', 'hex'),
  pause_plan: Buffer.from('d0c8a0abd45ef9e9', 'hex'),
  resume_plan: Buffer.from('43adfb2aa92284a1', 'hex'),
  add_guardian: Buffer.from('a7bdaa1b4af0c9f1', 'hex'),
  remove_guardian: Buffer.from('4875a0f49bb94712', 'hex'),
  approve_claim: Buffer.from('4ae4d33f8cff45d2', 'hex'),
  veto_claim: Buffer.from('7ee2aa1de02ea419', 'hex'),
  finalize_claim: Buffer.from('56a2caf1887d3495', 'hex'),
  set_emergency_bucket: Buffer.from('36ef72adba3576b2', 'hex'),
  emergency_withdraw: Buffer.from('ef2dcb409649da5c', 'hex'),
} as const;

/**
 * Plan mode enum — matches the Rust PlanMode on-chain.
 */
export enum PlanMode {
  Medical = 0,
  LegalRisk = 1,
  Legacy = 2,
}

/**
 * Plan state enum — mirrors PlanState on-chain.
 */
export enum PlanState {
  Draft = 0,
  Active = 1,
  ClaimPending = 2,
  ClaimApproved = 3,
  Claimed = 4,
  Cancelled = 5,
  Paused = 6,
}

/**
 * On-chain plan account data (deserialized).
 */
export interface PlanAccountData {
  owner: PublicKey;
  planId: bigint;
  mode: PlanMode;
  state: PlanState;
  beneficiary: PublicKey;
  backupBeneficiary: PublicKey | null;
  inactivityDuration: bigint;
  gracePeriod: bigint;
  lastHeartbeat: bigint;
  guardianSet: PublicKey;
  guardianQuorum: number;
  createdAt: bigint;
  updatedAt: bigint;
  vaultAuthorityBump: number;
  protectedLamports: bigint;
  emergencyBucketLamports: bigint;
  bump: number;
}

/** Parameters for creating a new plan. */
export interface CreatePlanParams {
  planId: bigint;
  mode: PlanMode;
  beneficiary: PublicKey;
  backupBeneficiary?: PublicKey;
  inactivityDuration: bigint;
  gracePeriod: bigint;
  guardianQuorum: number;
}

/** Claim lifecycle state — mirrors ClaimState on-chain. */
export enum ClaimState {
  Pending = 0,
  Approved = 1,
  Vetoed = 2,
  Finalized = 3,
  Cancelled = 4,
}

/** On-chain guardian set account (deserialized). */
export interface GuardianSetData {
  plan: PublicKey;
  guardians: PublicKey[];
  quorum: number;
  updateDelay: bigint;
  bump: number;
}

/** On-chain claim account (deserialized). */
export interface ClaimData {
  plan: PublicKey;
  claimant: PublicKey;
  state: ClaimState;
  startedAt: bigint;
  graceDeadline: bigint;
  approvals: PublicKey[];
  vetoes: PublicKey[];
  bump: number;
}

/** A plan account paired with its address and live vault balance. */
export interface PlanSummary {
  address: PublicKey;
  account: PlanAccountData;
  vaultLamports: number;
}

/** Total on-chain size of a PlanAccount (8 discriminator + fields + padding). */
const PLAN_ACCOUNT_SIZE = 270;

/**
 * Minimal sequential reader for Borsh-encoded Anchor account data.
 * Avoids pulling a Borsh dependency to stay React Native friendly.
 */
class BufferReader {
  offset = 0;
  constructor(private readonly buf: Buffer) {}

  pubkey(): PublicKey {
    const key = new PublicKey(this.buf.subarray(this.offset, this.offset + 32));
    this.offset += 32;
    return key;
  }
  u8(): number {
    const v = this.buf.readUInt8(this.offset);
    this.offset += 1;
    return v;
  }
  u32(): number {
    const v = this.buf.readUInt32LE(this.offset);
    this.offset += 4;
    return v;
  }
  u64(): bigint {
    const v = this.buf.readBigUInt64LE(this.offset);
    this.offset += 8;
    return v;
  }
  i64(): bigint {
    const v = this.buf.readBigInt64LE(this.offset);
    this.offset += 8;
    return v;
  }
  optionPubkey(): PublicKey | null {
    return this.u8() === 0 ? null : this.pubkey();
  }
  vecPubkey(): PublicKey[] {
    const n = this.u32();
    const out: PublicKey[] = [];
    for (let i = 0; i < n; i += 1) out.push(this.pubkey());
    return out;
  }
}

/**
 * ThinkxxClient — SDK for interacting with the Lifeline protocol.
 *
 * This client builds transaction instructions for all protocol operations.
 * Signing and sending is handled by the caller (MWA or CLI).
 */
export class ThinkxxClient {
  public readonly connection: Connection;
  private readonly programId: PublicKey;

  constructor(
    connection: Connection,
    programId: PublicKey = PROGRAM_ID,
  ) {
    this.connection = connection;
    this.programId = programId;
  }

  /**
   * Build instruction to initialize a new plan.
   * Returns the instruction and derived PDA addresses.
   */
  buildInitializePlan(
    owner: PublicKey,
    params: CreatePlanParams,
  ): { instruction: TransactionInstruction; planPda: PublicKey; guardianSetPda: PublicKey } {
    const [planPda] = derivePlanPda(owner, params.planId);
    const [guardianSetPda] = deriveGuardianSetPda(planPda);
    const [vaultAuthority] = deriveVaultAuthorityPda(planPda);

    // Borsh-serialize instruction data
    // Discriminator for initialize_plan + args
    const data = this.encodeInitializePlan(params);

    const keys = [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: planPda, isSigner: false, isWritable: true },
      { pubkey: guardianSetPda, isSigner: false, isWritable: true },
      { pubkey: vaultAuthority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys,
      data,
    });

    return { instruction, planPda, guardianSetPda };
  }

  /**
   * Build instruction for owner heartbeat.
   */
  buildHeartbeat(owner: PublicKey, planPda: PublicKey): TransactionInstruction {
    const discriminator = this.getDiscriminator('heartbeat');

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: planPda, isSigner: false, isWritable: true },
      ],
      data: discriminator,
    });
  }

  /**
   * Build instruction to deposit SOL into the plan vault.
   */
  buildDepositSol(
    owner: PublicKey,
    planPda: PublicKey,
    amount: bigint,
  ): TransactionInstruction {
    const [solVault] = deriveSolVaultPda(planPda);
    const discriminator = this.getDiscriminator('deposit_sol');

    const data = Buffer.alloc(8 + 8);
    discriminator.copy(data, 0);
    data.writeBigUInt64LE(amount, 8);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: planPda, isSigner: false, isWritable: true },
        { pubkey: solVault, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
  }

  /**
   * Build instruction to start a claim as beneficiary.
   */
  buildStartClaim(
    claimant: PublicKey,
    planPda: PublicKey,
  ): TransactionInstruction {
    const [claimPda] = deriveClaimPda(planPda);
    const discriminator = this.getDiscriminator('start_claim');

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: claimant, isSigner: true, isWritable: true },
        { pubkey: planPda, isSigner: false, isWritable: true },
        { pubkey: claimPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: discriminator,
    });
  }

  /**
   * Build instruction to cancel a pending claim as owner.
   */
  buildCancelClaim(
    owner: PublicKey,
    planPda: PublicKey,
    claimPda: PublicKey,
  ): TransactionInstruction {
    const discriminator = this.getDiscriminator('cancel_claim');

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: planPda, isSigner: false, isWritable: true },
        { pubkey: claimPda, isSigner: false, isWritable: true },
      ],
      data: discriminator,
    });
  }

  // --- Phase 4: Plan Lifecycle ---

  /** Activate a plan from Draft → Active. */
  buildActivatePlan(owner: PublicKey, planPda: PublicKey): TransactionInstruction {
    return this.simpleInstruction('activate_plan', [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: planPda, isSigner: false, isWritable: true },
    ]);
  }

  /** Pause an active plan (stops inactivity timer). */
  buildPausePlan(owner: PublicKey, planPda: PublicKey): TransactionInstruction {
    return this.simpleInstruction('pause_plan', [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: planPda, isSigner: false, isWritable: true },
    ]);
  }

  /** Resume a paused plan. */
  buildResumePlan(owner: PublicKey, planPda: PublicKey): TransactionInstruction {
    return this.simpleInstruction('resume_plan', [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: planPda, isSigner: false, isWritable: true },
    ]);
  }

  // --- Phase 4: Guardian Management ---

  /** Add a guardian to a plan's guardian set. */
  buildAddGuardian(
    owner: PublicKey,
    planPda: PublicKey,
    guardianSetPda: PublicKey,
    guardian: PublicKey,
  ): TransactionInstruction {
    const discriminator = this.getDiscriminator('add_guardian');
    const data = Buffer.alloc(8 + 32);
    discriminator.copy(data, 0);
    guardian.toBuffer().copy(data, 8);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: planPda, isSigner: false, isWritable: true },
        { pubkey: guardianSetPda, isSigner: false, isWritable: true },
      ],
      data,
    });
  }

  /** Remove a guardian from a plan's guardian set. */
  buildRemoveGuardian(
    owner: PublicKey,
    planPda: PublicKey,
    guardianSetPda: PublicKey,
    guardian: PublicKey,
  ): TransactionInstruction {
    const discriminator = this.getDiscriminator('remove_guardian');
    const data = Buffer.alloc(8 + 32);
    discriminator.copy(data, 0);
    guardian.toBuffer().copy(data, 8);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: planPda, isSigner: false, isWritable: true },
        { pubkey: guardianSetPda, isSigner: false, isWritable: true },
      ],
      data,
    });
  }

  // --- Phase 4: Claim Flow ---

  /** Guardian approves a pending claim. */
  buildApproveClaim(
    guardian: PublicKey,
    planPda: PublicKey,
    guardianSetPda: PublicKey,
    claimPda: PublicKey,
  ): TransactionInstruction {
    return this.simpleInstruction('approve_claim', [
      { pubkey: guardian, isSigner: true, isWritable: false },
      { pubkey: planPda, isSigner: false, isWritable: false },
      { pubkey: guardianSetPda, isSigner: false, isWritable: false },
      { pubkey: claimPda, isSigner: false, isWritable: true },
    ]);
  }

  /** Guardian vetoes a pending claim (immediately cancels). */
  buildVetoClaim(
    guardian: PublicKey,
    planPda: PublicKey,
    guardianSetPda: PublicKey,
    claimPda: PublicKey,
  ): TransactionInstruction {
    return this.simpleInstruction('veto_claim', [
      { pubkey: guardian, isSigner: true, isWritable: true },
      { pubkey: planPda, isSigner: false, isWritable: true },
      { pubkey: guardianSetPda, isSigner: false, isWritable: false },
      { pubkey: claimPda, isSigner: false, isWritable: true },
    ]);
  }

  /** Finalize an approved claim — transfers vault to claimant. */
  buildFinalizeClaim(
    claimant: PublicKey,
    planPda: PublicKey,
    guardianSetPda: PublicKey,
    claimPda: PublicKey,
  ): TransactionInstruction {
    const [solVault] = deriveSolVaultPda(planPda);
    const [vaultAuthority] = deriveVaultAuthorityPda(planPda);

    return this.simpleInstruction('finalize_claim', [
      { pubkey: claimant, isSigner: true, isWritable: true },
      { pubkey: planPda, isSigner: false, isWritable: true },
      { pubkey: guardianSetPda, isSigner: false, isWritable: false },
      { pubkey: claimPda, isSigner: false, isWritable: true },
      { pubkey: solVault, isSigner: false, isWritable: true },
      { pubkey: vaultAuthority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);
  }

  // --- Phase 4: Emergency Bucket ---

  /** Set the emergency bucket allocation. */
  buildSetEmergencyBucket(
    owner: PublicKey,
    planPda: PublicKey,
    amount: bigint,
  ): TransactionInstruction {
    const discriminator = this.getDiscriminator('set_emergency_bucket');
    const data = Buffer.alloc(8 + 8);
    discriminator.copy(data, 0);
    data.writeBigUInt64LE(amount, 8);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: planPda, isSigner: false, isWritable: true },
      ],
      data,
    });
  }

  /** Owner withdraws from emergency bucket. */
  buildEmergencyWithdraw(
    owner: PublicKey,
    planPda: PublicKey,
    amount: bigint,
  ): TransactionInstruction {
    const [solVault] = deriveSolVaultPda(planPda);
    const [vaultAuthority] = deriveVaultAuthorityPda(planPda);
    const discriminator = this.getDiscriminator('emergency_withdraw');
    const data = Buffer.alloc(8 + 8);
    discriminator.copy(data, 0);
    data.writeBigUInt64LE(amount, 8);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: planPda, isSigner: false, isWritable: true },
        { pubkey: solVault, isSigner: false, isWritable: true },
        { pubkey: vaultAuthority, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
  }

  // --- Helpers ---

  /** Build a simple instruction with no args (discriminator only). */
  private simpleInstruction(
    name: keyof typeof INSTRUCTION_DISCRIMINATORS,
    keys: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>,
  ): TransactionInstruction {
    return new TransactionInstruction({
      programId: this.programId,
      keys,
      data: this.getDiscriminator(name),
    });
  }

  /**
   * Compute Anchor instruction discriminator.
   * Stored as constants to keep the SDK React Native compatible.
   */
  private getDiscriminator(name: keyof typeof INSTRUCTION_DISCRIMINATORS): Buffer {
    return INSTRUCTION_DISCRIMINATORS[name];
  }

  /**
   * Encode initialize_plan instruction data (Borsh).
   */
  private encodeInitializePlan(params: CreatePlanParams): Buffer {
    const discriminator = this.getDiscriminator('initialize_plan');

    // Calculate buffer size
    // 8 discriminator + 8 plan_id + 1 mode + 32 beneficiary
    // + 1 + (0|32) backup_beneficiary option
    // + 8 inactivity_duration + 8 grace_period + 1 guardian_quorum
    const hasBackup = params.backupBeneficiary != null;
    const size = 8 + 8 + 1 + 32 + 1 + (hasBackup ? 32 : 0) + 8 + 8 + 1;
    const buf = Buffer.alloc(size);
    let offset = 0;

    // Discriminator
    discriminator.copy(buf, offset);
    offset += 8;

    // plan_id (u64 LE)
    buf.writeBigUInt64LE(params.planId, offset);
    offset += 8;

    // mode (u8 enum)
    buf.writeUInt8(params.mode, offset);
    offset += 1;

    // beneficiary (Pubkey)
    params.beneficiary.toBuffer().copy(buf, offset);
    offset += 32;

    // backup_beneficiary (Option<Pubkey>)
    if (hasBackup && params.backupBeneficiary) {
      buf.writeUInt8(1, offset);
      offset += 1;
      params.backupBeneficiary.toBuffer().copy(buf, offset);
      offset += 32;
    } else {
      buf.writeUInt8(0, offset);
      offset += 1;
    }

    // inactivity_duration (i64 LE)
    buf.writeBigInt64LE(params.inactivityDuration, offset);
    offset += 8;

    // grace_period (i64 LE)
    buf.writeBigInt64LE(params.gracePeriod, offset);
    offset += 8;

    // guardian_quorum (u8)
    buf.writeUInt8(params.guardianQuorum, offset);

    return buf;
  }

  // --- Account decoding (read path) ---

  /** Decode raw PlanAccount data (skips the 8-byte Anchor discriminator). */
  static decodePlanAccount(data: Buffer): PlanAccountData {
    const r = new BufferReader(data);
    r.offset = 8;
    return {
      owner: r.pubkey(),
      planId: r.u64(),
      mode: r.u8() as PlanMode,
      state: r.u8() as PlanState,
      beneficiary: r.pubkey(),
      backupBeneficiary: r.optionPubkey(),
      inactivityDuration: r.i64(),
      gracePeriod: r.i64(),
      lastHeartbeat: r.i64(),
      guardianSet: r.pubkey(),
      guardianQuorum: r.u8(),
      createdAt: r.i64(),
      updatedAt: r.i64(),
      vaultAuthorityBump: r.u8(),
      protectedLamports: r.u64(),
      emergencyBucketLamports: r.u64(),
      bump: r.u8(),
    };
  }

  /** Decode raw GuardianSetAccount data. */
  static decodeGuardianSet(data: Buffer): GuardianSetData {
    const r = new BufferReader(data);
    r.offset = 8;
    return {
      plan: r.pubkey(),
      guardians: r.vecPubkey(),
      quorum: r.u8(),
      updateDelay: r.i64(),
      bump: r.u8(),
    };
  }

  /** Decode raw ClaimAccount data. */
  static decodeClaim(data: Buffer): ClaimData {
    const r = new BufferReader(data);
    r.offset = 8;
    return {
      plan: r.pubkey(),
      claimant: r.pubkey(),
      state: r.u8() as ClaimState,
      startedAt: r.i64(),
      graceDeadline: r.i64(),
      approvals: r.vecPubkey(),
      vetoes: r.vecPubkey(),
      bump: r.u8(),
    };
  }

  // --- Account fetching (read path) ---

  /** Fetch and decode a plan account; null if it does not exist. */
  async fetchPlan(planPda: PublicKey): Promise<PlanAccountData | null> {
    const info = await this.connection.getAccountInfo(planPda);
    if (!info) return null;
    return ThinkxxClient.decodePlanAccount(info.data as Buffer);
  }

  /** Fetch and decode a guardian set account; null if it does not exist. */
  async fetchGuardianSet(guardianSetPda: PublicKey): Promise<GuardianSetData | null> {
    const info = await this.connection.getAccountInfo(guardianSetPda);
    if (!info) return null;
    return ThinkxxClient.decodeGuardianSet(info.data as Buffer);
  }

  /** Fetch and decode the active claim for a plan; null if none exists. */
  async fetchClaim(claimPda: PublicKey): Promise<ClaimData | null> {
    const info = await this.connection.getAccountInfo(claimPda);
    if (!info) return null;
    return ThinkxxClient.decodeClaim(info.data as Buffer);
  }

  /** Lamports currently held in a plan's SOL vault. */
  async fetchVaultLamports(planPda: PublicKey): Promise<number> {
    const [solVault] = deriveSolVaultPda(planPda);
    return this.connection.getBalance(solVault);
  }

  /** Fetch all plans owned by `owner`, each with its live vault balance. */
  async fetchPlansByOwner(owner: PublicKey): Promise<PlanSummary[]> {
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [
        { dataSize: PLAN_ACCOUNT_SIZE },
        { memcmp: { offset: 8, bytes: owner.toBase58() } },
      ],
    });

    const summaries: PlanSummary[] = [];
    for (const { pubkey, account } of accounts) {
      try {
        const decoded = ThinkxxClient.decodePlanAccount(account.data as Buffer);
        const vaultLamports = await this.fetchVaultLamports(pubkey);
        summaries.push({ address: pubkey, account: decoded, vaultLamports });
      } catch {
        // Skip accounts that fail to decode (forward-compat / corrupt data).
      }
    }
    return summaries;
  }
}
