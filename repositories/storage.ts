"use client";

type StorageAdapter = {
  getItem: (key: string) => string | null;
  isAvailable: () => boolean;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

type StorageSerializer = {
  parse: (raw: string) => unknown;
  stringify: (value: unknown) => string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const jsonStorageSerializer: StorageSerializer = {
  parse: (raw) => JSON.parse(raw) as unknown,
  stringify: (value) => JSON.stringify(value),
};

const browserLocalStorageAdapter: StorageAdapter = {
  getItem: (key) => window.localStorage.getItem(key),
  isAvailable: () =>
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined",
  removeItem: (key) => {
    window.localStorage.removeItem(key);
  },
  setItem: (key, value) => {
    window.localStorage.setItem(key, value);
  },
};

let activeStorageAdapter: StorageAdapter = browserLocalStorageAdapter;
let activeStorageSerializer: StorageSerializer = jsonStorageSerializer;

const isAdapterAvailable = (adapter: StorageAdapter) => {
  try {
    return adapter.isAvailable();
  } catch {
    return false;
  }
};

const readRawStorageValue = (key: string) => {
  if (!isAdapterAvailable(activeStorageAdapter)) {
    return null;
  }

  try {
    return activeStorageAdapter.getItem(key);
  } catch {
    return null;
  }
};

const writeRawStorageValue = (key: string, value: string) => {
  if (!isAdapterAvailable(activeStorageAdapter)) {
    return;
  }

  try {
    activeStorageAdapter.setItem(key, value);
  } catch {
    // Ignore storage backend write errors to preserve current repository behavior.
  }
};

const removeRawStorageValue = (key: string) => {
  if (!isAdapterAvailable(activeStorageAdapter)) {
    return;
  }

  try {
    activeStorageAdapter.removeItem(key);
  } catch {
    // Ignore storage backend delete errors to preserve current repository behavior.
  }
};

export const configureStorageBackend = (
  adapter: StorageAdapter,
  serializer: StorageSerializer = jsonStorageSerializer
) => {
  activeStorageAdapter = adapter;
  activeStorageSerializer = serializer;
};

export const resetStorageBackend = () => {
  activeStorageAdapter = browserLocalStorageAdapter;
  activeStorageSerializer = jsonStorageSerializer;
};

export const canUseStorage = () => isAdapterAvailable(activeStorageAdapter);

export const readStorageValue = (key: string): unknown => {
  const raw = readRawStorageValue(key);

  if (!raw) {
    return null;
  }

  try {
    return activeStorageSerializer.parse(raw);
  } catch {
    return null;
  }
};

export const writeStorageValue = (key: string, value: unknown) => {
  try {
    writeRawStorageValue(key, activeStorageSerializer.stringify(value));
  } catch {
    // Ignore serialization failures to preserve current repository behavior.
  }
};

export const removeStorageValue = (key: string) => {
  removeRawStorageValue(key);
};

export const isObjectRecord = isRecord;
