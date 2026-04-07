use crate::error::LifelineError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateTiming<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Active || plan.state == PlanState::Paused || plan.state == PlanState::Draft @ LifelineError::InvalidPlanState,
    )]
    pub plan: Account<'info, PlanAccount>,
}

/// Update timing parameters (inactivity duration and grace period).
/// Must respect minimum bounds: inactivity >= 1 day, grace >= 1 day.
pub fn handler(
    ctx: Context<UpdateTiming>,
    new_inactivity_duration: i64,
    new_grace_period: i64,
) -> Result<()> {
    const MIN_DURATION: i64 = 86_400; // 1 day in seconds

    require!(
        new_inactivity_duration >= MIN_DURATION,
        LifelineError::InvalidTimingParameter
    );
    require!(
        new_grace_period >= MIN_DURATION,
        LifelineError::InvalidTimingParameter
    );

    let plan = &mut ctx.accounts.plan;
    plan.inactivity_duration = new_inactivity_duration;
    plan.grace_period = new_grace_period;
    plan.updated_at = Clock::get()?.unix_timestamp;

    msg!(
        "Timing updated: inactivity={}s, grace={}s",
        new_inactivity_duration,
        new_grace_period
    );
    Ok(())
}
