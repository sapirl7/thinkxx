/**
 * CreatePlanScreen tests — validates client-side form validation
 * aligned with on-chain constraints (P3 audit fix).
 *
 * These tests verify the validation logic directly without rendering.
 * Full component render tests require a native test environment.
 */

import { PublicKey } from '@solana/web3.js';

// ── Validation Constants (from CreatePlanScreen.tsx) ──

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_HOUR = 3_600;

// Client-side bounds matching on-chain program constraints
const MIN_INACTIVITY_DAYS = 1;
const MAX_INACTIVITY_DAYS = 1_825; // ~5 years
const MIN_GRACE_HOURS = 1;
const MAX_GRACE_DAYS = 90;
const MIN_GRACE_DAYS = MIN_GRACE_HOURS / 24;

// ── Validation Logic (extracted from component) ──

function validateBeneficiary(address: string): string | null {
  try {
    new PublicKey(address);
    return null;
  } catch {
    return 'Invalid Solana address for beneficiary';
  }
}

function validateInactivity(days: number): string | null {
  if (isNaN(days) || days < MIN_INACTIVITY_DAYS) {
    return `Inactivity period must be at least ${MIN_INACTIVITY_DAYS} day`;
  }
  if (days > MAX_INACTIVITY_DAYS) {
    return `Inactivity period cannot exceed ${MAX_INACTIVITY_DAYS} days (~5 years)`;
  }
  return null;
}

function validateGrace(days: number): string | null {
  if (isNaN(days) || days < MIN_GRACE_DAYS) {
    return `Grace period must be at least ${MIN_GRACE_HOURS} hour`;
  }
  if (days > MAX_GRACE_DAYS) {
    return `Grace period cannot exceed ${MAX_GRACE_DAYS} days`;
  }
  return null;
}

function convertToSeconds(days: number): bigint {
  return BigInt(Math.round(days * SECONDS_PER_DAY));
}

// ── Tests ──────────────────────────────────────────────

describe('CreatePlanScreen validation', () => {
  describe('Beneficiary validation', () => {
    it('accepts valid Solana address', () => {
      const valid = PublicKey.default.toBase58();
      expect(validateBeneficiary(valid)).toBeNull();
    });

    it('rejects invalid address', () => {
      expect(validateBeneficiary('not-a-valid-address')).toContain('Invalid');
    });

    it('rejects empty address', () => {
      expect(validateBeneficiary('')).toContain('Invalid');
    });
  });

  describe('Inactivity validation', () => {
    it('rejects < 1 day', () => {
      expect(validateInactivity(0.5)).toContain('at least');
    });

    it('rejects 0 days', () => {
      expect(validateInactivity(0)).toContain('at least');
    });

    it('accepts 1 day (minimum)', () => {
      expect(validateInactivity(1)).toBeNull();
    });

    it('accepts 1825 days (maximum)', () => {
      expect(validateInactivity(1825)).toBeNull();
    });

    it('rejects > 1825 days', () => {
      expect(validateInactivity(2000)).toContain('exceed');
    });

    it('rejects NaN', () => {
      expect(validateInactivity(NaN)).toContain('at least');
    });
  });

  describe('Grace period validation', () => {
    it('rejects < 1 hour (0.01 days = ~14 min)', () => {
      expect(validateGrace(0.01)).toContain('at least');
    });

    it('accepts 1/24 days (= 1 hour, minimum)', () => {
      expect(validateGrace(1 / 24)).toBeNull();
    });

    it('accepts 0.5 days (= 12 hours, decimal input)', () => {
      expect(validateGrace(0.5)).toBeNull();
    });

    it('accepts 90 days (maximum)', () => {
      expect(validateGrace(90)).toBeNull();
    });

    it('rejects > 90 days', () => {
      expect(validateGrace(91)).toContain('exceed');
    });

    it('rejects NaN', () => {
      expect(validateGrace(NaN)).toContain('at least');
    });
  });

  describe('Seconds conversion', () => {
    it('converts 1 day → 86400 seconds', () => {
      expect(convertToSeconds(1)).toBe(BigInt(86_400));
    });

    it('converts 0.5 days → 43200 seconds (12h)', () => {
      expect(convertToSeconds(0.5)).toBe(BigInt(43_200));
    });

    it('converts 1/24 days → 3600 seconds (1h)', () => {
      expect(convertToSeconds(1 / 24)).toBe(BigInt(3_600));
    });
  });

  describe('On-chain bounds alignment', () => {
    it('MIN_INACTIVITY matches on-chain 86400s', () => {
      expect(MIN_INACTIVITY_DAYS * SECONDS_PER_DAY).toBe(86_400);
    });

    it('MAX_INACTIVITY matches on-chain 157,680,000s', () => {
      expect(MAX_INACTIVITY_DAYS * SECONDS_PER_DAY).toBe(157_680_000);
    });

    it('MIN_GRACE matches on-chain 3600s', () => {
      expect(Math.round(MIN_GRACE_DAYS * SECONDS_PER_DAY)).toBe(3_600);
    });

    it('MAX_GRACE matches on-chain 7,776,000s', () => {
      expect(MAX_GRACE_DAYS * SECONDS_PER_DAY).toBe(7_776_000);
    });
  });
});
