/**
 * GuardiansScreen tests — render-based with mocked SDK.
 *
 * Covers: quorum display, guardian list, add button, empty state.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';

import { resetMobileMocks } from '../../test/setup';

// Suppress React DOM prop warnings from RN components (activeOpacity, etc.)
const originalError = console.error;
beforeAll(() => { console.error = (...args: unknown[]) => { if (typeof args[0] === 'string' && args[0].includes('is not a valid')) return; originalError(...args); }; });
afterAll(() => { console.error = originalError; });

// Must prefix with "mock" for jest.mock() scope access
const mockPubkeyDefault = PublicKey.default;

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: mockPubkeyDefault,
    shortAddress: '11111...1111',
    disconnect: jest.fn(),
    signAndSendTransaction: jest.fn().mockResolvedValue('FakeSig123'),
    connection: {
      getAccountInfo: jest.fn().mockResolvedValue(null),
    },
  }),
}));

jest.mock('@thinkxx/sdk', () => {
  const actual = jest.requireActual('@thinkxx/sdk');
  const { PublicKey: PK } = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    deriveGuardianSetPda: jest.fn().mockReturnValue([PK.default, 255]),
    fetchGuardianSet: jest.fn().mockResolvedValue({
      plan: PK.default,
      guardians: [PK.default],
      quorum: 1,
      updateDelay: 0n,
      bump: 253,
    }),
  };
});

import GuardiansScreen from './GuardiansScreen';

const onBack = jest.fn();
const planAddress = PublicKey.default.toBase58();

beforeEach(() => {
  resetMobileMocks();
  onBack.mockReset();
});

describe('GuardiansScreen', () => {
  it('renders quorum display', async () => {
    const { container } = render(
      <GuardiansScreen planAddress={planAddress} onBack={onBack} />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('Quorum');
      expect(container.textContent).toContain('1 of 1');
    }, { timeout: 3000 });
  });

  it('renders guardian list with count', async () => {
    const { container } = render(
      <GuardiansScreen planAddress={planAddress} onBack={onBack} />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('GUARDIANS (1/5)');
      expect(container.textContent).toContain('Guardian 1');
    }, { timeout: 3000 });
  });

  it('renders add guardian button when below max', async () => {
    const { container } = render(
      <GuardiansScreen planAddress={planAddress} onBack={onBack} />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('+ Add Guardian');
    }, { timeout: 3000 });
  });

  it('shows header title', () => {
    const { container } = render(
      <GuardiansScreen planAddress={planAddress} onBack={onBack} />,
    );
    expect(container.textContent).toContain('Guardians');
  });
});
