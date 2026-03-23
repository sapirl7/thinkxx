/**
 * deposit_sol integration tests.
 *
 * Covers:
 * - Happy path: deposit adds to vault and protected_lamports
 * - Auto-activation: Draft → Active on first deposit
 * - Multiple deposits accumulate
 * - Zero amount rejected
 * - Owner-only: non-owner rejected
 * - State constraint: only Draft or Active allow deposit
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
  fetchPlan,
  expectAnchorError,
  DEFAULT_PLAN_PARAMS,
  TestContext,
  PlanFixture,
} from './helpers';

describe('deposit_sol', () => {
  let provider: anchor.AnchorProvider;
  let program: ReturnType<typeof getProgram>;

  before(async () => {
    await initTestEnvironment();
    provider = getProvider();
    program = getProgram();
  });

  it('deposits SOL into vault and updates protected_lamports', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({ program, provider, ctx });

    const amount = new anchor.BN(LAMPORTS_PER_SOL);
    await depositSolFixture({ program, ctx, fixture, amountLamports: amount });

    const plan = await fetchPlan(program, fixture.planPda);
    expect(plan.protectedLamports.toNumber()).to.equal(LAMPORTS_PER_SOL);

    // Verify vault actually has lamports
    const vaultBalance = Number(
      await getBankrunContext().banksClient.getBalance(fixture.solVaultPda),
    );
    expect(vaultBalance).to.equal(LAMPORTS_PER_SOL);
  });

  it('auto-activates Draft → Active on first deposit', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({ program, provider, ctx });

    // Verify Draft state before deposit
    const planBefore = await fetchPlan(program, fixture.planPda);
    expect(Object.keys(planBefore.state)[0]).to.equal('draft');

    await depositSolFixture({
      program,
      ctx,
      fixture,
      amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
    });

    const planAfter = await fetchPlan(program, fixture.planPda);
    expect(Object.keys(planAfter.state)[0]).to.equal('active');
    expect(planAfter.lastHeartbeat.toNumber()).to.be.greaterThan(0);
  });

  it('second deposit keeps Active state and accumulates', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({ program, provider, ctx });

    const first = new anchor.BN(LAMPORTS_PER_SOL);
    const second = new anchor.BN(LAMPORTS_PER_SOL / 2);

    await depositSolFixture({ program, ctx, fixture, amountLamports: first });
    await depositSolFixture({ program, ctx, fixture, amountLamports: second });

    const plan = await fetchPlan(program, fixture.planPda);
    expect(Object.keys(plan.state)[0]).to.equal('active');
    expect(plan.protectedLamports.toNumber()).to.equal(
      LAMPORTS_PER_SOL + LAMPORTS_PER_SOL / 2,
    );

    const vaultBalance = Number(
      await getBankrunContext().banksClient.getBalance(fixture.solVaultPda),
    );
    expect(vaultBalance).to.equal(LAMPORTS_PER_SOL + LAMPORTS_PER_SOL / 2);
  });

  it('rejects zero amount deposit', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({ program, provider, ctx });

    await expectAnchorError(
      depositSolFixture({
        program,
        ctx,
        fixture,
        amountLamports: new anchor.BN(0),
      }),
      'InvalidTimingParameter', // re-used for zero amount check
    );
  });

  it('rejects deposit from non-owner', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({ program, provider, ctx });

    const impostor = Keypair.generate();
    await fundSigner(provider, impostor.publicKey, 5);

    await expectAnchorError(
      (program.methods as any)
        .depositSol(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          owner: impostor.publicKey,
          plan: fixture.planPda,
          solVault: fixture.solVaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([impostor])
        .rpc(),
      'NotOwner',
    );
  });

  it('rejects deposit on Paused plan', async () => {
    const ctx = createTestContext();
    await fundContext(provider, ctx);
    const fixture = await createPlanFixture({ program, provider, ctx });

    // First deposit to activate
    await depositSolFixture({
      program,
      ctx,
      fixture,
      amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
    });

    // Pause the plan
    await (program.methods as any)
      .pausePlan()
      .accounts({
        owner: ctx.owner.publicKey,
        plan: fixture.planPda,
      })
      .signers([ctx.owner])
      .rpc();

    const planPaused = await fetchPlan(program, fixture.planPda);
    expect(Object.keys(planPaused.state)[0]).to.equal('paused');

    // Deposit on paused plan should fail
    await expectAnchorError(
      depositSolFixture({
        program,
        ctx,
        fixture,
        amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
      }),
      'InvalidPlanState',
    );
  });
});
