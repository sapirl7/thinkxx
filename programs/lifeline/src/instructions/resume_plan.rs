use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::LifelineError;

#[derive(Accounts)]
pub struct ResumePlan<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Paused @ LifelineError::PlanNotPaused,
    )]
    pub plan: Account<'info, PlanAccount>,
}

/// Resume a paused plan. Resets the heartbeat timer.
pub fn handler(ctx: Context<ResumePlan>) -> Result<()> {
    let clock = Clock::get()?;
    let plan = &mut ctx.accounts.plan;

    plan.state = PlanState::Active;
    plan.last_heartbeat = clock.unix_timestamp;
    plan.updated_at = clock.unix_timestamp;

    msg!("Plan resumed at {}", clock.unix_timestamp);
    Ok(())
}
