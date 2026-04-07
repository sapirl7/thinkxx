import { Connection, PublicKey } from '@solana/web3.js';

const DEFAULT_MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function isRpcRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b429\b|rate limit|too many requests|connection rate limits exceeded/i.test(message);
}

export function isTransientRpcReadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    isRpcRateLimitError(error) ||
    /timeout|timed out|fetch failed|network request failed|temporarily unavailable|503|502|504|network error/i.test(
      message
    )
  );
}

export function toRpcReadMessage(
  error: unknown,
  fallback = 'Failed to read devnet state.',
): string {
  if (isRpcRateLimitError(error)) {
    return 'Devnet RPC is busy right now. Pull to refresh in a few seconds.';
  }

  return error instanceof Error ? error.message : fallback;
}

export async function retryRpcRead<T>(
  read: () => Promise<T>,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      lastError = error;

      if (!isTransientRpcReadError(error) || attempt === maxAttempts - 1) {
        break;
      }

      const delay = BASE_DELAY_MS * (attempt + 1);
      await sleep(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function readBalanceWithRetry(
  connection: Connection,
  address: PublicKey,
  commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed',
): Promise<number> {
  return retryRpcRead(() => connection.getBalance(address, commitment));
}
