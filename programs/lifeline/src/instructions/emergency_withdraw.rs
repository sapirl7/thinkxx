use anchor_lang::prelude::*;
use anchor_lang::system_program;
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
    // Validate against plan accounting (read-only checks first)
    require!(
        amount <= ctx.accounts.plan.emergency_bucket_lamports,
        LifelineError::EmergencyBucketExceeded
    );

    // Verify vault has enough lamports
    let vault_lamports = ctx.accounts.sol_vault.lamports();
    require!(amount <= vault_lamports, LifelineError::EmergencyBucketExceeded);

    // Transfer from vault to owner via CPI with PDA signing.
    // The sol_vault is system-owned (funded via system_program::transfer in deposit),
    // so we must use invoke_signed with the vault PDA seeds.
    let plan_key = ctx.accounts.plan.key();
    let vault_bump = ctx.bumps.sol_vault;
    let vault_seeds: &[&[u8]] = &[b"sol_vault", plan_key.as_ref(), &[vault_bump]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.sol_vault.to_account_info(),
                to: ctx.accounts.owner.to_account_info(),
            },
            &[vault_seeds],
        ),
        amount,
    )?;

    // Update accounting (mutable borrow after CPI)
    let plan = &mut ctx.accounts.plan;
    plan.emergency_bucket_lamports = plan
        .emergency_bucket_lamports
        .checked_sub(amount)
        .ok_or(LifelineError::EmergencyBucketExceeded)?;
    plan.protected_lamports = plan
        .protected_lamports
        .checked_sub(amount)
        .ok_or(LifelineError::EmergencyBucketExceeded)?;
    plan.updated_at = Clock::get()?.unix_timestamp;

    msg!("Emergency withdrawal: {} lamports to owner", amount);
    Ok(())
}
