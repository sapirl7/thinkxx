# Mobile UX

## Scope

Thinkxx mobile is the **owner-side operator console** for the Lifeline protocol.

What the app currently supports on devnet:
- connect a Solana Mobile wallet via MWA
- create a plan
- view dashboard and selected-plan state
- send heartbeat
- deposit SOL into the selected plan vault
- manage guardians
- inspect connection, version, and endpoint metadata

What is explicitly out of scope today:
- beneficiary claim-flow screens
- mainnet support
- automated heartbeats
- biometric lock
- push notifications
- sponsored transactions

## UX Principles

1. **Plan-bound actions only**
   Heartbeat, deposit, status, and guardian management must always operate on a resolved `planPda`, never a wallet address or beneficiary address.

2. **Trust-critical clarity**
   The UI must distinguish:
   - owner wallet
   - beneficiary wallet
   - plan account

3. **On-chain honesty**
   The app must not present a plan as live until the plan account is visible on-chain.

4. **One active plan context**
   Dashboard, plan detail, heartbeat, deposit, and guardians read from the same selected-plan session.

5. **Graceful degraded states**
   If no valid plan is selected, plan-bound actions stay disabled and explain why inline.

## Screen Map

| Screen | Purpose |
|---|---|
| Connect | Establish owner wallet session via MWA |
| Dashboard | Show wallet balance, discovered plans, selected-plan focus, quick actions |
| Create Plan | Configure and provision a new plan account |
| Plan Detail | Inspect selected plan state, vault summary, heartbeat status, guardians entrypoint |
| Heartbeat | Record owner activity for the selected plan |
| Deposit | Move SOL from owner wallet into selected plan vault |
| Guardians | Review quorum and maintain guardian set |
| Settings | Connection metadata, app identity, endpoint, planned capabilities |

## State Model

### Wallet state

- disconnected
- connecting
- connected
- restored from persisted session

### Plan state

- no selected plan
- pending sync after creation
- selected plan resolved on-chain
- selected plan unavailable / invalid

### Transaction state

- editing
- awaiting wallet approval
- confirming on-chain
- completed
- failed

## Address Presentation Rules

- Show explicit labels for every address type.
- Default to shortened display in list views.
- Allow reveal/full display only as a secondary action.
- Never ask the user to manually enter a `planPda` in the standard owner flow.

## Design Direction

- dark-first control-room interface
- teal + amber accent system
- restrained motion
- strong status hierarchy
- minimal emoji usage in trust-critical surfaces

## Manual Device QA

Recommended devnet smoke flow:

1. Connect wallet
2. Create plan
3. Confirm plan appears on Dashboard
4. Open Plan Detail
5. Send Heartbeat
6. Deposit SOL
7. Open Guardians and review quorum state
8. Restart the app and confirm wallet/plan session restore
