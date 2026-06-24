use anchor_lang::prelude::*;

/// Protocol error codes.
/// Each error maps to the specification in docs/PROTOCOL_SPEC.md.
#[error_code]
pub enum LifelineError {
    #[msg("Invalid plan state for this operation")]
    InvalidPlanState,

    #[msg("Inactivity window has not elapsed")]
    InactivityWindowNotElapsed,

    #[msg("Grace period has not elapsed")]
    GracePeriodNotElapsed,

    #[msg("Grace period has expired — owner can no longer cancel")]
    GracePeriodExpired,

    #[msg("Guardian quorum has not been met")]
    QuorumNotMet,

    #[msg("Signer is not the designated beneficiary")]
    NotBeneficiary,

    #[msg("Signer is not a registered guardian")]
    NotGuardian,

    #[msg("Signer is not the plan owner")]
    NotOwner,

    #[msg("Guardian has already approved this claim")]
    AlreadyApproved,

    #[msg("Guardian has already vetoed this claim")]
    AlreadyVetoed,

    #[msg("A claim already exists for this plan")]
    ClaimAlreadyExists,

    #[msg("Plan is not in active state")]
    PlanNotActive,

    #[msg("Vault is not empty — cannot close plan")]
    VaultNotEmpty,

    #[msg("Token mint is not supported by this protocol version")]
    UnsupportedToken,

    #[msg("A pending update already exists")]
    PendingUpdateExists,

    #[msg("No pending update to confirm or cancel")]
    NoPendingUpdate,

    #[msg("Update delay period has not elapsed")]
    UpdateDelayNotElapsed,

    #[msg("Guardian set is full (max 5)")]
    GuardianSetFull,

    #[msg("Guardian not found in set")]
    GuardianNotFound,

    #[msg("Invalid quorum value")]
    InvalidQuorum,

    #[msg("Withdrawal exceeds emergency bucket allocation")]
    EmergencyBucketExceeded,

    #[msg("Plan is not paused")]
    PlanNotPaused,

    #[msg("Invalid timing parameter")]
    InvalidTimingParameter,

    #[msg("Duplicate guardian in set")]
    DuplicateGuardian,

    #[msg("Beneficiary cannot be the plan owner")]
    InvalidBeneficiary,
}
