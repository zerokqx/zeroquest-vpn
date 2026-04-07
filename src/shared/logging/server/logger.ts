import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { serializeForLog, serializeUnknownError } from '../shared/serialize';

export type ServerLogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ServerLogEntry {
  data?: unknown;
  error?: unknown;
  event: string;
  level: ServerLogLevel;
  pid: number;
  scope: string;
  timestamp: string;
}

interface LoggerRuntimeState {
  queue: Promise<void>;
}

const runtimeStateSymbol = Symbol.for('vpn-shop.server-logger.runtime-state');
const globalRuntimeState = globalThis as typeof globalThis & {
  [runtimeStateSymbol]?: LoggerRuntimeState;
};
const runtimeState = (globalRuntimeState[runtimeStateSymbol] ??= {
  queue: Promise.resolve(),
}) satisfies LoggerRuntimeState;
const LOG_DIRECTORY = path.join(process.cwd(), 'logs', 'backend');

const getLogFilePath = (): string =>
  path.join(LOG_DIRECTORY, `${new Date().toISOString().slice(0, 10)}.log`);

const writeLogLine = (line: string): void => {
  runtimeState.queue = runtimeState.queue
    .then(async () => {
      await mkdir(LOG_DIRECTORY, { recursive: true });
      await appendFile(getLogFilePath(), line, 'utf8');
    })
    .catch((error) => {
      console.error('[server-logger] unable to write log line', error);
    });
};

const printToConsole = (entry: ServerLogEntry): void => {
  const message = `[server][${entry.scope}] ${entry.event}`;
  const payload = {
    data: entry.data,
    error: entry.error,
    pid: entry.pid,
    timestamp: entry.timestamp,
  };

  switch (entry.level) {
    case 'debug':
      console.debug(message, payload);
      return;
    case 'warn':
      console.warn(message, payload);
      return;
    case 'error':
      console.error(message, payload);
      return;
    default:
      console.info(message, payload);
  }
};

export const logServerEvent = (
  level: ServerLogLevel,
  scope: string,
  event: string,
  data?: unknown
): void => {
  const entry: ServerLogEntry = {
    data: data === undefined ? undefined : serializeForLog(data),
    event,
    level,
    pid: process.pid,
    scope,
    timestamp: new Date().toISOString(),
  };

  printToConsole(entry);
  writeLogLine(`${JSON.stringify(entry)}\n`);
};

export const logServerError = (
  scope: string,
  event: string,
  error: unknown,
  data?: unknown
): void => {
  const entry: ServerLogEntry = {
    data: data === undefined ? undefined : serializeForLog(data),
    error: serializeUnknownError(error),
    event,
    level: 'error',
    pid: process.pid,
    scope,
    timestamp: new Date().toISOString(),
  };

  printToConsole(entry);
  writeLogLine(`${JSON.stringify(entry)}\n`);
};
