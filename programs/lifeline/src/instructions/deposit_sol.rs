use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::error::LifelineError;

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner @ LifelineError::NotOwner,
        constraint = plan.state == PlanState::Draft || plan.state == PlanState::Active @ LifelineError::InvalidPlanState,
    )]
    pub plan: Account<'info, PlanAccount>,

    /// CHECK: SOL vault PDA, receives lamports
    #[account(
        mut,
        seeds = [b"sol_vault", plan.key().as_ref()],
        bump
    )]
    pub sol_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
    require!(amount > 0, LifelineError::InvalidTimingParameter);

    // Transfer SOL from owner to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.owner.to_account_info(),
                to: ctx.accounts.sol_vault.to_account_info(),
            },
        ),
        amount,
    )?;

    let plan = &mut ctx.accounts.plan;
    plan.protected_lamports = plan
        .protected_lamports
        .checked_add(amount)
        .ok_or(LifelineError::InvalidTimingParameter)?;

    // Transition Draft → Active on first deposit
    if plan.state == PlanState::Draft {
        plan.state = PlanState::Active;
        let clock = Clock::get()?;
        plan.last_heartbeat = clock.unix_timestamp;
    }

    plan.updated_at = Clock::get()?.unix_timestamp;

    msg!("Deposited {} lamports into vault", amount);
    Ok(())
}
