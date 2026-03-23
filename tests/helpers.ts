/**
 * Shared test helpers for Anchor integration tests.
 *
 * Provides:
 * - Bankrun-based test environment with time-warp support
 * - Typed fixtures for PDA derivation and composite setup
 * - Error assertion helpers for Anchor custom errors
 * - Account fetchers with null-safety
 */
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { startAnchor, BankrunProvider } from 'anchor-bankrun';
import { ProgramTestContext, Clock } from 'solana-bankrun';
import { expect } from 'chai';
import type { Lifeline } from '../target/types/lifeline';

// Re-export the IDL for use in test files
const IDL = require('../target/idl/lifeline.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TestContext = {
  owner: Keypair;
  beneficiary: Keypair;
  backupBeneficiary: Keypair;
  guardian1: Keypair;
  guardian2: Keypair;
  guardian3: Keypair;
};

export type PlanFixture = {
  planId: anchor.BN;
  planPda: PublicKey;
  guardianSetPda: PublicKey;
  claimPda: PublicKey;
  vaultAuthorityPda: PublicKey;
  solVaultPda: PublicKey;
};

// ---------------------------------------------------------------------------
// PDA Seeds
// ---------------------------------------------------------------------------

export const SEEDS = {
  PLAN: Buffer.from('plan'),
  GUARDIAN_SET: Buffer.from('guardian_set'),
  CLAIM: Buffer.from('claim'),
  VAULT_AUTHORITY: Buffer.from('vault_authority'),
  SOL_VAULT: Buffer.from('sol_vault'),
};

// ---------------------------------------------------------------------------
// Plan defaults
// ---------------------------------------------------------------------------

export const DEFAULT_PLAN_PARAMS = {
  inactivityDuration: new anchor.BN(86_400),   // 1 day (MIN_INACTIVITY)
  gracePeriod: new anchor.BN(3_600),           // 1 hour (MIN_GRACE)
  guardianQuorum: 2,
  mode: { medical: {} },
};

export const PLAN_MODES = {
  medical: { medical: {} },
  legalRisk: { legalRisk: {} },
  legacy: { legacy: {} },
};

// ---------------------------------------------------------------------------
// Global state — initialized once per test suite via initTestEnvironment()
// ---------------------------------------------------------------------------

let _bankrunContext: ProgramTestContext;
let _provider: BankrunProvider;
let _program: Program<Lifeline>;

/** Monotonic plan ID counter to avoid PDA collisions between tests. */
let _planIdCounter = 100;

// ---------------------------------------------------------------------------
// Environment bootstrap
// ---------------------------------------------------------------------------

/**
 * Initialize the bankrun test environment.
 * Call once in `before()` at the suite level.
 */
export async function initTestEnvironment(): Promise<void> {
  _bankrunContext = await startAnchor('.', [], []);
  _provider = new BankrunProvider(_bankrunContext);
  anchor.setProvider(_provider as unknown as anchor.AnchorProvider);
  _program = new anchor.Program(IDL, _provider as unknown as anchor.AnchorProvider) as unknown as Program<Lifeline>;
}

export function getProvider(): anchor.AnchorProvider {
  return _provider as unknown as anchor.AnchorProvider;
}

export function getProgram(): Program<Lifeline> {
  return _program;
}

export function getBankrunContext(): ProgramTestContext {
  return _bankrunContext;
}

/** Returns a fresh unique plan ID for each test case. */
export function nextPlanId(): anchor.BN {
  return new anchor.BN(++_planIdCounter);
}

// ---------------------------------------------------------------------------
// Context & funding
// ---------------------------------------------------------------------------

export function createTestContext(): TestContext {
  return {
    owner: Keypair.generate(),
    beneficiary: Keypair.generate(),
    backupBeneficiary: Keypair.generate(),
    guardian1: Keypair.generate(),
    guardian2: Keypair.generate(),
    guardian3: Keypair.generate(),
  };
}

/**
 * Fund a signer by setting their account balance directly in bankrun.
 * BankrunProvider's connection doesn't support requestAirdrop,
 * so we use context.setAccount() to set lamport balance.
 */
export async function fundSigner(
  _provider: anchor.AnchorProvider,
  pubkey: PublicKey,
  sol: number = 10,
): Promise<void> {
  const context = getBankrunContext();
  const lamports = sol * LAMPORTS_PER_SOL;
  context.setAccount(pubkey, {
    lamports,
    data: Buffer.alloc(0),
    owner: SystemProgram.programId,
    executable: false,
  } as any);
}

/**
 * Fund all signers in a TestContext: owner, beneficiary, backupBeneficiary,
 * and all three guardians. Necessary so that any of them can pay TX fees.
 */
