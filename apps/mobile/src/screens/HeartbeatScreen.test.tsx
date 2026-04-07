/**
 * HeartbeatScreen tests — plan-bound owner flow.
 *
 * Covers: missing plan selection, on-chain validation, and ready state rendering.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';

import { resetMobileMocks } from '../../test/setup';

const mockPlanOwner = PublicKey.default;
const mockFetchPlan = jest.fn();
const mockSignAndSendTransaction = jest.fn().mockResolvedValue('heartbeat-sig-123');
const mockConnection = {};

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: mockPlanOwner,
    connection: mockConnection,
    signAndSendTransaction: mockSignAndSendTransaction,
  }),
}));

jest.mock('@thinkxx/sdk', () => {
  const actual = jest.requireActual('@thinkxx/sdk');
  const { PublicKey: PK } = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    fetchPlan: (...args: unknown[]) => mockFetchPlan(...args),
    ThinkxxClient: jest.fn().mockImplementation(() => ({
      buildHeartbeat: jest.fn().mockReturnValue({
        programId: PK.default,
        keys: [],
        data: new Uint8Array(8),
      }),
    })),
    PlanState: {
      Draft: 0,
      Active: 1,
      ClaimPending: 2,
      ClaimApproved: 3,
      Claimed: 4,
      Cancelled: 5,
      Paused: 6,
    },
  };
});

import HeartbeatScreen from './HeartbeatScreen';

const mockOnBack = jest.fn();
const planAddress = PublicKey.unique().toBase58();

beforeEach(() => {
  resetMobileMocks();
  mockOnBack.mockReset();
  mockFetchPlan.mockReset();
  mockSignAndSendTransaction.mockReset().mockResolvedValue('heartbeat-sig-123');
});

describe('HeartbeatScreen', () => {
  it('renders with Heartbeat title', () => {
    const { container } = render(<HeartbeatScreen onBack={mockOnBack} planAddress={null} />);
    expect(container.textContent).toContain('Heartbeat');
  });

  it('shows no valid plan message when no selected plan exists', async () => {
    const { container } = render(<HeartbeatScreen onBack={mockOnBack} planAddress={null} />);
    await waitFor(() => {
      expect(container.textContent).toContain('No valid plan connected');
    });
  });

  it('shows on-chain missing plan state', async () => {
    mockFetchPlan.mockResolvedValue(null);
    const { container } = render(<HeartbeatScreen onBack={mockOnBack} planAddress={planAddress} />);
    await waitFor(() => {
      expect(container.textContent).toContain('Selected plan was not found on-chain yet');
    });
  });

  it('shows foreign owner state', async () => {
    mockFetchPlan.mockResolvedValue({
      owner: PublicKey.unique(),
      planId: 1n,
      mode: 0,
      state: 1,
      beneficiary: PublicKey.unique(),
      backupBeneficiary: null,
      inactivityDuration: 86400n,
      gracePeriod: 3600n,
      lastHeartbeat: 1710000000n,
      guardianSet: PublicKey.unique(),
      guardianQuorum: 0,
      createdAt: 1710000000n,
      updatedAt: 1710000000n,
      vaultAuthorityBump: 1,
      protectedLamports: 0n,
      emergencyBucketLamports: 0n,
      bump: 1,
    });

    const { container } = render(<HeartbeatScreen onBack={mockOnBack} planAddress={planAddress} />);
    await waitFor(() => {
      expect(container.textContent).toContain('belongs to another wallet');
    });
  });

  it('shows ready state for a valid plan', async () => {
    mockFetchPlan.mockResolvedValue({
      owner: mockPlanOwner,
      planId: 1n,
      mode: 0,
      state: 1,
      beneficiary: PublicKey.unique(),
      backupBeneficiary: null,
      inactivityDuration: 86400n,
      gracePeriod: 3600n,
      lastHeartbeat: BigInt(Math.floor(Date.now() / 1000) - 60),
      guardianSet: PublicKey.unique(),
      guardianQuorum: 0,
      createdAt: 1710000000n,
      updatedAt: 1710000000n,
      vaultAuthorityBump: 1,
      protectedLamports: 0n,
      emergencyBucketLamports: 0n,
      bump: 1,
    });

    const { container } = render(<HeartbeatScreen onBack={mockOnBack} planAddress={planAddress} />);
    await waitFor(() => {
      expect(container.textContent).toContain('Plan is ready for heartbeat');
      expect(container.textContent).toContain('Last Recorded Heartbeat');
    });
  });
});
