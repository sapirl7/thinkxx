import { Connection, PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { PROGRAM_ID } from '@thinkxx/config';
import { derivePlanPda, deriveGuardianSetPda, deriveSolVaultPda, deriveVaultAuthorityPda, deriveClaimPda } from './pda';

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
    name: string,
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
   * SHA256("global:<instruction_name>")[0..8]
   */
  private getDiscriminator(name: string): Buffer {
    const { createHash } = require('crypto');
    const hash = createHash('sha256').update(`global:${name}`).digest();
    return Buffer.from(hash.subarray(0, 8));
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
}
