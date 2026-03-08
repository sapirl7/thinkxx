# Thinkxx

**Non-custodial Solana Mobile dApp for emergency access and inheritance planning.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Network: devnet](https://img.shields.io/badge/Solana-devnet-purple.svg)](https://explorer.solana.com/?cluster=devnet)

---

## What is Thinkxx?

Thinkxx enables users to create time-locked emergency access policies on Solana. If you become inactive (medical emergency, travel risk, long-term absence), trusted beneficiaries can access your vault funds after a configurable waiting period — with guardian oversight and multi-stage claim verification.

### What it is
- 🔐 Emergency access protocol for digital assets
- 📱 Android-first mobile app with Seeker optimization
- ⛓️ On-chain policy enforcement via Anchor
- 🛡️ Non-custodial — your keys, your wallet

### What it is NOT
- ❌ Not a wallet or key custodian
- ❌ Not a legal will substitute
- ❌ Not a seed phrase manager
- ❌ Not a DeFi protocol

## Architecture

```
┌─────────────┐     MWA      ┌──────────────┐
│  Mobile App │◄────────────►│ Solana Wallet │
│  (Expo/RN)  │              │  (Phantom,    │
│             │              │   Solflare)   │
└──────┬──────┘              └──────────────┘
       │ SDK
       ▼
┌──────────────┐    RPC     ┌──────────────┐
│   Thinkxx    │◄──────────►│   Solana      │
│     SDK      │            │  (devnet)     │
└──────┬───────┘            └──────┬───────┘
       │                           │
       ▼                           ▼
┌──────────────────────────────────────────┐
│        Lifeline Anchor Program           │
└──────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Rust (stable)
- Anchor CLI 0.32+
- Solana CLI (Agave 3.0+)
- Android Studio (for mobile dev)

### Setup
```bash
git clone https://github.com/sapirl7/thinkxx.git
cd thinkxx
pnpm install
pnpm run build
```

### Anchor Program
```bash
cd programs/lifeline
anchor build
anchor test
anchor deploy  # deploys to devnet
```

### Mobile App
```bash
cd apps/mobile
npx expo start
# or
npx expo run:android
```

## Project Structure

```
├── apps/mobile/          # React Native + Expo mobile app
├── programs/lifeline/    # Anchor program (Solana)
├── packages/
│   ├── sdk/              # TypeScript SDK
│   ├── cli/              # Emergency CLI tool
│   ├── config/           # Shared configuration
│   ├── notifications/    # Notification adapters
│   └── rpc/              # RPC resilience layer
├── docs/                 # Architecture & protocol docs
└── .github/              # CI workflows
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design and trust model |
| [Protocol Spec](docs/PROTOCOL_SPEC.md) | Anchor program specification |
| [State Machine](docs/STATE_MACHINE.md) | Protocol state transitions |
| [Threat Model](docs/THREAT_MODEL.md) | Security analysis |
| [Token Support](docs/TOKEN_SUPPORT_MATRIX.md) | Supported token types |
| [RPC Strategy](docs/RPC_STRATEGY.md) | Network resilience |
| [Notifications](docs/NOTIFICATIONS.md) | Alert architecture |
| [Sponsored Txs](docs/SPONSORED_TXS.md) | Fee-free emergency actions |
| [Publish Safe](docs/PUBLISH_SAFE.md) | Repository hygiene |

## How It Works

1. **Create a Plan** — Choose a mode (Medical, Legal Risk, Legacy), set beneficiary, guardians, and timing
2. **Fund Your Vault** — Deposit SOL or supported tokens
3. **Stay Active** — Send periodic heartbeats to signal you're OK
4. **Emergency Access** — If you're inactive beyond the threshold, your beneficiary can start a claim
5. **Guardian Oversight** — Guardians approve or veto claims based on your policy
6. **Finalization** — After grace period and guardian approval, funds transfer to beneficiary

## Important Disclaimers

- ⚠️ This is **not legal advice** and may not replace jurisdiction-specific estate planning
- ⚠️ This is experimental software deployed on **devnet only**
- ⚠️ Public blockchain activity is publicly observable
- ⚠️ A formal security audit has **not** been completed
- ⚠️ Users must independently verify beneficiary addresses and legal arrangements

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

Apache 2.0 — see [LICENSE](LICENSE).
