use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::LifelineError;

#[derive(Accounts)]
pub struct ApproveClaim<'info> {
    pub guardian: Signer<'info>,

    #[account(
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
    )]
    pub claim: Account<'info, ClaimAccount>,
}

pub fn handler(ctx: Context<ApproveClaim>) -> Result<()> {
    let claim = &mut ctx.accounts.claim;
    let guardian_key = ctx.accounts.guardian.key();

    // Prevent double-approval
    require!(
        !claim.approvals.contains(&guardian_key),
        LifelineError::AlreadyApproved
    );

    claim.approvals.push(guardian_key);

    // Check if quorum is met
    let quorum = ctx.accounts.guardian_set.quorum;
    if claim.approvals.len() >= quorum as usize {
        claim.state = ClaimState::Approved;
        msg!("Claim approved — quorum ({}/{}) met", claim.approvals.len(), quorum);
    } else {
        msg!(
            "Guardian {} approved. Progress: {}/{}",
            guardian_key,
            claim.approvals.len(),
            quorum
        );
    }

    Ok(())
}
