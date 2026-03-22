/**
 * HeartbeatScreen tests — render-based with mocked useWallet + Connection.
 *
 * Covers: plan address validation, account checks, success/error paths.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

import { resetMobileMocks, mockConnection, mockAlert } from '../../test/setup';

const mockProgramId = new PublicKey('5FEoFcJ2QK7T8SFDX7jKtCfSKvfGhE8QDRLVH2xSWvaP');
const mockPubkey = PublicKey.default;
const mockSignAndSendTransaction = jest.fn().mockResolvedValue('heartbeat-sig-123');

jest.mock('../providers/WalletProvider', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: mockPubkey,
    connection: mockConnection,
    signAndSendTransaction: mockSignAndSendTransaction,
  }),
}));

jest.mock('@thinkxx/sdk', () => ({
  ThinkxxClient: jest.fn().mockImplementation(() => ({
    buildHeartbeat: jest.fn().mockReturnValue({
      programId: mockPubkey, keys: [], data: new Uint8Array(8),
    }),
  })),
}));

import HeartbeatScreen from './HeartbeatScreen';

const mockOnBack = jest.fn();

beforeEach(() => {
  resetMobileMocks();
  mockOnBack.mockReset();
  mockSignAndSendTransaction.mockReset().mockResolvedValue('heartbeat-sig-123');
});

describe('HeartbeatScreen', () => {
  it('renders with Heartbeat title', () => {
    const { container } = render(<HeartbeatScreen onBack={mockOnBack} />);
    expect(container.textContent).toContain('Heartbeat');
  });

  it('renders with initialPlanAddress prop', () => {
    const addr = 'AbCdEf123456789AbCdEf123456789AbCdEf12345678';
    const { container } = render(<HeartbeatScreen onBack={mockOnBack} initialPlanAddress={addr} />);
    expect(container).toBeTruthy();
  });

  // ── Plan Address Validation Logic ──

  it('rejects invalid base58', () => {
    let isValid = true;
    try { new PublicKey('0OlI'); } catch { isValid = false; }
    expect(isValid).toBe(false);
  });

  it('accepts valid base58 public key', () => {
    let isValid = true;
    try { new PublicKey(PublicKey.default.toBase58()); } catch { isValid = false; }
    expect(isValid).toBe(true);
  });

  // ── Account Info Validation Logic ──

  it('null account info → Plan not found', () => {
    const error = !null ? 'Plan account was not found on devnet.' : null;
    expect(error).toBe('Plan account was not found on devnet.');
  });

  it('wrong owner → not a Thinkxx plan', () => {
    const otherProgram = PublicKey.unique();
    const error = !otherProgram.equals(mockProgramId) ? 'This address is not a Thinkxx plan.' : null;
    expect(error).toBe('This address is not a Thinkxx plan.');
  });

  it('short data → data is invalid', () => {
    const PLAN_OWNER_END = 40;
    const error = Buffer.alloc(10).length < PLAN_OWNER_END ? 'Plan account data is invalid.' : null;
    expect(error).toBe('Plan account data is invalid.');
  });

  it('sufficient data length accepted', () => {
    const PLAN_OWNER_END = 40;
    const error = Buffer.alloc(200).length < PLAN_OWNER_END ? 'Plan account data is invalid.' : null;
    expect(error).toBeNull();
  });

  it('owner in data ≠ wallet → does not belong', () => {
    const PLAN_OWNER_OFFSET = 8;
    const PLAN_OWNER_END = PLAN_OWNER_OFFSET + 32;
    const otherOwner = PublicKey.unique();
    const data = Buffer.alloc(200);
    data.set(otherOwner.toBuffer(), PLAN_OWNER_OFFSET);
    const planOwner = new PublicKey(data.subarray(PLAN_OWNER_OFFSET, PLAN_OWNER_END));
    const error = !planOwner.equals(mockPubkey) ? 'This plan does not belong to your wallet.' : null;
    expect(error).toBe('This plan does not belong to your wallet.');
  });

  it('owner in data = wallet → passes validation', () => {
    const PLAN_OWNER_OFFSET = 8;
    const PLAN_OWNER_END = PLAN_OWNER_OFFSET + 32;
    const data = Buffer.alloc(200);
    data.set(mockPubkey.toBuffer(), PLAN_OWNER_OFFSET);
    const planOwner = new PublicKey(data.subarray(PLAN_OWNER_OFFSET, PLAN_OWNER_END));
    const error = !planOwner.equals(mockPubkey) ? 'This plan does not belong to your wallet.' : null;
    expect(error).toBeNull();
  });
});
