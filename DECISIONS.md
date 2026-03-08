# Decision Log

Running record of key engineering decisions for the Thinkxx project.

---

## 2026-03-08 — Initial Architecture Decisions

### D001: Mobile Wallet Adapter over Seed Vault SDK
**Decision**: Use MWA for all wallet interactions. Do not use Seed Vault SDK.
**Rationale**: Thinkxx is a dApp, not a wallet. MWA provides standard wallet connectivity that works with any compliant Solana wallet. Seed Vault is for wallet apps that manage keys. See ADR-0001.

### D002: Android-first, Seeker-optimized
**Decision**: Target Android as the primary platform with Seeker-specific UX optimizations.
**Rationale**: Solana Mobile ecosystem is Android-first. Seeker is the flagship device. iOS can follow later. See ADR-0002.

### D003: Anchor for on-chain program
**Decision**: Use Anchor framework for the Solana program.
**Rationale**: Anchor provides account validation, serialization, IDL generation, and testing framework. The IDL enables automatic SDK generation. See ADR-0003.

### D004: React Native + Expo for mobile
**Decision**: Use React Native with Expo for the mobile application.
**Rationale**: JavaScript/TypeScript ecosystem has the best Solana Mobile library support. Expo simplifies build tooling. Prior art from Solarma project validates this stack.

### D005: pnpm + Turborepo monorepo
**Decision**: Use pnpm workspaces with Turborepo for the monorepo build system.
**Rationale**: pnpm is fast and efficient for monorepos. Turborepo provides incremental builds and task caching. Standard tooling in the Solana ecosystem.

### D006: Apache 2.0 license
**Decision**: License the project under Apache 2.0.
**Rationale**: Permissive license that allows commercial use while requiring attribution. Patent grant protects contributors. Consistent with Solarma and Solana ecosystem norms.

### D007: Metadata minimization
**Decision**: Store only execution-critical data on-chain. No PII.
**Rationale**: On-chain data is public and immutable. Storing names, emails, or relationship details would create permanent privacy exposure. See ADR-0004.

### D008: Explicit state machine over implicit behavior
**Decision**: All protocol states and transitions are explicit with named enums and transition functions.
**Rationale**: Auditability, testability, and correctness require clear state boundaries. Implicit behavior creates ambiguity that leads to bugs and security issues.

### D009: Delayed updates for beneficiaries and guardians
**Decision**: Changes to beneficiary addresses and guardian sets must enforce a time-delay before taking effect.
**Rationale**: If an attacker temporarily compromises the owner's wallet, they cannot instantly redirect funds to a new beneficiary. The delay gives the owner time to detect and revert. See threat model.

### D010: devnet only for v1
**Decision**: Deploy exclusively to devnet for the initial release.
**Rationale**: The protocol handles real financial assets and emergency access — mainnet deployment requires formal audit, extensive testing, and community review. Devnet allows safe iteration.
