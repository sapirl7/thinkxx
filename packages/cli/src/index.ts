#!/usr/bin/env node

/**
 * @module @thinkxx/cli
 *
 * Emergency CLI for the Thinkxx Lifeline protocol.
 * Provides command-line access to all protocol operations
 * as a fallback when the mobile app is unavailable.
 *
 * Usage:
 *   thinkxx status -o <owner-pubkey>
 *   thinkxx heartbeat -p <plan-pubkey> -k <keypair-path>
 *   thinkxx claim -p <plan-pubkey> -k <keypair-path> [--finalize]
 *   thinkxx deposit -p <plan-pubkey> -k <keypair-path> -a <amount-sol>
 *   thinkxx pause -p <plan-pubkey> -k <keypair-path>
 *   thinkxx resume -p <plan-pubkey> -k <keypair-path>
 *   thinkxx guardian add -p <plan> -k <keypair> -g <guardian-pubkey>
 *   thinkxx guardian remove -p <plan> -k <keypair> -g <guardian-pubkey>
 *   thinkxx emergency-withdraw -p <plan> -k <keypair> -a <amount-sol>
 */

import { Command } from 'commander';
import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { ThinkxxClient } from '@thinkxx/sdk';
import { NETWORK_CONFIG, CLUSTER } from '@thinkxx/config';
import * as fs from 'fs';

const program = new Command();

program
  .name('thinkxx')
  .description('Emergency CLI for Thinkxx Lifeline protocol')
  .version('0.1.0');

/** Helper: load keypair from file */
function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

/** Helper: create connection */
function getConnection(cluster: string): Connection {
  const rpc = cluster === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : NETWORK_CONFIG[CLUSTER.DEVNET].rpcEndpoint;
  return new Connection(rpc, 'confirmed');
}

// === Status ===

program
  .command('status')
  .description('Check plan status for a given owner')
  .requiredOption('-o, --owner <pubkey>', 'Owner public key')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .action(async (options: { owner: string; cluster: string }) => {
    const connection = getConnection(options.cluster);
    const owner = new PublicKey(options.owner);
    console.log(`\n🔍 Checking plans for ${owner.toBase58().slice(0, 8)}...`);
    console.log(`   Cluster: ${options.cluster}`);
    console.log(`   RPC: ${connection.rpcEndpoint}`);

    // Currently limited to a single plan lookup. Multi-plan discovery via
    // getProgramAccounts is deferred to a future CLI release.
    console.log('\n   No plans found (account fetching not yet wired)');
    console.log('   Use the mobile app or SDK for full functionality.\n');
  });

// === Heartbeat ===

