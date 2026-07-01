import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/** Convert lamports to SOL. */
export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

/** Convert SOL (as entered by a user) to integer lamports. */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL));
}

/** Format lamports as a human "1.2345 SOL" string. */
export function formatSol(lamports: number | bigint, digits = 4): string {
  return `${lamportsToSol(lamports).toFixed(digits)} SOL`;
}

/** Shorten a base58 address to "abcd…wxyz". */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/** Human-readable duration from seconds (largest sensible unit). */
export function formatDuration(seconds: number | bigint): string {
  const s = Math.max(0, Math.floor(Number(seconds)));
  const day = 86_400;
  const hour = 3_600;
  const minute = 60;
  if (s >= day) {
    const d = Math.round(s / day);
    return d === 1 ? '1 day' : `${d} days`;
  }
  if (s >= hour) {
    const h = Math.round(s / hour);
    return h === 1 ? '1 hour' : `${h} hours`;
  }
  const m = Math.max(1, Math.round(s / minute));
  return m === 1 ? '1 minute' : `${m} minutes`;
}

/** Format a unix timestamp (seconds) as a local date-time string. */
export function formatTimestamp(unixSeconds: number | bigint): string {
  return new Date(Number(unixSeconds) * 1000).toLocaleString();
}

/** Format a unix timestamp (seconds) as a local date string. */
export function formatDate(unixSeconds: number | bigint): string {
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString();
}

/** Relative label like "in 2 days" / "3 hours ago" from a unix timestamp (seconds). */
export function relativeFromNow(unixSeconds: number | bigint, nowMs: number = Date.now()): string {
  const deltaSec = Number(unixSeconds) - nowMs / 1000;
  const label = formatDuration(Math.abs(deltaSec));
  return deltaSec >= 0 ? `in ${label}` : `${label} ago`;
}
