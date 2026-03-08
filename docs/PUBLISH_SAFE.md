# Publish-Safe Hygiene

## Purpose

This document defines the publish-safe checklist for the Thinkxx repository. The repository is treated as a public artifact from day one. Every commit should be safe to push to a public GitHub repository.

## Checklist

### 1. No Secrets in Repository
- [ ] No API keys, private endpoints, or tokens in source code
- [ ] All secrets injected via environment variables or `.env` files
- [ ] `.env` patterns are in `.gitignore`
- [ ] No `keystore.properties` or signing keys committed
- [ ] No RPC API keys in committed config

### 2. No Private Endpoints
- [ ] No hardcoded private RPC URLs
- [ ] Endpoint configuration uses environment variables
- [ ] Example config uses public endpoints only

### 3. No Personal Data in Fixtures
- [ ] Test fixtures use obviously fake data
- [ ] No real wallet addresses in test data
- [ ] No real names, emails, or phone numbers anywhere

### 4. No Misleading TODOs
- [ ] Every TODO references a GitHub issue
- [ ] No TODOs claiming features exist that don't
- [ ] No "coming soon" without a clear issue/milestone link

### 5. No Broken Scripts
- [ ] All scripts in `scripts/` are documented
- [ ] All npm scripts in `package.json` work
- [ ] Build commands succeed from a clean checkout

### 6. No Dead Files
- [ ] No experimental files in root directory
- [ ] No orphaned config files
- [ ] No duplicate or abandoned implementations
- [ ] No generated files that should be in `.gitignore`

### 7. No Local Environment Assumptions
- [ ] Scripts don't assume specific local paths
- [ ] No hardcoded absolute paths
- [ ] CI works on fresh runner
- [ ] Setup instructions work on clean machine

### 8. No Unreviewed Generated Content
- [ ] No auto-generated files committed without review
- [ ] IDL files are intentionally committed (not accidental)
- [ ] Lock files are reviewed before commit

### 9. No Sensitive Screenshots
- [ ] No screenshots showing private keys or wallet balances
- [ ] No screenshots showing personal information
- [ ] Demo assets use test/devnet data only

### 10. No False Claims
- [ ] README accurately describes current project state
- [ ] No claims of mainnet deployment without actual deployment
- [ ] No claims of audit completion without audit report
- [ ] Feature list matches actual implementation
- [ ] Version numbers match release tags

## Pre-Release Verification

Before any tagged release:

```bash
# Verify no secrets
git log --all -p | grep -iE "(api_key|secret|password|private_key)" || echo "Clean"

# Verify commands work
pnpm install
pnpm run build
pnpm run lint
pnpm run typecheck
pnpm run test

# Verify docs
# Check all internal links resolve
# Check README setup steps work from scratch

# Verify git state
git status     # Should be clean
git diff HEAD  # No uncommitted changes
```

## Continuous Enforcement

- `.gitignore` prevents common secret patterns
- CI runs secret scanning (GitHub Advanced Security)
- PR template includes publish-safe reminder
- Code review checks for PII exposure
