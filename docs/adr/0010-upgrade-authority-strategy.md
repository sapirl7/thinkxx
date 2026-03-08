# ADR-0010: Upgrade Authority Strategy

## Status
Accepted

## Date
2026-03-08

## Context
Solana programs can be deployed as upgradeable (owner can update bytecode) or immutable (frozen forever). The upgrade authority has significant power — they can change program behavior.

## Decision
Deploy to devnet with upgrade authority retained by the deployer for rapid iteration. Before mainnet, transfer upgrade authority to a multi-sig or renounce it after audit.

## Upgrade Authority Lifecycle
1. **Devnet (current)**: Deployer retains upgrade authority for development
2. **Pre-audit**: Document upgrade authority holder and strategy
3. **Post-audit**: Transfer to multi-sig controlled by multiple parties
4. **Maturity**: Consider renouncing upgrade authority (immutable deployment)

## Alternatives Considered
- **Immutable from start**: Rejected. Bugs in early development require ability to fix.
- **DAO-controlled upgrades**: Too complex for v1. May consider for mainnet maturity.
- **Timelock upgrades**: Considered for mainnet. Users get warning period before changes.

## Consequences
- Devnet deployments can be rapidly updated
- Upgrade authority holder has significant trust
- Must clearly document who controls upgrade authority at each phase
- Users must understand that devnet programs may change without notice
- Mainnet upgrade strategy must be decided and documented before launch
