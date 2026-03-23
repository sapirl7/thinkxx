/**
 * emergency_bucket integration tests.
 *
 * Covers set_emergency_bucket:
 * - Happy path: bucket ≤ protected balance
 * - Over-withdraw rejected: bucket > protected balance
 * - Owner-only: non-owner rejected
 * - State constraint: only Draft or Active
 *
 * Covers emergency_withdraw:
 * - Happy path: withdraw within bucket allocation
 * - Accounting correct after withdrawal
 * - Exceeds bucket rejected
 * - Non-owner rejected
 * - State constraint: only Active
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

describe('emergency_bucket', () => {
  let provider: anchor.AnchorProvider;
  let program: ReturnType<typeof getProgram>;

  before(async () => {
    await initTestEnvironment();
    provider = getProvider();
    program = getProgram();
  });

  // Helper: create active plan with deposit
  async function activeWithDeposit(
    ctx: TestContext,
    depositLamports = LAMPORTS_PER_SOL,
  ): Promise<PlanFixture> {
    const fixture = await createPlanFixture({ program, provider, ctx });
    await depositSolFixture({
      program, ctx, fixture,
      amountLamports: new anchor.BN(depositLamports),
    });
    return fixture;
  }

  // Helper: set emergency bucket
  async function setBucket(
    ctx: TestContext,
    fixture: PlanFixture,
    amount: number,
  ): Promise<void> {
    await (program.methods as any)
      .setEmergencyBucket(new anchor.BN(amount))
      .accounts({
        owner: ctx.owner.publicKey,
        plan: fixture.planPda,
      })
      .signers([ctx.owner])
      .rpc();
  }

  // =========================================================================
  // set_emergency_bucket
  // =========================================================================
  describe('set_emergency_bucket', () => {
    it('sets bucket within protected balance', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await activeWithDeposit(ctx);

      await setBucket(ctx, fixture, LAMPORTS_PER_SOL / 2);

      const plan = await fetchPlan(program, fixture.planPda);
      expect(plan.emergencyBucketLamports.toNumber()).to.equal(LAMPORTS_PER_SOL / 2);
    });

    it('allows setting bucket to zero', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await activeWithDeposit(ctx);

      await setBucket(ctx, fixture, LAMPORTS_PER_SOL / 2);
      await setBucket(ctx, fixture, 0);

      const plan = await fetchPlan(program, fixture.planPda);
      expect(plan.emergencyBucketLamports.toNumber()).to.equal(0);
    });

    it('rejects bucket exceeding protected balance', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await activeWithDeposit(ctx);

      await expectAnchorError(
        setBucket(ctx, fixture, LAMPORTS_PER_SOL + 1),
        'EmergencyBucketExceeded',
      );
    });

    it('rejects non-owner', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await activeWithDeposit(ctx);

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .setEmergencyBucket(new anchor.BN(1000))
          .accounts({
            owner: impostor.publicKey,
            plan: fixture.planPda,
          })
          .signers([impostor])
          .rpc(),
        'NotOwner',
      );
    });

    it('works on Draft plan (before activation)', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      // Draft plan with 0 protected lamports — bucket must be 0
      const fixture = await createPlanFixture({ program, provider, ctx });

      await setBucket(ctx, fixture, 0);

      const plan = await fetchPlan(program, fixture.planPda);
      expect(plan.emergencyBucketLamports.toNumber()).to.equal(0);
    });
  });

  // =========================================================================
  // emergency_withdraw
  // =========================================================================
  describe('emergency_withdraw', () => {
    it('withdraws within bucket allocation', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const depositAmount = 2 * LAMPORTS_PER_SOL;
      const fixture = await activeWithDeposit(ctx, depositAmount);

      // Set bucket to 1 SOL
      await setBucket(ctx, fixture, LAMPORTS_PER_SOL);

      const ownerBefore = Number(
        await getBankrunContext().banksClient.getBalance(ctx.owner.publicKey),
      );

      // Withdraw 0.5 SOL from emergency bucket
      const withdrawAmount = LAMPORTS_PER_SOL / 2;
      await (program.methods as any)
        .emergencyWithdraw(new anchor.BN(withdrawAmount))
        .accounts({
          owner: ctx.owner.publicKey,
          plan: fixture.planPda,
          solVault: fixture.solVaultPda,
          vaultAuthority: fixture.vaultAuthorityPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.owner])
        .rpc();

      const ownerAfter = Number(
        await getBankrunContext().banksClient.getBalance(ctx.owner.publicKey),
      );
      expect(ownerAfter).to.be.greaterThan(ownerBefore);
    });

    it('correctly updates accounting after withdrawal', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const depositAmount = 2 * LAMPORTS_PER_SOL;
      const fixture = await activeWithDeposit(ctx, depositAmount);

      await setBucket(ctx, fixture, LAMPORTS_PER_SOL);

      const withdrawAmount = LAMPORTS_PER_SOL / 4;
      await (program.methods as any)
        .emergencyWithdraw(new anchor.BN(withdrawAmount))
        .accounts({
          owner: ctx.owner.publicKey,
          plan: fixture.planPda,
          solVault: fixture.solVaultPda,
          vaultAuthority: fixture.vaultAuthorityPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.owner])
        .rpc();

      const plan = await fetchPlan(program, fixture.planPda);
      // protected_lamports reduced
      expect(plan.protectedLamports.toNumber()).to.equal(depositAmount - withdrawAmount);
      // emergency_bucket_lamports reduced
      expect(plan.emergencyBucketLamports.toNumber()).to.equal(
        LAMPORTS_PER_SOL - withdrawAmount,
      );

      // Vault balance matches
      const vaultBalance = Number(
        await getBankrunContext().banksClient.getBalance(fixture.solVaultPda),
      );
      expect(vaultBalance).to.equal(depositAmount - withdrawAmount);
    });

    it('rejects withdrawal exceeding emergency bucket', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await activeWithDeposit(ctx);

      await setBucket(ctx, fixture, LAMPORTS_PER_SOL / 4);

      await expectAnchorError(
        (program.methods as any)
          .emergencyWithdraw(new anchor.BN(LAMPORTS_PER_SOL / 2))
          .accounts({
            owner: ctx.owner.publicKey,
            plan: fixture.planPda,
            solVault: fixture.solVaultPda,
            vaultAuthority: fixture.vaultAuthorityPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([ctx.owner])
          .rpc(),
        'EmergencyBucketExceeded',
      );
    });

    it('rejects non-owner withdrawal', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await activeWithDeposit(ctx);

      await setBucket(ctx, fixture, LAMPORTS_PER_SOL / 2);

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .emergencyWithdraw(new anchor.BN(1000))
          .accounts({
            owner: impostor.publicKey,
            plan: fixture.planPda,
            solVault: fixture.solVaultPda,
            vaultAuthority: fixture.vaultAuthorityPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([impostor])
          .rpc(),
        'NotOwner',
      );
    });

    it('rejects withdrawal on Draft plan (must be Active)', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await expectAnchorError(
        (program.methods as any)
          .emergencyWithdraw(new anchor.BN(1000))
          .accounts({
            owner: ctx.owner.publicKey,
            plan: fixture.planPda,
            solVault: fixture.solVaultPda,
            vaultAuthority: fixture.vaultAuthorityPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([ctx.owner])
          .rpc(),
        'PlanNotActive',
      );
    });
  });
});
