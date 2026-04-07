const MAX_DEPTH = 4;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

const serializeError = (error: Error) => ({
  message: error.message,
  name: error.name,
  stack: error.stack ?? null,
});

const serializeInternal = (
  value: unknown,
  depth: number,
  seen: WeakSet<object>
): unknown => {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (typeof value === 'function') {
    return `[Function ${value.name || 'anonymous'}]`;
  }

  if (depth >= MAX_DEPTH) {
    if (Array.isArray(value)) {
      return `[Array(${value.length})]`;
    }

    if (value && typeof value === 'object') {
      return '[Object]';
    }
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);
    const serialized = value.map((item) => serializeInternal(item, depth + 1, seen));
    seen.delete(value);

    return serialized;
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    if (!isPlainObject(value)) {
      return String(value);
    }

    const serialized = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        serializeInternal(item, depth + 1, seen),
      ])
    );

    seen.delete(value);

    return serialized;
  }

  return String(value);
};

export const serializeForLog = (value: unknown): unknown =>
  serializeInternal(value, 0, new WeakSet<object>());

export const serializeUnknownError = (error: unknown): unknown =>
  error instanceof Error ? serializeError(error) : serializeForLog(error);
