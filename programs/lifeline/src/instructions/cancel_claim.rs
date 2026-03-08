use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::LifelineError;

#[derive(Accounts)]
pub struct CancelClaim<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::ClaimPending @ LifelineError::InvalidPlanState,
    )]
    pub plan: Account<'info, PlanAccount>,

    #[account(
        mut,
        has_one = plan,
        constraint = claim.state == ClaimState::Pending @ LifelineError::InvalidPlanState,
        close = owner,
    )]
    pub claim: Account<'info, ClaimAccount>,
}

pub fn handler(ctx: Context<CancelClaim>) -> Result<()> {
    let clock = Clock::get()?;
    let claim = &ctx.accounts.claim;

    // Owner can only cancel during grace period
    require!(
        clock.unix_timestamp <= claim.grace_deadline,
        LifelineError::GracePeriodExpired
    );

    // Restore plan to Active
    let plan = &mut ctx.accounts.plan;
    plan.state = PlanState::Active;
    plan.last_heartbeat = clock.unix_timestamp; // Reset heartbeat on cancel
    plan.updated_at = clock.unix_timestamp;

    msg!("Claim cancelled by owner at {}", clock.unix_timestamp);
    Ok(())
}
