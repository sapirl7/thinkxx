/**
 * lifecycle integration tests — end-to-end state machine.
 *
 * Covers:
 * - Full cycle: Draft → Active → Pause → Resume → ClaimPending → Claimed
 * - Draft → Active via deposit
 * - Pause/Resume: happy paths and invalid state transitions
 * - Close plan: Draft close, refund rent
 * - Invalid transitions: pause Draft, resume Active, close Active
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
  expectAccountClosed,
  warpPastInactivityWindow,
  warpPastGraceDeadline,
  DEFAULT_PLAN_PARAMS,
  TestContext,
  PlanFixture,
} from './helpers';

describe('lifecycle', () => {
  let provider: anchor.AnchorProvider;
  let program: ReturnType<typeof getProgram>;

  before(async () => {
    await initTestEnvironment();
    provider = getProvider();
    program = getProgram();
  });

  // =========================================================================
  // pause_plan
  // =========================================================================
  describe('pause_plan', () => {
    it('pauses an Active plan', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      // Activate via deposit
      await depositSolFixture({
        program, ctx, fixture,
        amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
      });

      await (program.methods as any)
        .pausePlan()
        .accounts({ owner: ctx.owner.publicKey, plan: fixture.planPda })
        .signers([ctx.owner])
        .rpc();

      const plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('paused');
    });

    it('rejects pausing a Draft plan', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await expectAnchorError(
        (program.methods as any)
          .pausePlan()
          .accounts({ owner: ctx.owner.publicKey, plan: fixture.planPda })
          .signers([ctx.owner])
          .rpc(),
        'PlanNotActive',
      );
    });

    it('rejects non-owner pause', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await depositSolFixture({
        program, ctx, fixture,
        amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
      });

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .pausePlan()
          .accounts({ owner: impostor.publicKey, plan: fixture.planPda })
          .signers([impostor])
          .rpc(),
        'NotOwner',
      );
    });
  });

  // =========================================================================
  // resume_plan
  // =========================================================================
  describe('resume_plan', () => {
    it('resumes a Paused plan back to Active', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await depositSolFixture({
        program, ctx, fixture,
        amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
      });

      // Pause
      await (program.methods as any)
        .pausePlan()
        .accounts({ owner: ctx.owner.publicKey, plan: fixture.planPda })
        .signers([ctx.owner])
        .rpc();

      // Resume
      await (program.methods as any)
        .resumePlan()
        .accounts({ owner: ctx.owner.publicKey, plan: fixture.planPda })
        .signers([ctx.owner])
        .rpc();

      const plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('active');
      expect(plan.lastHeartbeat.toNumber()).to.be.greaterThan(0);
    });

    it('rejects resuming non-Paused plan', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await depositSolFixture({
        program, ctx, fixture,
        amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
      });

      // Plan is Active, not Paused
      await expectAnchorError(
        (program.methods as any)
          .resumePlan()
          .accounts({ owner: ctx.owner.publicKey, plan: fixture.planPda })
          .signers([ctx.owner])
          .rpc(),
        'PlanNotPaused',
      );
    });

    it('rejects non-owner resume', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await depositSolFixture({
        program, ctx, fixture,
        amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
      });

      await (program.methods as any)
        .pausePlan()
        .accounts({ owner: ctx.owner.publicKey, plan: fixture.planPda })
        .signers([ctx.owner])
        .rpc();

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .resumePlan()
          .accounts({ owner: impostor.publicKey, plan: fixture.planPda })
          .signers([impostor])
          .rpc(),
        'NotOwner',
      );
    });
  });

  // =========================================================================
  // close_plan
  // =========================================================================
  describe('close_plan', () => {
    it('closes Draft plan and reclaims rent', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      const ownerBefore = Number(
        await getBankrunContext().banksClient.getBalance(ctx.owner.publicKey),
      );

      await (program.methods as any)
        .closePlan()
        .accounts({
          owner: ctx.owner.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          solVault: fixture.solVaultPda,
        })
        .signers([ctx.owner])
        .rpc();

      // Plan account closed
      await expectAccountClosed(provider.connection, fixture.planPda);

      // Guardian set account closed
      await expectAccountClosed(provider.connection, fixture.guardianSetPda);

      // Owner got rent back
      const ownerAfter = Number(
        await getBankrunContext().banksClient.getBalance(ctx.owner.publicKey),
      );
      expect(ownerAfter).to.be.greaterThan(ownerBefore);
    });

    it('rejects closing Active plan', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await depositSolFixture({
        program, ctx, fixture,
        amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
      });

      await expectAnchorError(
        (program.methods as any)
          .closePlan()
          .accounts({
            owner: ctx.owner.publicKey,
            plan: fixture.planPda,
            guardianSet: fixture.guardianSetPda,
            solVault: fixture.solVaultPda,
          })
          .signers([ctx.owner])
          .rpc(),
        'InvalidPlanState',
      );
    });

    it('rejects non-owner close', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .closePlan()
          .accounts({
            owner: impostor.publicKey,
            plan: fixture.planPda,
            guardianSet: fixture.guardianSetPda,
            solVault: fixture.solVaultPda,
          })
          .signers([impostor])
          .rpc(),
        'NotOwner',
      );
    });
  });

  // =========================================================================
  // E2E: full lifecycle
  // =========================================================================
  describe('end-to-end', () => {
    it('Draft → Active → Pause → Resume → ClaimPending → Claimed', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);

      // 1. Create (Draft)
      const fixture = await createPlanFixture({
        program, provider, ctx,
        guardianQuorum: 0, // No guardians needed for quick finalize
      });
      let plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('draft');

      // 2. Deposit → Active
      await depositSolFixture({
        program, ctx, fixture,
        amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
      });
      plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('active');

      // 3. Pause
      await (program.methods as any)
        .pausePlan()
        .accounts({ owner: ctx.owner.publicKey, plan: fixture.planPda })
        .signers([ctx.owner])
        .rpc();
      plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('paused');

      // 4. Resume → Active
      await (program.methods as any)
        .resumePlan()
        .accounts({ owner: ctx.owner.publicKey, plan: fixture.planPda })
        .signers([ctx.owner])
        .rpc();
      plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('active');

      // 5. Warp → start claim → ClaimPending
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
      plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('claimPending');

      // 6. Warp past grace → finalize → Claimed (no guardians, pending path)
      await warpPastGraceDeadline({
        provider, program,
        claimPda: fixture.claimPda,
        marginSeconds: 1,
      });

      await (program.methods as any)
        .finalizeClaim()
        .accounts({
          claimant: ctx.beneficiary.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          claim: fixture.claimPda,
          solVault: fixture.solVaultPda,
          vaultAuthority: fixture.vaultAuthorityPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.beneficiary])
        .rpc();
      plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('claimed');
      expect(plan.protectedLamports.toNumber()).to.equal(0);

      // Vault drained
      const vault = Number(
        await getBankrunContext().banksClient.getBalance(fixture.solVaultPda),
      );
      expect(vault).to.equal(0);
    });
  });
});
