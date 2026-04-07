use crate::error::LifelineError;
use crate::state::*;
use anchor_lang::prelude::*;

/// Minimum inactivity duration: 1 day in seconds
const MIN_INACTIVITY: i64 = 86_400;
/// Maximum inactivity duration: ~5 years in seconds
const MAX_INACTIVITY: i64 = 157_680_000;
/// Minimum grace period: 1 hour in seconds
const MIN_GRACE: i64 = 3_600;
/// Maximum grace period: 90 days in seconds
const MAX_GRACE: i64 = 7_776_000;

#[derive(Accounts)]
#[instruction(plan_id: u64)]
pub struct InitializePlan<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = PlanAccount::SPACE,
        seeds = [b"plan", owner.key().as_ref(), &plan_id.to_le_bytes()],
        bump
    )]
    pub plan: Account<'info, PlanAccount>,

    #[account(
        init,
        payer = owner,
        space = GuardianSetAccount::SPACE,
        seeds = [b"guardian_set", plan.key().as_ref()],
        bump
    )]
    pub guardian_set: Account<'info, GuardianSetAccount>,

    /// CHECK: PDA used as vault authority, no data
    #[account(
        seeds = [b"vault_authority", plan.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializePlan>,
    plan_id: u64,
    mode: PlanMode,
    beneficiary: Pubkey,
    backup_beneficiary: Option<Pubkey>,
    inactivity_duration: i64,
    grace_period: i64,
    guardian_quorum: u8,
) -> Result<()> {
    // Validate timing parameters
    require!(
        inactivity_duration >= MIN_INACTIVITY && inactivity_duration <= MAX_INACTIVITY,
        LifelineError::InvalidTimingParameter
    );
    require!(
        grace_period >= MIN_GRACE && grace_period <= MAX_GRACE,
        LifelineError::InvalidTimingParameter
    );

    let clock = Clock::get()?;
    let plan = &mut ctx.accounts.plan;

    plan.owner = ctx.accounts.owner.key();
    plan.plan_id = plan_id;
    plan.mode = mode;
    plan.state = PlanState::Draft;
    plan.beneficiary = beneficiary;
    plan.backup_beneficiary = backup_beneficiary;
    plan.inactivity_duration = inactivity_duration;
    plan.grace_period = grace_period;
    plan.last_heartbeat = clock.unix_timestamp;
    plan.guardian_set = ctx.accounts.guardian_set.key();
    plan.guardian_quorum = guardian_quorum;
    plan.created_at = clock.unix_timestamp;
    plan.updated_at = clock.unix_timestamp;
    plan.vault_authority_bump = ctx.bumps.vault_authority;
    plan.protected_lamports = 0;
    plan.emergency_bucket_lamports = 0;
    plan.bump = ctx.bumps.plan;

    let guardian_set = &mut ctx.accounts.guardian_set;
    guardian_set.plan = plan.key();
    guardian_set.guardians = vec![];
    guardian_set.quorum = guardian_quorum;
    guardian_set.update_delay = 3 * 86_400; // 3 days default
    guardian_set.bump = ctx.bumps.guardian_set;

    msg!("Plan {} initialized for owner {}", plan_id, plan.owner);
    Ok(())
}
