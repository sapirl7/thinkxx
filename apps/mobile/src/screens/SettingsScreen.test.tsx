/**
 * SettingsScreen tests — render-based.
 *
 * Covers: sections render, version display, disconnect button, Coming Soon badges,
 * wallet metadata from provider.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { resetMobileMocks } from '../../test/setup';

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => ({
    connected: true,
    disconnect: jest.fn(),
    shortAddress: '11111...1111',
    walletLabel: 'Phantom',
    rpcEndpoint: 'https://api.devnet.solana.com',
  }),
}));

import SettingsScreen from './SettingsScreen';

const onBack = jest.fn();

beforeEach(() => {
  resetMobileMocks();
  onBack.mockReset();
});

describe('SettingsScreen', () => {
  it('renders all settings sections', () => {
    const { container } = render(<SettingsScreen onBack={onBack} />);
    expect(container.textContent).toContain('WALLET');
    expect(container.textContent).toContain('CURRENT OPERATOR SURFACE');
    expect(container.textContent).toContain('PLANNED CAPABILITIES');
    expect(container.textContent).toContain('APP');
  });

  it('shows version info', () => {
    const { container } = render(<SettingsScreen onBack={onBack} />);
    expect(container.textContent).toContain('Version');
  });

  it('shows network as Devnet', () => {
    const { container } = render(<SettingsScreen onBack={onBack} />);
    expect(container.textContent).toContain('Devnet');
  });

  it('renders disconnect button', () => {
    const { container } = render(<SettingsScreen onBack={onBack} />);
    expect(container.textContent).toContain('Disconnect Wallet');
  });

  it('shows Coming Soon for unimplemented features', () => {
    const { container } = render(<SettingsScreen onBack={onBack} />);
    expect(container.textContent).toContain('Coming Soon');
  });

  it('shows wallet label from provider', () => {
    const { container } = render(<SettingsScreen onBack={onBack} />);
    expect(container.textContent).toContain('Phantom');
  });

  it('shows RPC endpoint from provider', () => {
    const { container } = render(<SettingsScreen onBack={onBack} />);
    expect(container.textContent).toContain('api.devnet.solana.com');
  });

  it('shows app identity scheme and program info', () => {
    const { container } = render(<SettingsScreen onBack={onBack} />);
    expect(container.textContent).toContain('thinkxx://app');
    expect(container.textContent).toContain('Devnet program');
  });
});
