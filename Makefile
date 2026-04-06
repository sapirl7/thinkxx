# ─────────────────────────────────────────────────────────────
# Thinkxx — Unified DX commands
# Usage: make <target>
# ─────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help

# ── Setup ──────────────────────────────────────────────────

.PHONY: install
install: ## Install all dependencies (frozen lockfile)
	pnpm install --frozen-lockfile

# ── Build ──────────────────────────────────────────────────

.PHONY: build
build: ## Build all TypeScript packages
	pnpm run build

.PHONY: anchor-build
anchor-build: ## Build the Anchor program
	anchor build

.PHONY: build-all
build-all: build anchor-build ## Build everything (TS + Anchor)

# ── Lint & Format ──────────────────────────────────────────

.PHONY: lint
lint: ## Run ESLint + TypeScript strict check
	pnpm run typecheck
	pnpm run lint

.PHONY: format-check
format-check: ## Check formatting (Prettier + cargo fmt)
	pnpm run format:check
	cargo fmt --all -- --check

.PHONY: format
format: ## Auto-format all files (Prettier + cargo fmt)
	pnpm run format
	cargo fmt --all

.PHONY: clippy
clippy: ## Run cargo clippy with deny warnings
	cargo clippy --all-targets -- -D warnings

.PHONY: check
check: lint format-check clippy ## Run all quality checks (no tests)

# ── Tests ──────────────────────────────────────────────────

.PHONY: test-sdk
test-sdk: ## Run SDK tests (Vitest)
	pnpm run test:sdk

.PHONY: test-mobile
test-mobile: ## Run mobile tests (Jest)
	pnpm run test:mobile

.PHONY: test-anchor
test-anchor: ## Run Anchor tests (bankrun)
	pnpm run test:anchor

.PHONY: test-all
test-all: test-sdk test-mobile test-anchor ## Run all 3 test suites

.PHONY: test-quick
test-quick: test-sdk test-mobile ## Run SDK + mobile tests (no Anchor)

# ── Security ───────────────────────────────────────────────

.PHONY: audit
audit: ## Run dependency security audits
	cargo audit 2>/dev/null || echo "[WARN] cargo-audit not installed — run: cargo install cargo-audit --locked"
	pnpm audit --prod --audit-level=high || true

# ── Clean ──────────────────────────────────────────────────

.PHONY: clean
clean: ## Remove build artifacts
	pnpm run clean
	rm -rf target/deploy target/idl target/types

# ── CI reproduction ────────────────────────────────────────

.PHONY: ci
ci: install check test-all ## Reproduce CI pipeline locally

# ── Help ───────────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
