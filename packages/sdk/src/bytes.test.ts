import { describe, expect, it } from 'vitest';
import {
  bytesEqual,
  bytesToHex,
  readI64LE,
  readU32LE,
  readU64LE,
  writeI64LE,
  writeU64LE,
} from './bytes';

describe('bytes helpers', () => {
  it('roundtrips u64 values', () => {
    const values = [0n, 1n, 86_400n, 4_294_967_296n, BigInt(Date.now())];

    for (const value of values) {
      const bytes = new Uint8Array(8);
      writeU64LE(bytes, 0, value);
      expect(readU64LE(bytes, 0)).toBe(value);
    }
  });

  it('roundtrips i64 values', () => {
    const values = [0n, -1n, 86_400n, -86_400n];

    for (const value of values) {
      const bytes = new Uint8Array(8);
      writeI64LE(bytes, 0, value);
      expect(readI64LE(bytes, 0)).toBe(value);
    }
  });

  it('reads u32 little-endian values', () => {
    const bytes = Uint8Array.from([0x78, 0x56, 0x34, 0x12]);
    expect(readU32LE(bytes, 0)).toBe(0x12345678);
  });

  it('compares and stringifies bytes', () => {
    const left = Uint8Array.from([0xde, 0xad, 0xbe, 0xef]);
    const right = Uint8Array.from([0xde, 0xad, 0xbe, 0xef]);
    const other = Uint8Array.from([0xca, 0xfe, 0xba, 0xbe]);

    expect(bytesEqual(left, right)).toBe(true);
    expect(bytesEqual(left, other)).toBe(false);
    expect(bytesToHex(left)).toBe('deadbeef');
  });
});
