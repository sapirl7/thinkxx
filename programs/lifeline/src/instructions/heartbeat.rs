use crate::error::LifelineError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Heartbeat<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Active || plan.state == PlanState::Draft @ LifelineError::InvalidPlanState,
    )]
    pub plan: Account<'info, PlanAccount>,
}

pub fn handler(ctx: Context<Heartbeat>) -> Result<()> {
    let clock = Clock::get()?;
    let plan = &mut ctx.accounts.plan;

    plan.last_heartbeat = clock.unix_timestamp;
    plan.updated_at = clock.unix_timestamp;

    msg!("Heartbeat recorded at {}", clock.unix_timestamp);
    Ok(())
}
