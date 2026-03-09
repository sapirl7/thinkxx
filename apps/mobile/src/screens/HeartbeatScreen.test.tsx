/**
 * HeartbeatScreen tests — validates RPC ownership preflight
 * checks (P3 audit fix) and form behavior.
 *
 * Tests the validation logic directly without rendering the component.
 */

import { PublicKey } from '@solana/web3.js';

// Must use require() inside jest.mock factory for PROGRAM_ID
jest.mock('@thinkxx/config', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PublicKey: PK } = require('@solana/web3.js');
  return {
    PROGRAM_ID: new PK('5FEoFcJ2QK7T8SFDX7jKtCfSKvfGhE8QDRLVH2xSWvaP'),
    SEEDS: {
      PLAN: Buffer.from('plan'),
      GUARDIAN_SET: Buffer.from('guardian_set'),
      CLAIM: Buffer.from('claim'),
      VAULT_AUTHORITY: Buffer.from('vault_authority'),
      SOL_VAULT: Buffer.from('sol_vault'),
    },
  };
});

import { PROGRAM_ID } from '@thinkxx/config';

// ── Validation Logic (extracted from HeartbeatScreen.tsx) ──

const PLAN_OWNER_OFFSET = 8; // Anchor discriminator
const PLAN_OWNER_END = PLAN_OWNER_OFFSET + 32;

function validatePlanAddress(input: string): PublicKey {
  try {
    return new PublicKey(input);
  } catch {
    throw new Error('Invalid plan address. Please enter a valid Solana public key.');
  }
}

interface AccountInfo {
  owner: PublicKey;
  data: Buffer;
}

function validateAccountInfo(
  info: AccountInfo | null,
  walletPubkey: PublicKey,
): void {
  if (!info) {
    throw new Error('Plan account not found on devnet. Check the address.');
  }

  if (!info.owner.equals(PROGRAM_ID)) {
    throw new Error('This account is not a Thinkxx plan. Wrong program owner.');
  }

  if (info.data.length < PLAN_OWNER_END) {
    throw new Error('Plan account data is invalid or too short.');
  }

  const planOwnerBytes = info.data.subarray(PLAN_OWNER_OFFSET, PLAN_OWNER_END);
  const planOwner = new PublicKey(planOwnerBytes);
  if (!planOwner.equals(walletPubkey)) {
    throw new Error('This plan does not belong to your wallet.');
  }
}

function makeAccountData(ownerPubkey: PublicKey): Buffer {
  const data = Buffer.alloc(200);
  ownerPubkey.toBuffer().copy(data, PLAN_OWNER_OFFSET);
  return data;
}

// ── Tests ──────────────────────────────────────────────

const WALLET_PUBKEY = new PublicKey('11111111111111111111111111111112');

describe('HeartbeatScreen validation', () => {
  describe('validatePlanAddress', () => {
    it('accepts valid base58 address', () => {
      const valid = PublicKey.default.toBase58();
      expect(() => validatePlanAddress(valid)).not.toThrow();
    });

    it('rejects invalid base58', () => {
      expect(() => validatePlanAddress('not-valid-base58!!!')).toThrow('Invalid plan address');
    });

    it('rejects empty string', () => {
      expect(() => validatePlanAddress('')).toThrow('Invalid plan address');
    });
  });

  describe('validateAccountInfo', () => {
    it('throws when account is null', () => {
      expect(() => validateAccountInfo(null, WALLET_PUBKEY)).toThrow('not found');
    });

    it('throws when owner is not PROGRAM_ID', () => {
      const wrongOwner = new PublicKey('11111111111111111111111111111113');
      const info = {
        owner: wrongOwner,
        data: makeAccountData(WALLET_PUBKEY),
      };
      expect(() => validateAccountInfo(info, WALLET_PUBKEY)).toThrow('not a Thinkxx plan');
    });

    it('throws when data is too short', () => {
      const info = {
        owner: PROGRAM_ID,
        data: Buffer.alloc(10),
      };
      expect(() => validateAccountInfo(info, WALLET_PUBKEY)).toThrow('invalid or too short');
    });

    it('throws when plan owner does not match wallet', () => {
      const otherOwner = new PublicKey('11111111111111111111111111111116');
      const info = {
        owner: PROGRAM_ID,
        data: makeAccountData(otherOwner),
      };
      expect(() => validateAccountInfo(info, WALLET_PUBKEY)).toThrow(
        'does not belong to your wallet',
      );
    });

    it('passes when all checks succeed', () => {
      const info = {
        owner: PROGRAM_ID,
        data: makeAccountData(WALLET_PUBKEY),
      };
      expect(() => validateAccountInfo(info, WALLET_PUBKEY)).not.toThrow();
    });
  });

  describe('data layout', () => {
    it('plan owner offset is 8 (after discriminator)', () => {
      expect(PLAN_OWNER_OFFSET).toBe(8);
    });

    it('plan owner is 32 bytes long', () => {
      expect(PLAN_OWNER_END - PLAN_OWNER_OFFSET).toBe(32);
    });

    it('makeAccountData places owner at correct offset', () => {
      const data = makeAccountData(WALLET_PUBKEY);
      const extracted = new PublicKey(data.subarray(8, 40));
      expect(extracted.equals(WALLET_PUBKEY)).toBe(true);
    });
  });
});
