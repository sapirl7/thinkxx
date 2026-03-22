/**
 * heartbeat integration tests.
 *
 * Covers:
 * - Happy path on Draft plan: updates last_heartbeat
 * - Happy path on Active plan: updates last_heartbeat
 * - Owner-only: non-owner rejected (NotOwner)
 * - Rejected on Paused plan (InvalidPlanState)
 * - Rejected on ClaimPending plan (InvalidPlanState)
 */
import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import {
  initTestEnvironment,
  getProvider,
  getProgram,
  getBankrunContext,
  createTestContext,
  fundContext,
  fundSigner,
  createPlanFixture,
  depositSolFixture,
  addGuardianFixture,
  fetchPlan,
  expectAnchorError,
  warpPastInactivityWindow,
  DEFAULT_PLAN_PARAMS,
  TestContext,
  PlanFixture,
} from './helpers';

describe('heartbeat', () => {
  let provider: anchor.AnchorProvider;
  let program: ReturnType<typeof getProgram>;

  before(async () => {
    await initTestEnvironment();
    provider = getProvider();
    program = getProgram();
  });

  async function sendHeartbeat(ctx: TestContext, fixture: PlanFixture): Promise<void> {
    await (program.methods as any)
      .heartbeat()
      .accounts({
        owner: ctx.owner.publicKey,
        plan: fixture.planPda,
      })
      .signers([ctx.owner])
      .rpc();
  }

  it('updates last_heartbeat on Draft plan', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({ program, provider, ctx });

    const planBefore = await fetchPlan(program, fixture.planPda);
    const hbBefore = planBefore.lastHeartbeat.toNumber();

    // Advance clock by 100s
    const context = getBankrunContext();
    const clock = await context.banksClient.getClock();
    const { Clock } = await import('solana-bankrun');
    context.setClock(new Clock(
      clock.slot + BigInt(1),
      clock.epochStartTimestamp,
      clock.epoch,
      clock.leaderScheduleEpoch,
      clock.unixTimestamp + BigInt(100),
    ));

    await sendHeartbeat(ctx, fixture);

    const planAfter = await fetchPlan(program, fixture.planPda);
    expect(planAfter.lastHeartbeat.toNumber()).to.be.greaterThan(hbBefore);
    expect(planAfter.updatedAt.toNumber()).to.equal(planAfter.lastHeartbeat.toNumber());
  });

  it('updates last_heartbeat on Active plan', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({ program, provider, ctx });

    // Activate via deposit
    await depositSolFixture({
      program, ctx, fixture,
      amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
    });

    const planActive = await fetchPlan(program, fixture.planPda);
    expect(Object.keys(planActive.state)[0]).to.equal('active');
    const hbBefore = planActive.lastHeartbeat.toNumber();

    // Advance clock
    const context = getBankrunContext();
    const clock = await context.banksClient.getClock();
    const { Clock } = await import('solana-bankrun');
    context.setClock(new Clock(
      clock.slot + BigInt(1),
      clock.epochStartTimestamp,
      clock.epoch,
      clock.leaderScheduleEpoch,
      clock.unixTimestamp + BigInt(200),
    ));

    await sendHeartbeat(ctx, fixture);

    const planAfter = await fetchPlan(program, fixture.planPda);
    expect(planAfter.lastHeartbeat.toNumber()).to.be.greaterThan(hbBefore);
  });

  it('rejects heartbeat from non-owner', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({ program, provider, ctx });

    const impostor = Keypair.generate();
    await fundSigner(provider, impostor.publicKey, 2);

    await expectAnchorError(
      (program.methods as any)
        .heartbeat()
        .accounts({
          owner: impostor.publicKey,
          plan: fixture.planPda,
        })
        .signers([impostor])
        .rpc(),
      'NotOwner',
    );
  });

  it('rejects heartbeat on Paused plan', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({ program, provider, ctx });

    // Activate then pause
    await depositSolFixture({
      program, ctx, fixture,
      amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
    });
    await (program.methods as any)
      .pausePlan()
      .accounts({
        owner: ctx.owner.publicKey,
        plan: fixture.planPda,
      })
      .signers([ctx.owner])
      .rpc();

    await expectAnchorError(
      sendHeartbeat(ctx, fixture),
      'InvalidPlanState',
    );
  });

  it('rejects heartbeat on ClaimPending plan', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({
      program, provider, ctx, guardianQuorum: 0,
    });

    await depositSolFixture({
      program, ctx, fixture,
      amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
    });

    // Warp past inactivity and start claim
    await warpPastInactivityWindow({ provider, program, planPda: fixture.planPda });

    await (program.methods as any)
      .startClaim()
      .accounts({
        claimant: ctx.beneficiary.publicKey,
        plan: fixture.planPda,
        claim: fixture.claimPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([ctx.beneficiary])
      .rpc();

    const plan = await fetchPlan(program, fixture.planPda);
    expect(Object.keys(plan.state)[0]).to.equal('claimPending');

    await expectAnchorError(
      sendHeartbeat(ctx, fixture),
      'InvalidPlanState',
    );
  });
});
