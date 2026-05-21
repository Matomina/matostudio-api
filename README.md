# MatoStudio API

Backend API for MatoStudio.

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
Local development
npm install
npm run dev

API available locally at:

http://localhost:3000
Environment variables

Create a .env file based on .env.example.

NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contact@example.com
SMTP_PASS=change-me

MAIL_FROM="MatoStudio <contact@example.com>"
MAIL_TO=contact@example.com
Production

Render build command:

npm install && npm run build

Render start command:

npm start
License

© 2026 MatoStudio. All rights reserved.