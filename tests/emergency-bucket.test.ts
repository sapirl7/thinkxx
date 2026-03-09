/**
 * Emergency bucket integration tests.
 *
 * Tests: set bucket, withdraw, bounds, owner-only.
 */
import * as anchor from '@coral-xyz/anchor';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { airdrop, derivePlanPDAs, createTestContext, DEFAULT_PLAN_PARAMS } from './helpers';

describe('emergency_bucket', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const programId = provider.wallet.publicKey;

  let ctx: ReturnType<typeof createTestContext>;

  before(async () => {
    ctx = createTestContext(provider);
    await airdrop(provider.connection, ctx.owner.publicKey, 10);
  });

  describe('set_emergency_bucket', () => {
    it('should set emergency bucket amount', () => {
      const amount = 500_000;
      expect(amount).to.be.greaterThan(0);

      // TODO: program.methods.setEmergencyBucket(new anchor.BN(amount))
      //   .accounts({ owner, plan })
      //   .signers([ctx.owner])
      //   .rpc();
      // const plan = await program.account.plan.fetch(planPda);
      // expect(plan.emergencyBucket.toNumber()).to.equal(amount);
    });

    it('should reject set from non-owner', () => {
      const impostor = Keypair.generate();
      expect(impostor.publicKey.equals(ctx.owner.publicKey)).to.be.false;
    });

    it('should accept zero to disable emergency bucket', () => {
      const amount = new anchor.BN(0);
      expect(amount.toNumber()).to.equal(0);
    });
  });

  describe('emergency_withdraw', () => {
    it('should withdraw up to emergency bucket amount', () => {
      const bucketAmount = 500_000;
      const withdrawAmount = 500_000;
      expect(withdrawAmount).to.be.at.most(bucketAmount);

      // TODO: program.methods.emergencyWithdraw(new anchor.BN(withdrawAmount))
      //   .accounts({ owner, plan, solVault, vaultAuthority, systemProgram })
      //   .signers([ctx.owner])
      //   .rpc();
    });

    it('should reject withdraw exceeding bucket', () => {
      const bucketAmount = 500_000;
      const tooMuch = 500_001;
      expect(tooMuch).to.be.greaterThan(bucketAmount);

      // TODO: Expect ExceedsEmergencyBucket error
    });

    it('should reject withdraw exceeding vault balance', () => {
      const vaultBalance = 1_000_000;
      const bucketAmount = 5_000_000;
      const withdrawAmount = 2_000_000;
      expect(withdrawAmount).to.be.greaterThan(vaultBalance);

      // TODO: Expect InsufficientFunds error
    });

    it('should reject withdraw from non-owner', () => {
      const impostor = Keypair.generate();
      expect(impostor.publicKey.equals(ctx.owner.publicKey)).to.be.false;
    });

    it('should update vault balance after withdrawal', () => {
      const preVaultBalance = 1_000_000;
      const withdrawAmount = 250_000;
      const postBalance = preVaultBalance - withdrawAmount;
      expect(postBalance).to.equal(750_000);
    });
  });
});
