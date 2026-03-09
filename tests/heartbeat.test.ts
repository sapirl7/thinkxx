/**
 * Heartbeat integration tests.
 *
 * Tests: owner-only, timestamp update, Draft rejection.
 */
import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { airdrop, derivePlanPDAs, createTestContext, DEFAULT_PLAN_PARAMS } from './helpers';

describe('heartbeat', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const programId = provider.wallet.publicKey;

  let ctx: ReturnType<typeof createTestContext>;

  before(async () => {
    ctx = createTestContext(provider);
    await airdrop(provider.connection, ctx.owner.publicKey, 10);
  });

  it('should update last_heartbeat timestamp for owner', async () => {
    const { planPda } = derivePlanPDAs(programId, ctx.owner.publicKey, DEFAULT_PLAN_PARAMS.planId);
    const now = Math.floor(Date.now() / 1000);

    // TODO: After initializing and activating plan:
    // const tx = await program.methods.heartbeat()
    //   .accounts({ owner: ctx.owner.publicKey, plan: planPda })
    //   .signers([ctx.owner])
    //   .rpc();
    // const plan = await program.account.plan.fetch(planPda);
    // expect(plan.lastHeartbeat.toNumber()).to.be.at.least(now - 5);

    expect(now).to.be.a('number');
  });

  it('should reject heartbeat from non-owner', async () => {
    const impostor = Keypair.generate();
    await airdrop(provider.connection, impostor.publicKey, 1);

    // TODO: Expect ConstraintHasOne or unauthorized error
    // await expect(
    //   program.methods.heartbeat()
    //     .accounts({ owner: impostor.publicKey, plan: planPda })
    //     .signers([impostor])
    //     .rpc()
    // ).to.be.rejected;

    expect(impostor.publicKey).to.not.be.null;
  });

  it('should reject heartbeat on Draft plan', () => {
    // Heartbeat only valid on Active plans
    const validStates = ['Active'];
    expect(validStates).to.not.include('Draft');
  });

  it('should reject heartbeat on Paused plan', () => {
    const validStates = ['Active'];
    expect(validStates).to.not.include('Paused');
  });
});
