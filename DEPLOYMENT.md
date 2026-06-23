# QLSS — Deployment Guide

QLSS is a link shortener / unshortener / markdown-page platform built on Next.js 16 (App Router), Supabase (auth + Postgres), and Tailwind CSS v4 + shadcn/ui.

This guide covers everything you need to run QLSS in production.

---

## 1. Prerequisites

- **Node.js** ≥ 20 (or **Bun** ≥ 1.1)
- A **Supabase** project (https://supabase.com) — free tier is fine
- A domain name (optional, but recommended for short links)

---

## 2. Environment variables

Copy `.env.example` to `.env` (or `.env.local`) and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL, e.g. `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service-role key — **server only, never expose** |
| `NEXT_PUBLIC_SITE_URL` | ✅ | The public origin of your deployment, e.g. `https://qlss.link` |
| `UNSHORTEN_API_TOKEN` | ✅ | Secret token required to call `GET /api/unshorten`. External API consumers send `Authorization: Token <token>` |
| `NEXT_PUBLIC_UNSHORTEN_API_TOKEN` | ✅ | Public mirror of `UNSHORTEN_API_TOKEN` that the in-browser **unshorten** tab sends. Set it equal to `UNSHORTEN_API_TOKEN` so the built-in tab works; external callers use the server-side token |

> When Supabase env vars are missing, the app runs in **"not configured" mode** — pages render but link creation/auth are disabled.

---

## 3. Supabase setup

### 3.1 Run the migration

The schema lives in `supabase/migrations/`. Apply `20260623_comprehensive_update.sql` to your Supabase project.

**Option A — Supabase Dashboard**

1. Open your project → **SQL Editor**
2. Paste the contents of `supabase/migrations/20260623_comprehensive_update.sql`
3. Run it

**Option B — Supabase CLI**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 3.2 Base schema (if starting fresh)

The migration assumes the following base tables already exist (from the original QLSS schema). If you are starting from an empty project, also create:

```sql
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean default false not null,
  banned boolean default false not null,
  banned_at timestamptz,
  banned_reason text,
  created_at timestamptz default now() not null
);

create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  slug text unique not null,
  destination_url text not null,
  title text,
  description text,
  pincode text,
  created_at timestamptz default now() not null
);

create table if not exists analytics (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references links(id) on delete cascade,
  ip_address text,
  asn text,
  country text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,
  timezone text,
  user_agent text,
  browser_name text,
  browser_version text,
  os_name text,
  os_version text,
  device_type text,
  is_bot boolean,
  referer text,
  language text,
  clicked_at timestamptz default now() not null
);

create table if not exists abuse_reports (
  id uuid primary key default gen_random_uuid(),
  link_slug text,
  message text not null,
  reviewed boolean default false not null,
  created_at timestamptz default now() not null
);

create table if not exists site_config (
  key text primary key,
  value text not null,
  updated_at timestamptz default now() not null
);
```

Then run `20260623_comprehensive_update.sql`.

### 3.3 Auth providers

In Supabase Dashboard → **Authentication → Providers**, enable:

- **Google** OAuth (for "Continue with Google")
- **Email** magic links (for "Continue with email")

Set the **Site URL** to `NEXT_PUBLIC_SITE_URL` and add redirect URLs:

```
https://<your-domain>/api/auth/callback
http://localhost:3000/api/auth/callback   # for local dev
```

---

## 4. Install & build

```bash
# install deps
bun install           # or: npm install

# run the SQL migration on Supabase (see §3.1)

# build
bun run build         # or: npm run build
```

---

## 5. Running

### Development

```bash
bun run dev           # http://localhost:3000
```

### Production

```bash
bun run start         # or: npm run start
```

The app listens on port 3000 by default. Set `PORT` to change it.

---

## 6. Admin users

To make a user an admin, run against your Supabase project:

```sql
update profiles set is_admin = true where id = '<user-uuid>';
```

Admins can access `/admin` and the admin API routes. Admins can ban/unban users, delete any link, and view per-user link stats.

---

## 7. Banning

### User bans

Admins ban a user from the admin panel (`PATCH /api/admin/users/[id]` with `action: "ban"`). Banned users see an HTML ban page (with the reason) on every route — enforced in `src/middleware.ts`.

### IP bans

Insert a row into `banned_ips` to block an IP at the middleware layer:

```sql
insert into banned_ips (ip_address, reason) values ('203.0.113.10', 'phishing');
```

Banned IPs are blocked on all routes except the public shorten API.

### Username bans

`banned_usernames` prevents those usernames from being claimed during onboarding. The migration seeds common reserved names (`admin`, `root`, `support`, …).

---

## 8. Unshorten API

`GET /api/unshorten?url=<short-url>` resolves a shortened URL to its destination.

**Auth:** send an `Authorization` header:

```
Authorization: Token <UNSHORTEN_API_TOKEN>
```

( `Bearer <token>` is also accepted. )

**Example:**

```bash
curl -G "https://qlss.link/api/unshorten" \
  --data-urlencode "url=https://bit.ly/3xyz" \
  -H "Authorization: Token $UNSHORTEN_API_TOKEN"
```

Returns:

```json
{ "url": "https://bit.ly/3xyz", "resolved_url": "https://example.com/...", "success": true }
```

The built-in **unshorten** tab on the home page sends `NEXT_PUBLIC_UNSHORTEN_API_TOKEN` automatically.

---

## 9. Markdown pages

A link with `link_type: "markdown"` renders a full HTML page (rendered from `markdown_content` via `marked` + `shiki`) instead of redirecting. Create one from the **markdown** tab on the home page. Owners can edit their page at `/<slug>/edit`.

OG meta (`og_title`, `og_description`, `og_image`) is injected into the page `<head>` for markdown and pincode pages.

---

## 10. Link expiry & usage limits

- `expires_at` (ISO timestamp) — link stops resolving after this time
- `max_uses` (integer) — link stops resolving after `use_count >= max_uses`
- `use_count` is incremented on every successful redirect

Both are enforced in `src/app/[slug]/route.ts`.

---

## 11. Onboarding

New users are redirected to `/onboard` after their first sign-in (handled in `src/app/api/auth/callback/route.ts`). They must pick a unique username (3–30 chars, letters/numbers/underscores, not in `banned_usernames`) and accept the ToS + Privacy Policy before proceeding.

---

## 12. i18n

QLSS ships with English (en), Spanish (es), and Catalan (ca). The language switcher is in the site footer. The choice is persisted in a cookie (`qlss-lang`) for 1 year.

---

## 13. Deployment targets

QLSS is a standard Next.js app — deploy anywhere that supports Node/Bun:

- **Vercel** — zero-config. Set env vars in the project settings.
- **Docker** — `bun run build` then `bun run start` inside a Node 20+ image.
- **Self-host** — reverse proxy (Caddy/Nginx) in front of `bun run start`.

For a single-port gateway setup (e.g. a sandbox), route all traffic to port 3000.

---

## 14. Troubleshooting

| Symptom | Fix |
|---|---|
| "Supabase not configured" banner | Set the three Supabase env vars |
| 401 on `/api/unshorten` | Send `Authorization: Token <UNSHORTEN_API_TOKEN>` |
| New users not redirected to `/onboard` | Ensure the `profiles.username` column exists (run the migration) |
| Banned user still has access | Middleware caches nothing — check that `profiles.banned` is `true` and that `src/middleware.ts` is deployed |
| `/admin` returns 403 | The signed-in user's `profiles.is_admin` is `false` |

---

QLSS · short links · 2026
