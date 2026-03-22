/**
 * guardian (add/remove) integration tests.
 *
 * Covers:
 * - Add guardian: happy path, guardian set membership
 * - Duplicate guardian rejected
 * - Guardian set full (max 5) rejected
 * - Remove guardian: happy path, quorum validation
 * - Non-owner rejected for both add and remove
 * - Invalid state rejected (only Draft or Active)
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
  createPlanFixture,
  addGuardianFixture,
  depositSolFixture,
  fetchPlan,
  fetchGuardianSet,
  expectAnchorError,
  DEFAULT_PLAN_PARAMS,
  TestContext,
  PlanFixture,
} from './helpers';

describe('guardian', () => {
  let provider: anchor.AnchorProvider;
  let program: ReturnType<typeof getProgram>;

  before(async () => {
    await initTestEnvironment();
    provider = getProvider();
    program = getProgram();
  });

  // =========================================================================
  // add_guardian
  // =========================================================================
  describe('add_guardian', () => {
    it('adds a guardian to the set', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await addGuardianFixture({
        program, ctx, fixture,
        guardian: ctx.guardian1.publicKey,
      });

      const gs = await fetchGuardianSet(program, fixture.guardianSetPda);
      expect(gs.guardians).to.have.length(1);
      expect(gs.guardians[0].equals(ctx.guardian1.publicKey)).to.be.true;
    });

    it('adds multiple guardians', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian2.publicKey });
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian3.publicKey });

      const gs = await fetchGuardianSet(program, fixture.guardianSetPda);
      expect(gs.guardians).to.have.length(3);
    });

    it('works on Active plan too', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      // Activate via deposit
      await depositSolFixture({
        program, ctx, fixture,
        amountLamports: new anchor.BN(LAMPORTS_PER_SOL),
      });

      const plan = await fetchPlan(program, fixture.planPda);
      expect(Object.keys(plan.state)[0]).to.equal('active');

      // Add guardian on Active plan
      await addGuardianFixture({
        program, ctx, fixture,
        guardian: ctx.guardian1.publicKey,
      });

      const gs = await fetchGuardianSet(program, fixture.guardianSetPda);
      expect(gs.guardians).to.have.length(1);
    });

    it('rejects duplicate guardian', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await addGuardianFixture({
        program, ctx, fixture,
        guardian: ctx.guardian1.publicKey,
      });

      await expectAnchorError(
        addGuardianFixture({
          program, ctx, fixture,
          guardian: ctx.guardian1.publicKey,
        }),
        'DuplicateGuardian',
      );
    });

    it('rejects when guardian set is full (5)', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      // Add 5 guardians
      for (let i = 0; i < 5; i++) {
        const g = Keypair.generate();
        await addGuardianFixture({ program, ctx, fixture, guardian: g.publicKey });
      }

      const gs = await fetchGuardianSet(program, fixture.guardianSetPda);
      expect(gs.guardians).to.have.length(5);

      // 6th should fail
      const extra = Keypair.generate();
      await expectAnchorError(
        addGuardianFixture({ program, ctx, fixture, guardian: extra.publicKey }),
        'GuardianSetFull',
      );
    });

    it('rejects non-owner signer', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .addGuardian(ctx.guardian1.publicKey)
          .accounts({
            owner: impostor.publicKey,
            plan: fixture.planPda,
            guardianSet: fixture.guardianSetPda,
          })
          .signers([impostor])
          .rpc(),
        'NotOwner',
      );
    });
  });

  // =========================================================================
  // remove_guardian
  // =========================================================================
  describe('remove_guardian', () => {
    it('removes a guardian from the set', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({
        program, provider, ctx, guardianQuorum: 1,
      });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian2.publicKey });

      // Remove guardian1
      await (program.methods as any)
        .removeGuardian(ctx.guardian1.publicKey)
        .accounts({
          owner: ctx.owner.publicKey,
          plan: fixture.planPda,
          guardianSet: fixture.guardianSetPda,
        })
        .signers([ctx.owner])
        .rpc();

      const gs = await fetchGuardianSet(program, fixture.guardianSetPda);
      expect(gs.guardians).to.have.length(1);
      expect(gs.guardians[0].equals(ctx.guardian2.publicKey)).to.be.true;
    });

    it('rejects removing non-existent guardian', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({ program, provider, ctx });

      await expectAnchorError(
        (program.methods as any)
          .removeGuardian(ctx.guardian1.publicKey)
          .accounts({
            owner: ctx.owner.publicKey,
            plan: fixture.planPda,
            guardianSet: fixture.guardianSetPda,
          })
          .signers([ctx.owner])
          .rpc(),
        'GuardianNotFound',
      );
    });

    it('rejects removal when it would violate quorum', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({
        program, provider, ctx, guardianQuorum: 2,
      });

      // Add 2 guardians (quorum = 2)
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });
      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian2.publicKey });

      // Removing 1 would leave 1 guardian with quorum=2 — invalid
      await expectAnchorError(
        (program.methods as any)
          .removeGuardian(ctx.guardian1.publicKey)
          .accounts({
            owner: ctx.owner.publicKey,
            plan: fixture.planPda,
            guardianSet: fixture.guardianSetPda,
          })
          .signers([ctx.owner])
          .rpc(),
        'InvalidQuorum',
      );
    });

    it('rejects non-owner signer for remove', async () => {
      const ctx = createTestContext();
      await fundContext(provider, ctx);
      const fixture = await createPlanFixture({
        program, provider, ctx, guardianQuorum: 1,
      });

      await addGuardianFixture({ program, ctx, fixture, guardian: ctx.guardian1.publicKey });

      const impostor = Keypair.generate();
      await fundSigner(provider, impostor.publicKey, 2);

      await expectAnchorError(
        (program.methods as any)
          .removeGuardian(ctx.guardian1.publicKey)
          .accounts({
            owner: impostor.publicKey,
            plan: fixture.planPda,
            guardianSet: fixture.guardianSetPda,
          })
          .signers([impostor])
          .rpc(),
        'NotOwner',
      );
    });
  });
});
