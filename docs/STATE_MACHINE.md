# State Machine

## Plan State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft : initialize_plan
    Draft --> Active : deposit_sol / deposit_token
    Active --> ClaimPending : start_claim (by beneficiary)
    Active --> Paused : pause_plan (by owner)
    Active --> Cancelled : close_plan (by owner, vault empty)
    Paused --> Active : resume_plan (by owner)
    Paused --> Cancelled : close_plan (by owner, vault empty)
    ClaimPending --> Active : cancel_claim (by owner, within grace)
    ClaimPending --> ClaimApproved : guardian quorum met
    ClaimPending --> Active : guardian_veto (veto threshold met)
    ClaimApproved --> Claimed : finalize_claim (permissionless)
    Claimed --> [*]
    Cancelled --> [*]
```

## Plan States

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| **Draft** | Plan created, vault empty | deposit, heartbeat, update, close |
| **Active** | Funded, heartbeat running | heartbeat, deposit, pause, update, withdraw_emergency |
| **ClaimPending** | Beneficiary initiated claim | cancel_claim (owner), guardian_approve, guardian_veto |
| **ClaimApproved** | Guardian quorum met | finalize_claim |
| **Claimed** | Terminal: funds transferred | close accounts |
| **Cancelled** | Terminal: plan closed | close accounts |
| **Paused** | Temporarily suspended | resume, close |

## Claim State Machine

```mermaid
stateDiagram-v2
    [*] --> Pending : start_claim
    Pending --> Cancelled : cancel_claim (owner, within grace)
    Pending --> Approved : guardian_approve (quorum met)
    Pending --> Vetoed : guardian_veto
    Approved --> Finalized : finalize_claim
    Cancelled --> [*]
    Vetoed --> [*]
    Finalized --> [*]
```

## Transition Guards

### start_claim
- Plan state = Active
- Signer = beneficiary OR backup_beneficiary
- `now > last_heartbeat + inactivity_duration`

### cancel_claim
- Plan state = ClaimPending
- Signer = owner
- `now < claim.started_at + grace_period`

### guardian_approve
- Plan state = ClaimPending
- Signer = registered guardian
- Guardian has not already approved or vetoed this claim
- Claim state = Pending

### guardian_veto
- Plan state = ClaimPending
- Signer = registered guardian
- Guardian has not already approved or vetoed this claim

### finalize_claim
- Claim state = Approved
- Grace period elapsed: `now >= claim.started_at + grace_period`
- Permissionless: any signer may invoke

## Timing Diagram

```
Owner creates plan              Beneficiary starts claim
│                              │
▼                              ▼
┌──────────────────────┐       ┌──────────────────┐        ┌─────────────┐
│    Active State      │       │  Grace Period     │        │  Finalizable│
│                      │       │                   │        │             │
│  Owner heartbeats    │       │  Owner can cancel │        │ Permissionless
│  periodically        │       │  Guardians vote   │        │ finalize    │
│                      │       │                   │        │             │
│  last_heartbeat ─────┼───────┼── + inactivity ───┼────────┼── + grace ──┤
│                      │       │    window         │        │   period    │
└──────────────────────┘       └──────────────────┘        └─────────────┘
```

## Guardian Update State Machine

```mermaid
stateDiagram-v2
    [*] --> NoUpdate : initial
    NoUpdate --> UpdatePending : request_add/remove/update_quorum
    UpdatePending --> NoUpdate : cancel_guardian_update
    UpdatePending --> Applied : confirm_guardian_update (delay elapsed)
    Applied --> [*]
```

### Guardian Update Guards

- **request_***: Signer = owner, no existing pending update
- **confirm_guardian_update**: Signer = owner, `now >= pending.requested_at + update_delay`
- **cancel_guardian_update**: Signer = owner, pending update exists

## Plan Update State Machine

```mermaid
stateDiagram-v2
    [*] --> NoUpdate : initial
    NoUpdate --> UpdatePending : request_plan_update
    UpdatePending --> NoUpdate : cancel_pending_update
    UpdatePending --> Applied : confirm_plan_update (delay elapsed)
    Applied --> [*]
```

### Updatable Plan Parameters (with delay)
- `beneficiary`
- `backup_beneficiary`
- `inactivity_duration`
- `grace_period`
- `emergency_bucket_lamports`

Parameters that do NOT require delay:
- `heartbeat` (always immediate)
- `pause` / `resume` (always immediate)
