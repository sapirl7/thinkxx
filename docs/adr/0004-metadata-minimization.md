# ADR-0004: Metadata Minimization

## Status
Accepted

## Date
2026-03-08

## Context
The protocol manages emergency access to funds, which involves sensitive relationships (owner ↔ beneficiary ↔ guardians). Solana is a public blockchain — all account data is publicly readable.

## Decision
Store only execution-critical data on-chain. No personally identifiable information (PII). Optional metadata is stored off-chain, encrypted, with only hash references on-chain.

## On-chain data (allowed)
- Public keys (owner, beneficiary, guardians)
- Timing parameters (inactivity window, grace period)
- State enums and counters
- Vault balances and references

## Off-chain data (optional, encrypted)
- Names and relationship labels
- Contact information
- Personal notes or instructions
- Medical or legal context

## Alternatives Considered
- **Full on-chain metadata**: Rejected. Immutable PII on public blockchain creates permanent privacy exposure.
- **Encrypted on-chain metadata**: Considered. Still stores encrypted blobs in public accounts, increasing storage costs and adding key management complexity.
- **No metadata at all**: Acceptable but limits UX. Optional off-chain metadata provides better user experience without compromising privacy.

## Consequences
- Users must understand that pubkey relationships are publicly observable
- Onboarding must clearly explain privacy limitations
- Off-chain metadata requires separate storage and encryption key management
- Protocol works fully without any metadata — it's a UX enhancement only
