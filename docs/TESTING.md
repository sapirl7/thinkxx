# Testing Guide

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Rust stable toolchain
- Anchor CLI (`cargo install --git https://github.com/coral-xyz/anchor avm && avm install 0.30.1 && avm use 0.30.1`)
- Solana CLI (`solana-install init 2.0.0`) — only for deploy, not for tests

## Running Tests

### SDK Tests

```bash
pnpm run test:sdk
```

Runs via `vitest` inside `packages/sdk`. **44 unit tests** covering instruction building, PDA derivation, account parsing, fetch helpers, and error mapping.

### Mobile Tests

```bash
pnpm run test:mobile
```

Runs via `jest` inside `apps/mobile`. **10 suites / 70 tests** covering wallet connection, persisted state, owner-side screen rendering, and plan-bound flows.

### Anchor Tests (bankrun-based)

```bash
pnpm run test:anchor
```

Rebuilds the program (`anchor build`) then runs 69 integration tests via `ts-mocha` using `anchor-bankrun`. **No local validator is required** — bankrun runs an in-process Solana runtime.

> **⚠️ `anchor test` is NOT the merge gate.** The canonical command is `pnpm run test:anchor`, which runs bankrun-based tests without a local validator. The old `anchor test` command (which spins up `solana-test-validator`) is no longer used in CI or local development. If you see `anchor test` in legacy docs or scripts, replace it with `pnpm run test:anchor`.

Tests cover: `initialize_plan`, `deposit_sol`, `add/remove_guardian`, `heartbeat`, `set_emergency_bucket`, `emergency_withdraw`, `pause/resume/close_plan`, and the full claim flow (`start`, `cancel`, `approve`, `veto`, `finalize`).

### Combo Commands

```bash
pnpm run test:all:local   # SDK + Mobile
pnpm run test:full:local  # SDK + Mobile + Anchor
```

## Architecture

### Bankrun (Anchor tests)

All Anchor integration tests use [`anchor-bankrun`](https://github.com/coral-xyz/anchor/tree/master/ts/packages/anchor-bankrun) + [`solana-bankrun`](https://github.com/kevinheavey/solana-bankrun) for deterministic, in-process testing:

- **No validator needed**: `startAnchor('.')` boots a local SVM runtime
- **Deterministic time**: `context.setClock()` for time-warp (inactivity windows, grace deadlines)
- **Fast**: Full 69-test suite runs in ~2 seconds
- **Isolated**: Each test case gets fresh keypairs and a unique PDA via `nextPlanId()`

### Test Helpers (`tests/helpers.ts`)

Shared bankrun harness with:
- `initTestEnvironment()` — bootstrap bankrun
- `createTestContext()` — 6 fresh keypairs (owner, beneficiary, backup, 3 guardians)
- `fundSigner()` / `fundContext()` — fund accounts via `context.setAccount()`
- `derivePlanPDAs()` — compute all 5 PDAs from owner + planId
- `createPlanFixture()`, `depositSolFixture()`, `addGuardianFixture()` — composite setup
- `expectAnchorError()` — assert on custom error names
- `warpPastInactivityWindow()` / `warpPastGraceDeadline()` — deterministic time warp

## Protected Protocol Logic

Changes to files under `programs/lifeline/src/` require **maintainer review** before merge, per [AGENTS.md](/AGENTS.md). This includes any instruction handler, state definition, or error code.

## CI Jobs

| Job | What it does | Required |
|---|---|---|
| `lint-and-typecheck` | ESLint + TypeScript strict | ✅ |
| `rust-checks` | `cargo fmt --check` + `clippy -D warnings` | ✅ |
| `anchor-build` | `anchor build` | ✅ |
| `sdk-test` | `pnpm run test:sdk` | ✅ |
| `mobile-test` | `pnpm run test:mobile` | ✅ |
| `anchor-test` | `pnpm run test:anchor` (bankrun, no validator) | ✅ |
