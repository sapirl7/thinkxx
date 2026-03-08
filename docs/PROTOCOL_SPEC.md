# Protocol Specification — Lifeline

## Overview

The Lifeline program is an Anchor-based Solana smart contract that manages emergency access and inheritance policies. It enforces time-locked beneficiary access to vault funds after verified owner inactivity, with guardian oversight.

## Program ID

- **devnet**: TBD (assigned after first deployment)
- **mainnet**: Not deployed (requires audit)

---

## Accounts

### PlanAccount

The core policy record. One per owner per plan.

**PDA Seeds**: `["plan", owner_pubkey, plan_id]`

| Field | Type | Description |
|-------|------|-------------|
| `owner` | `Pubkey` | Plan creator and owner |
| `plan_id` | `u64` | Unique plan identifier per owner |
| `mode` | `PlanMode` | Medical / LegalRisk / Legacy |
| `state` | `PlanState` | Current lifecycle state |
| `beneficiary` | `Pubkey` | Primary beneficiary address |
| `backup_beneficiary` | `Option<Pubkey>` | Optional backup beneficiary |
| `inactivity_duration` | `i64` | Seconds of inactivity before claim eligibility |
| `grace_period` | `i64` | Seconds owner has to cancel after claim starts |
| `last_heartbeat` | `i64` | Unix timestamp of last owner check-in |
| `guardian_set` | `Pubkey` | Associated GuardianSetAccount |
| `guardian_quorum` | `u8` | Approvals required to advance claim |
| `created_at` | `i64` | Creation timestamp |
| `updated_at` | `i64` | Last modification timestamp |
| `vault_authority_bump` | `u8` | PDA bump for vault authority |
| `pending_update` | `Option<PendingPlanUpdate>` | Delayed update record |
| `emergency_bucket_lamports` | `u64` | SOL reserved for emergency access |
| `protected_lamports` | `u64` | SOL protected by the plan |
| `bump` | `u8` | PDA bump |

### GuardianSetAccount

Manages the guardian roster and quorum for a plan.

**PDA Seeds**: `["guardian_set", plan_pubkey]`

| Field | Type | Description |
|-------|------|-------------|
| `plan` | `Pubkey` | Associated plan |
| `guardians` | `Vec<Pubkey>` | Guardian public keys (max 5) |
| `quorum` | `u8` | Required approvals |
| `pending_update` | `Option<PendingGuardianUpdate>` | Delayed roster change |
| `update_delay` | `i64` | Seconds before guardian changes take effect |
| `bump` | `u8` | PDA bump |

### ClaimAccount

Created when a beneficiary initiates a claim.

**PDA Seeds**: `["claim", plan_pubkey]`

| Field | Type | Description |
|-------|------|-------------|
| `plan` | `Pubkey` | Associated plan |
| `claimant` | `Pubkey` | Who initiated the claim |
| `state` | `ClaimState` | Pending / Approved / Vetoed / Finalized / Cancelled |
| `started_at` | `i64` | When claim was initiated |
| `grace_deadline` | `i64` | When grace period expires |
| `approvals` | `Vec<Pubkey>` | Guardians who approved |
| `vetoes` | `Vec<Pubkey>` | Guardians who vetoed |
| `bump` | `u8` | PDA bump |

### Vault Authority

**PDA Seeds**: `["vault_authority", plan_pubkey]`

Controls both the SOL vault and any token vault accounts. This is a PDA with no data — it serves only as the authority for vault accounts.

### SOL Vault

**PDA Seeds**: `["sol_vault", plan_pubkey]`

A system-owned account that holds deposited SOL. Transfers are authorized by the Vault Authority PDA via CPI.

### Token Vault Accounts

Associated Token Accounts owned by the Vault Authority PDA. One per supported token mint per plan.

---

## Enums

### PlanMode
```
Medical      = 0   // Short inactivity, short grace, simple setup
LegalRisk    = 1   // Emergency bucket preferred, guardian-heavy
Legacy       = 2   // Long inactivity, long grace, multi-asset
```

### PlanState
```
Draft            = 0   // Created but not funded
Active           = 1   // Funded, heartbeat active
ClaimPending     = 2   // Claim initiated, in grace period
ClaimApproved    = 3   // Guardians approved, awaiting finalize
Claimed          = 4   // Terminal: funds transferred
Cancelled        = 5   // Terminal: plan cancelled by owner
Paused           = 6   // Temporarily suspended by owner
```

