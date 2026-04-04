import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AppDb } from './types';

const DB_FILE_PATH = join(process.cwd(), 'data', 'app-db.json');
const INITIAL_DB: AppDb = {
  users: [],
  accessRecords: [],
};

const writeQueueSymbol = Symbol.for('vpn-shop.app-db.write-queue');
const globalState = globalThis as typeof globalThis & {
  [writeQueueSymbol]?: Promise<void>;
};

const ensureDbFile = async (): Promise<void> => {
  await mkdir(dirname(DB_FILE_PATH), { recursive: true });

  try {
    await readFile(DB_FILE_PATH, 'utf-8');
  } catch {
    await writeFile(DB_FILE_PATH, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
  }
};

export const readDb = async (): Promise<AppDb> => {
  await ensureDbFile();

  const raw = await readFile(DB_FILE_PATH, 'utf-8');

  return JSON.parse(raw) as AppDb;
};

export const mutateDb = async <T>(
  mutator: (db: AppDb) => T | Promise<T>
): Promise<T> => {
  const previousQueue = globalState[writeQueueSymbol] ?? Promise.resolve();

  let releaseQueue!: () => void;
  const nextQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });
  globalState[writeQueueSymbol] = previousQueue.then(() => nextQueue);

  await previousQueue;

  try {
    const db = await readDb();
    const result = await mutator(db);

    await writeFile(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');

    return result;
  } finally {
    releaseQueue();
  }
};
