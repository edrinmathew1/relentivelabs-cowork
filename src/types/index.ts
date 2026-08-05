export type UserRole = 'admin' | 'member';
export type UserStatus = 'active' | 'invited' | 'deactivated';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  title?: string;
  avatar_url?: string;
  timezone?: string;
  status: UserStatus;
  invited_by?: string;
  invited_at?: string;
  joined_at: string;
  created_at: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'shipped';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id?: string;
  owner?: Profile;
  start_date?: string;
  target_date?: string;
  created_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  project_id: string;
  project?: Project;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  assignee?: Profile;
  created_by?: string;
  creator?: Profile;
  due_date?: string;
  estimated_hours: number;
  actual_hours: number;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  author?: Profile;
  body: string;
  mentions: string[];
  created_at: string;
}

export interface TaskActivityLog {
  id: string;
  task_id: string;
  actor_id: string;
  actor?: Profile;
  action: string;
  meta: Record<string, any>;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed?: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  role: string;
  items: ChecklistItem[];
  created_at: string;
}

export interface DailyChecklist {
  id: string;
  user_id: string;
  date: string;
  items: ChecklistItem[];
  completed_count: number;
  total_count: number;
  is_complete: boolean;
  created_at: string;
}

export type GoalStatus = 'on_track' | 'at_risk' | 'off_track' | 'done';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  scope: 'company' | 'individual';
  owner_id?: string;
  owner?: Profile;
  period: string;
  progress: number;
  target_value: number;
  current_value: number;
  linked_project_id?: string;
  linked_project?: Project;
  status: GoalStatus;
  created_at: string;
}

export interface WorkLog {
  id: string;
  user_id: string;
  user?: Profile;
  date: string;
  summary: string;
  hours: number;
  linked_task_ids: string[];
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, any>;
  read: boolean;
  created_at: string;
}

export interface Invite {
  id: string;
  email: string;
  token: string;
  invited_by?: string;
  role: UserRole;
  expires_at: string;
  accepted: boolean;
  created_at: string;
}

export type EventType = 'meeting' | 'milestone' | 'deadline' | 'holiday' | 'task_due' | 'goal_end' | 'custom';
export type EventScope = 'company' | 'project' | 'personal';
export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_at: string;
  end_at?: string;
  all_day: boolean;
  color: string;
  scope: EventScope;
  project_id?: string;
  project?: Project;
  created_by: string;
  creator?: Profile;
  recurrence_rule: RecurrenceRule;
  reminder_offset_minutes: number;
  reminder_sent: boolean;
  created_at: string;
}

export type DocCategory = 'sop' | 'brand' | 'api_spec' | 'meeting_notes' | 'general';

export interface Doc {
  id: string;
  title: string;
  content: string;
  category: DocCategory;
  project_id?: string;
  project?: Project;
  author_id?: string;
  author?: Profile;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: string;
  project_id: string;
  project?: Project;
  repo_name: string;
  github_token: string;
  webhook_secret?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubCommit {
  id: string;
  repo_id: string;
  commit_sha: string;
  message: string;
  author_name?: string;
  author_email?: string;
  author_avatar_url?: string;
  commit_url?: string;
  linked_task_id?: string;
  linked_task?: Task;
  committed_at: string;
  created_at: string;
}
