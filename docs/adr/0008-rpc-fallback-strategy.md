# ADR-0008: RPC Fallback Strategy

## Status
Accepted

## Date
2026-03-08

## Context
Mobile apps face unreliable network conditions. Solana RPC endpoints can be rate-limited, slow, or unavailable. A single RPC endpoint is a single point of failure.

## Decision
Implement an RPC provider pool with health scoring, automatic fallback, and degraded read-only mode.

## Alternatives Considered
- **Single endpoint**: Rejected. Single point of failure.
- **Client-side load balancing**: Implemented. Round-robin with health scoring.
- **RPC proxy/aggregator service**: Rejected for v1. Adds backend dependency. May consider for v2.

## Consequences
- Multiple RPC endpoints required in configuration
- Health scoring adds minor latency (background checks)
- Degraded mode provides read-only access when writes fail
- Clear error classification helps UX distinguish network vs. protocol errors
- See `docs/RPC_STRATEGY.md` for implementation details
