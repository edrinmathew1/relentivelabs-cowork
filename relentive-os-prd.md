# Relentive OS — Internal Agency Management Platform
### PRD · Architecture · Antigravity Build Prompt

---

## 1. Overview

**Product name:** Relentive OS
**Owner:** Relentive (SaaS product agency)
**Purpose:** A private, internal Notion-style workspace for Relentive to run the agency itself — tasks, daily checklists, goals/OKRs, progress analytics, and team accountability, with email-based invites and reminders.
**Theme:** Red (#E10600 / #FF1E1E accent range) on Black (#0A0A0A base), dark-mode only.
**Deploy target:** Vercel.
**Users:** Just you (owner/admin) + your internal tech team — no client role, no client-facing surface, ever.
**Cost:** $0 to run at this scale — every service in the stack (Vercel Hobby, Supabase free tier, Resend free tier, cron-job.org) is free, see §5.1 and §8 for details.

**Core problem it solves:** Right now agency task tracking is scattered. You (as founder/admin) need one place to assign work, see who's doing what, enforce daily check-ins, and measure contribution over time — without paying for Notion/ClickUp/Linear seats.

---

## 2. Users & Roles

| Role | Description | Permissions |
|---|---|---|
| **Owner/Admin** (you) | Full control | Invite/remove members, create projects, assign tasks, view all analytics, edit goals, send reminders |
| **Team Member** (tech team) | Invited via email | View/update own tasks, complete daily checklist, log work, view own analytics, view team/project boards they're on |

Only these two roles exist — this is a purely internal tool for you and your tech team, with no client-facing surface at all (not even planned for later).

Auth is invite-only — no public sign-up. Admin invites by email → magic link/password-set flow → account created and scoped to Relentive's workspace.

---

## 3. Core Modules (Feature Set)

### 3.1 Workspace & Projects
- Single workspace ("Relentive"), multiple **Projects** inside it (e.g. each SaaS product you're building/client engagement)
- Each project has: description, status (Planning/Active/On Hold/Shipped), owner, members, start/target dates

### 3.2 Tasks
- Kanban board (Backlog / To Do / In Progress / Review / Done) + list view + calendar view
- Task fields: title, description (rich text), assignee(s), project, priority (Low/Med/High/Urgent), due date, tags/labels, status, estimated hours, actual hours, subtasks, comments, attachments
- Activity log per task (auto-tracked: created, status changes, reassignments, comments)
- @mentions in comments → triggers notification

### 3.3 Daily Checklists
- Each team member gets a **daily checklist** (recurring template + ad hoc items)
- Admin can create checklist templates per role (e.g. "Backend Dev Daily", "Frontend Dev Daily")
- Streak tracking (consecutive days completed) — this is a key contribution signal
- End-of-day auto-lock + carry-over of incomplete items to next day (flagged)

### 3.4 Goals / OKRs
- Company-level goals and per-member goals, quarterly/monthly
- Goal = Objective + Key Results (numeric, % progress auto or manually updated)
- Goals can link to projects/tasks so progress rolls up automatically

### 3.5 Work Logs / Time Tracking (lightweight)
- Daily "what I worked on" log entry (freeform + linked tasks)
- Optional hours logged per task
- This feeds the contribution analytics

### 3.6 Progress Analytics Dashboard
- **Admin view:** tasks completed per member per week, on-time completion %, checklist streaks, project burndown, workload distribution (who's overloaded/underloaded), velocity trend
- **Member view:** personal stats — tasks done, streak, on-time %, hours logged
- Charts: bar (tasks/week), line (velocity trend), heatmap (checklist streak calendar, GitHub-contributions-style), pie (workload by project)

### 3.7 Notifications & Email Reminders
- Transactional email (via Resend or similar) for:
  - Team invite (set password / accept invite)
  - Daily checklist reminder (e.g. 9 AM, if not yet started)
  - End-of-day reminder if checklist incomplete
  - Task assigned to you
  - Task due tomorrow / overdue
  - Weekly digest to admin (team progress summary)
- In-app notification bell in addition to email
- Reminder timing configurable per user (timezone-aware)

### 3.8 Team Member Invites
- Admin enters name + email → system sends invite email with secure signup link (token, expires in 72h)
- Invitee sets password → lands in onboarding → assigned to project(s)
- Admin can deactivate/remove members (soft delete, retains historical data for analytics)

### 3.9 Settings
- Workspace branding (already fixed: red/black, "Relentive")
- Notification preferences
- Profile (avatar, role/title, timezone)

---

## 4. Non-Functional Requirements
- Dark theme only, red/black palette, fast (Notion-like feel = instant, low-latency interactions, optimistic UI updates)
- Mobile-responsive (team may check tasks from phone)
- Realtime updates (task board updates live when teammate moves a card)
- Data isolation: everything scoped to the single Relentive workspace (multi-tenant-ready schema even if v1 is single-tenant, in case you later sell this as a product to other agencies)
- Audit trail on tasks/goals for accountability

---

## 5. System Architecture

### 5.1 Stack (chosen to match your existing skillset — Next.js/Supabase, as used on ATS)

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **Next.js 14 (App Router)** | SSR + fast client nav, matches your ATS build experience |
| Styling | **Tailwind CSS** + shadcn/ui (themed red/black) | Fast, consistent, matches your stack |
| Animations | Framer Motion (subtle — checklist checks, board drag) | Notion-like micro-interactions |
| Drag & drop board | `@dnd-kit/core` | Lightweight, accessible Kanban DnD |
| Rich text (task descriptions, comments) | `Tiptap` (ProseMirror-based) | Notion-style block editing without full Notion complexity |
| Auth | **Supabase Auth** (email/password + magic link for invites) | You already run Supabase; RLS gives per-row security |
| Database | **Supabase Postgres** | Same as ATS; relational fits tasks/projects/goals well |
| Realtime | **Supabase Realtime** (Postgres changes) | Live board updates without extra infra |
| File storage | **Supabase Storage** | Task attachments, avatars |
| Email | **Resend** (or Supabase + Resend combo) via transactional templates | Reliable, dev-friendly, generous free tier |
| Scheduled jobs (reminders, digests) | **cron-job.org** (free external scheduler) hitting protected API routes | Free, unlimited jobs/frequency — avoids Vercel Hobby's cron limits |
| Charts | **Recharts** | Matches your existing tool familiarity, good for analytics dashboard |
| Hosting | **Vercel** | As specified |
| State/data fetching | **TanStack Query** + Supabase client | Caching, optimistic updates for Notion-like snappiness |

### 5.2 High-Level Architecture Diagram (textual)

```
┌───────────────────────────────┐         ┌──────────────────────────┐
│   cron-job.org (free, ext.)   │──HTTPS─▶│   Vercel (Next.js App)    │
│  fires GET requests on a      │  (with  │  ┌───────────┐┌─────────┐ │
│  schedule against protected   │  secret │  │App Router ││API + cron│ │
│  /api/cron/* endpoints         │  header)│  │(pages/UI) ││ routes   │ │
│  (morning reminder, EOD,       │         │  └─────┬─────┘└────┬────┘ │
│  due-date check, weekly digest)│         └────────┼───────────┼─────┘
└───────────────────────────────┘                   │           │
                                                      ▼           ▼
                                        ┌───────────────────────────────┐
                                        │        Supabase (Backend)      │
                                        │ ┌────────┐┌─────┐┌────────┐┌──┐│
                                        │ │Postgres││Auth ││Realtime││St││
                                        │ │ + RLS  ││(inv/││(board  ││or││
                                        │ │        ││login││ sync)  ││ge││
                                        │ └────────┘└─────┘└────────┘└──┘│
                                        └───────────────┬─────────────────┘
                                                         │
                                                         ▼
                                                 ┌─────────────┐
                                                 │   Resend    │
                                                 │ (emails:    │
                                                 │  invites,   │
                                                 │  reminders, │
                                                 │  digests)   │
                                                 └─────────────┘
```

**Why external instead of Vercel Cron:** Vercel's Hobby (free) plan caps cron jobs at 2 and restricts them to once-a-day runs — not enough for a morning reminder + EOD reminder + due-date check + weekly digest running at different times. cron-job.org is free with no job-count or frequency limits; it just calls your `/api/cron/*` routes over HTTPS. Protect each route with a shared secret (e.g. `CRON_SECRET` env var checked against a header or query param) so only your scheduler can trigger them.

### 5.3 Database Schema (core tables)

```sql
-- Users are Supabase auth.users; this extends with profile data
profiles (
  id uuid primary key references auth.users,
  full_name text,
  email text unique,
  role text check (role in ('admin','member')) default 'member',
  title text,               -- e.g. "Backend Developer"
  avatar_url text,
  timezone text default 'Asia/Kolkata',
  status text check (status in ('active','invited','deactivated')) default 'invited',
  invited_by uuid references profiles(id),
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz default now()
)

projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text check (status in ('planning','active','on_hold','shipped')) default 'planning',
  owner_id uuid references profiles(id),
  start_date date,
  target_date date,
  created_at timestamptz default now()
)

project_members (
  project_id uuid references projects(id),
  user_id uuid references profiles(id),
  primary key (project_id, user_id)
)

tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  title text not null,
  description text,          -- rich text (JSON from Tiptap)
  status text check (status in ('backlog','todo','in_progress','review','done')) default 'todo',
  priority text check (priority in ('low','medium','high','urgent')) default 'medium',
  assignee_id uuid references profiles(id),
  created_by uuid references profiles(id),
  due_date date,
  estimated_hours numeric,
  actual_hours numeric,
  tags text[],
  position int,              -- for board ordering
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id),
  author_id uuid references profiles(id),
  body text,
  mentions uuid[],
  created_at timestamptz default now()
)

task_activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id),
  actor_id uuid references profiles(id),
  action text,                -- 'created','status_changed','reassigned', etc.
  meta jsonb,
  created_at timestamptz default now()
)

checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text,                  -- e.g. "Backend Dev Daily"
  role text,
  items jsonb                 -- [{label, order}]
)

daily_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  date date not null,
  items jsonb,                 -- [{label, done, completed_at}]
  completed_count int,
  total_count int,
  is_complete boolean default false,
  unique (user_id, date)
)

goals (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  scope text check (scope in ('company','individual')) default 'company',
  owner_id uuid references profiles(id),   -- null if company-level
  period text,                -- e.g. '2026-Q3'
  progress numeric default 0, -- 0-100
  target_value numeric,
  current_value numeric,
  linked_project_id uuid references projects(id),
  status text check (status in ('on_track','at_risk','off_track','done')) default 'on_track',
  created_at timestamptz default now()
)

work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  date date,
  summary text,
  hours numeric,
  linked_task_ids uuid[],
  created_at timestamptz default now()
)

notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  type text,                  -- 'task_assigned','mention','reminder','digest'
  payload jsonb,
  read boolean default false,
  created_at timestamptz default now()
)

invites (
  id uuid primary key default gen_random_uuid(),
  email text,
  token text unique,
  invited_by uuid references profiles(id),
  role text default 'member',
  expires_at timestamptz,
  accepted boolean default false,
  created_at timestamptz default now()
)
```

RLS strategy: admin role bypasses most row filters; members can only `select`/`update` rows where they are `assignee_id`/`user_id`, or where they're a `project_member` of the related project. All tables enable RLS from day one.

### 5.4 API / Route Structure (Next.js App Router)

```
/app
  /(auth)/login
  /(auth)/accept-invite/[token]
  /(app)/dashboard                → admin analytics overview
  /(app)/projects
  /(app)/projects/[id]            → project board
  /(app)/tasks/[id]                → task detail (modal or page)
  /(app)/checklist                 → today's checklist
  /(app)/goals
  /(app)/team                      → admin: member list, invite, analytics per member
  /(app)/team/[userId]              → individual contribution profile
  /(app)/settings

/app/api
  /invite                (POST — admin sends invite)
  /invite/accept          (POST — sets password, creates profile)
  /tasks                  (CRUD)
  /tasks/[id]/comments
  /checklists/today
  /goals
  /cron/daily-reminder     (called by cron-job.org → checks who hasn't started checklist)
  /cron/eod-reminder       (called by cron-job.org → incomplete checklist nudge)
  /cron/weekly-digest      (called by cron-job.org → admin summary email)
  /cron/due-date-check     (called by cron-job.org → task due tomorrow/overdue emails)
  (all /cron/* routes require a `?secret=` or header match against
   process.env.CRON_SECRET — reject with 401 if missing/invalid)
```

### 5.5 Analytics computation
- Nightly (or on-read, cached) aggregation job computes: tasks completed/week per user, on-time %, streak counts, workload distribution — stored in a `member_stats` materialized view or computed via SQL views for simplicity in v1.

---

## 6. Design System (Red & Black)

- Background: `#0A0A0A` (near-black), surface cards: `#141414` / `#1A1A1A`
- Primary accent (red): `#E10600` for primary actions, active states, priority-urgent tags
- Secondary red tones: `#FF3B3B` (hover), `#7A0000` (muted/borders)
- Text: `#F5F5F5` primary, `#A3A3A3` secondary/muted
- Success: keep a desaturated green (`#3FBF6C`) only for "done" states — don't fight the red/black identity
- Typography: a clean geometric sans for UI (e.g. Inter or Geist) — Notion-like density, generous line-height, small font sizes (13–14px body) for information density
- Iconography: minimal line icons (Lucide)
- Interaction feel: instant optimistic UI, subtle hover elevation, drag-and-drop with smooth spring physics

---

## 7. MVP Scope vs Later Phases

**Phase 1 (MVP — build first):**
Auth + invites, Projects, Task board (CRUD + kanban), Daily checklist, Basic admin dashboard (tasks completed, streaks), Email: invite + daily reminder.

**Phase 2:**
Goals/OKRs, full analytics (velocity, workload heatmap), weekly digest email, work logs/time tracking, comments + @mentions + notifications.

**Phase 3:**
Multi-workspace (if you ever sell this as a product to other agencies), integrations (Slack/GitHub).

---

## 8. Antigravity Build Prompt

Copy the block below as the prompt/spec you feed to Antigravity (or any agentic coding tool) to scaffold the project. It's self-contained.

```
You are building "Relentive OS" — an internal Notion-style agency management
platform for a SaaS product agency called Relentive. Theme: dark mode only,
black background (#0A0A0A) with red accents (#E10600 primary, #FF3B3B hover,
#7A0000 muted). Typography: Inter or Geist, dense/compact Notion-like UI.

STACK:
- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui components (restyled to red/black theme)
- Supabase (Postgres + Auth + Realtime + Storage), RLS enabled on all tables
- Resend for transactional email
- Vercel Cron Jobs for scheduled reminders/digests
- TanStack Query for data fetching/caching with optimistic updates
- @dnd-kit/core for kanban drag-and-drop
- Tiptap for rich text task descriptions/comments
- Recharts for analytics charts
- Scheduled jobs: NOT Vercel Cron. Build them as normal Next.js API routes
  under /api/cron/* protected by a shared secret (CRON_SECRET env var,
  checked via header or query param, return 401 if missing/wrong). These
  routes will be triggered externally by the free service cron-job.org —
  do not add a vercel.json cron config.
- Deployment target: Vercel (Hobby/free plan — everything in this stack
  must stay on free tiers: Vercel Hobby, Supabase free tier, Resend free
  tier, cron-job.org free tier)

BUILD IN THIS ORDER:

1. PROJECT SETUP
   - Scaffold Next.js 14 + TS + Tailwind + shadcn/ui
   - Set up Supabase project, connect via env vars (NEXT_PUBLIC_SUPABASE_URL,
     NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
   - Create the database schema exactly as specified below (tables: profiles,
     projects, project_members, tasks, task_comments, task_activity_log,
     checklist_templates, daily_checklists, goals, work_logs, notifications,
     invites). Enable RLS on every table with policies: admins have full
     access; members can only read/write rows tied to their own user_id or
     projects they're a member of.
   - Set up Resend account integration for transactional email.

2. AUTH & INVITES
   - No public signup. Login page only accepts existing accounts.
   - Admin (role='admin') can invite a team member: enter name + email →
     generates a secure token, inserts into `invites`, sends an email via
     Resend with a link to /accept-invite/[token].
   - Accept-invite page: validate token + expiry, let user set a password,
     create their Supabase auth user + profiles row (role='member',
     status='active').
   - Seed one admin account for the agency owner.

3. PROJECTS & TASKS
   - Projects list/detail pages. Admin can create projects, add members.
   - Task board (Kanban: Backlog/To Do/In Progress/Review/Done) using
     @dnd-kit, drag-and-drop updates task.status + position with optimistic
     UI via TanStack Query.
   - Task detail view/modal: title, rich text description (Tiptap),
     assignee, priority, due date, tags, estimated/actual hours, comments
     with @mentions, activity log (auto-logged on status/assignee changes).
   - List view and simple calendar view as alternate task views.

4. DAILY CHECKLISTS
   - Admin defines checklist templates per role.
   - Each active member gets today's checklist auto-generated from their
     template at midnight (their timezone) via a cron job, stored in
     daily_checklists.
   - Checklist UI: simple checkbox list, streak counter (consecutive days
     with is_complete=true) shown prominently, GitHub-style contribution
     heatmap of past completions.
   - Incomplete items at day-end are flagged and carried into tomorrow's
     "carried over" section but don't break the streak logic in a way that
     unfairly punishes users — define streak as "completed by end of day."

5. GOALS/OKRS
   - Admin creates company-level and individual goals per period (e.g.
     2026-Q3), with objective + key result(s), target/current numeric
     values, auto or manual progress %.
   - Goals can link to a project so progress can be manually rolled up.
   - Goals dashboard shows on_track/at_risk/off_track status with progress
     bars.

6. ANALYTICS DASHBOARD
   - Admin dashboard: tasks completed per member per week (bar chart),
     on-time completion % per member, checklist streak leaderboard,
     workload distribution across active projects (pie/stacked bar),
     velocity trend over past 8 weeks (line chart) — all via Recharts.
   - Individual member view: their own stats only (tasks done, streak,
     on-time %, hours logged via work_logs).
   - Compute stats via SQL views or a nightly aggregation cron job — keep
     it simple for v1, optimize later if slow.

7. EMAIL & NOTIFICATIONS
   - Build four protected API routes, each triggered externally on a
     schedule by cron-job.org (a free scheduler that just sends an HTTPS
     GET/POST — no Vercel cron config needed). Each route must check a
     shared secret (CRON_SECRET) before doing anything, and return 401 if
     it's missing or wrong:
     a) /api/cron/daily-reminder — intended to run each morning; emails
        anyone who hasn't started today's checklist.
     b) /api/cron/eod-reminder — intended to run each evening; emails
        anyone with an incomplete checklist.
     c) /api/cron/due-date-check — intended to run daily; emails assignees
        with tasks due tomorrow or overdue.
     d) /api/cron/weekly-digest — intended to run weekly; emails the admin
        a summary of team progress (tasks completed, streaks, at-risk
        goals).
   - Document in the README that these four URLs need to be added as jobs
     on cron-job.org (or any similar free scheduler) with the CRON_SECRET
     appended as a query param, at whatever frequency/timezone fits.
   - In-app notification bell (notifications table) for: task assigned to
     you, @mention in a comment, goal status change.
   - All emails use a consistent branded template: black background, red
     accent header with "Relentive" wordmark.

8. SETTINGS
   - Profile settings (name, avatar upload to Supabase Storage, timezone,
     notification preferences).
   - Admin-only: manage team (deactivate/reactivate members, view invite
     status), manage checklist templates.

DESIGN REQUIREMENTS:
- Every page dark-mode only, red/black palette as specified above.
- Prioritize information density and speed over whitespace — this should
  feel like Notion/Linear, not a marketing site.
- Use optimistic UI updates everywhere (task moves, checklist checks)
  so it feels instant.
- Fully responsive — team members will check tasks/checklists on mobile.
- Use Supabase Realtime subscriptions on the task board so changes from
  teammates appear live without refresh.

NON-GOALS FOR V1 (do not build yet):
- Public signup, billing/payments, client-facing views (this platform has
  no client role at all — only admin + internal team members), multi-
  workspace support, third-party integrations (Slack/GitHub) — design the
  schema to not preclude these later, but don't build the UI/logic now.

Deliver working code deployable to Vercel's free Hobby plan, using only
free tiers across the whole stack (Vercel, Supabase, Resend, cron-job.org),
with a README covering: env vars required (including CRON_SECRET), the
Supabase schema migration script, Resend setup steps, and step-by-step
instructions for registering the four /api/cron/* URLs as jobs on
cron-job.org.
```

---

## 9. Suggested Next Steps
1. Create the Supabase project and run the schema above as a migration.
2. Scaffold the Next.js app and wire up auth + invite flow first (it unblocks everything else — you need real accounts to test the rest).
3. Build the task board next since it's the daily-use core.
4. Layer in checklists → analytics → goals → email automation.
5. Deploy early and often to Vercel (even mid-build) so cron jobs and env vars are validated in the real environment, not just locally.
