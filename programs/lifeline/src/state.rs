use anchor_lang::prelude::*;

/// Plan operating modes with different default timing.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PlanMode {
    Medical,
    LegalRisk,
    Legacy,
}

/// Plan lifecycle states.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PlanState {
    Draft,
    Active,
    ClaimPending,
    ClaimApproved,
    Claimed,
    Cancelled,
    Paused,
}

/// Claim lifecycle states.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ClaimState {
    Pending,
    Approved,
    Vetoed,
    Finalized,
    Cancelled,
}

/// Core plan account — stores policy configuration and state.
/// PDA: ["plan", owner, plan_id]
#[account]
pub struct PlanAccount {
    pub owner: Pubkey,
    pub plan_id: u64,
    pub mode: PlanMode,
    pub state: PlanState,
    pub beneficiary: Pubkey,
    pub backup_beneficiary: Option<Pubkey>,
    pub inactivity_duration: i64,
    pub grace_period: i64,
    pub last_heartbeat: i64,
    pub guardian_set: Pubkey,
    pub guardian_quorum: u8,
    pub created_at: i64,
    pub updated_at: i64,
    pub vault_authority_bump: u8,
    pub protected_lamports: u64,
    pub emergency_bucket_lamports: u64,
    pub bump: u8,
}

impl PlanAccount {
    /// Space calculation for account allocation.
    /// 8 (discriminator) + fields
    pub const SPACE: usize = 8  // discriminator
        + 32  // owner
        + 8   // plan_id
        + 1   // mode
        + 1   // state
        + 32  // beneficiary
        + 1 + 32 // backup_beneficiary (Option<Pubkey>)
        + 8   // inactivity_duration
        + 8   // grace_period
        + 8   // last_heartbeat
        + 32  // guardian_set
        + 1   // guardian_quorum
        + 8   // created_at
        + 8   // updated_at
        + 1   // vault_authority_bump
        + 8   // protected_lamports
        + 8   // emergency_bucket_lamports
        + 1   // bump
        + 64; // padding for future fields
}

/// Guardian set account — manages guardian roster.
/// PDA: ["guardian_set", plan]
#[account]
pub struct GuardianSetAccount {
    pub plan: Pubkey,
    pub guardians: Vec<Pubkey>,
    pub quorum: u8,
    pub update_delay: i64,
    pub bump: u8,
}

impl GuardianSetAccount {
    /// Space: max 5 guardians
    pub const SPACE: usize = 8  // discriminator
        + 32  // plan
        + 4 + (32 * 5) // guardians vec (max 5)
        + 1   // quorum
        + 8   // update_delay
        + 1   // bump
        + 32; // padding
}

/// Claim account — tracks an active claim process.
/// PDA: ["claim", plan]
#[account]
pub struct ClaimAccount {
    pub plan: Pubkey,
    pub claimant: Pubkey,
    pub state: ClaimState,
    pub started_at: i64,
    pub grace_deadline: i64,
    pub approvals: Vec<Pubkey>,
    pub vetoes: Vec<Pubkey>,
    pub bump: u8,
}

impl ClaimAccount {
    /// Space: max 5 approvals + 5 vetoes
    pub const SPACE: usize = 8  // discriminator
        + 32  // plan
        + 32  // claimant
        + 1   // state
        + 8   // started_at
        + 8   // grace_deadline
        + 4 + (32 * 5) // approvals vec (max 5)
        + 4 + (32 * 5) // vetoes vec (max 5)
        + 1   // bump
        + 32; // padding
}
