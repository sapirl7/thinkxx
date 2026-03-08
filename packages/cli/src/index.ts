#!/usr/bin/env node

/**
 * @module @thinkxx/cli
 *
 * Emergency CLI for the Thinkxx Lifeline protocol.
 * Provides command-line access to all protocol operations
 * as a fallback when the mobile app is unavailable.
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('thinkxx')
  .description('Emergency CLI for Thinkxx Lifeline protocol')
  .version('0.1.0');

program
  .command('status')
  .description('Check plan status for a given owner')
  .requiredOption('-o, --owner <pubkey>', 'Owner public key')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .action((_options) => {
    // TODO(#3): Implement plan status check
    console.log('Plan status check — not yet implemented');
  });

program
  .command('heartbeat')
  .description('Send heartbeat for a plan')
  .requiredOption('-p, --plan <pubkey>', 'Plan account public key')
  .requiredOption('-k, --keypair <path>', 'Path to owner keypair')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .action((_options) => {
    // TODO(#4): Implement heartbeat
    console.log('Heartbeat — not yet implemented');
  });

program
  .command('claim')
  .description('Start or finalize a claim')
  .requiredOption('-p, --plan <pubkey>', 'Plan account public key')
  .requiredOption('-k, --keypair <path>', 'Path to beneficiary keypair')
  .option('-c, --cluster <cluster>', 'Solana cluster', 'devnet')
  .option('--finalize', 'Finalize an approved claim')
  .action((_options) => {
    // TODO(#5): Implement claim flow
    console.log('Claim — not yet implemented');
  });

program.parse();
