/**
 * @thinkxx/sdk — RN-safe byte helpers.
 *
 * Manual little-endian readers/writers for i64/u64 values.
 * Avoids Node-only Buffer BigInt helpers that are not consistently available
 * in React Native / Hermes runtimes.
 */

const BYTE_MASK = 0xffn;
const TWO_POW_64 = 1n << 64n;
const TWO_POW_63 = 1n << 63n;

export function writeU64LE(target: Uint8Array, offset: number, value: bigint): void {
  let remaining = BigInt.asUintN(64, value);

  for (let index = 0; index < 8; index += 1) {
    target[offset + index] = Number(remaining & BYTE_MASK);
    remaining >>= 8n;
  }
}

export function writeI64LE(target: Uint8Array, offset: number, value: bigint): void {
  writeU64LE(target, offset, BigInt.asUintN(64, value));
}

export function readU64LE(source: Uint8Array, offset: number): bigint {
  let value = 0n;

  for (let index = 7; index >= 0; index -= 1) {
    value <<= 8n;
    value |= BigInt(source[offset + index] ?? 0);
  }

  return value;
}

export function readI64LE(source: Uint8Array, offset: number): bigint {
  const raw = readU64LE(source, offset);
  return raw >= TWO_POW_63 ? raw - TWO_POW_64 : raw;
}

export function readU32LE(source: Uint8Array, offset: number): number {
  return (
    (source[offset] ?? 0) |
    ((source[offset + 1] ?? 0) << 8) |
    ((source[offset + 2] ?? 0) << 16) |
    ((source[offset + 3] ?? 0) << 24)
  ) >>> 0;
}

export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}
