import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '@thinkxx/config';

/**
 * ThinkxxClient provides high-level access to the Lifeline protocol.
 *
 * This client wraps Anchor program methods and provides typed interfaces
 * for all protocol operations.
 */
export class ThinkxxClient {
  readonly connection: Connection;
  readonly programId: PublicKey;

  constructor(connection: Connection, programId?: PublicKey) {
    this.connection = connection;
    this.programId = programId ?? PROGRAM_ID;
  }

  /**
   * Fetch all plans owned by a given public key.
   */
  async getPlansForOwner(_owner: PublicKey): Promise<unknown[]> {
    // TODO(#1): Implement plan account fetching with memcmp filter
    return [];
  }

  /**
   * Check if an owner's plan is eligible for claim.
   */
  async isClaimEligible(_plan: PublicKey): Promise<boolean> {
    // TODO(#2): Implement eligibility check against on-chain state
    return false;
  }
}
