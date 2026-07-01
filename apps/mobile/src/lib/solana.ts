import { PublicKey } from '@solana/web3.js';

/** True if `value` is a valid base58 Solana public key. */
export function isValidPublicKey(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new PublicKey(value.trim());
    return true;
  } catch {
    return false;
  }
}

/** Solana Explorer URL for an account address (devnet). */
export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

/** Solana Explorer URL for a transaction signature (devnet). */
export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
