/**
 * SettingsScreen tests — render-based with mocked useWallet.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';

import { resetMobileMocks } from '../../test/setup';

const mockPublicKey = PublicKey.default;

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => ({ publicKey: mockPublicKey }),
}));

import SettingsScreen from './SettingsScreen';

const onBack = jest.fn();
const onDisconnect = jest.fn();

beforeEach(() => {
  resetMobileMocks();
  onBack.mockReset();
  onDisconnect.mockReset();
});

describe('SettingsScreen', () => {
  it('renders the settings sections', () => {
    const { container } = render(<SettingsScreen onBack={onBack} onDisconnect={onDisconnect} />);
    expect(container.textContent).toContain('Wallet');
    expect(container.textContent).toContain('Notifications');
    expect(container.textContent).toContain('About');
    expect(container.textContent).toContain('Danger zone');
  });

  it('shows version info', () => {
    const { container } = render(<SettingsScreen onBack={onBack} onDisconnect={onDisconnect} />);
    expect(container.textContent).toContain('0.3.0');
  });

  it('shows the network as Devnet', () => {
    const { container } = render(<SettingsScreen onBack={onBack} onDisconnect={onDisconnect} />);
    expect(container.textContent).toContain('Devnet');
  });

  it('renders the disconnect action', () => {
    const { container } = render(<SettingsScreen onBack={onBack} onDisconnect={onDisconnect} />);
    expect(container.textContent).toContain('Disconnect wallet');
  });
});
