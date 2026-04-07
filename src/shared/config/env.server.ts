const requireEnv = (key: string): string => {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required env variable: ${key}`);
  }

  return value;
};

const parseInteger = (
  rawValue: string | undefined,
  fallback: number,
  key: string
): number => {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric env variable: ${key}`);
  }

  return parsed;
};

const parseBoolean = (
  rawValue: string | undefined,
  fallback: boolean
): boolean => {
  if (!rawValue) {
    return fallback;
  }

  return rawValue === 'true';
};

const normalizeBasePath = (value: string): string => {
  const normalized = value.trim().replace(/^\/+|\/+$/g, '');

  return normalized.length > 0 ? `/${normalized}` : '';
};

export const threeXUiConfig = {
  protocol: requireEnv('THREE_X_UI_PROTOCOL'),
  host: requireEnv('THREE_X_UI_HOST'),
  port: parseInteger(process.env.THREE_X_UI_PORT, 443, 'THREE_X_UI_PORT'),
  clientPublicHost:
    process.env.THREE_X_UI_CLIENT_PUBLIC_HOST?.trim() ||
    requireEnv('THREE_X_UI_HOST'),
  webBasePath: normalizeBasePath(requireEnv('THREE_X_UI_WEB_BASE_PATH')),
  username: requireEnv('THREE_X_UI_USERNAME'),
  password: requireEnv('THREE_X_UI_PASSWORD'),
  twoFactorCode: process.env.THREE_X_UI_TWO_FACTOR_CODE ?? '',
  includeEmptyTwoFactor: parseBoolean(
    process.env.THREE_X_UI_INCLUDE_EMPTY_TWO_FACTOR,
    false
  ),
  allowInsecureTls: parseBoolean(
    process.env.THREE_X_UI_ALLOW_INSECURE_TLS,
    true
  ),
  timeoutMs: parseInteger(
    process.env.THREE_X_UI_TIMEOUT_MS,
    10000,
    'THREE_X_UI_TIMEOUT_MS'
  ),
} as const;

export const yooKassaConfig = {
  shopId: requireEnv('YOOKASSA_SHOP_ID'),
  token:
    process.env.YOOKASSA_TOKEN?.trim() ||
    process.env.YOOKASSA_API_TOKEN?.trim() ||
    requireEnv('YOOKASSA_TOKEN'),
  redirectTo: requireEnv('YOOKASSA_REDIRECT_TO'),
  apiBaseUrl: process.env.YOOKASSA_API_BASE_URL?.trim() || 'https://api.yookassa.ru/v3',
} as const;

export const authConfig = {
  cookieName: process.env.AUTH_COOKIE_NAME?.trim() || 'vpn_shop_auth',
  jwtSecret: requireEnv('AUTH_JWT_SECRET'),
  jwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN?.trim() || '30d',
} as const;

export const dataSecurityConfig = {
  databaseUrl: requireEnv('DATABASE_URL'),
  encryptionKey: requireEnv('APP_DATA_ENCRYPTION_KEY'),
  adminDefaultLogin:
    process.env.ADMIN_DEFAULT_LOGIN?.trim().toLowerCase() || 'admin',
  adminDefaultPassword: process.env.ADMIN_DEFAULT_PASSWORD?.trim() || null,
} as const;

export const buildThreeXUiOrigin = (): string =>
  `${threeXUiConfig.protocol}://${threeXUiConfig.host}:${threeXUiConfig.port}`;

export const buildThreeXUiUrl = (path: string, search = ''): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${buildThreeXUiOrigin()}${threeXUiConfig.webBasePath}${normalizedPath}${search}`;
};
