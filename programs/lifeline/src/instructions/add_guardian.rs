use crate::error::LifelineError;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AddGuardian<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Draft || plan.state == PlanState::Active @ LifelineError::InvalidPlanState,
    )]
    pub plan: Account<'info, PlanAccount>,

    #[account(
        mut,
        has_one = plan,
        constraint = guardian_set.guardians.len() < 5 @ LifelineError::GuardianSetFull,
    )]
    pub guardian_set: Account<'info, GuardianSetAccount>,
}

pub fn handler(ctx: Context<AddGuardian>, guardian: Pubkey) -> Result<()> {
    let guardian_set = &mut ctx.accounts.guardian_set;

    // Prevent duplicates
    require!(
        !guardian_set.guardians.contains(&guardian),
        LifelineError::DuplicateGuardian
    );

    guardian_set.guardians.push(guardian);

    let plan = &mut ctx.accounts.plan;
    plan.updated_at = Clock::get()?.unix_timestamp;

    msg!(
        "Guardian {} added. Total: {}",
        guardian,
        guardian_set.guardians.len()
    );
    Ok(())
}
