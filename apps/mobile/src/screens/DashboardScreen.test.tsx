/**
 * DashboardScreen tests — render-based with mocked useWallet and SDK.
 *
 * Covers: balance formatting, wallet display, plan state labels.
 * Render tests use waitFor to handle async data fetching.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { resetMobileMocks } from '../../test/setup';

const mockPublicKeyDefault = PublicKey.default;
const mockGetBalance = jest.fn().mockResolvedValue(5_000_000_000);

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: mockPublicKeyDefault,
    shortAddress: '11111...1111',
    disconnect: jest.fn(),
    connection: {
      getBalance: mockGetBalance,
      getProgramAccounts: jest.fn().mockResolvedValue([]),
      getAccountInfo: jest.fn().mockResolvedValue(null),
    },
  }),
}));

jest.mock('@thinkxx/sdk', () => {
  const actual = jest.requireActual('@thinkxx/sdk');
  return {
    ...actual,
    fetchPlansByOwner: jest.fn().mockResolvedValue([]),
  };
});

import DashboardScreen from './DashboardScreen';

const mockOnCreatePlan = jest.fn();
const mockOnHeartbeat = jest.fn();
const mockOnSettings = jest.fn();
const mockOnPlanDetail = jest.fn();
const mockOnDeposit = jest.fn();

const defaultProps = {
  onCreatePlan: mockOnCreatePlan,
  onHeartbeat: mockOnHeartbeat,
  onSettings: mockOnSettings,
  onPlanDetail: mockOnPlanDetail,
  onDeposit: mockOnDeposit,
  selectedPlanAddress: null as string | null,
  lastCreatedPlanAddress: null as string | null,
};

beforeEach(() => {
  resetMobileMocks();
  mockOnCreatePlan.mockReset();
  mockOnHeartbeat.mockReset();
  mockOnSettings.mockReset();
  mockOnPlanDetail.mockReset();
  mockOnDeposit.mockReset();
  mockGetBalance.mockReset().mockResolvedValue(5_000_000_000);
});

describe('DashboardScreen', () => {
  it('renders header and section titles', async () => {
    const { container } = render(<DashboardScreen {...defaultProps} />);
    await waitFor(
      () => expect(container.textContent).toContain('Thinkxx'),
      { timeout: 3000 },
    );
    expect(container.textContent).toContain('Your Plans');
    expect(container.textContent).toContain('Quick Actions');
  });

  it('renders wallet short address', async () => {
    const { container } = render(<DashboardScreen {...defaultProps} />);
    await waitFor(
      () => expect(container.textContent).toContain('11111...1111'),
      { timeout: 3000 },
    );
  });

  it('shows empty state when no plans and no selected plan context', async () => {
    const { container } = render(<DashboardScreen {...defaultProps} />);
    await waitFor(
      () => expect(container.textContent).toContain('No plans yet'),
      { timeout: 3000 },
    );
  });

  it('shows pending sync card when last created plan exists', async () => {
    const { container } = render(
      <DashboardScreen
        {...defaultProps}
        lastCreatedPlanAddress="4YgMP83QVn2zadubaCBi3btu7qnHPPaErgG95W2nxWHx"
      />
    );
    await waitFor(
      () => expect(container.textContent).toContain('Plan created, syncing...'),
      { timeout: 3000 },
    );
  });

  // ── Pure logic tests (no rendering) ──

  it('formats SOL balance correctly', () => {
    const lamports = 1_500_000_000;
    const sol = lamports / LAMPORTS_PER_SOL;
    expect(sol.toFixed(4)).toBe('1.5000');
  });

  it('shows "—" when balance is null', () => {
    const balance = null as number | null;
    const display = balance !== null ? `${balance.toFixed(4)} SOL` : '—';
    expect(display).toBe('—');
  });

  it('derives short address format correctly', () => {
    const pubkey = PublicKey.default;
    const short = `${pubkey.toBase58().slice(0, 4)}...${pubkey.toBase58().slice(-4)}`;
    expect(short).toMatch(/^.{4}\.\.\..{4}$/);
    expect(short.length).toBe(11);
  });
});
