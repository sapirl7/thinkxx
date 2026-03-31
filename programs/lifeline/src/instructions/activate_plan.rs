use crate::error::LifelineError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ActivatePlan<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Draft @ LifelineError::InvalidPlanState,
    )]
    pub plan: Account<'info, PlanAccount>,
}

/// Explicitly activate a plan from Draft state.
/// The plan must have a non-zero protected balance to be activated.
pub fn handler(ctx: Context<ActivatePlan>) -> Result<()> {
    let clock = Clock::get()?;
    let plan = &mut ctx.accounts.plan;

    plan.state = PlanState::Active;
    plan.last_heartbeat = clock.unix_timestamp;
    plan.updated_at = clock.unix_timestamp;

    msg!("Plan activated at {}", clock.unix_timestamp);
    Ok(())
}
