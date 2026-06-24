use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::LifelineError;

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
/// Bounds must match `initialize_plan` so timing can't be relaxed after creation:
/// inactivity in [1 day, ~5 years], grace in [1 hour, 90 days].
pub fn handler(
    ctx: Context<UpdateTiming>,
    new_inactivity_duration: i64,
    new_grace_period: i64,
) -> Result<()> {
    const MIN_INACTIVITY: i64 = 86_400; // 1 day
    const MAX_INACTIVITY: i64 = 157_680_000; // ~5 years
    const MIN_GRACE: i64 = 3_600; // 1 hour
    const MAX_GRACE: i64 = 7_776_000; // 90 days

    require!(
        new_inactivity_duration >= MIN_INACTIVITY && new_inactivity_duration <= MAX_INACTIVITY,
        LifelineError::InvalidTimingParameter
    );
    require!(
        new_grace_period >= MIN_GRACE && new_grace_period <= MAX_GRACE,
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
