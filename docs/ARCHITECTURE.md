# Architecture

## Overview

Thinkxx is a non-custodial Solana Mobile dApp for emergency access and inheritance planning. The architecture follows a **serverless, trust-minimized** design where all critical logic lives on-chain in an Anchor program.

## System Architecture

```mermaid
graph TB
    subgraph "Android Device"
        APP[Mobile App<br/>React Native + Expo]
        REMINDER[Local Reminder<br/>Engine]
    end

    subgraph "Wallet App"
        MWA[Mobile Wallet<br/>Adapter]
        KEYS[User Keys]
    end

    subgraph "Solana Network"
        RPC[RPC Nodes<br/>Pool + Fallback]
        PROGRAM[Lifeline Program<br/>Anchor]
        subgraph "Program Accounts"
            PLAN[PlanAccount]
            GUARDIAN[GuardianSetAccount]
            CLAIM[ClaimAccount]
            VAULT_SOL[SOL Vault PDA]
            VAULT_TOKEN[Token Vault PDAs]
        end
    end

    subgraph "Optional Services"
        NOTIFY[Notification<br/>Adapters]
        RELAY[Sponsored Tx<br/>Relayer]
    end

    APP <-->|Sign/Authorize| MWA
    APP -->|RPC Calls| RPC
    RPC <--> PROGRAM
    PROGRAM --> PLAN
    PROGRAM --> GUARDIAN
    PROGRAM --> CLAIM
    PROGRAM --> VAULT_SOL
    PROGRAM --> VAULT_TOKEN
    APP --> REMINDER
    APP -.->|Optional| NOTIFY
    APP -.->|Optional| RELAY
    RELAY -.->|Fee Payer| RPC
```

## Trust Model

| Component | Trust Level | Rationale |
|-----------|------------|-----------|
| Anchor Program | **Full** | All policy enforcement, timing, access control |
| Mobile App | **Zero** | Convenience layer; protocol works without it |
| SDK | **Zero** | Instruction builder; cannot bypass on-chain checks |
| Wallet (MWA) | **User-trusted** | Signs transactions; user controls wallet choice |
| RPC Nodes | **Transport** | Can censor but cannot forge; pool mitigates |
| Notification Adapters | **Zero** | UX redundancy; missed notifications don't break protocol |
| Sponsored Tx Relayer | **Zero** | Pays fees; cannot alter instruction semantics |

## Core Design Principles

1. **On-chain enforcement**: All timing, access control, and state transitions are enforced by the Anchor program
2. **Non-custodial**: The app never holds private keys; all signing via MWA
3. **Explicit state machine**: Named states with explicit guard conditions
4. **Metadata minimization**: Only execution-critical data on-chain
5. **Graceful degradation**: Works without backend, notifications, or specific RPC providers
6. **Emergency resilience**: Protocol usable via CLI even if mobile app disappears

## Account Relationships

```mermaid
erDiagram
    OWNER ||--o{ PLAN : creates
    PLAN ||--|| GUARDIAN_SET : has
    PLAN ||--o| CLAIM : may_have
    PLAN ||--|| SOL_VAULT : controls
    PLAN ||--o{ TOKEN_VAULT : controls
    GUARDIAN_SET ||--|{ GUARDIAN : contains
    PLAN ||--|| BENEFICIARY : designates
    PLAN ||--o| BACKUP_BENEFICIARY : optionally_designates
    CLAIM }|--|| BENEFICIARY : initiated_by
```

## Data Flow: Plan Creation

```mermaid
sequenceDiagram
    participant User
    participant App
    participant MWA as Wallet (MWA)
    participant RPC
    participant Program as Lifeline Program

    User->>App: Configure plan
    App->>App: Build initialize_plan tx
    App->>MWA: Request signature
    MWA->>User: Approve in wallet
    User->>MWA: Approve
    MWA->>App: Signed transaction
    App->>RPC: Send transaction
    RPC->>Program: Execute initialize_plan
    Program->>Program: Create PlanAccount PDA
    Program->>Program: Create GuardianSetAccount PDA
    Program->>Program: Create SOL Vault PDA
    Program-->>RPC: Confirmation
    RPC-->>App: Transaction result
    App->>User: Plan created
```

## Data Flow: Claim Process

```mermaid
sequenceDiagram
    participant Beneficiary
    participant App
    participant Program as Lifeline Program
    participant Guardian

    Note over Beneficiary,Program: Inactivity window elapsed

    Beneficiary->>App: Start claim
    App->>Program: start_claim
    Program->>Program: Verify inactivity window
    Program->>Program: Create ClaimAccount (Pending)

    Note over Program: Grace period begins

    alt Owner cancels
        Program->>Program: cancel_claim (within grace)
        Program->>Program: Plan → Active
    else Guardians approve
        Guardian->>Program: guardian_approve_claim
        Program->>Program: Check quorum
        Program->>Program: Claim → Approved
    else Guardian vetoes
        Guardian->>Program: guardian_veto_claim
        Program->>Program: Claim → Cancelled
    end

    Note over Program: After grace + quorum met

    Beneficiary->>Program: finalize_claim
    Program->>Program: Transfer vault → beneficiary
    Program->>Program: Plan → Claimed
```

## Package Dependencies

```
apps/mobile
├── @thinkxx/sdk
├── @thinkxx/config
├── @thinkxx/rpc
└── @thinkxx/notifications

packages/sdk
├── @coral-xyz/anchor
├── @solana/web3.js
└── @thinkxx/config

packages/cli
├── @thinkxx/sdk
├── @thinkxx/config
└── commander

packages/rpc
├── @solana/web3.js
└── @thinkxx/config

packages/notifications → adapter interfaces only
packages/config → shared constants, types, network config
```

## Milestone Gates

| Gate | Criteria |
|------|----------|
| **M1** | Repo scaffold, docs skeleton, CI green |
| **M2** | Wallet connect, minimal plan + heartbeat on devnet |
| **M3** | Claim flow, guardian support, docs reflect implementation |
| **M4** | Sponsorship, notifications, RPC resilience, token matrix enforced |
| **M5** | Hardening, release docs, production-readiness assessment |
