# ADR-0001: Mobile Wallet Adapter over Seed Vault SDK

## Status
Accepted

## Date
2026-03-08

## Context
Solana Mobile provides two primary integration paths for Android apps:
1. **Mobile Wallet Adapter (MWA)**: Standard protocol for dApps to request signing from any compliant wallet app
2. **Seed Vault SDK**: Low-level API for wallet apps to securely store and manage seed phrases

Thinkxx needs wallet connectivity for signing transactions (heartbeat, deposits, claims).

## Decision
Use Mobile Wallet Adapter (MWA) for all wallet interactions. Do not use Seed Vault SDK.

## Alternatives Considered
- **Seed Vault SDK**: Rejected. Seed Vault is designed for wallet apps that manage keys. Thinkxx is a dApp that delegates signing to external wallets. Using Seed Vault would make Thinkxx a key custodian, violating its core design principle.
- **Direct private key input**: Rejected. Fundamentally incompatible with non-custodial design.
- **WalletConnect**: Considered for cross-platform, but MWA is the Solana Mobile native standard with better UX on Seeker.

## Consequences
- Users must have a MWA-compatible wallet installed (Phantom, Solflare, etc.)
- App cannot function without a wallet app
- Signing UX depends on wallet app quality
- Maximum security: Thinkxx never touches private keys
- Ecosystem-standard integration: works with any MWA wallet
