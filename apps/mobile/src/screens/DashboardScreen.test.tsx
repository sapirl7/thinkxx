/**
 * DashboardScreen tests — render-based with mocked useWallet + usePlans.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';

import { resetMobileMocks } from '../../test/setup';

// Must prefix with 'mock' for jest.mock() factory scoping.
const mockPublicKeyDefault = PublicKey.default;
const mockGetBalance = jest.fn();
const mockUsePlans = jest.fn();

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: mockPublicKeyDefault,
    shortAddress: '11111...1111',
    connection: { getBalance: mockGetBalance },
  }),
}));

jest.mock('../hooks/useThinkxx', () => ({
  usePlans: () => mockUsePlans(),
}));

import DashboardScreen from './DashboardScreen';

const mockOnCreatePlan = jest.fn();
const mockOnOpenPlan = jest.fn();
const mockOnClaim = jest.fn();
const mockOnSettings = jest.fn();

function renderDashboard() {
  return render(
    <DashboardScreen
      onCreatePlan={mockOnCreatePlan}
      onOpenPlan={mockOnOpenPlan}
      onClaim={mockOnClaim}
      onSettings={mockOnSettings}
    />,
  );
}

beforeEach(() => {
  resetMobileMocks();
  mockOnCreatePlan.mockReset();
  mockOnOpenPlan.mockReset();
  mockOnSettings.mockReset();
  mockGetBalance.mockReset().mockResolvedValue(5_000_000_000);
  mockUsePlans.mockReset().mockReturnValue({ data: [], loading: false, error: null, refetch: jest.fn() });
});

describe('DashboardScreen', () => {
  it('shows empty state when there are no plans', async () => {
    let container: HTMLElement;
    await act(async () => {
      container = renderDashboard().container;
    });
    expect(container!.textContent).toContain('No plans yet');
  });

  it('renders a plan card and hides the empty state when a plan exists', async () => {
    mockUsePlans.mockReturnValue({
      data: [
        {
          address: PublicKey.default,
          account: {
            owner: PublicKey.default,
            mode: 0,
            state: 1,
            beneficiary: PublicKey.default,
            backupBeneficiary: null,
            lastHeartbeat: 0n,
          },
          vaultLamports: 5_000_000_000,
        },
      ],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    let container: HTMLElement;
    await act(async () => {
      container = renderDashboard().container;
    });
    expect(container!.textContent).toContain('Your plans');
    expect(container!.textContent).not.toContain('No plans yet');
  });

  it('shows the loading state while plans load', async () => {
    mockUsePlans.mockReturnValue({ data: [], loading: true, error: null, refetch: jest.fn() });
    let container: HTMLElement;
    await act(async () => {
      container = renderDashboard().container;
    });
    expect(container!.textContent).toContain('Loading');
  });

  it('shows the short wallet address', async () => {
    let container: HTMLElement;
    await act(async () => {
      container = renderDashboard().container;
    });
    expect(container!.textContent).toContain('11111...1111');
  });
});
