# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-03-08

### Added
- **Anchor Test Suite**: 30 tests across 8 categories (state transitions, guardians, claims, timing, PDA derivation, security invariants)
- **RPC Resilience**: `ResilientConnection` with exponential backoff retry and automatic endpoint fallback
- **Sponsored Transactions**: `SponsoredTransactionBuilder` for gasless mobile UX with fee payer separation

## [0.2.0] - 2026-03-08

### Added
- **Plan Updates**: `update_beneficiary`, `update_timing`, `close_plan` instructions (18 total)
- **CLI Emergency Toolkit**: 10 commands (status, heartbeat, claim, deposit, pause, resume, guardian add/remove, emergency-withdraw)
- **Notification Adapters**: `ConsoleAdapter` (stdout) and `TelegramAdapter` (Bot API with health check)

## [0.1.0] - 2026-03-08

### Added
- **Anchor Program**: 15 initial instructions covering plan lifecycle, vault operations, guardian management, and claim flow
- **SDK**: `ThinkxxClient` with 15 instruction builders, PDA derivation helpers, Borsh encoding
- **Mobile App**: 4 screens (Connect, Dashboard, CreatePlan, Heartbeat) with dark Solana theme
- **Monorepo**: pnpm workspaces + Turborepo with 6 packages
- **Documentation**: 9 specification docs, 10 ADRs, architecture diagrams
- **CI/CD**: GitHub Actions workflows for build, lint, and test
- **Community**: LICENSE (Apache 2.0), SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md

[0.3.0]: https://github.com/sapirl7/thinkxx/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/sapirl7/thinkxx/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sapirl7/thinkxx/releases/tag/v0.1.0
