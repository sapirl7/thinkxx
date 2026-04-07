# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-devnet] - 2026-03-31

First public devnet release of Thinkxx.

### Highlights
- 183 total tests (44 SDK + 70 mobile + 69 Anchor)
- 18 on-chain instructions, 8 mobile screens, 15 SDK builders
- Comprehensive documentation: 15 spec documents, 10 ADRs, README with Mermaid diagrams
- Public repo hygiene, CI gates, and publish-safe docs in place

### Added
- **Expo / React Native mobile app** for owner-side plan management
  - 8 screens: Connect, Dashboard, CreatePlan, PlanDetail, Heartbeat, Deposit, Guardians, Settings
  - Dark-first control-room UI with teal + amber accent system
  - WalletProvider with MWA session management and persistence
  - Plan-bound state management (plan-session, wallet-session, storage)
- **Anchor-based Lifeline protocol** on Solana devnet
  - 18 instructions: plan lifecycle, vault operations, guardian management, claim flow, plan updates
  - 3 on-chain accounts: PlanAccount, GuardianSetAccount, ClaimAccount
  - 5 PDA derivations: plan, guardian_set, claim, vault_authority, sol_vault
  - 24 custom error codes with descriptive messages
  - Emergency bucket for owner quick-withdrawals
- **TypeScript SDK** (`@thinkxx/sdk`)
  - ThinkxxClient with 15 instruction builders
  - PDA derivation helpers (5 functions)
  - Account parsing and fetch helpers
  - SponsoredTransactionBuilder for gasless UX
- **CLI Emergency Toolkit** (`@thinkxx/cli`)
  - 10 commands: status, heartbeat, claim, deposit, pause, resume, guardian add/remove, emergency-withdraw
- **RPC Resilience** (`@thinkxx/rpc`)
  - ResilientConnection with exponential backoff retry
  - Endpoint pool with health scoring and automatic fallback
  - Blockhash caching with refresh on failure
- **Notification Adapters** (`@thinkxx/notifications`)
  - ConsoleAdapter (stdout) and TelegramAdapter (Bot API with health check)
  - Pluggable adapter interface for future channels
- **Bankrun-based Anchor test suite**
  - 69 integration tests — deterministic, in-process, ~2 seconds
  - Covers all state transitions, timing boundaries, guardian quorum, security invariants
- **Documentation**
  - Architecture with system diagrams and trust model
  - Protocol spec with full account and instruction reference
  - State machine with 4 Mermaid stateDiagrams and guard conditions
  - STRIDE-based threat model (12 threats analyzed)
  - Token support matrix with Token-2022 extension evaluation
  - RPC strategy, notifications, sponsored transactions specs
  - Security audit report, release readiness, publish-safe checklist
  - 10 Architecture Decision Records (ADRs)
- **CI/CD**: GitHub Actions workflows for build, lint, typecheck, and all 3 test suites
- **Community**: LICENSE (Apache 2.0), SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, AGENTS.md

### Known Limitations
- Devnet only — not deployed to mainnet
- No beneficiary mobile claim UX yet
- No automated heartbeat or push notifications
- No mainnet deployment or production security audit

[0.1.0-devnet]: https://github.com/sapirl7/thinkxx/releases/tag/v0.1.0-devnet
