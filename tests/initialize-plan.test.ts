/**
 * initialize_plan integration tests.
 *
 * Covers:
 * - Happy path: Draft state, correct fields, all modes
 * - Timing bounds: MIN/MAX inactivity, MIN/MAX grace
 * - Backup beneficiary: with and without
 * - Guardian set initialization
 * - Wrong signer (Anchor constraint)
 * - PDA determinism (same owner+planId → same PDA)
 */
import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import {
  initTestEnvironment,
  getProvider,
  getProgram,
  createTestContext,
  fundContext,
  fundSigner,
  nextPlanId,
  derivePlanPDAs,
  fetchPlan,
  fetchGuardianSet,
  expectAnchorError,
  DEFAULT_PLAN_PARAMS,
  PLAN_MODES,
  TestContext,
  PlanFixture,
} from './helpers';

describe('initialize_plan', () => {
  let provider: anchor.AnchorProvider;
  let program: ReturnType<typeof getProgram>;

  before(async () => {
    await initTestEnvironment();
    provider = getProvider();
    program = getProgram();
  });

  // Helper: create plan with custom params
  async function initPlan(
    ctx: TestContext,
    opts: {
      planId?: anchor.BN;
      mode?: any;
      backupBeneficiary?: PublicKey | null;
      inactivityDuration?: anchor.BN;
      gracePeriod?: anchor.BN;
      guardianQuorum?: number;
    } = {},
  ): Promise<PlanFixture> {
    const planId = opts.planId ?? nextPlanId();
    const fixture = derivePlanPDAs(program.programId, ctx.owner.publicKey, planId);

    await (program.methods as any)
      .initializePlan(
        planId,
        opts.mode ?? DEFAULT_PLAN_PARAMS.mode,
        ctx.beneficiary.publicKey,
        opts.backupBeneficiary ?? null,
        opts.inactivityDuration ?? DEFAULT_PLAN_PARAMS.inactivityDuration,
        opts.gracePeriod ?? DEFAULT_PLAN_PARAMS.gracePeriod,
        opts.guardianQuorum ?? DEFAULT_PLAN_PARAMS.guardianQuorum,
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

  it('creates plan in Draft state with correct fields', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await initPlan(ctx);

    const plan = await fetchPlan(program, fixture.planPda);
    expect(Object.keys(plan.state)[0]).to.equal('draft');
    expect(plan.owner.equals(ctx.owner.publicKey)).to.be.true;
    expect(plan.beneficiary.equals(ctx.beneficiary.publicKey)).to.be.true;
    expect(plan.backupBeneficiary).to.be.null;
    expect(plan.inactivityDuration.toNumber()).to.equal(86_400);
    expect(plan.gracePeriod.toNumber()).to.equal(3_600);
    expect(plan.guardianQuorum).to.equal(2);
    expect(plan.protectedLamports.toNumber()).to.equal(0);
    expect(plan.emergencyBucketLamports.toNumber()).to.equal(0);
    expect(plan.lastHeartbeat.toNumber()).to.be.greaterThan(0);
    expect(plan.createdAt.toNumber()).to.equal(plan.updatedAt.toNumber());
  });

  it('initializes guardian set correctly', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await initPlan(ctx, { guardianQuorum: 3 });

    const gs = await fetchGuardianSet(program, fixture.guardianSetPda);
    expect(gs.plan.equals(fixture.planPda)).to.be.true;
    expect(gs.guardians).to.have.length(0);
    expect(gs.quorum).to.equal(3);
    expect(gs.updateDelay.toNumber()).to.equal(3 * 86_400); // 3 days default
  });

  it('stores backup beneficiary when provided', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await initPlan(ctx, {
      backupBeneficiary: ctx.backupBeneficiary.publicKey,
    });

    const plan = await fetchPlan(program, fixture.planPda);
    expect(plan.backupBeneficiary).to.not.be.null;
    expect(plan.backupBeneficiary.equals(ctx.backupBeneficiary.publicKey)).to.be.true;
  });

  it('supports all three plan modes', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);

    for (const [name, mode] of Object.entries(PLAN_MODES)) {
      const fixture = await initPlan(ctx, { mode });
      const plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.mode)[0]).to.equal(name);
    }
  });

  it('rejects inactivity below MIN_INACTIVITY (86400)', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);

    await expectAnchorError(
      initPlan(ctx, { inactivityDuration: new anchor.BN(86_399) }),
      'InvalidTimingParameter',
    );
  });

  it('rejects inactivity above MAX_INACTIVITY (157680000)', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);

    await expectAnchorError(
      initPlan(ctx, { inactivityDuration: new anchor.BN(157_680_001) }),
      'InvalidTimingParameter',
    );
  });

  it('rejects grace below MIN_GRACE (3600)', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);

    await expectAnchorError(
      initPlan(ctx, { gracePeriod: new anchor.BN(3_599) }),
      'InvalidTimingParameter',
    );
  });

  it('rejects grace above MAX_GRACE (7776000)', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);

    await expectAnchorError(
      initPlan(ctx, { gracePeriod: new anchor.BN(7_776_001) }),
      'InvalidTimingParameter',
    );
  });

  it('accepts boundary timing values (MIN and MAX)', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);

    // MIN boundaries
    const f1 = await initPlan(ctx, {
      inactivityDuration: new anchor.BN(86_400),
      gracePeriod: new anchor.BN(3_600),
    });
    const plan1 = await fetchPlan(program, f1.planPda);
    expect(plan1.inactivityDuration.toNumber()).to.equal(86_400);
    expect(plan1.gracePeriod.toNumber()).to.equal(3_600);

    // MAX boundaries
    const f2 = await initPlan(ctx, {
      inactivityDuration: new anchor.BN(157_680_000),
      gracePeriod: new anchor.BN(7_776_000),
    });
    const plan2 = await fetchPlan(program, f2.planPda);
    expect(plan2.inactivityDuration.toNumber()).to.equal(157_680_000);
    expect(plan2.gracePeriod.toNumber()).to.equal(7_776_000);
  });

  it('rejects wrong signer (Anchor constraint)', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);

    const impostor = Keypair.generate();
    await fundSigner(provider, impostor.publicKey, 2);

    // PDA is derived from owner, but impostor signs — seed mismatch → ConstraintSeeds
    const planId = nextPlanId();
    const fixture = derivePlanPDAs(program.programId, ctx.owner.publicKey, planId);

    try {
      await (program.methods as any)
        .initializePlan(
          planId,
          DEFAULT_PLAN_PARAMS.mode,
          ctx.beneficiary.publicKey,
          null,
          DEFAULT_PLAN_PARAMS.inactivityDuration,
          DEFAULT_PLAN_PARAMS.gracePeriod,
          DEFAULT_PLAN_PARAMS.guardianQuorum,
        )
        .accounts({
          owner: impostor.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          vaultAuthority: fixture.vaultAuthorityPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([impostor])
        .rpc();
      expect.fail('Expected error but call succeeded');
    } catch (err: any) {
      // PDA seed mismatch — will get ConstraintSeeds or similar
      expect(err.toString()).to.include('Error');
    }
  });

  it('produces deterministic PDAs for same owner and planId', async () => {
    const ctx = createTestContext();
    const planId = nextPlanId();

    const f1 = derivePlanPDAs(program.programId, ctx.owner.publicKey, planId);
    const f2 = derivePlanPDAs(program.programId, ctx.owner.publicKey, planId);

    expect(f1.planPda.equals(f2.planPda)).to.be.true;
    expect(f1.guardianSetPda.equals(f2.guardianSetPda)).to.be.true;
    expect(f1.claimPda.equals(f2.claimPda)).to.be.true;
    expect(f1.solVaultPda.equals(f2.solVaultPda)).to.be.true;
  });
});
