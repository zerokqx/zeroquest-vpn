FROM oven/bun:1 AS app

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time defaults so Next/Prisma can compile inside the image.
ENV AUTH_COOKIE_NAME=vpn_shop_auth
ENV AUTH_JWT_SECRET=build-secret-key-change-me
ENV AUTH_JWT_EXPIRES_IN=30d
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/vpn_shop?schema=public
ENV APP_DATA_ENCRYPTION_KEY=build-encryption-key-change-me-32-chars
ENV ADMIN_DEFAULT_LOGIN=admin
ENV THREE_X_UI_PROTOCOL=https
ENV THREE_X_UI_HOST=127.0.0.1
ENV THREE_X_UI_PORT=443
ENV THREE_X_UI_WEB_BASE_PATH=/
ENV THREE_X_UI_USERNAME=build-user
ENV THREE_X_UI_PASSWORD=build-password
ENV THREE_X_UI_TWO_FACTOR_CODE=
ENV THREE_X_UI_INCLUDE_EMPTY_TWO_FACTOR=false
ENV THREE_X_UI_ALLOW_INSECURE_TLS=true
ENV THREE_X_UI_TIMEOUT_MS=10000
ENV THREE_X_UI_CLIENT_PUBLIC_HOST=127.0.0.1
ENV YOOKASSA_TOKEN=build-yookassa-token
ENV YOOKASSA_SHOP_ID=build-yookassa-shop-id
ENV YOOKASSA_REDIRECT_TO=http://127.0.0.1:5901/dashboard

COPY . .

RUN bun run build

EXPOSE 3000

CMD ["sh", "scripts/docker-entrypoint.sh"]
