import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

export type KeyRing = {
  keys: Set<string>;
  customerByKey: Map<string, string>;
  generated: boolean;
  persistPath?: string;
};

const DEFAULT_PERSIST = process.env.KEEL_A2A_KEY_FILE ?? ".data/keel-api-key";

export function loadKeyRing(options: {
  apiKey?: string;
  apiKeys?: string[];
  keyMap?: Record<string, string>;
} = {}): KeyRing {
  const keys = new Set<string>();
  const customerByKey = new Map<string, string>();

  const explicit =
    options.apiKey !== undefined ||
    options.apiKeys !== undefined ||
    options.keyMap !== undefined;

  if (explicit) {
    if (options.apiKey) keys.add(options.apiKey);
    for (const key of options.apiKeys ?? []) {
      if (key) keys.add(key);
    }
    for (const [customer, key] of Object.entries(options.keyMap ?? {})) {
      if (key) {
        keys.add(key);
        customerByKey.set(key, customer);
      }
    }
    return { keys, customerByKey, generated: false };
  }

  addIfPresent(keys, process.env.KEEL_A2A_API_KEY);

  for (const key of splitCsv(process.env.KEEL_A2A_API_KEYS)) {
    keys.add(key);
  }

  const filePath = process.env.KEEL_A2A_API_KEYS_FILE;
  if (filePath) {
    loadKeyFile(filePath, keys, customerByKey);
  }

  if (keys.size > 0) {
    return { keys, customerByKey, generated: false };
  }

  if (existsSync(DEFAULT_PERSIST)) {
    const persisted = readFileSync(DEFAULT_PERSIST, "utf8").trim();
    if (persisted) {
      keys.add(persisted);
      return { keys, customerByKey, generated: false, persistPath: DEFAULT_PERSIST };
    }
  }

  const generated = `keel_a2a_${randomBytes(24).toString("hex")}`;
  mkdirSync(dirname(DEFAULT_PERSIST), { recursive: true });
  writeFileSync(DEFAULT_PERSIST, `${generated}\n`, { mode: 0o600 });
  keys.add(generated);
  return {
    keys,
    customerByKey,
    generated: true,
    persistPath: DEFAULT_PERSIST,
  };
}

export function authorizeKey(ring: KeyRing, provided: string | undefined) {
  if (!provided || !ring.keys.has(provided)) {
    return undefined;
  }
  return {
    key: provided,
    customerId: ring.customerByKey.get(provided),
  };
}

function addIfPresent(keys: Set<string>, value: string | undefined) {
  const trimmed = value?.trim();
  if (trimmed) keys.add(trimmed);
}

function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function loadKeyFile(
  filePath: string,
  keys: Set<string>,
  customerByKey: Map<string, string>,
) {
  if (!existsSync(filePath)) {
    throw new Error(`KEEL_A2A_API_KEYS_FILE not found: ${filePath}`);
  }
  const raw = readFileSync(filePath, "utf8").trim();
  if (!raw) return;

  if (raw.startsWith("{")) {
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [customer, key] of Object.entries(parsed)) {
      if (key) {
        keys.add(key);
        customerByKey.set(key, customer);
      }
    }
    return;
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      keys.add(trimmed);
      continue;
    }
    const customer = trimmed.slice(0, eq).trim();
    const key = trimmed.slice(eq + 1).trim();
    if (key) {
      keys.add(key);
      customerByKey.set(key, customer);
    }
  }
}
