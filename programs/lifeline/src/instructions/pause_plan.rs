use crate::error::LifelineError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PausePlan<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Active @ LifelineError::PlanNotActive,
    )]
    pub plan: Account<'info, PlanAccount>,
}

/// Pause an active plan. Inactivity timer stops while paused.
/// Useful when the owner knows they will be unreachable for maintenance
/// but doesn't want to trigger a claim.
pub fn handler(ctx: Context<PausePlan>) -> Result<()> {
    let plan = &mut ctx.accounts.plan;
    plan.state = PlanState::Paused;
    plan.updated_at = Clock::get()?.unix_timestamp;

    msg!("Plan paused");
    Ok(())
}
