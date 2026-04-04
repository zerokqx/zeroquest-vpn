## VPN Shop

Next.js + Bun project for selling VPN access. The first implemented part is a server-side proxy to your `3x-ui` panel.

## Run

Create the local env file if needed:

```bash
cp .env.example .env.local
```

Start development:

```bash
bun dev
```

Open `http://localhost:3000`.

## Docker

Run the whole stack in Docker:

```bash
docker compose up -d --build
```

App will be available on `http://localhost:5901`, PostgreSQL on `localhost:5433`.

## 3x-ui API

Implemented endpoints:

- `GET /api/plans`
- `POST /api/access/claim`
- `GET /api/3x-ui/session/status`
- `POST /api/3x-ui/session/login`
- `POST /api/3x-ui/session/logout`
- `ALL /api/3x-ui/proxy/*`

Example:

```bash
curl http://localhost:3000/api/plans
curl -X POST http://localhost:3000/api/access/claim \
  -H 'Content-Type: application/json' \
  -d '{"planId":"free-10gb-month","name":"Murad iPhone"}'
curl -X POST http://localhost:3000/api/access/claim \
  -H 'Content-Type: application/json' \
  -d '{"planId":"extended-unlimited-month","name":"Murad MacBook"}'
curl -X POST http://localhost:3000/api/3x-ui/session/login
curl http://localhost:3000/api/3x-ui/proxy/panel/api/inbounds/list
```

Current limitation:

- upstream `3x-ui` admin session is stored in process memory for now.
