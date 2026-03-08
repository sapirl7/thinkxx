# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| devnet  | :white_check_mark: |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Please report security vulnerabilities by emailing the maintainers:
- Open a [private security advisory](https://github.com/sapirl7/thinkxx/security/advisories/new) on GitHub

### What to include
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

### Response timeline
- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix timeline**: Depends on severity

## Scope

### In scope
- Anchor program logic (state transitions, timing, access control)
- Vault authority and PDA security
- Token handling and transfer logic
- Guardian quorum enforcement
- Mobile app authentication and signing flows
- SDK correctness
- RPC and transport layer security

### Out of scope
- Issues in third-party wallets
- Issues in Solana runtime itself
- Social engineering attacks
- Issues requiring physical access to the device

## Security Design Principles

1. **Non-custodial**: The app never holds, stores, or transmits private keys
2. **On-chain enforcement**: All critical policy logic runs in the Anchor program
3. **Explicit state transitions**: No implicit behavior in protocol state changes
4. **Metadata minimization**: No PII stored on-chain
5. **No admin backdoors**: No hidden privileged instructions
6. **Delayed updates**: Beneficiary and guardian changes enforce time delays

## Audit Status

This project has **not yet undergone a formal security audit**. It is currently deployed on **devnet only**. A formal audit is required before any mainnet deployment.

## Disclaimer

This is experimental software. Use at your own risk. The protocol is designed for emergency access and inheritance planning but does **not** constitute legal advice or replace jurisdiction-specific estate planning.
