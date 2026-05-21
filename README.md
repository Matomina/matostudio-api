# MatoStudio API

Backend API for MatoStudio contact and quote requests.

## Features

- Health check endpoint
- Contact form endpoint
- Quote request endpoint
- Email delivery with Nodemailer
- Request validation with Zod
- Basic security with Helmet, CORS and rate limiting
- Ready for Render deployment

## Stack

- Node.js
- Express
- TypeScript
- Zod
- Nodemailer
- Render

## Endpoints

```txt
GET  /health
POST /api/contact
POST /api/quote
```

## Local development

```bash
npm install
npm run dev
```

API available locally at:

```txt
http://localhost:3000
```

## Environment variables

Create a `.env` file based on `.env.example`.

```env
NODE_ENV=development
PORT=3000
FRONTEND_ORIGINS=http://localhost:5173,http://localhost:5174,https://matostudio.fr,https://www.matostudio.fr

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contact@example.com
SMTP_PASS=change-me

MAIL_FROM="MatoStudio <contact@example.com>"
MAIL_TO=contact@example.com
```

## Production on Render

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

Recommended production variables:

```env
NODE_ENV=production
FRONTEND_ORIGINS=https://matostudio.fr,https://www.matostudio.fr
```

## Quality commands

```bash
npm run typecheck
npm run build
npm run check
npm test
```

## Deployment checklist

- Render service is deployed from `main`
- `FRONTEND_ORIGINS` contains the production domain
- SMTP variables are configured with an app password, not the mailbox password
- `/health` returns a successful response
- `/api/contact` accepts production contact requests
- `/api/quote` accepts production quote simulator requests

## License

© 2026 MatoStudio. All rights reserved.
