'use client';

import { serializeForLog, serializeUnknownError } from '../shared/serialize';

export type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[frontend]';

const getConsoleMethod = (level: ClientLogLevel) => {
  switch (level) {
    case 'debug':
      return console.debug;
    case 'warn':
      return console.warn;
    case 'error':
      return console.error;
    default:
      return console.info;
  }
};

export const logClientEvent = (
  level: ClientLogLevel,
  scope: string,
  event: string,
  data?: unknown
): void => {
  getConsoleMethod(level)(`${PREFIX}[${scope}] ${event}`, {
    data: data === undefined ? undefined : serializeForLog(data),
    timestamp: new Date().toISOString(),
  });
};

export const logClientError = (
  scope: string,
  event: string,
  error: unknown,
  data?: unknown
): void => {
  console.error(`${PREFIX}[${scope}] ${event}`, {
    data: data === undefined ? undefined : serializeForLog(data),
    error: serializeUnknownError(error),
    timestamp: new Date().toISOString(),
  });
};
