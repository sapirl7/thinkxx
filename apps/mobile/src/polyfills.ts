declare const require: (moduleName: string) => {
  Buffer: {
    from: (...args: unknown[]) => unknown;
    alloc: (...args: unknown[]) => unknown;
  };
};

const { Buffer } = require('buffer');

type GlobalWithBuffer = typeof globalThis & {
  Buffer?: typeof Buffer;
};

const globalWithBuffer = globalThis as GlobalWithBuffer;

if (!globalWithBuffer.Buffer) {
  globalWithBuffer.Buffer = Buffer;
}
