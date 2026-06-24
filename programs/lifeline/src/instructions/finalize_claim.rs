use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::error::LifelineError;

#[derive(Accounts)]
pub struct FinalizeClaim<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,

    #[account(
        mut,
        constraint = plan.state == PlanState::ClaimPending @ LifelineError::InvalidPlanState,
    )]
    pub plan: Account<'info, PlanAccount>,

    #[account(
        has_one = plan,
    )]
    pub guardian_set: Account<'info, GuardianSetAccount>,

    #[account(
        mut,
        has_one = plan,
        constraint = claim.state == ClaimState::Approved || claim.state == ClaimState::Pending @ LifelineError::InvalidPlanState,
        constraint = claim.claimant == claimant.key() @ LifelineError::NotBeneficiary,
        close = claimant,
    )]
    pub claim: Account<'info, ClaimAccount>,

    /// CHECK: SOL vault PDA — lamports are transferred out
    #[account(
        mut,
        seeds = [b"sol_vault", plan.key().as_ref()],
        bump
    )]
    pub sol_vault: UncheckedAccount<'info>,

    /// CHECK: Vault authority PDA — signs the transfer
    #[account(
        seeds = [b"vault_authority", plan.key().as_ref()],
        bump = plan.vault_authority_bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FinalizeClaim>) -> Result<()> {
    let clock = Clock::get()?;
    let claim = &ctx.accounts.claim;
    let plan = &ctx.accounts.plan;

    // Two paths to finalization, both of which require the owner's grace
    // window to have elapsed so the owner always has the full grace period
    // to cancel a wrongful claim:
    // 1. Claim is Approved (guardian quorum met) AND grace elapsed
    // 2. No active guardian oversight AND grace elapsed
    match claim.state {
        ClaimState::Approved => {
            require!(
                clock.unix_timestamp >= claim.grace_deadline,
                LifelineError::GracePeriodNotElapsed
            );
        }
        ClaimState::Pending => {
            require!(
                clock.unix_timestamp > claim.grace_deadline
                    && (ctx.accounts.guardian_set.guardians.is_empty()
                        || plan.guardian_quorum == 0),
                LifelineError::QuorumNotMet
            );
        }
        _ => return err!(LifelineError::InvalidPlanState),
    }

    // Transfer all vault lamports to claimant via CPI with PDA signing.
    // The sol_vault is system-owned (funded via system_program::transfer in deposit),
    // so we must use invoke_signed with the vault PDA seeds.
    let vault_lamports = ctx.accounts.sol_vault.lamports();
    if vault_lamports > 0 {
        let plan_key = ctx.accounts.plan.key();
        let vault_bump = ctx.bumps.sol_vault;
        let vault_seeds: &[&[u8]] = &[b"sol_vault", plan_key.as_ref(), &[vault_bump]];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.sol_vault.to_account_info(),
                    to: ctx.accounts.claimant.to_account_info(),
                },
                &[vault_seeds],
            ),
            vault_lamports,
        )?;
    }

    // Update plan state
    let plan = &mut ctx.accounts.plan;
    plan.state = PlanState::Claimed;
    plan.protected_lamports = 0;
    plan.updated_at = clock.unix_timestamp;

    msg!(
        "Claim finalized. {} lamports transferred to {}",
        vault_lamports,
        ctx.accounts.claimant.key()
    );
    Ok(())
}
