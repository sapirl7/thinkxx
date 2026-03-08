use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::LifelineError;

#[derive(Accounts)]
pub struct EmergencyWithdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Active @ LifelineError::PlanNotActive,
    )]
    pub plan: Account<'info, PlanAccount>,

    /// CHECK: SOL vault PDA
    #[account(
        mut,
        seeds = [b"sol_vault", plan.key().as_ref()],
        bump
    )]
    pub sol_vault: UncheckedAccount<'info>,

    /// CHECK: Vault authority PDA
    #[account(
        seeds = [b"vault_authority", plan.key().as_ref()],
        bump = plan.vault_authority_bump,
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Owner withdraws from the emergency bucket without triggering claim flow.
pub fn handler(ctx: Context<EmergencyWithdraw>, amount: u64) -> Result<()> {
    let plan = &mut ctx.accounts.plan;

    require!(
        amount <= plan.emergency_bucket_lamports,
        LifelineError::EmergencyBucketExceeded
    );

    // Transfer from vault to owner
    let vault_lamports = ctx.accounts.sol_vault.lamports();
    require!(amount <= vault_lamports, LifelineError::EmergencyBucketExceeded);

    **ctx.accounts.sol_vault.try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.owner.try_borrow_mut_lamports()? += amount;

    // Update accounting
    plan.emergency_bucket_lamports -= amount;
    plan.protected_lamports -= amount;
    plan.updated_at = Clock::get()?.unix_timestamp;

    msg!("Emergency withdrawal: {} lamports to owner", amount);
    Ok(())
}
