# ADR-0006: Sponsored Transaction Strategy

## Status
Accepted

## Date
2026-03-08

## Context
Beneficiaries and guardians may have zero SOL when they need to interact with the protocol (starting a claim, approving as guardian). This is especially likely in emergency scenarios.

## Decision
Implement an optional sponsored transaction layer where a relayer can pay transaction fees for critical instructions. The relayer is a convenience layer, not a trust anchor.

## Alternatives Considered
- **No sponsorship**: Simplest but creates a UX barrier — beneficiaries must acquire SOL before they can claim inheritance.
- **Gasless via account abstraction**: Not natively supported on Solana.
- **Pre-funded fee accounts**: Complex on-chain logic to manage fee escrow per plan.

## Consequences
- Relayer is optional — protocol fully functional without it
- Relayer can only pay fees, cannot alter instruction semantics
- Abuse controls required (rate limiting, instruction allowlist)
- Relayer budget and availability are not guaranteed
- See `docs/SPONSORED_TXS.md` for implementation details
