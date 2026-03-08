pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::PlanMode;

declare_id!("5FEoFcJ2QK7T8SFDX7jKtCfSKvfGhE8QDRLVH2xSWvaP");

#[program]
pub mod lifeline {
    use super::*;

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

    /// Owner heartbeat — update last activity timestamp.
    pub fn heartbeat(ctx: Context<Heartbeat>) -> Result<()> {
        instructions::heartbeat::handler(ctx)
    }

    /// Deposit SOL into the plan vault.
    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        instructions::deposit_sol::handler(ctx, amount)
    }

    /// Beneficiary starts a claim after inactivity window.
    pub fn start_claim(ctx: Context<StartClaim>) -> Result<()> {
        instructions::start_claim::handler(ctx)
    }

    /// Owner cancels a pending claim during grace period.
    pub fn cancel_claim(ctx: Context<CancelClaim>) -> Result<()> {
        instructions::cancel_claim::handler(ctx)
    }
}
