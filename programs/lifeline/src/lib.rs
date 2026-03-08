pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::PlanMode;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod lifeline {
    use super::*;

    // === Plan Lifecycle ===

    /// Initialize a new emergency access plan.
    pub fn initialize_plan(
        ctx: Context<InitializePlan>,
        plan_id: u64,
        mode: PlanMode,
        beneficiary: Pubkey,
        backup_beneficiary: Option<Pubkey>,
        inactivity_duration: i64,
        grace_period: i64,
        guardian_quorum: u8,
    ) -> Result<()> {
        instructions::initialize_plan::handler(
            ctx,
            plan_id,
            mode,
            beneficiary,
            backup_beneficiary,
            inactivity_duration,
            grace_period,
            guardian_quorum,
        )
    }

    /// Explicitly activate a plan from Draft state.
    pub fn activate_plan(ctx: Context<ActivatePlan>) -> Result<()> {
        instructions::activate_plan::handler(ctx)
    }

    /// Owner heartbeat — update last activity timestamp.
    pub fn heartbeat(ctx: Context<Heartbeat>) -> Result<()> {
        instructions::heartbeat::handler(ctx)
    }

    /// Pause an active plan (stops inactivity timer).
    pub fn pause_plan(ctx: Context<PausePlan>) -> Result<()> {
        instructions::pause_plan::handler(ctx)
    }

    /// Resume a paused plan.
    pub fn resume_plan(ctx: Context<ResumePlan>) -> Result<()> {
        instructions::resume_plan::handler(ctx)
    }

    // === Vault Operations ===

    /// Deposit SOL into the plan vault.
    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        instructions::deposit_sol::handler(ctx, amount)
    }

    /// Set the emergency bucket allocation.
    pub fn set_emergency_bucket(ctx: Context<SetEmergencyBucket>, amount: u64) -> Result<()> {
        instructions::set_emergency_bucket::handler(ctx, amount)
    }

    /// Owner withdraws from emergency bucket.
    pub fn emergency_withdraw(ctx: Context<EmergencyWithdraw>, amount: u64) -> Result<()> {
        instructions::emergency_withdraw::handler(ctx, amount)
    }

    // === Guardian Management ===

    /// Add a guardian to the plan's guardian set.
    pub fn add_guardian(ctx: Context<AddGuardian>, guardian: Pubkey) -> Result<()> {
        instructions::add_guardian::handler(ctx, guardian)
    }

    /// Remove a guardian from the plan's guardian set.
    pub fn remove_guardian(ctx: Context<RemoveGuardian>, guardian: Pubkey) -> Result<()> {
        instructions::remove_guardian::handler(ctx, guardian)
    }

    // === Claim Flow ===

    /// Beneficiary starts a claim after inactivity window.
    pub fn start_claim(ctx: Context<StartClaim>) -> Result<()> {
        instructions::start_claim::handler(ctx)
    }

    /// Owner cancels a pending claim during grace period.
    pub fn cancel_claim(ctx: Context<CancelClaim>) -> Result<()> {
        instructions::cancel_claim::handler(ctx)
    }

    /// Guardian approves a pending claim.
    pub fn approve_claim(ctx: Context<ApproveClaim>) -> Result<()> {
        instructions::approve_claim::handler(ctx)
    }

    /// Guardian vetoes a pending claim (immediately cancels).
    pub fn veto_claim(ctx: Context<VetoClaim>) -> Result<()> {
        instructions::veto_claim::handler(ctx)
    }

    /// Beneficiary finalizes an approved claim and withdraws vault.
    pub fn finalize_claim(ctx: Context<FinalizeClaim>) -> Result<()> {
        instructions::finalize_claim::handler(ctx)
    }

    // === Plan Updates ===

    /// Update beneficiary address.
    pub fn update_beneficiary(
        ctx: Context<UpdateBeneficiary>,
        new_beneficiary: Pubkey,
        new_backup_beneficiary: Option<Pubkey>,
    ) -> Result<()> {
        instructions::update_beneficiary::handler(ctx, new_beneficiary, new_backup_beneficiary)
    }

    /// Update timing parameters (inactivity + grace).
    pub fn update_timing(
        ctx: Context<UpdateTiming>,
        new_inactivity_duration: i64,
        new_grace_period: i64,
    ) -> Result<()> {
        instructions::update_timing::handler(ctx, new_inactivity_duration, new_grace_period)
    }

    /// Close a plan and reclaim rent (draft/cancelled only).
    pub fn close_plan(ctx: Context<ClosePlan>) -> Result<()> {
        instructions::close_plan::handler(ctx)
    }
}
