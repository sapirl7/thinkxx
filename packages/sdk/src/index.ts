/**
 * @thinkxx/sdk
 *
 * TypeScript SDK for the Thinkxx Lifeline protocol.
 * Provides PDA derivation, instruction builders, and type definitions
 * for the Lifeline Anchor program.
 */

export { derivePlanPda, deriveGuardianSetPda, deriveClaimPda, deriveVaultAuthorityPda, deriveSolVaultPda } from './pda';
export { ThinkxxClient, PlanMode, PlanState } from './client';
export type { PlanAccountData, CreatePlanParams } from './client';
