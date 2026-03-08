/**
 * @module @thinkxx/sdk
 *
 * TypeScript SDK for interacting with the Thinkxx Lifeline protocol.
 *
 * Provides instruction builders, account parsers, and PDA derivation
 * for the Lifeline Anchor program.
 */

export { deriveplanPda, deriveGuardianSetPda, deriveClaimPda, deriveVaultAuthorityPda, deriveSolVaultPda } from './pda';
export { ThinkxxClient } from './client';
