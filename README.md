# MatoStudio API

Backend API for MatoStudio contact and quote forms.

## Presentation

This backend handles contact requests and quote simulations sent from the MatoStudio portfolio
frontend. It validates payloads with Zod, applies security headers and rate limiting, and delivers
notifications by email via SMTP.

## Frontend production

The frontend is live at [https://www.matostudio.fr/](https://www.matostudio.fr/).

For production, `FRONTEND_ORIGINS` must include the production domain so CORS allows the frontend
to reach this API.

## Stack

- Node.js 20+
- Express 5
- TypeScript (strict)
- Zod — payload validation
- Nodemailer — email delivery
- Helmet — security headers
- express-rate-limit — rate limiting
- dotenv — environment variables

## Endpoints

| Method | Path           | Description              |
| ------ | -------------- | ------------------------ |
| `GET`  | `/health`      | Health check             |
| `POST` | `/api/contact` | Contact form submission  |
| `POST` | `/api/quote`   | Quote request submission |

### GET /health

```json
{ "status": "ok", "service": "matostudio-api", "timestamp": "..." }
```

### POST /api/contact

```json
{
  "name": "string (2-120 chars)",
  "email": "valid email",
  "phone": "string (optional)",
  "projectType": "string",
  "budget": "string",
  "timeline": "string",
  "message": "string (10-3000 chars)"
}
```

### POST /api/quote

```json
{
  "name": "string",
  "email": "valid email",
  "phone": "string (optional)",
  "projectType": "string",
  "pageCount": "integer (1-30)",
  "options": ["string array"],
  "deadline": "string",
  "estimate": "number (0-100000)",
  "message": "string (optional)"
}
```

## Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable           | Required   | Description                                          |
| ------------------ | ---------- | ---------------------------------------------------- |
| `NODE_ENV`         | No         | `development` or `production` (default: development) |
| `PORT`             | No         | Port (default: 3000)                                 |
| `FRONTEND_ORIGINS` | No         | Comma-separated allowed origins                      |
| `SMTP_HOST`        | Production | SMTP server hostname                                 |
| `SMTP_PORT`        | Production | SMTP port (default: 587)                             |
| `SMTP_SECURE`      | Production | `true` for port 465, `false` otherwise               |
| `SMTP_USER`        | Production | SMTP login                                           |
| `SMTP_PASS`        | Production | SMTP app password                                    |
| `MAIL_FROM`        | Production | From address                                         |
| `MAIL_TO`          | Production | Recipient for notifications                          |

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

API available at `http://localhost:3000`.

Without SMTP configured, the API runs in dev mode: form submissions are logged to the console
instead of being emailed. No SMTP setup is required for local development.

## Commands

```bash
npm run dev           # Start dev server with hot reload
npm run build         # Compile TypeScript to dist/
npm start             # Run compiled server
npm run typecheck     # TypeScript check
npm run test          # Run tests (vitest)
npm run test:watch    # Tests in watch mode
npm run lint          # ESLint
npm run format:check  # Prettier check
npm run check         # Full check: lint + format + typecheck + test + build
```

## Tests

Tests use Vitest and Supertest and cover all three endpoints:

- `GET /health` — status and response shape
- `POST /api/contact` — valid payload, invalid email, missing required fields, frontend-compatible shape
- `POST /api/quote` — valid payload, invalid pageCount, negative estimate, missing fields, frontend-compatible shape

```bash
npm run test
```

## CORS and FRONTEND_ORIGINS

The API uses an origin whitelist. Default allowed origins:

- `http://localhost:5173`
- `http://localhost:5174`
- `https://matostudio.fr`
- `https://www.matostudio.fr`

Override in production:

```env
FRONTEND_ORIGINS=https://matostudio.fr,https://www.matostudio.fr
```

## Security

- **Helmet** — standard security headers on every response
- **CORS** — origin whitelist, rejects unlisted origins
- **Rate limiting** — 100 requests per 15 minutes per IP (global)
- **Payload size** — `express.json` limited to 100kb
- **Validation** — all payloads validated with Zod before processing
- **`trust proxy: 1`** — required for correct IP detection behind a reverse proxy (Render, Railway)

## SMTP in production

Use an app password or dedicated SMTP credentials, never your main mailbox password.

Recommended providers: Brevo (free tier), Mailgun, Resend.

Example for port 587 (STARTTLS):

```env
SMTP_HOST=smtp.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-login
SMTP_PASS=your-app-password
MAIL_FROM="MatoStudio <contact@matostudio.fr>"
MAIL_TO=contact@matostudio.fr
```

## Production deployment checklist

This backend is not yet deployed. Required steps before going live:

1. Choose a hosting provider (Render, Railway, Fly.io)
2. Set all required environment variables on the host
3. Configure SMTP with a real provider
4. Set `FRONTEND_ORIGINS` to the production domain
5. Verify `GET /health` returns 200
6. Test `POST /api/contact` and `POST /api/quote` end-to-end
7. Confirm email delivery in production

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

## CI

GitHub Actions runs `npm run check` on every push and pull request to `main`.

## License

&copy; 2026 MatoStudio. All rights reserved.
