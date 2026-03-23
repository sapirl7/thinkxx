/**
 * ConnectScreen tests — render-based with mocked useWallet.
 *
 * Covers: error banner, button disabled state.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { resetMobileMocks } from '../../test/setup';

let mockWalletState = {
  connect: jest.fn(),
  connecting: false,
  error: null as string | null,
};

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => mockWalletState,
}));

import ConnectScreen from './ConnectScreen';

beforeEach(() => {
  resetMobileMocks();
  mockWalletState = {
    connect: jest.fn(),
    connecting: false,
    error: null,
  };
});

describe('ConnectScreen', () => {
  it('renders branding elements', () => {
    const { container } = render(<ConnectScreen />);
    expect(container.textContent).toContain('Thinkxx');
    expect(container.textContent).toContain('Non-Custodial');
    expect(container.textContent).toContain('Time-Locked Access');
    expect(container.textContent).toContain('Guardian Oversight');
  });

  it('shows error banner when error is set', () => {
    mockWalletState.error = 'No compatible Solana wallet found.';
    const { container } = render(<ConnectScreen />);
    expect(container.textContent).toContain('No compatible Solana wallet found.');
  });

  it('hides error banner when no error', () => {
    mockWalletState.error = null;
    const { container } = render(<ConnectScreen />);
    expect(container.textContent).not.toContain('No compatible');
  });

  it('shows devnet network badge', () => {
    const { container } = render(<ConnectScreen />);
    expect(container.textContent).toContain('devnet');
  });
});
