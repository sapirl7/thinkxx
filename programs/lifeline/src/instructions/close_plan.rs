use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::LifelineError;

#[derive(Accounts)]
pub struct ClosePlan<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Draft || plan.state == PlanState::Cancelled @ LifelineError::InvalidPlanState,
        close = owner,
    )]
    pub plan: Account<'info, PlanAccount>,

    #[account(
        mut,
        has_one = plan,
        close = owner,
    )]
    pub guardian_set: Account<'info, GuardianSetAccount>,

    /// CHECK: SOL vault PDA — must be empty
    #[account(
        mut,
        seeds = [b"sol_vault", plan.key().as_ref()],
        bump,
    )]
    pub sol_vault: UncheckedAccount<'info>,
}

/// Close a plan and reclaim rent.
/// Only draft or cancelled plans with empty vaults can be closed.
pub fn handler(ctx: Context<ClosePlan>) -> Result<()> {
    // Verify vault is empty
    let vault_lamports = ctx.accounts.sol_vault.lamports();
    require!(vault_lamports == 0, LifelineError::VaultNotEmpty);

    msg!("Plan closed, rent reclaimed");
    Ok(())
}
