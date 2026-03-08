# ADR-0009: Emergency Exit Strategy

## Status
Accepted

## Date
2026-03-08

## Context
The mobile app may become unavailable (removed from store, user loses phone, developer abandons project). The protocol must remain usable in this scenario — funds must never be permanently locked because a frontend disappeared.

## Decision
Provide a CLI tool and raw transaction documentation as an emergency exit path. The protocol is fully operable without the mobile app.

## Emergency Exit Paths (priority order)
1. **CLI tool** (`@thinkxx/cli`): Command-line interface for all protocol operations
2. **SDK direct usage**: TypeScript SDK can be used in scripts
3. **Raw transaction construction**: Documentation for building transactions manually using `solana` CLI

## Alternatives Considered
- **Web frontend as backup**: Useful but also has availability risk.
- **Multi-sig recovery mechanism**: Too complex for v1.
- **Trusted third-party recovery**: Violates non-custodial principle.

## Consequences
- CLI must implement all critical protocol operations
- Emergency exit documentation must be clear for non-developers
- Protocol IDL must be published and accessible
- Program account data formats must be documented for manual parsing
