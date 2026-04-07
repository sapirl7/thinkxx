/**
 * Thin persistence wrapper for mobile session state.
 *
 * Uses AsyncStorage for non-sensitive state and SecureStore for wallet session secrets.
 * In test/web environments, falls back to localStorage or an in-memory map.
 */

type BasicStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const memoryStorage = new Map<string, string>();

function hasLocalStorage(): boolean {
  return typeof globalThis !== 'undefined' && 'localStorage' in globalThis;
}

function getLocalStorageFallback(): BasicStorage {
  return {
    async getItem(key: string): Promise<string | null> {
      if (hasLocalStorage()) {
        return globalThis.localStorage.getItem(key);
      }
      return memoryStorage.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      if (hasLocalStorage()) {
        globalThis.localStorage.setItem(key, value);
        return;
      }
      memoryStorage.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      if (hasLocalStorage()) {
        globalThis.localStorage.removeItem(key);
        return;
      }
      memoryStorage.delete(key);
    },
  };
}

function getAsyncStorage(): BasicStorage {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    const storage = (mod.default ?? mod) as BasicStorage;
    return storage;
  } catch {
    return getLocalStorageFallback();
  }
}

function getSecureStorage(): BasicStorage {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const secureStore = require('expo-secure-store') as {
      getItemAsync(key: string): Promise<string | null>;
      setItemAsync(key: string, value: string): Promise<void>;
      deleteItemAsync(key: string): Promise<void>;
    };
    return {
      getItem: secureStore.getItemAsync,
      setItem: secureStore.setItemAsync,
      removeItem: secureStore.deleteItemAsync,
    };
  } catch {
    return getLocalStorageFallback();
  }
}

const asyncStorage = getAsyncStorage();
const secureStorage = getSecureStorage();

export async function loadJson<T>(key: string, secure = false): Promise<T | null> {
  const raw = await (secure ? secureStorage : asyncStorage).getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveJson(key: string, value: unknown, secure = false): Promise<void> {
  await (secure ? secureStorage : asyncStorage).setItem(key, JSON.stringify(value));
}

export async function removeStoredValue(key: string, secure = false): Promise<void> {
  await (secure ? secureStorage : asyncStorage).removeItem(key);
}
