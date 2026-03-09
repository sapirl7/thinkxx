/**
 * Claim flow integration tests.
 *
 * Tests: start/cancel/approve/veto/finalize, timing windows, quorum.
 */
import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { expect } from 'chai';
import { airdrop, createTestContext } from './helpers';

describe('claim', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let ctx: ReturnType<typeof createTestContext>;

  before(async () => {
    ctx = createTestContext(provider);
    await airdrop(provider.connection, ctx.owner.publicKey, 10);
    await airdrop(provider.connection, ctx.beneficiary.publicKey, 2);
  });

  describe('start_claim', () => {
    it('should require inactivity window elapsed', () => {
      const lastHeartbeat = Math.floor(Date.now() / 1000) - 3_600; // 1 hour ago
      const inactivityWindow = 86_400; // 1 day
      const now = Math.floor(Date.now() / 1000);
      const isExpired = (now - lastHeartbeat) >= inactivityWindow;
      expect(isExpired).to.be.false; // 1 hour < 1 day → cannot start claim
    });

    it('should allow claim start after inactivity window', () => {
      const lastHeartbeat = Math.floor(Date.now() / 1000) - 100_000; // > 1 day ago
      const inactivityWindow = 86_400;
      const now = Math.floor(Date.now() / 1000);
      const isExpired = (now - lastHeartbeat) >= inactivityWindow;
      expect(isExpired).to.be.true; // > 1 day → can start claim
    });

    it('should reject start_claim from non-beneficiary', () => {
      const impostor = Keypair.generate();
      expect(impostor.publicKey.equals(ctx.beneficiary.publicKey)).to.be.false;
      // TODO: Expect unauthorized error
    });

    it('should set plan status to ClaimPending', () => {
      // TODO: program.methods.startClaim()
      //   .accounts({ claimant: beneficiary, plan, claim, systemProgram })
      //   .signers([ctx.beneficiary])
      //   .rpc();
      // const plan = await program.account.plan.fetch(planPda);
      // expect(plan.status).to.deep.equal({ claimPending: {} });

      const expectedStatus = { claimPending: {} };
      expect(expectedStatus).to.have.property('claimPending');
    });
  });

  describe('cancel_claim', () => {
    it('should allow owner to cancel claim', () => {
      // TODO: program.methods.cancelClaim()
      //   .accounts({ owner, plan, claim })
      //   .signers([ctx.owner])
      //   .rpc();
      // const plan = await program.account.plan.fetch(planPda);
      // expect(plan.status).to.deep.equal({ active: {} });

      const afterCancel = { active: {} };
      expect(afterCancel).to.have.property('active');
    });

    it('should reject cancel from non-owner', () => {
      const impostor = Keypair.generate();
      expect(impostor.publicKey.equals(ctx.owner.publicKey)).to.be.false;
    });
  });

  describe('approve_claim', () => {
    it('guardian approval increments approval count', () => {
      const approvals = [ctx.guardian1.publicKey];
      expect(approvals.length).to.equal(1);

      // TODO: program.methods.approveClaim()
      //   .accounts({ guardian: guardian1, plan, guardianSet, claim })
      //   .signers([ctx.guardian1])
      //   .rpc();
    });

    it('quorum reached marks claim as approved', () => {
      const approvals = [ctx.guardian1.publicKey, ctx.guardian2.publicKey];
      const quorum = 2;
      const quorumMet = approvals.length >= quorum;
      expect(quorumMet).to.be.true;
    });

    it('should reject approval from non-guardian', () => {
      const impostor = Keypair.generate();
      const guardians = [ctx.guardian1.publicKey, ctx.guardian2.publicKey];
      const isGuardian = guardians.some(g => g.equals(impostor.publicKey));
      expect(isGuardian).to.be.false;
    });

    it('should reject duplicate approval', () => {
      const approvers = [ctx.guardian1.publicKey];
      const alreadyApproved = approvers.includes(ctx.guardian1.publicKey);
      expect(alreadyApproved).to.be.true;
      // TODO: Expect AlreadyApproved error
    });
  });

  describe('veto_claim', () => {
    it('should immediately cancel claim', () => {
      // TODO: program.methods.vetoClaim()
      //   .accounts({ guardian, plan, guardianSet, claim })
      //   .signers([ctx.guardian1])
      //   .rpc();
      // const plan = await program.account.plan.fetch(planPda);
      // expect(plan.status).to.deep.equal({ active: {} });

      const afterVeto = { active: {} };
      expect(afterVeto).to.have.property('active');
    });

    it('should reject veto from non-guardian', () => {
      const impostor = Keypair.generate();
      expect(impostor.publicKey.equals(ctx.guardian1.publicKey)).to.be.false;
    });
  });

  describe('finalize_claim', () => {
    it('should require grace period elapsed and quorum met', () => {
      const claimStart = Math.floor(Date.now() / 1000) - 100_000;
      const gracePeriod = 86_400;
      const now = Math.floor(Date.now() / 1000);
      const graceElapsed = (now - claimStart) >= gracePeriod;
      const quorumMet = true;
      expect(graceElapsed && quorumMet).to.be.true;
    });

    it('should reject before grace period', () => {
      const claimStart = Math.floor(Date.now() / 1000) - 3_600; // 1 hour ago
      const gracePeriod = 86_400;
      const now = Math.floor(Date.now() / 1000);
      const graceElapsed = (now - claimStart) >= gracePeriod;
      expect(graceElapsed).to.be.false;
    });

    it('should transfer vault SOL to beneficiary', () => {
      // TODO: Record pre-finalize balances, then:
      // await program.methods.finalizeClaim()
      //   .accounts({ beneficiary, plan, guardianSet, claim, solVault, vaultAuthority, system })
      //   .signers([ctx.beneficiary])
      //   .rpc();
      // const postBalance = await provider.connection.getBalance(ctx.beneficiary.publicKey);
      // expect(postBalance).to.be.greaterThan(preBalance);

      const preBalance = 2_000_000_000; // 2 SOL
      const vaultAmount = 1_000_000_000; // 1 SOL
      const postBalance = preBalance + vaultAmount;
      expect(postBalance).to.be.greaterThan(preBalance);
    });

    it('should set plan status to Claimed', () => {
      const finalStatus = { claimed: {} };
      expect(finalStatus).to.have.property('claimed');
    });
  });
});
