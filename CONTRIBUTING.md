# Contributing to Thinkxx

Thank you for your interest in contributing to Thinkxx! This project builds a devnet-stage Solana Mobile dApp for emergency access and inheritance planning.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/thinkxx.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feat/your-feature`

## Development Setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- Rust (latest stable)
- Anchor CLI 0.30.1
- Solana CLI (Agave 3.0+, only for devnet deploy/manual chain checks)
- Android Studio (for mobile development)
- JDK 21+

### Commands
```bash
pnpm install          # Install all dependencies
pnpm run build        # Build all packages
pnpm run lint         # Lint all packages
pnpm run typecheck    # TypeScript strict check
pnpm run test         # Run all tests
pnpm run test:sdk     # SDK unit tests
pnpm run test:mobile  # React Native / mobile UI tests
pnpm run test:anchor  # Bankrun-based Anchor integration suite
pnpm run test:full:local  # Full local verification before PR
```

### Recommended Local Verification

Before opening a pull request, run the smallest command set that matches your change:

- Docs-only or config-only changes: `pnpm run build` and the relevant package tests
- Mobile UI / state changes: `pnpm run test:mobile`
- SDK changes: `pnpm run test:sdk`
- Protocol or cross-layer changes: `pnpm run test:full:local`

If you modify owner-side mobile flows, also do a short manual devnet smoke on Android:

1. Connect wallet
2. Create plan
3. Confirm the plan appears on Dashboard
4. Open Plan Detail
5. Send Heartbeat
6. Restart the app and confirm wallet + selected plan restore

## Coding Standards

### TypeScript
- Strict mode enabled (`strict: true` in tsconfig)
- No `any` types without explicit justification
- Explicit return types on exported functions
- Small, focused modules (< 300 lines)

### Rust / Anchor
- `cargo fmt` and `cargo clippy` must pass
- Explicit account constraints
- Clear error enums with descriptive messages
- No magic numbers without named constants

### General
- No secrets in code or config
- No dead code or unused imports
- Meaningful commit messages (conventional commits preferred)
- Update docs when changing behavior

## Pull Request Process

1. Ensure all CI checks pass
2. Update relevant documentation
3. Add tests for new functionality
4. Request review from maintainers
5. Squash commits before merge

### PR Title Format
```
feat: add guardian approval flow
fix: handle stale blockhash on retry
docs: update state machine diagram
test: add claim timing window tests
chore: bump dependencies
```

## Architecture Decisions

Major changes should be preceded by an ADR (Architecture Decision Record) in `docs/adr/`. See existing ADRs for format reference.

## Security

- Never commit secrets, keys, or private endpoints
- Report vulnerabilities via [SECURITY.md](SECURITY.md)
- Review the [threat model](docs/THREAT_MODEL.md) before modifying protocol logic

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## Toolchain Pinning

The repository pins toolchain versions for reproducibility:

- **Node.js**: see [`.nvmrc`](../.nvmrc) — use `nvm use` to switch
- **Rust**: see [`rust-toolchain.toml`](../rust-toolchain.toml) — `rustup` reads this automatically
- **pnpm**: pinned in `packageManager` field of root `package.json`
- **Anchor**: version tracked in `.github/workflows/ci.yml` env and `Anchor.toml`

## Makefile

A [`Makefile`](../Makefile) provides a unified DX layer for all operations:

```bash
make help          # List all targets
make install       # pnpm install --frozen-lockfile
make check         # lint + format-check + clippy (no tests)
make test-all      # SDK + mobile + Anchor tests
make audit         # cargo audit + pnpm audit
make ci            # Full CI reproduction (install → check → test-all)
```

## Dependency Security

Security audits run automatically in CI ([security.yml](../.github/workflows/security.yml)) and can be triggered locally:

```bash
make audit
```

This runs `cargo audit` (Rust/RustSec) and `pnpm audit --prod --audit-level=high` (npm advisories).
