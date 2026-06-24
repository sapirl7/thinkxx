use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::LifelineError;

#[derive(Accounts)]
pub struct UpdateBeneficiary<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Active || plan.state == PlanState::Paused @ LifelineError::InvalidPlanState,
    )]
    pub plan: Account<'info, PlanAccount>,
}

/// Schedule a beneficiary update with a time delay.
/// The update is stored as a pending change and takes effect
/// after UPDATE_DELAY_SECONDS (72h) without owner cancellation.
///
/// For v1, we apply immediately since delayed updates are complex
/// and require a separate PDA. The 72h delay will be enforced
/// in v2 with a PendingUpdate account.
pub fn handler(
    ctx: Context<UpdateBeneficiary>,
    new_beneficiary: Pubkey,
    new_backup_beneficiary: Option<Pubkey>,
) -> Result<()> {
    let plan = &mut ctx.accounts.plan;

    // Prevent setting beneficiary or backup to owner — the owner must never be
    // able to masquerade as the claimant via start_claim.
    require!(
        new_beneficiary != plan.owner,
        LifelineError::InvalidBeneficiary
    );
    if let Some(backup) = new_backup_beneficiary {
        require!(backup != plan.owner, LifelineError::InvalidBeneficiary);
    }

    plan.beneficiary = new_beneficiary;
    plan.backup_beneficiary = new_backup_beneficiary;
    plan.updated_at = Clock::get()?.unix_timestamp;

    msg!("Beneficiary updated to {}", new_beneficiary);
    Ok(())
}
