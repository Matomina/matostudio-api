# MatoStudio Dashboard Roadmap

This document prepares the future MatoStudio admin dashboard without changing the current public website or API behavior.

## Current validated flow

- `GET /health` checks API availability.
- `POST /api/contact` receives public contact requests.
- `POST /api/quote` receives quote simulator requests.
- When SMTP variables are missing, requests are logged in development mode.
- When SMTP variables are configured, requests are sent by email with Nodemailer.

## Dashboard goal

Create a private admin space to centralize MatoStudio leads and quotes after persistence is added.

The dashboard should not be implemented as a fake static interface. It must be backed by real persisted data.

## Required backend foundation

Before building the full dashboard, add a database layer.

Recommended Render PostgreSQL tables:

### contacts

- `id`
- `name`
- `email`
- `phone`
- `project_type`
- `budget`
- `timeline`
- `message`
- `status`
- `created_at`
- `updated_at`

### quotes

- `id`
- `name`
- `email`
- `phone`
- `project_type`
- `page_count`
- `options`
- `deadline`
- `estimate`
- `message`
- `status`
- `created_at`
- `updated_at`

### admin_users

- `id`
- `email`
- `password_hash`
- `role`
- `created_at`
- `updated_at`

## Future API routes

Protected admin routes:

- `GET /api/admin/contacts`
- `GET /api/admin/contacts/:id`
- `PATCH /api/admin/contacts/:id/status`
- `GET /api/admin/quotes`
- `GET /api/admin/quotes/:id`
- `PATCH /api/admin/quotes/:id/status`
- `GET /api/admin/stats`

Authentication routes:

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/me`

## Security rules

- Protect all admin routes.
- Never expose SMTP secrets or database credentials to the frontend.
- Keep validation with Zod.
- Keep rate limiting.
- Add stricter auth rate limits on login.
- Store only hashed passwords.
- Use secure HTTP-only cookies or a carefully scoped token strategy.

## Future frontend dashboard

Routes to add later in `matostudio-portfolio-v2`:

- `/dashboard`
- `/dashboard/contacts`
- `/dashboard/quotes`
- `/dashboard/settings`

Design rules:

- Reuse MatoStudio premium visual language.
- Do not modify the public website design.
- Keep admin UI separate from public conversion pages.
- Display real API data only.

## Recommended implementation order

1. Add PostgreSQL on Render.
2. Add database client and migrations.
3. Persist contact requests.
4. Persist quote requests.
5. Add protected admin auth.
6. Add admin list endpoints.
7. Add admin status update endpoints.
8. Build dashboard frontend pages.
9. Add production tests and manual QA checklist.
