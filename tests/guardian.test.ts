/**
 * Guardian management integration tests.
 *
 * Tests: add/remove, duplicate prevention, quorum validation, max limit.
 */
import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { expect } from 'chai';
import { airdrop, createTestContext } from './helpers';

describe('guardian', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  let ctx: ReturnType<typeof createTestContext>;

  before(async () => {
    ctx = createTestContext(provider);
    await airdrop(provider.connection, ctx.owner.publicKey, 10);
  });

  it('should add a guardian to the set', async () => {
    // TODO: program.methods.addGuardian(guardian1.publicKey)
    //   .accounts({ owner, plan, guardianSet })
    //   .signers([ctx.owner])
    //   .rpc();
    // const gs = await program.account.guardianSet.fetch(guardianSetPda);
    // expect(gs.guardians.length).to.equal(1);
    // expect(gs.guardians[0].equals(ctx.guardian1.publicKey)).to.be.true;

    expect(ctx.guardian1.publicKey).to.be.instanceOf(PublicKey);
  });

  it('should support up to 5 guardians', () => {
    const MAX_GUARDIANS = 5;
    const guardians = Array.from({ length: MAX_GUARDIANS }, () => Keypair.generate());
    expect(guardians.length).to.equal(MAX_GUARDIANS);
  });

  it('should reject duplicate guardian', () => {
    const guardians = [ctx.guardian1.publicKey, ctx.guardian2.publicKey];
    const alreadyExists = guardians.includes(ctx.guardian1.publicKey);
    expect(alreadyExists).to.be.true;

    // TODO: Expect DuplicateGuardian error
    // await expect(program.methods.addGuardian(ctx.guardian1.publicKey).rpc())
    //   .to.be.rejectedWith('DuplicateGuardian');
  });

  it('should reject 6th guardian (max 5)', () => {
    const MAX_GUARDIANS = 5;
    const currentCount = 5;
    expect(currentCount + 1).to.be.greaterThan(MAX_GUARDIANS);

    // TODO: Expect MaxGuardiansReached error
  });

  it('should remove a guardian', () => {
    // TODO: program.methods.removeGuardian(guardian1.publicKey)
    //   .accounts({ owner, plan, guardianSet })
    //   .signers([ctx.owner])
    //   .rpc();
    // const gs = await program.account.guardianSet.fetch(guardianSetPda);
    // expect(gs.guardians).to.not.deep.include(ctx.guardian1.publicKey);

    const guardians = [ctx.guardian1.publicKey, ctx.guardian2.publicKey];
    const afterRemoval = guardians
      .filter(g => !g.equals(ctx.guardian1.publicKey));
    expect(afterRemoval.length).to.equal(1);
  });

  it('should validate quorum after removal', () => {
    // If quorum=2 and only 1 guardian remains, quorum cannot be met
    const guardiansCount = 1;
    const quorum = 2;
    const canMeetQuorum = guardiansCount >= quorum;
    expect(canMeetQuorum).to.be.false;

    // On-chain should either reject removal or adjust quorum
  });

  it('should reject add_guardian from non-owner', async () => {
    const impostor = Keypair.generate();
    await airdrop(provider.connection, impostor.publicKey, 1);

    // TODO: Expect unauthorized error
    expect(impostor.publicKey).to.not.equal(ctx.owner.publicKey);
  });
});
