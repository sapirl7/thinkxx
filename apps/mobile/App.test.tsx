/**
 * App.test.tsx — tests for AppNavigator wallet-change reset logic.
 *
 * Mocks useWallet with controllable publicKey, uses rerender
 * to simulate wallet switch, verifies state resets.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';

import { resetMobileMocks } from './test/setup';
import { persistPlanSession } from './src/state/plan-session';

let mockCurrentPublicKey: PublicKey | null = null;
let mockCurrentConnected = false;

jest.mock('./src/providers/WalletProvider', () => ({
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useWallet: () => ({
    connected: mockCurrentConnected,
    publicKey: mockCurrentPublicKey,
    hydrated: true,
    connecting: false,
    error: null,
    connection: {},
    connect: jest.fn(),
    disconnect: jest.fn(),
    signAndSendTransaction: jest.fn(),
    shortAddress: mockCurrentPublicKey ? `${mockCurrentPublicKey.toBase58().slice(0, 4)}...` : null,
  }),
}));

// Mock screens to avoid pulling in full component trees
jest.mock('./src/screens/ConnectScreen', () => () => <div data-testid="connect-screen">Connect</div>);
jest.mock('./src/screens/DashboardScreen', () => (props: any) => (
  <div data-testid="dashboard-screen">
    Dashboard
    <span data-testid="selected-plan">{props.selectedPlanAddress ?? 'none'}</span>
    <span data-testid="created-plan">{props.lastCreatedPlanAddress ?? 'none'}</span>
  </div>
));
jest.mock('./src/screens/CreatePlanScreen', () => (props: any) => (
  <div data-testid="create-plan-screen">
    <button onClick={() => props.onCreated('plan-addr-123')}>create</button>
  </div>
));
jest.mock('./src/screens/HeartbeatScreen', () => () => <div data-testid="heartbeat-screen">HB</div>);
jest.mock('./src/screens/PlanDetailScreen', () => () => <div>PlanDetail</div>);
jest.mock('./src/screens/GuardiansScreen', () => () => <div>Guardians</div>);
jest.mock('./src/screens/SettingsScreen', () => () => <div>Settings</div>);

import App from './App';

beforeEach(() => {
  resetMobileMocks();
  mockCurrentPublicKey = null;
  mockCurrentConnected = false;
});

describe('App navigator', () => {
  it('shows ConnectScreen when not connected', async () => {
    mockCurrentConnected = false;
    mockCurrentPublicKey = null;

    const { findByTestId } = render(<App />);
    expect(await findByTestId('connect-screen')).toBeTruthy();
  });

  it('shows DashboardScreen when connected', async () => {
    mockCurrentConnected = true;
    mockCurrentPublicKey = PublicKey.default;

    const { findByTestId } = render(<App />);
    expect(await findByTestId('dashboard-screen')).toBeTruthy();
  });

  it('resets selected plan context when wallet address changes', async () => {
    const walletA = PublicKey.unique();
    const walletB = PublicKey.unique();
    const storedPlanAddress = PublicKey.unique().toBase58();

    await persistPlanSession({
      walletOwner: walletA.toBase58(),
      selectedPlanPda: storedPlanAddress,
      lastCreatedPlanPda: storedPlanAddress,
      knownPlanPdas: [storedPlanAddress],
    });

    mockCurrentConnected = true;
    mockCurrentPublicKey = walletA;

    const { findByTestId, getByTestId, rerender } = render(<App />);
    expect(await findByTestId('dashboard-screen')).toBeTruthy();
    expect(getByTestId('selected-plan').textContent).toBe(storedPlanAddress);
    expect(getByTestId('created-plan').textContent).toBe(storedPlanAddress);

    // Switch wallet
    mockCurrentPublicKey = walletB;
    rerender(<App />);

    await findByTestId('dashboard-screen');

    const selectedPlan = getByTestId('selected-plan');
    const createdPlan = getByTestId('created-plan');
    expect(selectedPlan.textContent).toBe('none');
    expect(createdPlan.textContent).toBe('none');
  });

  it('does NOT reset when same wallet re-renders', async () => {
    const wallet = PublicKey.default;
    mockCurrentConnected = true;
    mockCurrentPublicKey = wallet;

    const { findByTestId, getByTestId, rerender } = render(<App />);
    expect(await findByTestId('dashboard-screen')).toBeTruthy();

    // Re-render with same wallet — no reset
    rerender(<App />);
    expect(getByTestId('dashboard-screen')).toBeTruthy();
  });
});
