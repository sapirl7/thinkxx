use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::LifelineError;

#[derive(Accounts)]
pub struct RemoveGuardian<'info> {
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
    )]
    pub guardian_set: Account<'info, GuardianSetAccount>,
}

pub fn handler(ctx: Context<RemoveGuardian>, guardian: Pubkey) -> Result<()> {
    let guardian_set = &mut ctx.accounts.guardian_set;

    let pos = guardian_set
        .guardians
        .iter()
        .position(|g| *g == guardian)
        .ok_or(LifelineError::GuardianNotFound)?;

    guardian_set.guardians.remove(pos);

    // Validate quorum still makes sense
    if !guardian_set.guardians.is_empty() {
        require!(
            guardian_set.quorum as usize <= guardian_set.guardians.len(),
            LifelineError::InvalidQuorum
        );
    }

    let plan = &mut ctx.accounts.plan;
    plan.updated_at = Clock::get()?.unix_timestamp;

    msg!("Guardian {} removed. Remaining: {}", guardian, guardian_set.guardians.len());
    Ok(())
}