export async function fundContext(
  provider: anchor.AnchorProvider,
  ctx: TestContext,
): Promise<void> {
  const signers = [
    ctx.owner.publicKey,
    ctx.beneficiary.publicKey,
    ctx.backupBeneficiary.publicKey,
    ctx.guardian1.publicKey,
    ctx.guardian2.publicKey,
    ctx.guardian3.publicKey,
  ];
  for (const pk of signers) {
    await fundSigner(provider, pk, 10);
  }
}

// ---------------------------------------------------------------------------
// PDA derivation
// ---------------------------------------------------------------------------

/** Derive all PDAs for a given plan. */
export function derivePlanPDAs(
  programId: PublicKey,
  owner: PublicKey,
  planId: anchor.BN,
): PlanFixture {
  const planIdBuf = planId.toArrayLike(Buffer, 'le', 8);
  const [planPda] = PublicKey.findProgramAddressSync(
    [SEEDS.PLAN, owner.toBuffer(), planIdBuf],
    programId,
  );
  const [guardianSetPda] = PublicKey.findProgramAddressSync(
    [SEEDS.GUARDIAN_SET, planPda.toBuffer()],
    programId,
  );
  const [claimPda] = PublicKey.findProgramAddressSync(
    [SEEDS.CLAIM, planPda.toBuffer()],
    programId,
  );
  const [vaultAuthorityPda] = PublicKey.findProgramAddressSync(
    [SEEDS.VAULT_AUTHORITY, planPda.toBuffer()],
    programId,
  );
  const [solVaultPda] = PublicKey.findProgramAddressSync(
    [SEEDS.SOL_VAULT, planPda.toBuffer()],
    programId,
  );

  return { planId, planPda, guardianSetPda, claimPda, vaultAuthorityPda, solVaultPda };
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/**
 * Assert that a promise rejects with a specific Anchor custom error code.
 * Matches against the error name string (e.g. "InvalidTimingParameter").
 */
export async function expectAnchorError(
  promise: Promise<unknown>,
  errorName: string,
): Promise<void> {
  try {
    await promise;
    expect.fail(`Expected error "${errorName}" but call succeeded`);
  } catch (err: any) {
    // Anchor wraps program errors in AnchorError
    const errStr = err.toString();
    expect(
      errStr.includes(errorName),
      `Expected error containing "${errorName}" but got: ${errStr}`,
    ).to.be.true;
  }
}

// ---------------------------------------------------------------------------
// Account fetchers
// ---------------------------------------------------------------------------

export async function fetchPlan(
  program: Program<Lifeline>,
  planPda: PublicKey,
): Promise<any> {
  return (program.account as any).planAccount.fetch(planPda);
}

export async function fetchClaim(
  program: Program<Lifeline>,
  claimPda: PublicKey,
): Promise<any> {
  return (program.account as any).claimAccount.fetch(claimPda);
}

export async function fetchGuardianSet(
  program: Program<Lifeline>,
  guardianSetPda: PublicKey,
): Promise<any> {
  return (program.account as any).guardianSetAccount.fetch(guardianSetPda);
}

/**
 * Assert that an account has been closed (no longer exists on-chain).
 * Bankrun throws "Could not find ..." for non-existent accounts instead
 * of returning null, so we catch that error as success.
 */
export async function expectAccountClosed(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
): Promise<void> {
  try {
    const info = await connection.getAccountInfo(pubkey);
    // If we get here without error, the account still exists
    expect(info, `Expected account ${pubkey.toBase58()} to be closed`).to.be.null;
  } catch (err: any) {
    // Bankrun throws "Could not find <pubkey>" for closed accounts — that's success
    if (err.message && err.message.includes('Could not find')) {
      return; // Account is closed — test passes
    }
    throw err; // Re-throw unexpected errors
  }
}

// ---------------------------------------------------------------------------
// Composite fixtures — wrap target instructions for DRY setup
// ---------------------------------------------------------------------------

/**
 * Create a plan via initializePlan. Returns PlanFixture with all PDAs.
 * Does NOT call the target instruction under test — safe to use in beforeEach.
 */
export async function createPlanFixture(args: {
  program: Program<Lifeline>;
  provider: anchor.AnchorProvider;
  ctx: TestContext;
  planId?: anchor.BN;
  inactivityDuration?: anchor.BN;
  gracePeriod?: anchor.BN;
  guardianQuorum?: number;
  mode?: any;
  backupBeneficiary?: PublicKey | null;
}): Promise<PlanFixture> {
  const {
    program,
    ctx,
    planId = nextPlanId(),
    inactivityDuration = DEFAULT_PLAN_PARAMS.inactivityDuration,
    gracePeriod = DEFAULT_PLAN_PARAMS.gracePeriod,
    guardianQuorum = DEFAULT_PLAN_PARAMS.guardianQuorum,
    mode = DEFAULT_PLAN_PARAMS.mode,
    backupBeneficiary = null,
  } = args;

  const fixture = derivePlanPDAs(program.programId, ctx.owner.publicKey, planId);

  await (program.methods as any)
    .initializePlan(
      planId,
      mode,
      ctx.beneficiary.publicKey,
      backupBeneficiary,
      inactivityDuration,
      gracePeriod,
      guardianQuorum,
    )
    .accounts({
      owner: ctx.owner.publicKey,
      plan: fixture.planPda,
      guardianSet: fixture.guardianSetPda,
      vaultAuthority: fixture.vaultAuthorityPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([ctx.owner])
    .rpc();

  return fixture;
}

/**
 * Explicitly activate a plan (Draft → Active).
 */
export async function activatePlanFixture(args: {
  program: Program<Lifeline>;
  ctx: TestContext;
  fixture: PlanFixture;
}): Promise<void> {
  const { program, ctx, fixture } = args;
  await (program.methods as any)
    .activatePlan()
    .accounts({
      owner: ctx.owner.publicKey,
      plan: fixture.planPda,
    })
    .signers([ctx.owner])
    .rpc();
}

/**
 * Deposit SOL into the plan vault.
 * Also auto-activates Draft → Active as per on-chain logic.
 */
export async function depositSolFixture(args: {
  program: Program<Lifeline>;
  ctx: TestContext;
  fixture: PlanFixture;
  amountLamports: anchor.BN;
}): Promise<void> {
  const { program, ctx, fixture, amountLamports } = args;
  await (program.methods as any)
    .depositSol(amountLamports)
    .accounts({
      owner: ctx.owner.publicKey,
      plan: fixture.planPda,
      solVault: fixture.solVaultPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([ctx.owner])
    .rpc();
}

/**
 * Add a guardian to the plan's guardian set.
 */
export async function addGuardianFixture(args: {
  program: Program<Lifeline>;
  ctx: TestContext;
  fixture: PlanFixture;
  guardian: PublicKey;
}): Promise<void> {
  const { program, ctx, fixture, guardian } = args;
  await (program.methods as any)
    .addGuardian(guardian)
    .accounts({
      owner: ctx.owner.publicKey,
      plan: fixture.planPda,
      guardianSet: fixture.guardianSetPda,
    })
    .signers([ctx.owner])
    .rpc();
}

// ---------------------------------------------------------------------------
// Time-warp helpers (bankrun only)
// ---------------------------------------------------------------------------

/**
 * Warp chain clock past lastHeartbeat + inactivityDuration.
 * After warp, beneficiary can call startClaim().
 */
export async function warpPastInactivityWindow(args: {
  provider: anchor.AnchorProvider;
  program: Program<Lifeline>;
  planPda: PublicKey;
  marginSeconds?: number;
}): Promise<void> {
  const { program, planPda, marginSeconds = 5 } = args;
  const plan = await fetchPlan(program, planPda);
  const targetTime =
    plan.lastHeartbeat.toNumber() +
    plan.inactivityDuration.toNumber() +
    marginSeconds;

  await warpToTimestamp(targetTime);
}

/**
 * Warp chain clock past the claim's grace deadline.
 * After warp, owner can no longer cancelClaim();
 * beneficiary may finalize if guardians empty or quorum==0.
 */
export async function warpPastGraceDeadline(args: {
  provider: anchor.AnchorProvider;
  program: Program<Lifeline>;
  claimPda: PublicKey;
  marginSeconds?: number;
}): Promise<void> {
  const { program, claimPda, marginSeconds = 1 } = args;
  const claim = await fetchClaim(program, claimPda);
  const targetTime = claim.graceDeadline.toNumber() + marginSeconds;

  await warpToTimestamp(targetTime);
}

/**
 * Low-level: set bankrun clock to a specific unix timestamp.
 * Advances slot by 1 to ensure the new timestamp takes effect.
 */
async function warpToTimestamp(unixTimestamp: number): Promise<void> {
  const context = getBankrunContext();
  const currentClock = await context.banksClient.getClock();
  const newSlot = currentClock.slot + BigInt(1);

  context.setClock(
    new Clock(
      newSlot,
      currentClock.epochStartTimestamp,
      currentClock.epoch,
      currentClock.leaderScheduleEpoch,
      BigInt(unixTimestamp),
    ),
  );
}
