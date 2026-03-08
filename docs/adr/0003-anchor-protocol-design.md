# ADR-0003: Anchor Framework for On-Chain Program

## Status
Accepted

## Date
2026-03-08

## Context
Solana programs can be written using raw Rust with `solana-program` or using higher-level frameworks like Anchor.

## Decision
Use Anchor for the Lifeline on-chain program.

## Alternatives Considered
- **Raw `solana-program`**: Considered. Offers maximum control but requires manual account validation, serialization, and error handling. Higher audit surface area.
- **Seahorse (Python)**: Rejected. Less mature, limited tooling support.

## Consequences
- Automatic account validation via `#[account(...)]` constraints
- IDL generation enables automatic SDK client generation
- Built-in testing framework with `anchor test`
- Reduced boilerplate for account serialization (Borsh)
- Anchor discriminators provide instruction/account type safety
- Framework dependency adds supply chain surface area (acceptable trade-off)
- Must pin Anchor version and track compatibility with Solana runtime versions
