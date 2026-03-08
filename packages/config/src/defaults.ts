import type { PlanMode, TimingConfig } from './types';

/** Seconds per unit for readability */
const HOUR = 3600;
const DAY = 24 * HOUR;

/** Default timing configurations per plan mode */
export const PLAN_DEFAULTS: Record<PlanMode, TimingConfig> = {
  medical: {
    inactivityDuration: 7 * DAY,    // 7 days
    gracePeriod: 1 * DAY,           // 24 hours
    updateDelay: 3 * DAY,           // 3 days
  },
  legal_risk: {
    inactivityDuration: 3 * DAY,    // 3 days
    gracePeriod: 12 * HOUR,         // 12 hours
    updateDelay: 3 * DAY,           // 3 days
  },
  legacy: {
    inactivityDuration: 180 * DAY,  // ~6 months
    gracePeriod: 30 * DAY,          // 30 days
    updateDelay: 14 * DAY,          // 14 days
  },
} as const;

/** Absolute timing bounds enforced on-chain */
export const TIMING_BOUNDS = {
  MIN_INACTIVITY: 1 * DAY,
  MAX_INACTIVITY: 1825 * DAY,      // ~5 years
  MIN_GRACE: 1 * HOUR,
  MAX_GRACE: 90 * DAY,
  MIN_UPDATE_DELAY: 1 * DAY,
  MAX_GUARDIANS: 5,
  MAX_QUORUM: 5,
} as const;
