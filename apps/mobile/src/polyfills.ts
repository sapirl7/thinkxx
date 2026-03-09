/**
 * React Native polyfills for Solana web3.js compatibility.
 * Must be imported BEFORE any @solana/* or crypto-related packages.
 */

// 1. getRandomValues — required by @noble/hashes, web3.js
import 'react-native-get-random-values';

// 2. Buffer — required by web3.js, bs58, borsh
import { Buffer } from 'buffer';

type GlobalAny = typeof globalThis & {
  Buffer?: typeof Buffer;
};

const g = globalThis as GlobalAny;
if (!g.Buffer) {
  g.Buffer = Buffer;
}
