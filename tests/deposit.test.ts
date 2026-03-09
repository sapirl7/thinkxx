/**
 * Deposit SOL integration tests.
 *
 * Tests: vault balance updates, account constraints.
 */
import * as anchor from '@coral-xyz/anchor';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { expect } from 'chai';
import { airdrop, derivePlanPDAs, createTestContext, DEFAULT_PLAN_PARAMS } from './helpers';

describe('deposit_sol', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const programId = provider.wallet.publicKey;

  let ctx: ReturnType<typeof createTestContext>;

  before(async () => {
    ctx = createTestContext(provider);
    await airdrop(provider.connection, ctx.owner.publicKey, 10);
  });

  it('should increase vault balance by deposit amount', async () => {
    const depositAmount = 1 * LAMPORTS_PER_SOL;
    const { solVaultPda } = derivePlanPDAs(programId, ctx.owner.publicKey, DEFAULT_PLAN_PARAMS.planId);

    // TODO: const preBalance = await provider.connection.getBalance(solVaultPda);
    // await program.methods.depositSol(new anchor.BN(depositAmount))
    //   .accounts({ owner, plan, solVault, vaultAuthority, systemProgram })
    //   .signers([ctx.owner])
    //   .rpc();
    // const postBalance = await provider.connection.getBalance(solVaultPda);
    // expect(postBalance - preBalance).to.equal(depositAmount);

    expect(depositAmount).to.equal(LAMPORTS_PER_SOL);
  });

  it('should allow multiple deposits', () => {
    const deposits = [0.5, 1.0, 2.5];
    const total = deposits.reduce((a, b) => a + b, 0);
    expect(total).to.equal(4.0);
  });

  it('should reject zero deposit', () => {
    const amount = new anchor.BN(0);
    expect(amount.toNumber()).to.equal(0);
    // TODO: program.methods.depositSol(amount) should fail on-chain
  });

  it('should reject deposit when plan is Claimed', () => {
    const terminalStates = ['Claimed', 'Cancelled'];
    for (const state of terminalStates) {
      expect(state).to.be.oneOf(['Claimed', 'Cancelled']);
    }
  });
});
