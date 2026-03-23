# Thinkxx

**Non-custodial Solana Mobile dApp for emergency access and inheritance planning.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Network: devnet](https://img.shields.io/badge/Solana-devnet-purple.svg)](https://explorer.solana.com/?cluster=devnet)
[![Anchor](https://img.shields.io/badge/Anchor-0.30.1-blueviolet.svg)](https://anchor-lang.com)

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
│             18 Instructions              │
└──────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Rust (stable)
- Anchor CLI 0.30.1
- Solana CLI (for devnet deploy only — bankrun tests run without it)
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
anchor build
pnpm run test:anchor   # bankrun-based, no validator needed
anchor deploy  # deploys to devnet
```

### Mobile App
```bash
cd apps/mobile
npx expo start
npx expo run:android
```

### CLI (Emergency Access)
```bash
# Check plan status
thinkxx status -o <owner-pubkey>

# Send heartbeat
thinkxx heartbeat -p <plan-pubkey> -k <keypair-path>

# Emergency withdrawal
thinkxx emergency-withdraw -p <plan-pubkey> -k <keypair-path> -a 0.5

# Guardian management
thinkxx guardian add -p <plan> -k <keypair> -g <guardian-pubkey>
thinkxx guardian remove -p <plan> -k <keypair> -g <guardian-pubkey>
```

## Protocol Instructions

| # | Instruction | Category | Description |
|---|-------------|----------|-------------|
| 1 | `initialize_plan` | Lifecycle | Create a new plan in Draft state |
| 2 | `activate_plan` | Lifecycle | Transition Draft → Active |
| 3 | `heartbeat` | Lifecycle | Reset inactivity timer |
| 4 | `pause_plan` | Lifecycle | Active → Paused (stop timer) |
| 5 | `resume_plan` | Lifecycle | Paused → Active (reset timer) |
| 6 | `close_plan` | Lifecycle | Reclaim rent (Draft/Cancelled only) |
| 7 | `deposit_sol` | Vault | Deposit SOL into plan vault |
| 8 | `set_emergency_bucket` | Vault | Set withdrawal allocation |
| 9 | `emergency_withdraw` | Vault | Owner withdraws from bucket |
| 10 | `add_guardian` | Guardian | Add guardian (max 5) |
| 11 | `remove_guardian` | Guardian | Remove with quorum revalidation |
| 12 | `start_claim` | Claim | Beneficiary starts claim after inactivity |
| 13 | `cancel_claim` | Claim | Owner cancels active claim |
| 14 | `approve_claim` | Claim | Guardian approves (tracks quorum) |
| 15 | `veto_claim` | Claim | Guardian vetoes (immediate cancel) |
| 16 | `finalize_claim` | Claim | Transfer vault to beneficiary |
| 17 | `update_beneficiary` | Update | Change beneficiary address |
| 18 | `update_timing` | Update | Adjust inactivity/grace periods |

## Project Structure

```
├── apps/mobile/          # React Native + Expo mobile app
├── programs/lifeline/    # Anchor program (18 instructions)
├── packages/
│   ├── sdk/              # TypeScript SDK + sponsored txs
│   ├── cli/              # Emergency CLI (10 commands)
│   ├── config/           # Shared configuration
│   ├── notifications/    # Console + Telegram adapters
│   └── rpc/              # RPC resilience + retry layer
├── tests/                # Anchor integration tests (69 tests, bankrun-based)
├── docs/                 # Architecture & protocol docs
└── .github/              # CI workflows
```

## SDK Usage

```typescript
import { ThinkxxClient, SponsoredTransactionBuilder } from '@thinkxx/sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const client = new ThinkxxClient(connection);

// Build a heartbeat instruction
const ix = client.buildHeartbeat(ownerPubkey, planPda);

// Sponsored (gasless) transaction
const sponsored = new SponsoredTransactionBuilder(connection, {
  feePayer: relayerKeypair,
  maxFeePerTx: 10_000,
});
const tx = await sponsored.buildAndPartialSign([ix]);
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
| [Changelog](CHANGELOG.md) | Version history |

## How It Works

1. **Create a Plan** — Choose a mode (Medical, Legal Risk, Legacy), set beneficiary, guardians, and timing
2. **Fund Your Vault** — Deposit SOL into your plan's vault PDA
3. **Stay Active** — Send periodic heartbeats to signal you're OK
4. **Emergency Access** — If you're inactive beyond the threshold, your beneficiary can start a claim
5. **Guardian Oversight** — Guardians approve or veto claims; single veto cancels immediately
6. **Finalization** — After quorum approval or grace expiry, funds transfer to beneficiary
7. **Emergency Bucket** — Owner can set aside a small amount for quick withdrawals without claims

## Plan Modes

| Mode | Inactivity | Grace | Use Case |
|------|-----------|-------|----------|
| Medical | 2 days | 1 day | Surgery, hospitalization |
| LegalRisk | 7 days | 3 days | Travel to high-risk areas |
| Legacy | 90 days | 30 days | Inheritance planning |
| Custom | User-defined | User-defined | Flexible configuration |

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