### ClaimState
```
Pending     = 0   // Within grace period
Approved    = 1   // Guardian quorum met
Vetoed      = 2   // Guardian veto
Finalized   = 3   // Terminal: funds transferred
Cancelled   = 4   // Terminal: owner cancelled
```

---

## Instructions

### Plan Lifecycle

| Instruction | Signer | Description |
|------------|--------|-------------|
| `initialize_plan` | Owner | Create plan, guardian set, and vault PDAs |
| `heartbeat` | Owner | Update `last_heartbeat` timestamp |
| `pause_plan` | Owner | Transition Active → Paused |
| `resume_plan` | Owner | Transition Paused → Active |
| `request_plan_update` | Owner | Queue a delayed update to plan parameters |
| `confirm_plan_update` | Owner | Apply queued update after delay elapsed |
| `cancel_pending_update` | Owner | Cancel a queued plan update |

### Vault Operations

| Instruction | Signer | Description |
|------------|--------|-------------|
| `deposit_sol` | Owner | Transfer SOL to vault |
| `deposit_token` | Owner | Transfer supported SPL token to vault |
| `withdraw_emergency` | Owner | Withdraw from emergency bucket (if policy allows) |

### Claim Flow

| Instruction | Signer | Description |
|------------|--------|-------------|
| `start_claim` | Beneficiary | Initiate claim after inactivity window (creates ClaimAccount) |
| `cancel_claim` | Owner | Cancel claim during grace period |
| `guardian_approve` | Guardian | Record guardian approval |
| `guardian_veto` | Guardian | Record guardian veto |
| `finalize_claim` | Any (permissionless) | Complete claim after grace + quorum conditions met |

### Guardian Management

| Instruction | Signer | Description |
|------------|--------|-------------|
| `request_add_guardian` | Owner | Queue guardian addition |
| `request_remove_guardian` | Owner | Queue guardian removal |
| `request_update_quorum` | Owner | Queue quorum change |
| `confirm_guardian_update` | Owner | Apply guardian change after delay |
| `cancel_guardian_update` | Owner | Cancel pending guardian change |

### Account Cleanup

| Instruction | Signer | Description |
|------------|--------|-------------|
| `close_plan` | Owner | Close plan and recover rent (only if vault empty, no active claim) |

---

## Timing Constraints

| Parameter | Medical Default | Legal Risk Default | Legacy Default |
|-----------|:---------:|:----------:|:--------:|
| Inactivity window | 7 days | 3 days | 180 days |
| Grace period | 24 hours | 12 hours | 30 days |
| Beneficiary update delay | 3 days | 3 days | 14 days |
| Guardian update delay | 3 days | 3 days | 14 days |
| Min inactivity | 1 day | 1 day | 30 days |
| Max inactivity | 365 days | 365 days | 1825 days |

All timing is enforced on-chain using `Clock::get()?.unix_timestamp`.

---

## Error Codes

```
InvalidPlanState           = 6000
InactivityWindowNotElapsed = 6001
GracePeriodNotElapsed      = 6002
GracePeriodExpired         = 6003
QuorumNotMet               = 6004
NotBeneficiary             = 6005
NotGuardian                = 6006
NotOwner                   = 6007
AlreadyApproved            = 6008
AlreadyVetoed              = 6009
ClaimAlreadyExists         = 6010
PlanNotActive              = 6011
VaultNotEmpty              = 6012
UnsupportedToken           = 6013
PendingUpdateExists        = 6014
NoPendingUpdate            = 6015
UpdateDelayNotElapsed      = 6016
GuardianSetFull            = 6017
GuardianNotFound           = 6018
InvalidQuorum              = 6019
EmergencyBucketExceeded    = 6020
PlanNotPaused              = 6021
InvalidTimingParameter     = 6022
DuplicateGuardian          = 6023
```

---

## Security Invariants

1. Only the owner may sign `heartbeat`, `pause`, `resume`, and `cancel_claim`
2. Only the designated beneficiary (or backup) may sign `start_claim`
3. Only registered guardians may sign `guardian_approve` or `guardian_veto`
4. `finalize_claim` is permissionless but requires all conditions met
5. Beneficiary changes have a mandatory delay before taking effect
6. Guardian changes have a mandatory delay before taking effect
7. Vault authority is a PDA — no private key exists
8. SOL vault can only be drained by `finalize_claim` or `withdraw_emergency`
9. `start_claim` requires `Clock.unix_timestamp > last_heartbeat + inactivity_duration`
10. `cancel_claim` requires `Clock.unix_timestamp < claim.started_at + grace_period`
