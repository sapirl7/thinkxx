# Token Support Matrix

## Overview

Thinkxx uses an **explicit allowlist** approach for token support. We do not claim blanket support for all SPL tokens. Each token class is evaluated for compatibility with vault lifecycle operations (deposit, claim, finalize, close).

---

## v1 Support

| Token Class | Support | Program | Notes |
|-------------|---------|---------|-------|
| **SOL** | Full | System Program | Native asset, always supported |
| **Classic SPL Token** | Full | Token Program | Standard fungible tokens (USDC, USDT, etc.) |
| **Token-2022 (basic)** | Curated | Token-2022 | Only mints with no problematic extensions |

## Token-2022 Extension Evaluation

| Extension | v1 Support | Risk | Rationale |
|-----------|-----------|------|-----------|
| **Transfer Fee** | Rejected | HIGH | Fee deduction during claim could leave vault with dust; accounting becomes non-deterministic |
| **Interest Bearing** | Rejected | MEDIUM | Interest accrual complicates vault balance tracking; balance at claim time differs from deposit time |
| **Permanent Delegate** | Rejected | CRITICAL | Third party could drain vault tokens at any time |
| **Non-Transferable** | Rejected | HIGH | Cannot transfer during claim finalization |
| **Transfer Hook** | Rejected | HIGH | Arbitrary CPI during transfers; unpredictable gas, state changes, and failure modes |
| **Confidential Transfer** | Rejected | HIGH | Cannot verify vault balance on-chain; incompatible with transparent claim flow |
| **CPI Guard** | Evaluate | LOW | May prevent CPI transfers from vault; needs testing per mint |
| **Default Account State** | Compatible | LOW | Frozen default can be handled during vault account creation |
| **Immutable Owner** | Compatible | NONE | Does not affect transfer operations |
| **Memo Required** | Evaluate | LOW | CPI transfers may need memo instruction; adds complexity |
| **Metadata** | Compatible | NONE | Display only; no effect on transfers |
| **Metadata Pointer** | Compatible | NONE | Display only |

## Rejection Behavior

When a user attempts to deposit an unsupported token:

1. **On-chain**: `deposit_token` instruction validates the token program and mint extensions. Returns `UnsupportedToken` error for rejected tokens.
2. **SDK**: Pre-flight check examines mint account before building transaction.
3. **Mobile UI**: Clear error message: "This token type is not supported by Thinkxx. Only SOL and standard SPL tokens are supported in this version."

## Validation Logic

```rust
// Pseudocode for token validation
fn validate_token_mint(mint: &AccountInfo) -> Result<()> {
    // Reject if not Token Program or Token-2022
    let program = mint.owner;
    require!(
        program == &spl_token::ID || program == &spl_token_2022::ID,
        ErrorCode::UnsupportedToken
    );

    // For Token-2022, check extensions
    if program == &spl_token_2022::ID {
        let mint_data = mint.try_borrow_data()?;
        let extensions = get_extension_types(&mint_data)?;

        for ext in extensions {
            match ext {
                TransferFee | InterestBearing | PermanentDelegate
                | NonTransferable | TransferHook | ConfidentialTransfer => {
                    return Err(ErrorCode::UnsupportedToken.into());
                }
                _ => {} // Compatible extensions pass
            }
        }
    }

    Ok(())
}
```

## Future Versions

| Version | Planned Support |
|---------|----------------|
| v1.0 | SOL + classic SPL + basic Token-2022 |
| v1.1 | CPI Guard evaluation, Memo Required support |
| v2.0 | Transfer Fee support (with accounting), broader Token-2022 |

## References

- [SPL Token-2022 Extensions](https://spl.solana.com/token-2022/extensions)
- [Solana Token Program](https://spl.solana.com/token)
