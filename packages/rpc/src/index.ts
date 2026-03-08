/**
 * @module @thinkxx/rpc
 *
 * RPC resilience layer with provider pool, health scoring,
 * automatic fallback, retry with exponential backoff,
 * and degraded mode support.
 *
 * See docs/RPC_STRATEGY.md for architecture details.
 */

export { RpcPoolManager } from './pool';
export type { RpcEndpoint } from './pool';
export { ResilientConnection } from './resilient';
export type { RetryConfig } from './resilient';
