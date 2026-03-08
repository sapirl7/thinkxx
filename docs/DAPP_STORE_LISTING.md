# Solana dApp Store Listing

## App Identity

- **Name**: Thinkxx
- **Tagline**: Non-custodial emergency access for your digital assets
- **Category**: Utility / Security
- **Network**: Solana (devnet)
- **License**: Apache 2.0

## Short Description (80 chars)

Emergency access & inheritance planning for Solana. Your keys, your plan.

## Long Description

Thinkxx is a non-custodial Solana Mobile dApp for emergency access and inheritance planning. Create time-locked policies that allow trusted beneficiaries to access your vault funds after verified inactivity — with guardian oversight and multi-stage claim verification.

### Key Features

- **Time-Locked Policies**: Set inactivity thresholds (2 days to 90+ days) for different scenarios
- **Guardian Oversight**: Up to 5 guardians can approve or veto beneficiary claims
- **Emergency Bucket**: Quick-access funds without going through the claim process
- **Gasless Transactions**: Sponsored transaction support for critical operations
- **Multiple Plan Modes**: Medical, Legal Risk, Legacy, or Custom configurations
- **Non-Custodial**: Your wallet, your keys — protocol enforces all logic on-chain

### Use Cases

- 🏥 **Medical Procedures**: Going into surgery? Set a 2-day inactivity window
- ✈️ **Travel Risk**: Visiting high-risk regions? 7-day policy with trusted guardians
- 📋 **Inheritance**: Long-term estate planning with 90-day windows

### How It Works

1. Create a plan with your chosen mode and beneficiary
2. Fund your vault with SOL
3. Send periodic heartbeats to confirm you're active
4. If inactive beyond threshold, beneficiary can start a claim
5. Guardians approve or veto — a single veto cancels immediately
6. After quorum and grace period, funds transfer to beneficiary

### Security

- All logic enforced on-chain via Anchor program
- No admin backdoors or privileged operations
- Non-custodial — we never touch your private keys
- Open source: github.com/sapirl7/thinkxx

## Technical Requirements

- **Platform**: Android (Seeker optimized)
- **Wallet**: Phantom, Solflare (via Mobile Wallet Adapter)
- **Network**: Solana devnet (v1)
- **Min Android**: API 26 (Android 8.0)

## Screenshots

1. Connect wallet screen (dark theme, Solana branding)
2. Dashboard with active plans overview
3. Create plan flow with mode selection
4. Plan detail with vault balance and heartbeat status
5. Guardian management with quorum control
6. Settings screen with protocol configuration

## Contact

- **Repository**: https://github.com/sapirl7/thinkxx
- **Security**: See SECURITY.md for vulnerability reporting
- **License**: Apache 2.0
