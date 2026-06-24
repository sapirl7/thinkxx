/**
 * @thinkxx/sdk
 *
 * TypeScript SDK for the Thinkxx Lifeline protocol.
 * Provides PDA derivation, instruction builders, sponsored transactions,
 * and type definitions for the Lifeline Anchor program.
 */

export { derivePlanPda, deriveGuardianSetPda, deriveClaimPda, deriveVaultAuthorityPda, deriveSolVaultPda } from './pda';
export { ThinkxxClient, PlanMode, PlanState, ClaimState } from './client';
export type { PlanAccountData, CreatePlanParams, GuardianSetData, ClaimData, PlanSummary } from './client';
export { SponsoredTransactionBuilder } from './sponsored';
export type { SponsoredTxConfig } from './sponsored';
