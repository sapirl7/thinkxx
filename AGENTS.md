# AGENTS.md — Thinkxx

> Conventions and guidance for AI coding agents and human contributors working on the Thinkxx project.

## Project Overview

**Thinkxx** is a non-custodial Android-first Solana Mobile dApp for emergency access and inheritance planning. It enables users to create time-locked policies that allow trusted beneficiaries to access vault funds after verified inactivity, with guardian oversight and multi-stage claim flows.

**What it is**: An emergency-access and inheritance protocol with a mobile-first UX.
**What it is NOT**: A wallet, key custodian, legal will, seed phrase manager, or DeFi protocol.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile app | React Native + Expo, TypeScript (strict) |
| Wallet integration | Mobile Wallet Adapter (MWA) |
| On-chain program | Anchor (Rust), Solana |
| Build system | pnpm + Turborepo |
| SDK | TypeScript, `@coral-xyz/anchor` |
| CLI | TypeScript, Commander.js |
| Testing | Vitest (TS), Anchor test framework (Rust) |
| CI | GitHub Actions |
| Network | devnet (v1) |

## Repository Structure

```
├── apps/mobile/          # React Native + Expo mobile app
├── programs/lifeline/    # Anchor program (Solana)
├── packages/
│   ├── sdk/              # TypeScript SDK for protocol interaction
│   ├── cli/              # Emergency CLI tool
│   ├── config/           # Shared configuration
│   ├── notifications/    # Notification adapters
│   └── rpc/              # RPC resilience layer
├── docs/                 # Architecture, protocol spec, ADRs
├── scripts/              # Build and deployment scripts
└── .github/              # CI workflows, templates
```

## Main Commands

```bash
pnpm install              # Install all dependencies
pnpm run build            # Build all packages
pnpm run lint             # Lint (ESLint + clippy)
pnpm run typecheck        # TypeScript strict check
pnpm run test             # Run all tests
pnpm run test:anchor      # Anchor program tests only
pnpm run test:sdk         # SDK tests only

# Anchor (from programs/lifeline/)
anchor build              # Compile program
anchor test               # Run Anchor tests
anchor deploy             # Deploy to devnet

# Mobile (from apps/mobile/)
npx expo start            # Start dev server
npx expo run:android      # Build and run on Android
```

## Architecture Summary

```
┌─────────────┐     MWA      ┌──────────────┐
│  Mobile App │◄────────────►│ Solana Wallet │
│  (Expo/RN)  │              │  (Phantom,    │
│             │              │   Solflare)   │
└──────┬──────┘              └──────────────┘
       │ SDK
       ▼
┌──────────────┐    RPC     ┌──────────────┐
│   Thinkxx    │◄──────────►│   Solana      │
│     SDK      │            │   Network     │
└──────┬───────┘            │  (devnet)     │
       │                    └──────┬───────┘
       │                           │
       ▼                           ▼
┌──────────────────────────────────────────┐
│        Lifeline Anchor Program           │
│  ┌──────────┐ ┌────────┐ ┌────────────┐ │
│  │   Plan   │ │ Claim  │ │  Guardian   │ │
│  │ Account  │ │Account │ │ Set Account │ │
│  └──────────┘ └────────┘ └────────────┘ │
│  ┌──────────┐ ┌────────────────────────┐ │
│  │  Vault   │ │   Token Vault PDAs     │ │
│  │  (SOL)   │ │                        │ │
│  └──────────┘ └────────────────────────┘ │
└──────────────────────────────────────────┘
```

## Coding Conventions

### TypeScript
- `strict: true` in all tsconfig files
- No `any` — use `unknown` and narrow
- Explicit return types on exported functions
- Small focused modules (< 300 lines per file)
- Use domain-specific types, not primitives for pubkeys, amounts, timestamps

### Rust / Anchor
- `cargo fmt` before commit
- `cargo clippy -- -D warnings`
- Explicit account constraints with Anchor attributes
- Clear error enums with `#[error_code]`
- Separate business logic from instruction handlers
- Named constants for all magic numbers

### General
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`
- One logical change per commit
- Update docs when behavior changes
- No dead code, no commented-out code, no TODO without a linked issue

## Testing Expectations

- **Anchor**: State transitions, timing windows, guardian quorum, error paths
- **SDK**: Instruction building, account parsing, error mapping
- **Mobile**: Wallet connection flows, state management, error display
- **All**: Edge cases and failure paths, not just happy paths

## Documentation Expectations

- Every public module has a doc comment
- Every ADR follows the template in `docs/adr/`
- Protocol behavior changes update `docs/PROTOCOL_SPEC.md` and `docs/STATE_MACHINE.md`
- UX changes update `docs/MOBILE_UX.md`

## Security Expectations

- Never store, transmit, or access private keys
- All critical logic enforced on-chain
- No admin backdoors
- Beneficiary and guardian changes enforce time delays
- Unsupported tokens must fail safely
- Report vulnerabilities via `SECURITY.md`

## Never Modify Without Review

The following paths require explicit review from a maintainer:
- `programs/lifeline/src/` — any protocol logic change
- `packages/sdk/src/instructions/` — instruction building
- `AGENTS.md` — project conventions
- `docs/PROTOCOL_SPEC.md` — protocol specification
- `docs/THREAT_MODEL.md` — threat model
- `.github/workflows/` — CI pipeline

## Branch & Commit Hygiene

- `main` is the default branch, always green
- Feature branches: `feat/<short-description>`
- Fix branches: `fix/<short-description>`
- Squash merge to `main`
- No force-push to `main`
- Tag releases: `v0.1.0`, `v0.2.0`, etc.

## Release Hygiene

- Version bump in relevant `package.json` / `Cargo.toml`
- Update `CHANGELOG.md` if present
- Ensure docs match code
- Run full CI before tagging
- No unreleased features mentioned as shipped

## Working in Phases

This project follows a phased approach. See `docs/ARCHITECTURE.md` for milestone gates. Each phase:
1. Starts with specification (docs first)
2. Implements with tests
3. Verifies with CI and manual checks
4. Records decisions in `DECISIONS.md` and ADRs

## Decision Recording

- Quick decisions: append to `DECISIONS.md` with date and rationale
- Major architectural decisions: create `docs/adr/NNNN-title.md`
- ADRs are immutable once accepted — supersede with new ADRs

## Publish-Safe Rules

- No secrets in repo (use `.env` + `.gitignore`)
- No private endpoints committed
- No personal data in fixtures
- No misleading TODOs claiming features exist
- No broken scripts left unexplained
- See `docs/PUBLISH_SAFE.md` for full checklist

## Browser Allowlist (for AI agents)

Only access these domains for research:
- `docs.solanamobile.com`
- `solana.com`
- `anchor-lang.com`
- `spl.solana.com`
- `github.com`
- `developers.google.com`
