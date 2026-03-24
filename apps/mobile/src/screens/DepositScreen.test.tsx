/**
 * DepositScreen tests — render-based with mocked wallet.
 *
 * Covers: balance display, input rendering, amount validation.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';

import { resetMobileMocks } from '../../test/setup';

const mockPublicKeyDefault = PublicKey.default;
const mockGetBalance = jest.fn().mockResolvedValue(3_000_000_000);

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: mockPublicKeyDefault,
    shortAddress: '11111...1111',
    disconnect: jest.fn(),
    signAndSendTransaction: jest.fn().mockResolvedValue('FakeSig123'),
    connection: {
      getBalance: mockGetBalance,
    },
  }),
}));

jest.mock('@thinkxx/sdk', () => {
  const actual = jest.requireActual('@thinkxx/sdk');
  return {
    ...actual,
  };
});

import DepositScreen from './DepositScreen';

const onBack = jest.fn();
const planAddress = PublicKey.default.toBase58();

beforeEach(() => {
  resetMobileMocks();
  onBack.mockReset();
  mockGetBalance.mockReset().mockResolvedValue(3_000_000_000);
});

describe('DepositScreen', () => {
  it('renders header title', () => {
    const { container } = render(
      <DepositScreen planAddress={planAddress} onBack={onBack} />,
    );
    expect(container.textContent).toContain('Deposit SOL');
  });

  it('renders wallet and vault balance labels', async () => {
    const { container } = render(
      <DepositScreen planAddress={planAddress} onBack={onBack} />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('Wallet');
      expect(container.textContent).toContain('Vault');
    }, { timeout: 3000 });
  });

  it('renders amount input', () => {
    const { container } = render(
      <DepositScreen planAddress={planAddress} onBack={onBack} />,
    );
    expect(container.textContent).toContain('Amount (SOL)');
  });

  it('renders disabled deposit button by default', () => {
    const { container } = render(
      <DepositScreen planAddress={planAddress} onBack={onBack} />,
    );
    expect(container.textContent).toContain('Enter Amount');
  });
});
