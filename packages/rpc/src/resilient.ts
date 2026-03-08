import { Connection, Transaction, TransactionInstruction, Keypair } from '@solana/web3.js';
import type { RpcEndpoint } from './pool';
import { RpcPoolManager } from './pool';

export interface RetryConfig {
  /** Max number of retries per request */
  maxRetries: number;
  /** Base delay in ms before retry (exponential backoff) */
  baseDelay: number;
  /** Maximum delay in ms */
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 5000,
};

/**
 * ResilientConnection — wraps RpcPoolManager with automatic retry + fallback.
 *
 * On failure, retries with exponential backoff. If the primary endpoint
 * is unhealthy, falls back to the next-best endpoint in the pool.
 */
export class ResilientConnection {
  private readonly pool: RpcPoolManager;
  private readonly config: RetryConfig;

  constructor(endpoints: RpcEndpoint[], config?: Partial<RetryConfig>) {
    this.pool = new RpcPoolManager(endpoints);
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /** Get the current best connection */
  getConnection(): Connection {
    return this.pool.getConnection();
  }

  /**
   * Execute an RPC call with retry + fallback.
   * On failure, retries with exponential backoff, then falls back to next endpoint.
   */
  async execute<T>(fn: (connection: Connection) => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const connection = this.pool.getConnection();
      const url = connection.rpcEndpoint;

      try {
        const result = await fn(connection);
        this.pool.recordSuccess(url);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.pool.recordFailure(url);

        if (attempt < this.config.maxRetries) {
          const delay = Math.min(
            this.config.baseDelay * Math.pow(2, attempt),
            this.config.maxDelay,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error('All retry attempts failed');
  }

  /**
   * Send and confirm a transaction with retry + fallback.
   */
  async sendTransaction(
    transaction: Transaction,
    signers: Keypair[],
  ): Promise<string> {
    return this.execute(async (connection) => {
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.sign(...signers);

      const rawTx = transaction.serialize();
      const sig = await connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        'confirmed',
      );

      return sig;
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
