/**
 * Claim flow integration tests.
 *
 * Tests start_claim, cancel_claim, approve_claim, veto_claim, finalize_claim
 * with real on-chain calls via anchor-bankrun.
 *
 * Time-warp via bankrun setClock — no sleep, deterministic.
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
  createPlanFixture,
  activatePlanFixture,
  depositSolFixture,
  addGuardianFixture,
  fetchPlan,
  fetchClaim,
  fetchGuardianSet,
  expectAnchorError,
  expectAccountClosed,
  warpPastInactivityWindow,
  warpPastGraceDeadline,
  getBankrunContext,
  DEFAULT_PLAN_PARAMS,
  TestContext,
  PlanFixture,
} from './helpers';

describe('claim flow', () => {
  let provider: anchor.AnchorProvider;
  let program: ReturnType<typeof getProgram>;

  before(async () => {
    await initTestEnvironment();
    provider = getProvider();
    program = getProgram();
  });

  // -----------------------------------------------------------------------
  // Helper: create an active plan with SOL deposited, ready for claim testing
  // -----------------------------------------------------------------------
  async function setupActivePlanWithDeposit(
    ctx: TestContext,
    opts: {
      planId?: anchor.BN;
      backupBeneficiary?: PublicKey | null;
      guardianQuorum?: number;
      depositLamports?: number;
    } = {},
  ): Promise<PlanFixture> {
    const fixture = await createPlanFixture({
      program,
      provider,
      ctx,
      planId: opts.planId,
      backupBeneficiary: opts.backupBeneficiary ?? null,
      guardianQuorum: opts.guardianQuorum,
    });

    // Deposit auto-activates Draft → Active
    await depositSolFixture({
      program,
      ctx,
      fixture,
      amountLamports: new anchor.BN(opts.depositLamports ?? LAMPORTS_PER_SOL),
    });

    return fixture;
  }

  // =======================================================================
  // start_claim
  // =======================================================================
  describe('start_claim', () => {
    let ctx: TestContext;

    beforeEach(() => {
      ctx = createTestContext();
    });

    it('starts claim after inactivity window', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx);

      await warpPastInactivityWindow({
        provider,
        program,
        planPda: fixture.planPda,
        marginSeconds: 5,
      });

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

      const claim = await fetchClaim(program, fixture.claimPda);
      expect(Object.keys(claim.state)[0]).to.equal('pending');
      expect(claim.claimant.equals(ctx.beneficiary.publicKey)).to.be.true;
      expect(claim.approvals).to.have.length(0);
      expect(claim.vetoes).to.have.length(0);
      expect(claim.graceDeadline.toNumber()).to.be.greaterThan(claim.startedAt.toNumber());
    });

    it('rejects before inactivity window', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx);

      // No warp — inactivity window not elapsed
      await expectAnchorError(
        (program.methods as any)
          .startClaim()
          .accounts({
            claimant: ctx.beneficiary.publicKey,
            plan: fixture.planPda,
            claim: fixture.claimPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([ctx.beneficiary])
          .rpc(),
        'InactivityWindowNotElapsed',
      );
    });

    it('rejects non-beneficiary', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx);

      await warpPastInactivityWindow({
        provider,
        program,
        planPda: fixture.planPda,
      });

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .startClaim()
          .accounts({
            claimant: impostor.publicKey,
            plan: fixture.planPda,
            claim: fixture.claimPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([impostor])
          .rpc(),
        'NotBeneficiary',
      );
    });

    it('allows backup beneficiary', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx, {
        backupBeneficiary: ctx.backupBeneficiary.publicKey,
      });

      await warpPastInactivityWindow({
        provider,
        program,
        planPda: fixture.planPda,
      });

      await (program.methods as any)
        .startClaim()
        .accounts({
          claimant: ctx.backupBeneficiary.publicKey,
          plan: fixture.planPda,
          claim: fixture.claimPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([ctx.backupBeneficiary])
        .rpc();

      const claim = await fetchClaim(program, fixture.claimPda);
      expect(claim.claimant.equals(ctx.backupBeneficiary.publicKey)).to.be.true;
    });
  });

  // =======================================================================
  // cancel_claim
  // =======================================================================
  describe('cancel_claim', () => {
    let ctx: TestContext;

    beforeEach(() => {
      ctx = createTestContext();
    });

    it('owner cancels pending claim during grace', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx);

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

      // Cancel during grace
      // owner must be writable because close=owner sends rent lamports to owner
      await (program.methods as any)
        .cancelClaim()
        .accountsPartial({
          owner: ctx.owner.publicKey,
          plan: fixture.planPda,
          claim: fixture.claimPda,
        })
        .signers([ctx.owner])
        .rpc();

      const plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('active');
      expect(plan.lastHeartbeat.toNumber()).to.be.greaterThan(0);

      // Claim account should be closed (close = owner in cancel_claim.rs)
      await expectAccountClosed(provider.connection, fixture.claimPda);
    });

    it('rejects cancel from non-owner', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx);
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

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .cancelClaim()
          .accountsPartial({
            owner: impostor.publicKey,
            plan: fixture.planPda,
            claim: fixture.claimPda,
          })
          .signers([impostor])
          .rpc(),
        'NotOwner',
      );
    });

    it('rejects cancel after grace expired', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx);
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

      // Warp past grace deadline (+1s because code uses <=)
      await warpPastGraceDeadline({
        provider,
        program,
        claimPda: fixture.claimPda,
        marginSeconds: 1,
      });

      await expectAnchorError(
        (program.methods as any)
          .cancelClaim()
          .accountsPartial({
            owner: ctx.owner.publicKey,
            plan: fixture.planPda,
            claim: fixture.claimPda,
          })
          .signers([ctx.owner])
          .rpc(),
        'GracePeriodExpired',
      );
    });
  });

  // =======================================================================
  // approve_claim
  // =======================================================================
  describe('approve_claim', () => {
    let ctx: TestContext;

    beforeEach(() => {
      ctx = createTestContext();
    });

    it('first guardian approval keeps claim pending', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx, { guardianQuorum: 2 });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian2.publicKey });

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

      // First approval — quorum not yet met
      await (program.methods as any)
        .approveClaim()
        .accounts({
          guardian: ctx.guardian1.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          claim: fixture.claimPda,
        })
        .signers([ctx.guardian1])
        .rpc();

      const claim = await fetchClaim(program, fixture.claimPda);
      expect(claim.approvals).to.have.length(1);
      expect(claim.approvals[0].equals(ctx.guardian1.publicKey)).to.be.true;
      expect(Object.keys(claim.state)[0]).to.equal('pending');
    });

    it('second guardian approval reaches quorum and approves claim', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx, { guardianQuorum: 2 });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian2.publicKey });

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

      // First approval
      await (program.methods as any)
        .approveClaim()
        .accounts({
          guardian: ctx.guardian1.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          claim: fixture.claimPda,
        })
        .signers([ctx.guardian1])
        .rpc();

      // Second approval — quorum met
      await (program.methods as any)
        .approveClaim()
        .accounts({
          guardian: ctx.guardian2.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          claim: fixture.claimPda,
        })
        .signers([ctx.guardian2])
        .rpc();

      const claim = await fetchClaim(program, fixture.claimPda);
      expect(claim.approvals).to.have.length(2);
      expect(Object.keys(claim.state)[0]).to.equal('approved');
    });

    it('rejects approval from non-guardian', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx, { guardianQuorum: 1 });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });

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

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .approveClaim()
          .accounts({
            guardian: impostor.publicKey,
            plan: fixture.planPda,
            guardianSet: fixture.guardianSetPda,
            claim: fixture.claimPda,
          })
          .signers([impostor])
          .rpc(),
        'NotGuardian',
      );
    });

    it('rejects duplicate approval', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx, { guardianQuorum: 2 });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian2.publicKey });

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

      // First approval
      await (program.methods as any)
        .approveClaim()
        .accounts({
          guardian: ctx.guardian1.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          claim: fixture.claimPda,
        })
        .signers([ctx.guardian1])
        .rpc();

      // Advance clock by 1s so the duplicate tx has a different recent blockhash
      const ctx2 = getBankrunContext();
      const currentClock = await ctx2.banksClient.getClock();
      ctx2.setClock(
        new (await import('solana-bankrun')).Clock(
          currentClock.slot + BigInt(1),
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          currentClock.unixTimestamp + BigInt(1),
        ),
      );

      // Duplicate
      await expectAnchorError(
        (program.methods as any)
          .approveClaim()
          .accounts({
            guardian: ctx.guardian1.publicKey,
            plan: fixture.planPda,
            guardianSet: fixture.guardianSetPda,
            claim: fixture.claimPda,
          })
          .signers([ctx.guardian1])
          .rpc(),
        'AlreadyApproved',
      );
    });
  });

  // =======================================================================
  // veto_claim
  // =======================================================================
  describe('veto_claim', () => {
    let ctx: TestContext;

    beforeEach(() => {
      ctx = createTestContext();
    });

    it('guardian veto restores active plan and closes claim', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx, { guardianQuorum: 2 });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian2.publicKey });

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

      // Veto — closes claim account immediately
      // guardian must be writable because close=guardian sends rent lamports to guardian
      await (program.methods as any)
        .vetoClaim()
        .accountsPartial({
          guardian: ctx.guardian1.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          claim: fixture.claimPda,
        })
        .signers([ctx.guardian1])
        .rpc();

      const plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('active');
      expect(plan.lastHeartbeat.toNumber()).to.be.greaterThan(0);

      // Claim account closed (close = guardian in veto_claim.rs)
      await expectAccountClosed(provider.connection, fixture.claimPda);
    });

    it('rejects veto from non-guardian', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx, { guardianQuorum: 2 });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });

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

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .vetoClaim()
          .accountsPartial({
            guardian: impostor.publicKey,
            plan: fixture.planPda,
            guardianSet: fixture.guardianSetPda,
            claim: fixture.claimPda,
          })
          .signers([impostor])
          .rpc(),
        'NotGuardian',
      );
    });
  });

  // =======================================================================
  // finalize_claim
  // =======================================================================
  describe('finalize_claim', () => {
    let ctx: TestContext;

    beforeEach(() => {
      ctx = createTestContext();
    });

    it('finalizes approved claim immediately', async () => {
      await fundContext(provider, ctx);
      const depositAmount = 2 * LAMPORTS_PER_SOL;
      const fixture = await setupActivePlanWithDeposit(ctx, {
        guardianQuorum: 2,
        depositLamports: depositAmount,
      });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian2.publicKey });

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

      // Two approvals → Approved
      await (program.methods as any)
        .approveClaim()
        .accounts({
          guardian: ctx.guardian1.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          claim: fixture.claimPda,
        })
        .signers([ctx.guardian1])
        .rpc();

      await (program.methods as any)
        .approveClaim()
        .accounts({
          guardian: ctx.guardian2.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          claim: fixture.claimPda,
        })
        .signers([ctx.guardian2])
        .rpc();

      const beneficiaryBalanceBefore = Number(
        await getBankrunContext().banksClient.getBalance(ctx.beneficiary.publicKey),
      );

      // Finalize — no need to wait for grace (Approved path)
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

      const plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('claimed');
      expect(plan.protectedLamports.toNumber()).to.equal(0);

      // Vault drained
      const vaultBalance = Number(
        await getBankrunContext().banksClient.getBalance(fixture.solVaultPda),
      );
      expect(vaultBalance).to.equal(0);

      // Beneficiary received funds
      const beneficiaryBalanceAfter = Number(
        await getBankrunContext().banksClient.getBalance(ctx.beneficiary.publicKey),
      );
      expect(beneficiaryBalanceAfter).to.be.greaterThan(beneficiaryBalanceBefore);
    });

    it('finalizes pending claim after grace when guardian set is empty', async () => {
      await fundContext(provider, ctx);
      const depositAmount = 1 * LAMPORTS_PER_SOL;
      const fixture = await setupActivePlanWithDeposit(ctx, {
        guardianQuorum: 0, // No guardians required
        depositLamports: depositAmount,
      });

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

      // Warp past grace deadline (+1s because finalize uses strict > for pending path)
      await warpPastGraceDeadline({
        provider,
        program,
        claimPda: fixture.claimPda,
        marginSeconds: 1,
      });

      const beneficiaryBalanceBefore = Number(
        await getBankrunContext().banksClient.getBalance(ctx.beneficiary.publicKey),
      );

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

      const plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('claimed');
      expect(plan.protectedLamports.toNumber()).to.equal(0);

      const beneficiaryBalanceAfter = Number(
        await getBankrunContext().banksClient.getBalance(ctx.beneficiary.publicKey),
      );
      expect(beneficiaryBalanceAfter).to.be.greaterThan(beneficiaryBalanceBefore);
    });

    it('rejects finalize before quorum and before grace path', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx, { guardianQuorum: 2 });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian2.publicKey });

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

      // Only 1 approval (quorum = 2), and grace not expired, and guardians exist
      await (program.methods as any)
        .approveClaim()
        .accounts({
          guardian: ctx.guardian1.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
          claim: fixture.claimPda,
        })
        .signers([ctx.guardian1])
        .rpc();

      await expectAnchorError(
        (program.methods as any)
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
          .rpc(),
        'QuorumNotMet',
      );
    });

    it('rejects finalize from wrong claimant', async () => {
      await fundContext(provider, ctx);
      const fixture = await setupActivePlanWithDeposit(ctx, { guardianQuorum: 0 });

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

      await warpPastGraceDeadline({
        provider,
        program,
        claimPda: fixture.claimPda,
        marginSeconds: 1,
      });

      const wrongClaimant = Keypair.generate();
      await fundSigner(provider, wrongClaimant.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .finalizeClaim()
          .accounts({
            claimant: wrongClaimant.publicKey,
            plan: fixture.planPda,
            guardianSet: fixture.guardianSetPda,
            claim: fixture.claimPda,
            solVault: fixture.solVaultPda,
            vaultAuthority: fixture.vaultAuthorityPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([wrongClaimant])
          .rpc(),
        'NotBeneficiary',
      );
    });
  });
});
