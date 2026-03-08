# Threat Model

## Methodology

STRIDE-based analysis applied to the Lifeline protocol and Thinkxx mobile application.

---

## T1: Owner Key Compromise

**Threat**: Attacker gains access to the owner's wallet private key.

**Impact**: HIGH — attacker can heartbeat to prevent legitimate claims, change beneficiary, remove guardians.

**Mitigations**:
- Beneficiary and guardian changes enforce time delays (3–14 days)
- Guardians can observe on-chain for suspicious updates
- Owner can use wallet security features (biometric, hardware keys)
- Beneficiary is notified of pending changes (via notification layer)

**Residual Risk**: If attacker maintains access for the full delay period, changes take effect. This is inherent to key-based systems.

## T2: Beneficiary Key Compromise

**Threat**: Attacker gains access to beneficiary's wallet.

**Impact**: MEDIUM — attacker can initiate claim, but:
- Claim requires inactivity window to have elapsed
- Owner can cancel during grace period
- Guardians must approve (if quorum > 0)

**Mitigations**:
- Guardian quorum prevents unauthorized claims
- Grace period gives owner time to cancel
- Backup beneficiary exists as fallback

## T3: Guardian Collusion

**Threat**: Multiple guardians collude to approve a fraudulent claim.

**Impact**: HIGH — if quorum is met, claim can proceed.

**Mitigations**:
- Owner cancellation during grace period
- Owner should choose independent, trusted guardians
- Guardian count and quorum should be set thoughtfully
- On-chain activity is transparent and auditable

**Residual Risk**: If owner is truly inactive AND guardians collude AND no one cancels during grace, funds transfer. This is partially by design (the protocol must eventually release funds to prevent permanent lockup).

## T4: Timing Manipulation

**Threat**: Attacker manipulates perceived time to trigger premature claims.

**Impact**: LOW — Solana cluster time (`Clock::unix_timestamp`) is validator-consensus based.

**Mitigations**:
- All timing uses on-chain `Clock` sysvar
- No client-side time used for enforcement
- Solana clock drift is bounded by validator consensus

## T5: Transaction Frontrunning

**Threat**: Attacker observes a pending `cancel_claim` and frontruns with `finalize_claim`.

**Impact**: LOW — `finalize_claim` requires grace period to have elapsed.

**Mitigations**:
- Grace period must fully elapse before finalization is possible
- Owner can cancel at any time during grace period
- Frontrunning a cancel with finalize is only possible if grace already expired

## T6: Metadata Leakage

**Threat**: On-chain data reveals relationship between owner, beneficiary, and guardians.

**Impact**: MEDIUM — pubkey associations are publicly observable.

**Mitigations**:
- No PII stored on-chain (no names, emails, relationship labels)
- Only pubkeys, timing parameters, and state stored
- Optional encrypted metadata stored off-chain with only hash references on-chain
- Users informed during onboarding about privacy limitations

**Residual Risk**: Pubkey graph analysis can reveal relationships. This is inherent to public blockchains.

## T7: RPC Manipulation / Censorship

**Threat**: Malicious RPC provider censors or delays transactions.

**Impact**: MEDIUM — could delay heartbeats or claims.

**Mitigations**:
- RPC provider pool with health scoring and automatic fallback
- Multiple provider support (public + private endpoints)
- Degraded read-only mode for status checking
- CLI emergency path bypasses mobile app

## T8: Mobile App Compromise

**Threat**: Malicious version of mobile app or compromised device.

**Impact**: LOW for protocol — app cannot access keys.

**Mitigations**:
- Non-custodial: all signing via MWA in separate wallet app
- App only builds transactions; cannot sign without wallet approval
- User verifies transaction details in wallet app
- Protocol works without the mobile app (CLI path exists)

## T9: Wallet Unavailability

**Threat**: No wallet app installed, wallet crashes, or MWA session expires.

**Impact**: MEDIUM for UX — user cannot sign transactions.

**Mitigations**:
- Graceful wallet unavailability handling in app
- Session expiration detection and reconnect flow
- Clear error messages guiding user to install a wallet
- Heartbeat reminder system alerts user before inactivity window expires

## T10: Rent / Account Closure Attacks

**Threat**: Attacker closes accounts or drains rent to disrupt protocol.

**Impact**: LOW — PDA accounts require authority signatures.

**Mitigations**:
- Vault authority is a PDA with no private key
- Account closure requires explicit instruction with authority check
- Rent-exempt accounts cannot be garbage collected
- Close instructions verify vault is empty before allowing closure

## T11: Unsupported Token Handling

**Threat**: User deposits a token with incompatible extensions (e.g. Token-2022 with transfer hook).

**Impact**: MEDIUM — funds could become stuck.

**Mitigations**:
- Explicit token support matrix (SOL, classic SPL, curated Token-2022)
- `deposit_token` validates token program and rejects unsupported mints
- Clear UI error messages for unsupported tokens
- See `TOKEN_SUPPORT_MATRIX.md` for full analysis

## T12: Sponsored Transaction Abuse

**Threat**: Abuse of fee-payer relayer to drain relayer funds.

**Impact**: LOW for protocol — relayer is convenience, not trust anchor.

**Mitigations**:
- Rate limiting on relayer
- Relayer only sponsors specific instruction types (start_claim, finalize_claim, guardian actions)
- Relayer cannot alter instruction semantics
- Protocol fully functional without relayer

---

## Risk Summary

| Threat | Severity | Likelihood | Risk | Mitigation Status |
|--------|----------|------------|------|-------------------|
| T1 Owner Key Compromise | HIGH | LOW | MEDIUM | Delayed updates, guardian oversight |
| T2 Beneficiary Key Compromise | MEDIUM | LOW | LOW | Guardian quorum, grace period |
| T3 Guardian Collusion | HIGH | LOW | MEDIUM | Grace period, owner cancel |
| T4 Timing Manipulation | LOW | VERY LOW | VERY LOW | On-chain clock consensus |
| T5 Frontrunning | LOW | LOW | VERY LOW | Grace period design |
| T6 Metadata Leakage | MEDIUM | HIGH | MEDIUM | Minimization, no PII on-chain |
| T7 RPC Manipulation | MEDIUM | LOW | LOW | Provider pool, fallback |
| T8 App Compromise | LOW | LOW | VERY LOW | Non-custodial, MWA |
| T9 Wallet Unavailable | MEDIUM | MEDIUM | MEDIUM | Reconnect, reminders |
| T10 Rent Attacks | LOW | VERY LOW | VERY LOW | PDA authority |
| T11 Unsupported Tokens | MEDIUM | MEDIUM | MEDIUM | Explicit matrix, validation |
| T12 Sponsor Abuse | LOW | LOW | VERY LOW | Rate limiting, scope limits |

---

## Pre-Audit Checklist

Before requesting formal audit:
- [ ] All state transitions tested
- [ ] All timing boundaries tested (edge cases)
- [ ] Guardian quorum math verified
- [ ] PDA derivation verified
- [ ] Account closure safety verified
- [ ] Token support matrix implemented and tested
- [ ] Emergency exit path documented and tested
- [ ] Upgrade authority strategy documented
