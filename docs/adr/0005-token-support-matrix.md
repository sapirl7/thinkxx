# ADR-0005: Token Support Matrix Strategy

## Status
Accepted

## Date
2026-03-08

## Context
Solana has multiple token standards: SPL Token Program, Token-2022 (Token Extensions). Token-2022 introduces extensions that can fundamentally alter transfer semantics (fees, hooks, non-transferability).

## Decision
Use an explicit allowlist approach. Support SOL + classic SPL tokens in v1. Evaluate Token-2022 extensions individually and reject those with incompatible transfer semantics.

## Alternatives Considered
- **Support all SPL tokens**: Rejected. Token-2022 extensions like Transfer Hook and Permanent Delegate can cause vault funds to behave unpredictably during claim finalization.
- **SOL only**: Too restrictive. USDC and other standard SPL tokens are important for real-world inheritance planning.
- **Blocklist approach**: Rejected. New extensions could be added to Token-2022 that we haven't evaluated. Allowlist is safer.

## Consequences
- Clear boundary of what is supported
- Users see clear error when depositing unsupported tokens
- Requires ongoing evaluation as Token-2022 evolves
- See `docs/TOKEN_SUPPORT_MATRIX.md` for full extension analysis
