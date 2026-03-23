use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::LifelineError;

#[derive(Accounts)]
pub struct VetoClaim<'info> {
    #[account(mut)]
    pub guardian: Signer<'info>,

    #[account(
        mut,
        constraint = plan.state == PlanState::ClaimPending @ LifelineError::InvalidPlanState,
    )]
    pub plan: Account<'info, PlanAccount>,

    #[account(
        has_one = plan,
        constraint = guardian_set.guardians.contains(guardian.key) @ LifelineError::NotGuardian,
    )]
    pub guardian_set: Account<'info, GuardianSetAccount>,

    #[account(
        mut,
        has_one = plan,
        constraint = claim.state == ClaimState::Pending @ LifelineError::InvalidPlanState,
        close = guardian,
    )]
    pub claim: Account<'info, ClaimAccount>,
}

pub fn handler(ctx: Context<VetoClaim>) -> Result<()> {
    let guardian_key = ctx.accounts.guardian.key();

    // Prevent double-veto
    require!(
        !ctx.accounts.claim.vetoes.contains(&guardian_key),
        LifelineError::AlreadyVetoed
    );

    // Veto immediately cancels the claim and restores plan to Active
    let plan = &mut ctx.accounts.plan;
    plan.state = PlanState::Active;
    plan.last_heartbeat = Clock::get()?.unix_timestamp;
    plan.updated_at = Clock::get()?.unix_timestamp;

    msg!("Claim vetoed by guardian {}. Plan restored to Active.", guardian_key);
    Ok(())
}
