use crate::error::LifelineError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct StartClaim<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,

    #[account(
        mut,
        constraint = plan.state == PlanState::Active @ LifelineError::PlanNotActive,
        constraint = (
            claimant.key() == plan.beneficiary ||
            plan.backup_beneficiary == Some(claimant.key())
        ) @ LifelineError::NotBeneficiary,
    )]
    pub plan: Account<'info, PlanAccount>,

    #[account(
        init,
        payer = claimant,
        space = ClaimAccount::SPACE,
        seeds = [b"claim", plan.key().as_ref()],
        bump
    )]
    pub claim: Account<'info, ClaimAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<StartClaim>) -> Result<()> {
    let clock = Clock::get()?;
    let plan = &mut ctx.accounts.plan;

    // Verify inactivity window has elapsed
    let elapsed = clock.unix_timestamp - plan.last_heartbeat;
    require!(
        elapsed >= plan.inactivity_duration,
        LifelineError::InactivityWindowNotElapsed
    );

    // Initialize claim
    let claim = &mut ctx.accounts.claim;
    claim.plan = plan.key();
    claim.claimant = ctx.accounts.claimant.key();
    claim.state = ClaimState::Pending;
    claim.started_at = clock.unix_timestamp;
    claim.grace_deadline = clock.unix_timestamp + plan.grace_period;
    claim.approvals = vec![];
    claim.vetoes = vec![];
    claim.bump = ctx.bumps.claim;

    // Transition plan to ClaimPending
    plan.state = PlanState::ClaimPending;
    plan.updated_at = clock.unix_timestamp;

    msg!(
        "Claim started by {} at {}. Grace deadline: {}",
        claim.claimant,
        clock.unix_timestamp,
        claim.grace_deadline
    );
    Ok(())
}
