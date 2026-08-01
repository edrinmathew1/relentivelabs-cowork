# RelentiveLabs CoWork (Relentive OS)

> **Internal Notion/Linear-Style SaaS Agency Management Platform** for **Relentive**.

---

## 🎨 Theme & Aesthetics
- **Dark Mode Only**: Deep black base (`#0A0A0A`), surface cards (`#141414` / `#1F1F1F`), primary red accents (`#E10600` primary, `#FF3B3B` hover, `#7A0000` muted), and crisp white text (`#FFFFFF`, `#E5E5E5`).
- **Typography**: Inter / Geist font with high-density Notion/Linear layout principles.

---

## ⚡ Tech Stack & Free-Tier Architecture

| Layer | Technology | Free Tier Details |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Vercel Hobby Plan ($0/mo) |
| Database & Auth | **Supabase Postgres + Auth + Realtime + Storage** | Supabase Free Tier ($0/mo) |
| Calendar OS | `@fullcalendar/react` | Full Month/Week/Day schedule |
| Drag & Drop Kanban | `@dnd-kit/core` | Client-side drag-and-drop |
| Rich Text | `Tiptap` (ProseMirror-based) | Open-source block editing |
| Analytics | `Recharts` | Client-side charts |
| Transactional Email | `Resend` | Free tier 3,000 emails/mo |
| Scheduled Cron Jobs | `cron-job.org` | Unlimited free HTTPS cron triggers |

---

## ⚙️ Environment Variables Setup

Create a `.env.local` file in the project root (and configure in Vercel project settings):

```env
# Supabase Connection Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Resend Transactional Email Key
RESEND_API_KEY=re_123456789
RESEND_FROM_EMAIL=RelentiveLabs CoWork <notifications@relentivelabs.com>

# Protected Cron API Secret
CRON_SECRET=your_secure_cron_secret_2026

# App Base URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 🗄️ Database Migration Script

1. Open your Supabase Project Dashboard -> **SQL Editor**.
2. Copy and execute the contents of [`supabase/schema.sql`](file:///c:/Z/relentive-cowork/supabase/schema.sql).
3. This creates all 13 core tables (`profiles`, `projects`, `project_members`, `tasks`, `task_comments`, `task_activity_log`, `checklist_templates`, `daily_checklists`, `goals`, `work_logs`, `notifications`, `invites`, `events`), Row Level Security (RLS) policies, triggers, and seed data.

### Seeding Initial Admin Account:
To create your first owner/admin user:
1. Sign up/Create a user in Supabase Auth via SQL or Dashboard with email `admin@relentivelabs.com`.
2. Execute in Supabase SQL Editor:
```sql
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE email = 'admin@relentivelabs.com';
```

---

## ✉️ Resend Transactional Email Setup

1. Sign up at [resend.com](https://resend.com) (Free Tier).
2. Generate an API Key under API Keys and paste into `RESEND_API_KEY`.
3. Verify your sending domain (e.g. `relentivelabs.com`) or use the default test sender during setup (`onboarding@resend.dev`).

---

## ⏰ Cron Jobs Setup (`cron-job.org`)

Vercel Hobby plan imposes strict cron limits. Relentive OS uses protected API routes under `/api/cron/*` verified with `CRON_SECRET`.

Register these 5 URLs on [cron-job.org](https://cron-job.org) (Free):

| Route Path | Recommended Schedule | Description |
|---|---|---|
| `https://your-app.vercel.app/api/cron/daily-reminder?secret=YOUR_CRON_SECRET` | Daily at 09:00 AM | Nudges members who haven't started today's checklist |
| `https://your-app.vercel.app/api/cron/eod-reminder?secret=YOUR_CRON_SECRET` | Daily at 08:00 PM | Evening reminder for incomplete checklist items |
| `https://your-app.vercel.app/api/cron/due-date-check?secret=YOUR_CRON_SECRET` | Daily at 08:00 AM | Sends task due tomorrow / overdue email alerts |
| `https://your-app.vercel.app/api/cron/weekly-digest?secret=YOUR_CRON_SECRET` | Mondays at 09:00 AM | Emails Admin a weekly velocity & team digest report |
| `https://your-app.vercel.app/api/cron/event-reminders?secret=YOUR_CRON_SECRET` | Every 15 Minutes | Sends email reminders for upcoming calendar events/meetings |

*Note: You can also pass the secret in the HTTP header `x-cron-secret: YOUR_CRON_SECRET`.*

---

## 🚀 Local Development & Build Verification

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Production build check
npm run build
```
