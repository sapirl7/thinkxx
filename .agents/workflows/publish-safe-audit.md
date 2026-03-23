---
description: Publish-safe audit for the Thinkxx public portfolio repo
---

# Publish-Safe Audit — Thinkxx

## Repo-Specific Context

This repository is a **public-facing portfolio/demo candidate** for a devnet-first Solana Mobile monorepo.

**Stack**: pnpm monorepo, Expo/React Native mobile app, Anchor on-chain program, TypeScript SDK, CLI, supporting packages.

**Canonical sources** (read these first, do not duplicate):
- `AGENTS.md` — project conventions, protected paths, commit hygiene
- `docs/PUBLISH_SAFE.md` — full publish-safe checklist
- `docs/ARCHITECTURE.md` — system design and phase gates
- `docs/PROTOCOL_SPEC.md` — on-chain protocol specification
- `docs/TESTING.md` — test commands and bankrun architecture

## Hard Constraints

1. **This is not a greenfield repo.** Do not scaffold from scratch. Work with what exists.
2. **Do not add artifacts unless clearly justified.** No GOVERNANCE.md, PRIVACY.md, RUNBOOK.md, RELEASE.md unless the repo actually needs them right now.
3. **Update existing docs instead of creating duplicates.** If README already covers something, improve it there.
4. **Be honest about maturity.** State devnet-only, MVP/prototype where applicable. Do not claim audits, production readiness, or mainnet support unless implemented and evidenced.
5. **Do not perform feature work.** Only make changes required for publish safety, documentation accuracy, CI quality, and contributor readiness.
6. **Do not rewrite git history automatically.** If secrets or internal details are found in tracked files or history, stop and produce a remediation plan. Report, don't act.
7. **Do not modify protected paths during the audit pass.** If changes are needed there, report them separately and wait for explicit maintainer approval before applying them. Protected paths (per AGENTS.md):
   - `programs/lifeline/src/`
   - `packages/sdk/src/instructions/`
   - `.github/workflows/`
   - `docs/PROTOCOL_SPEC.md`
   - `docs/THREAT_MODEL.md`
   - `AGENTS.md`

## Audit Scope

Run these checks in order. Stop and report if anything blocks further progress.

### 1. Secret Scan

- Scan all tracked files for private keys, mnemonics, API keys, tokens, internal IPs/URLs.
- Check `.env` files are gitignored (not tracked).
- Check config files (`packages/config/`, `Anchor.toml`) for hardcoded secrets.
- Check for mobile/Android signing artifacts: `*.jks`, `*.keystore`, `keystore.properties`, `google-services.json`, `GoogleService-Info.plist`.
- Include history risk notes if filenames or prior commits suggest past leakage, but do not rewrite history automatically.
- If found in tracked files: **stop, report file + line, produce remediation plan.** Do not auto-fix history.
- **If history-risk is found (leaked secrets, keystore files in past commits), the publish recommendation must be "do not publish yet" — not "conditionally ok".**

### 2. Dependency & License Check

- Verify no private/internal packages in any `package.json` or `Cargo.toml`.
- Flag any dependency with non-permissive license (GPL, AGPL) that conflicts with Apache-2.0.
- Check `pnpm-lock.yaml` and `Cargo.lock` are committed and consistent.

### 3. Documentation Accuracy

- Verify README matches actual repo state: correct commands, correct structure, no dead links.
- **Cross-reference every public claim** (README, docs, SECURITY.md) against actual repo state. If the repo says "69 tests" — verify. If it says "devnet deployed" — verify. Claims must match reality.
- Check that docs do not claim features that don't exist yet.
- Verify `docs/ARCHITECTURE.md` matches current phase.
- Ensure no TODO/FIXME comments reference internal systems, names, or private context.
- Check that `SECURITY.md` exists and is honest (no false audit claims).

### 4. CI Integrity

- Verify all CI jobs in `.github/workflows/` reference correct commands from `package.json`.
- Check that test commands actually run and are not stubs.
- Verify no CI secrets are hardcoded (should use GitHub secrets references).

### 5. Code Hygiene

- No commented-out code blocks left without justification.
- No dead imports or unused files.
- No personal data in test fixtures or mock data.
- No internal Slack/Telegram/email references in code comments.
- Program IDs in `Anchor.toml` and `declare_id!()` are consistent.

### 6. Contributor Readiness

- `LICENSE` file exists and matches `package.json` license field.
- `CONTRIBUTING.md` or contribution section in README exists (can be minimal).
- `.gitignore` covers: `node_modules/`, `target/`, `.env`, IDE files, OS files.
- Running `pnpm install && pnpm run build && pnpm run test:full:local` works from clean clone.

## Output — Two Phases

### Phase 1 — Audit Report

Produce a report with:
- **Findings** grouped by severity: P0 (blocker), P1 (should-fix), P2 (nice-to-have)
- Each finding: file path, line number, what's wrong, recommended fix
- **Publish/no-publish recommendation** with rationale
- Protected-path findings listed separately

Do not modify any files during Phase 1. Report only.

### Phase 2 — Approved Remediation

After maintainer reviews the Phase 1 report and approves specific fixes:
- Execute approved P0/P1/P2 fixes in small, reviewable batches
- Smallest safe execution order
- Explicit list of files to change per batch
- Protected-path changes listed separately — apply only after explicit maintainer approval
- Each batch should be independently committable