program
  .command('heartbeat')
  .description('Send heartbeat for a plan')
  .requiredOption('-p, --plan <pubkey>', 'Plan account public key')
  .requiredOption('-k, --keypair <path>', 'Path to owner keypair')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .action(async (options: { plan: string; keypair: string; cluster: string }) => {
    const connection = getConnection(options.cluster);
    const keypair = loadKeypair(options.keypair);
    const client = new ThinkxxClient(connection);
    const planPda = new PublicKey(options.plan);

    console.log('\n💓 Sending heartbeat...');
    const ix = client.buildHeartbeat(keypair.publicKey, planPda);
    const tx = new Transaction().add(ix);

    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ Heartbeat confirmed: ${sig}`);
    } catch (err) {
      console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

// === Claim ===

program
  .command('claim')
  .description('Start or finalize a claim')
  .requiredOption('-p, --plan <pubkey>', 'Plan account public key')
  .requiredOption('-k, --keypair <path>', 'Path to beneficiary keypair')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .option('--finalize', 'Finalize an approved claim')
  .action(async (options: { plan: string; keypair: string; cluster: string; finalize?: boolean }) => {
    const connection = getConnection(options.cluster);
    const keypair = loadKeypair(options.keypair);
    const client = new ThinkxxClient(connection);
    const planPda = new PublicKey(options.plan);

    if (options.finalize) {
      console.log('\n💸 Finalizing claim...');
      // Need guardianSet PDA — derive from plan
      const { deriveGuardianSetPda, deriveClaimPda } = await import('@thinkxx/sdk');
      const [guardianSetPda] = deriveGuardianSetPda(planPda);
      const [claimPda] = deriveClaimPda(planPda);
      const ix = client.buildFinalizeClaim(keypair.publicKey, planPda, guardianSetPda, claimPda);
      const tx = new Transaction().add(ix);

      try {
        const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
        console.log(`   ✅ Claim finalized: ${sig}`);
      } catch (err) {
        console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    } else {
      console.log('\n🚨 Starting claim...');
      const ix = client.buildStartClaim(keypair.publicKey, planPda);
      const tx = new Transaction().add(ix);

      try {
        const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
        console.log(`   ✅ Claim started: ${sig}`);
      } catch (err) {
        console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    }
  });

// === Deposit ===

program
  .command('deposit')
  .description('Deposit SOL into plan vault')
  .requiredOption('-p, --plan <pubkey>', 'Plan account public key')
  .requiredOption('-k, --keypair <path>', 'Path to owner keypair')
  .requiredOption('-a, --amount <sol>', 'Amount in SOL')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .action(async (options: { plan: string; keypair: string; amount: string; cluster: string }) => {
    const connection = getConnection(options.cluster);
    const keypair = loadKeypair(options.keypair);
    const client = new ThinkxxClient(connection);
    const planPda = new PublicKey(options.plan);
    const lamports = BigInt(Math.floor(parseFloat(options.amount) * 1e9));

    console.log(`\n📥 Depositing ${options.amount} SOL...`);
    const ix = client.buildDepositSol(keypair.publicKey, planPda, lamports);
    const tx = new Transaction().add(ix);

    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ Deposited: ${sig}`);
    } catch (err) {
      console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

// === Pause / Resume ===

program
  .command('pause')
  .description('Pause an active plan')
  .requiredOption('-p, --plan <pubkey>', 'Plan account public key')
  .requiredOption('-k, --keypair <path>', 'Path to owner keypair')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .action(async (options: { plan: string; keypair: string; cluster: string }) => {
    const connection = getConnection(options.cluster);
    const keypair = loadKeypair(options.keypair);
    const client = new ThinkxxClient(connection);

    console.log('\n⏸ Pausing plan...');
    const ix = client.buildPausePlan(keypair.publicKey, new PublicKey(options.plan));
    const tx = new Transaction().add(ix);

    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ Paused: ${sig}`);
    } catch (err) {
      console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program
  .command('resume')
  .description('Resume a paused plan')
  .requiredOption('-p, --plan <pubkey>', 'Plan account public key')
  .requiredOption('-k, --keypair <path>', 'Path to owner keypair')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .action(async (options: { plan: string; keypair: string; cluster: string }) => {
    const connection = getConnection(options.cluster);
    const keypair = loadKeypair(options.keypair);
    const client = new ThinkxxClient(connection);

    console.log('\n▶️ Resuming plan...');
    const ix = client.buildResumePlan(keypair.publicKey, new PublicKey(options.plan));
    const tx = new Transaction().add(ix);

    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ Resumed: ${sig}`);
    } catch (err) {
      console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

// === Guardian Management ===

const guardianCmd = program
  .command('guardian')
  .description('Manage guardians');

guardianCmd
  .command('add')
  .description('Add a guardian')
  .requiredOption('-p, --plan <pubkey>', 'Plan account')
  .requiredOption('-k, --keypair <path>', 'Owner keypair')
  .requiredOption('-g, --guardian <pubkey>', 'Guardian public key')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .action(async (options: { plan: string; keypair: string; guardian: string; cluster: string }) => {
    const connection = getConnection(options.cluster);
    const keypair = loadKeypair(options.keypair);
    const client = new ThinkxxClient(connection);
    const planPda = new PublicKey(options.plan);
    const { deriveGuardianSetPda } = await import('@thinkxx/sdk');
    const [guardianSetPda] = deriveGuardianSetPda(planPda);

    console.log(`\n🛡 Adding guardian ${options.guardian.slice(0, 8)}...`);
    const ix = client.buildAddGuardian(keypair.publicKey, planPda, guardianSetPda, new PublicKey(options.guardian));
    const tx = new Transaction().add(ix);

    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ Guardian added: ${sig}`);
    } catch (err) {
      console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

guardianCmd
  .command('remove')
  .description('Remove a guardian')
  .requiredOption('-p, --plan <pubkey>', 'Plan account')
  .requiredOption('-k, --keypair <path>', 'Owner keypair')
  .requiredOption('-g, --guardian <pubkey>', 'Guardian public key')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .action(async (options: { plan: string; keypair: string; guardian: string; cluster: string }) => {
    const connection = getConnection(options.cluster);
    const keypair = loadKeypair(options.keypair);
    const client = new ThinkxxClient(connection);
    const planPda = new PublicKey(options.plan);
    const { deriveGuardianSetPda } = await import('@thinkxx/sdk');
    const [guardianSetPda] = deriveGuardianSetPda(planPda);

    console.log(`\n🛡 Removing guardian ${options.guardian.slice(0, 8)}...`);
    const ix = client.buildRemoveGuardian(keypair.publicKey, planPda, guardianSetPda, new PublicKey(options.guardian));
    const tx = new Transaction().add(ix);

    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ Guardian removed: ${sig}`);
    } catch (err) {
      console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

// === Emergency Withdraw ===

program
  .command('emergency-withdraw')
  .description('Withdraw from emergency bucket')
  .requiredOption('-p, --plan <pubkey>', 'Plan account public key')
  .requiredOption('-k, --keypair <path>', 'Path to owner keypair')
  .requiredOption('-a, --amount <sol>', 'Amount in SOL')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .action(async (options: { plan: string; keypair: string; amount: string; cluster: string }) => {
    const connection = getConnection(options.cluster);
    const keypair = loadKeypair(options.keypair);
    const client = new ThinkxxClient(connection);
    const planPda = new PublicKey(options.plan);
    const lamports = BigInt(Math.floor(parseFloat(options.amount) * 1e9));

    console.log(`\n🆘 Emergency withdrawal: ${options.amount} SOL...`);
    const ix = client.buildEmergencyWithdraw(keypair.publicKey, planPda, lamports);
    const tx = new Transaction().add(ix);

    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
      console.log(`   ✅ Withdrawn: ${sig}`);
    } catch (err) {
      console.error(`   ❌ Failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program.parse();
