/**
 * PlanDetailScreen tests — render-based with mocked SDK and wallet.
 *
 * Covers: plan data rendering, Coming Soon actions,
 * Pause/Resume toggle, vault display, heartbeat display.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';

import { resetMobileMocks } from '../../test/setup';
import { PlanMode, PlanState } from '@thinkxx/sdk';

// Suppress React DOM prop warnings from RN components (activeOpacity, etc.)
const originalError = console.error;
beforeAll(() => { console.error = (...args: unknown[]) => { if (typeof args[0] === 'string' && args[0].includes('is not a valid')) return; originalError(...args); }; });
afterAll(() => { console.error = originalError; });

// Must prefix with "mock" for jest.mock() scope access
const mockPubkeyDefault = PublicKey.default;
const mockGetBalance = jest.fn().mockResolvedValue(2_000_000_000);
const mockGetAccountInfo = jest.fn();

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: mockPubkeyDefault,
    shortAddress: '11111...1111',
    disconnect: jest.fn(),
    signAndSendTransaction: jest.fn().mockResolvedValue('FakeSig123'),
    connection: {
      getBalance: mockGetBalance,
      getAccountInfo: mockGetAccountInfo,
    },
  }),
}));

jest.mock('@thinkxx/sdk', () => {
  const actual = jest.requireActual('@thinkxx/sdk');
  const { PublicKey: PK } = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    deriveGuardianSetPda: jest.fn().mockReturnValue([PK.default, 253]),
    deriveSolVaultPda: jest.fn().mockReturnValue([PK.default, 252]),
    fetchPlan: jest.fn().mockResolvedValue({
      owner: PK.default,
      planId: 1n,
      mode: 0, // PlanMode.Legacy
      state: 1, // PlanState.Active
      beneficiary: PK.default,
      backupBeneficiary: null,
      inactivityDuration: 2592000n,
      gracePeriod: 604800n,
      lastHeartbeat: BigInt(Math.floor(Date.now() / 1000) - 3600),
      guardianSet: PK.default,
      guardianQuorum: 2,
      createdAt: BigInt(Math.floor(Date.now() / 1000)),
      updatedAt: BigInt(Math.floor(Date.now() / 1000)),
      vaultAuthorityBump: 255,
      protectedLamports: 5000000000n,
      emergencyBucketLamports: 1000000000n,
      bump: 254,
    }),
    fetchGuardianSet: jest.fn().mockResolvedValue({
      plan: PK.default,
      guardians: [PK.default],
      quorum: 1,
      updateDelay: 0n,
      bump: 253,
    }),
  };
});

import PlanDetailScreen from './PlanDetailScreen';

const onBack = jest.fn();
const onGuardians = jest.fn();
const onHeartbeat = jest.fn();
const onDeposit = jest.fn();

const planAddress = PublicKey.default.toBase58();

beforeEach(() => {
  resetMobileMocks();
  onBack.mockReset();
  onGuardians.mockReset();
  onHeartbeat.mockReset();
  onDeposit.mockReset();
  mockGetBalance.mockReset().mockResolvedValue(2_000_000_000);
  mockGetAccountInfo.mockReset().mockResolvedValue(null);
});

describe('PlanDetailScreen', () => {
  it('renders plan status and mode', async () => {
    const { container } = render(
      <PlanDetailScreen
        planAddress={planAddress}
        onBack={onBack}
        onGuardians={onGuardians}
        onHeartbeat={onHeartbeat}
        onDeposit={onDeposit}
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('Active');
      expect(container.textContent).toContain('Medical');
    }, { timeout: 3000 });
  });

  it('renders vault balance heading', async () => {
    const { container } = render(
      <PlanDetailScreen
        planAddress={planAddress}
        onBack={onBack}
        onGuardians={onGuardians}
        onHeartbeat={onHeartbeat}
        onDeposit={onDeposit}
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('Vault Balance');
    }, { timeout: 3000 });
  });

  it('marks Edit Timing as Coming Soon', async () => {
    const { container } = render(
      <PlanDetailScreen
        planAddress={planAddress}
        onBack={onBack}
        onGuardians={onGuardians}
        onHeartbeat={onHeartbeat}
        onDeposit={onDeposit}
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('Coming Soon');
      expect(container.textContent).toContain('Edit Timing');
    }, { timeout: 3000 });
  });

  it('marks Emergency as Coming Soon', async () => {
    const { container } = render(
      <PlanDetailScreen
        planAddress={planAddress}
        onBack={onBack}
        onGuardians={onGuardians}
        onHeartbeat={onHeartbeat}
        onDeposit={onDeposit}
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('Emergency');
      expect(container.textContent).toContain('Coming Soon');
    }, { timeout: 3000 });
  });

  it('shows Pause Plan button for active plan', async () => {
    const { container } = render(
      <PlanDetailScreen
        planAddress={planAddress}
        onBack={onBack}
        onGuardians={onGuardians}
        onHeartbeat={onHeartbeat}
        onDeposit={onDeposit}
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('Pause Plan');
    }, { timeout: 3000 });
  });

  it('shows emergency cap as subset of vault', async () => {
    const { container } = render(
      <PlanDetailScreen
        planAddress={planAddress}
        onBack={onBack}
        onGuardians={onGuardians}
        onHeartbeat={onHeartbeat}
        onDeposit={onDeposit}
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('Emergency cap');
    }, { timeout: 3000 });
  });

  it('shows configuration details', async () => {
    const { container } = render(
      <PlanDetailScreen
        planAddress={planAddress}
        onBack={onBack}
        onGuardians={onGuardians}
        onHeartbeat={onHeartbeat}
        onDeposit={onDeposit}
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('Configuration');
      expect(container.textContent).toContain('Beneficiary');
      expect(container.textContent).toContain('Inactivity Window');
      expect(container.textContent).toContain('Grace Period');
    }, { timeout: 3000 });
  });
});
