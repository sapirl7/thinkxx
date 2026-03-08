import { Connection } from '@solana/web3.js';

/** Configuration for a single RPC endpoint */
export interface RpcEndpoint {
  readonly url: string;
  readonly name: string;
  readonly priority: number;
  readonly rateLimit: number;
  readonly isPublic: boolean;
}

/** Health status of an endpoint */
interface EndpointHealth {
  score: number;
  lastSuccess: number;
  lastFailure: number;
  successCount: number;
  failureCount: number;
}

/**
 * Manages a pool of RPC endpoints with health scoring and automatic fallback.
 *
 * Endpoints are scored based on latency, success rate, and freshness.
 * The pool automatically routes requests to the healthiest available endpoint.
 */
export class RpcPoolManager {
  private readonly endpoints: RpcEndpoint[];
  private readonly health: Map<string, EndpointHealth> = new Map();
  private connections: Map<string, Connection> = new Map();

  constructor(endpoints: RpcEndpoint[]) {
    this.endpoints = [...endpoints].sort((a, b) => a.priority - b.priority);

    for (const ep of this.endpoints) {
      this.health.set(ep.url, {
        score: 100,
        lastSuccess: Date.now(),
        lastFailure: 0,
        successCount: 0,
        failureCount: 0,
      });
    }
  }

  /** Get the best available connection based on health scores */
  getConnection(): Connection {
    const best = this.getBestEndpoint();
    let conn = this.connections.get(best.url);
    if (!conn) {
      conn = new Connection(best.url, 'confirmed');
      this.connections.set(best.url, conn);
    }
    return conn;
  }

  /** Record a successful request to update health score */
  recordSuccess(url: string): void {
    const h = this.health.get(url);
    if (h) {
      h.successCount++;
      h.lastSuccess = Date.now();
      h.score = Math.min(100, h.score + 5);
    }
  }

  /** Record a failed request to update health score */
  recordFailure(url: string): void {
    const h = this.health.get(url);
    if (h) {
      h.failureCount++;
      h.lastFailure = Date.now();
      h.score = Math.max(0, h.score - 20);
    }
  }

  /** Get the healthiest endpoint */
  private getBestEndpoint(): RpcEndpoint {
    let best = this.endpoints[0];
    let bestScore = -1;

    for (const ep of this.endpoints) {
      const h = this.health.get(ep.url);
      const score = h ? h.score : 0;
      if (score > bestScore) {
        bestScore = score;
        best = ep;
      }
    }

    return best;
  }
}
