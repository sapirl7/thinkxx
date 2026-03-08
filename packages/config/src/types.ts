/**
 * Domain types for the Thinkxx protocol.
 * Use these instead of raw primitives for type safety.
 */

/** Plan operating modes with different default timing */
export type PlanMode = 'medical' | 'legal_risk' | 'legacy';

/** Plan lifecycle states */
export type PlanState =
  | 'draft'
  | 'active'
  | 'claim_pending'
  | 'claim_approved'
  | 'claimed'
  | 'cancelled'
  | 'paused';

/** Claim lifecycle states */
export type ClaimState =
  | 'pending'
  | 'approved'
  | 'vetoed'
  | 'finalized'
  | 'cancelled';

/** Timing configuration for a plan */
export interface TimingConfig {
  /** Seconds of inactivity before claim eligibility */
  readonly inactivityDuration: number;
  /** Seconds owner has to cancel after claim starts */
  readonly gracePeriod: number;
  /** Seconds before beneficiary/guardian changes take effect */
  readonly updateDelay: number;
}

/** Network configuration */
export interface NetworkConfig {
  readonly name: string;
  readonly rpcEndpoint: string;
  readonly wsEndpoint?: string;
  readonly explorerUrl: string;
}
