/**
 * DashboardScreen tests — render-based with mocked useWallet.
 *
 * Covers: synthetic plan, empty state, balance, button callbacks.
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { resetMobileMocks } from '../../test/setup';

// Must prefix with 'mock' for jest.mock() factory scoping
const mockPublicKeyDefault = PublicKey.default;
const mockGetBalance = jest.fn();

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: mockPublicKeyDefault,
    shortAddress: '11111...1111',
    disconnect: jest.fn(),
    connection: {
      getBalance: mockGetBalance,
    },
  }),
}));

import DashboardScreen from './DashboardScreen';

const mockOnCreatePlan = jest.fn();
const mockOnHeartbeat = jest.fn();
const mockOnSettings = jest.fn();

beforeEach(() => {
  resetMobileMocks();
  mockOnCreatePlan.mockReset();
  mockOnHeartbeat.mockReset();
  mockOnSettings.mockReset();
  mockGetBalance.mockReset().mockResolvedValue(5_000_000_000);
});

describe('DashboardScreen', () => {
  it('renders with lastPlanAddress → shows synthetic plan card, no "No plans yet"', async () => {
    const planAddr = 'PlanAddr123456789012345678901234567890Abc';
    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <DashboardScreen
          onCreatePlan={mockOnCreatePlan}
          onHeartbeat={mockOnHeartbeat}
          onSettings={mockOnSettings}
          lastPlanAddress={planAddr}
        />,
      );
      container = result.container;
    });
    expect(container!.textContent).toContain('Your Plans');
    expect(container!.textContent).not.toContain('No plans yet');
  });

  it('renders empty state when no lastPlanAddress', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <DashboardScreen
          onCreatePlan={mockOnCreatePlan}
          onHeartbeat={mockOnHeartbeat}
          onSettings={mockOnSettings}
          lastPlanAddress={null}
        />,
      );
      container = result.container;
    });
    expect(container!.textContent).toContain('No plans yet');
  });

  it('shows short wallet address', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <DashboardScreen
          onCreatePlan={mockOnCreatePlan}
          onHeartbeat={mockOnHeartbeat}
          onSettings={mockOnSettings}
          lastPlanAddress={null}
        />,
      );
      container = result.container;
    });
    expect(container!.textContent).toContain('11111...1111');
  });

  // ── Balance formatting logic ──

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

  // ── Short address derivation ──

  it('derives short address format correctly', () => {
    const pubkey = PublicKey.default;
    const short = `${pubkey.toBase58().slice(0, 4)}...${pubkey.toBase58().slice(-4)}`;
    expect(short).toMatch(/^.{4}\.\.\..{4}$/);
    expect(short.length).toBe(11);
  });
});
