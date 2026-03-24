/**
 * @thinkxx/sdk
 *
 * TypeScript SDK for the Thinkxx Lifeline protocol.
 * Provides PDA derivation, instruction builders, account parsing,
 * sponsored transactions, and type definitions for the Lifeline Anchor program.
 */

export { derivePlanPda, deriveGuardianSetPda, deriveClaimPda, deriveVaultAuthorityPda, deriveSolVaultPda } from './pda';
export { ThinkxxClient, PlanMode, PlanState } from './client';
export type { PlanAccountData, CreatePlanParams } from './client';
export {
  ClaimState,
  parsePlanAccount,
  parseGuardianSetAccount,
  parseClaimAccount,
  fetchPlansByOwner,
  fetchPlan,
  fetchGuardianSet,
  fetchClaim,
} from './accounts';
export type { ParsedGuardianSet, ParsedClaim, PlanWithAddress } from './accounts';
export { SponsoredTransactionBuilder } from './sponsored';
export type { SponsoredTxConfig } from './sponsored';
