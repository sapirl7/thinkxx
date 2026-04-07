use crate::error::LifelineError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SetEmergencyBucket<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Draft || plan.state == PlanState::Active @ LifelineError::InvalidPlanState,
    )]
    pub plan: Account<'info, PlanAccount>,
}

/// Owner sets the emergency bucket allocation.
/// This is the maximum amount that can be withdrawn by the owner
/// without triggering a full claim process (for urgent small expenses).
pub fn handler(ctx: Context<SetEmergencyBucket>, amount: u64) -> Result<()> {
    let plan = &mut ctx.accounts.plan;

    // Emergency bucket cannot exceed protected balance
    require!(
        amount <= plan.protected_lamports,
        LifelineError::EmergencyBucketExceeded
    );

    plan.emergency_bucket_lamports = amount;
    plan.updated_at = Clock::get()?.unix_timestamp;

    msg!("Emergency bucket set to {} lamports", amount);
    Ok(())
}
