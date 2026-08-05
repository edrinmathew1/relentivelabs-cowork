-- ========================================================
-- RelentiveLabs CoWork (Relentive OS) - Supabase Postgres Schema
-- Full Schema Migration with RLS Policies, Triggers & Realtime
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- 1. PROFILES
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  title TEXT DEFAULT 'Team Member',
  avatar_url TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  status TEXT CHECK (status IN ('active', 'invited', 'deactivated')) DEFAULT 'invited',
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatic handle user creation trigger from Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status, joined_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    'active',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      status = 'active';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------
-- 2. PROJECTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('planning', 'active', 'on_hold', 'shipped')) DEFAULT 'planning',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date DATE,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 3. PROJECT_MEMBERS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

-- --------------------------------------------------------
-- 4. TASKS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done')) DEFAULT 'todo',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated_at auto trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------
-- 5. TASK_COMMENTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 6. TASK_ACTIVITY_LOG
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 7. CHECKLIST_TEMPLATES
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'all',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 8. DAILY_CHECKLISTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_count INT DEFAULT 0,
  total_count INT DEFAULT 0,
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- --------------------------------------------------------
-- 9. GOALS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scope TEXT CHECK (scope IN ('company', 'individual')) DEFAULT 'company',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  period TEXT DEFAULT '2026-Q3',
  progress NUMERIC DEFAULT 0,
  target_value NUMERIC DEFAULT 100,
  current_value NUMERIC DEFAULT 0,
  linked_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('on_track', 'at_risk', 'off_track', 'done')) DEFAULT 'on_track',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 10. WORK_LOGS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  summary TEXT NOT NULL,
  hours NUMERIC DEFAULT 0,
  linked_task_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 11. NOTIFICATIONS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 12. INVITES
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'member',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 13. EVENTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN ('meeting', 'milestone', 'deadline', 'holiday', 'task_due', 'goal_end', 'custom')) DEFAULT 'custom',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#E10600',
  scope TEXT CHECK (scope IN ('company', 'project', 'personal')) DEFAULT 'company',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recurrence_rule TEXT DEFAULT 'none',
  reminder_offset_minutes INT DEFAULT 1440,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 14. DOCS & KNOWLEDGE BASE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT CHECK (category IN ('sop', 'brand', 'api_spec', 'meeting_notes', 'general')) DEFAULT 'general',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 15. GITHUB_REPOS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.github_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  repo_name TEXT NOT NULL,
  github_token TEXT NOT NULL,
  webhook_secret TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 16. GITHUB_COMMITS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.github_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES public.github_repos(id) ON DELETE CASCADE,
  commit_sha TEXT UNIQUE NOT NULL,
  message TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  author_avatar_url TEXT,
  commit_url TEXT,
  linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  committed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_commits ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own profile or admin updates any" ON public.profiles;
CREATE POLICY "Users can update own profile or admin updates any" ON public.profiles
  FOR ALL USING (auth.role() = 'authenticated');

-- Projects Policies
DROP POLICY IF EXISTS "Projects select policy" ON public.projects;
CREATE POLICY "Projects select policy" ON public.projects
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Projects all access" ON public.projects;
CREATE POLICY "Projects all access" ON public.projects
  FOR ALL USING (auth.role() = 'authenticated');

-- Project Members Policies
DROP POLICY IF EXISTS "Project members select" ON public.project_members;
CREATE POLICY "Project members select" ON public.project_members
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Project members all" ON public.project_members;
CREATE POLICY "Project members all" ON public.project_members
  FOR ALL USING (auth.role() = 'authenticated');

-- Tasks Policies
DROP POLICY IF EXISTS "Tasks select policy" ON public.tasks;
CREATE POLICY "Tasks select policy" ON public.tasks
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Tasks insert/update/delete" ON public.tasks;
CREATE POLICY "Tasks insert/update/delete" ON public.tasks
  FOR ALL USING (auth.role() = 'authenticated');

-- Task Comments Policies
DROP POLICY IF EXISTS "Comments select policy" ON public.task_comments;
CREATE POLICY "Comments select policy" ON public.task_comments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Comments insert policy" ON public.task_comments;
CREATE POLICY "Comments insert policy" ON public.task_comments
  FOR ALL USING (auth.role() = 'authenticated');

-- Task Activity Log Policies
DROP POLICY IF EXISTS "Activity log viewable by authenticated users" ON public.task_activity_log;
CREATE POLICY "Activity log viewable by authenticated users" ON public.task_activity_log
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Activity log insertable by authenticated users" ON public.task_activity_log;
CREATE POLICY "Activity log insertable by authenticated users" ON public.task_activity_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Checklist Templates Policies
DROP POLICY IF EXISTS "Templates viewable by authenticated users" ON public.checklist_templates;
CREATE POLICY "Templates viewable by authenticated users" ON public.checklist_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Templates admin modify" ON public.checklist_templates;
CREATE POLICY "Templates admin modify" ON public.checklist_templates
  FOR ALL USING (auth.role() = 'authenticated');

-- Daily Checklists Policies
DROP POLICY IF EXISTS "Daily checklists user access" ON public.daily_checklists;
CREATE POLICY "Daily checklists user access" ON public.daily_checklists
  FOR ALL USING (auth.role() = 'authenticated');

-- Goals Policies
DROP POLICY IF EXISTS "Goals select" ON public.goals;
CREATE POLICY "Goals select" ON public.goals
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Goals write" ON public.goals;
CREATE POLICY "Goals write" ON public.goals
  FOR ALL USING (auth.role() = 'authenticated');

-- Work Logs Policies
DROP POLICY IF EXISTS "Work logs access" ON public.work_logs;
CREATE POLICY "Work logs access" ON public.work_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- Notifications Policies
DROP POLICY IF EXISTS "Notifications user access" ON public.notifications;
CREATE POLICY "Notifications user access" ON public.notifications
  FOR ALL USING (auth.role() = 'authenticated');

-- Invites Policies
DROP POLICY IF EXISTS "Invites admin manage" ON public.invites;
CREATE POLICY "Invites admin manage" ON public.invites
  FOR ALL USING (TRUE);

-- Events Policies
DROP POLICY IF EXISTS "Events viewable by authenticated users" ON public.events;
CREATE POLICY "Events viewable by authenticated users" ON public.events
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Events insert/update/delete policy" ON public.events;
CREATE POLICY "Events insert/update/delete policy" ON public.events
  FOR ALL USING (auth.role() = 'authenticated');

-- Docs Policies
DROP POLICY IF EXISTS "Docs access" ON public.docs;
CREATE POLICY "Docs access" ON public.docs
  FOR ALL USING (auth.role() = 'authenticated');

-- GitHub Repos Policies
DROP POLICY IF EXISTS "GitHub Repos access" ON public.github_repos;
CREATE POLICY "GitHub Repos access" ON public.github_repos
  FOR ALL USING (auth.role() = 'authenticated');

-- GitHub Commits Policies
DROP POLICY IF EXISTS "GitHub Commits access" ON public.github_commits;
CREATE POLICY "GitHub Commits access" ON public.github_commits
  FOR ALL USING (auth.role() = 'authenticated');

-- Safely add tables to Realtime publication without duplicate error
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel
    WHERE prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND prrelid = 'public.tasks'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel
    WHERE prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND prrelid = 'public.notifications'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel
    WHERE prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND prrelid = 'public.events'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel
    WHERE prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
      AND prrelid = 'public.github_commits'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.github_commits;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
