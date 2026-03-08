# Contributing to Thinkxx

Thank you for your interest in contributing to Thinkxx! This project builds a production-grade Solana Mobile dApp for emergency access and inheritance planning.

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
- Anchor CLI 0.32+
- Solana CLI (Agave 3.0+)
- Android Studio (for mobile development)
- JDK 21+

### Commands
```bash
pnpm install          # Install all dependencies
pnpm run build        # Build all packages
pnpm run lint         # Lint all packages
pnpm run typecheck    # TypeScript strict check
pnpm run test         # Run all tests
```

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
chore: update Anchor to 0.32.x
```

## Architecture Decisions

Major changes should be preceded by an ADR (Architecture Decision Record) in `docs/adr/`. See existing ADRs for format reference.

## Security

- Never commit secrets, keys, or private endpoints
- Report vulnerabilities via [SECURITY.md](SECURITY.md)
- Review the [threat model](docs/THREAT_MODEL.md) before modifying protocol logic

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
