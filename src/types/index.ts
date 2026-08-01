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
  joined_at?: string;
  created_at?: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'shipped';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id?: string;
  start_date?: string;
  target_date?: string;
  created_at?: string;
  owner?: Profile;
  members?: Profile[];
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  created_by?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  tags?: string[];
  position: number;
  created_at?: string;
  updated_at?: string;
  assignee?: Profile;
  project?: Project;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  mentions?: string[];
  created_at: string;
  author?: Profile;
}

export interface TaskActivityLog {
  id: string;
  task_id: string;
  actor_id: string;
  action: string;
  meta?: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  completed_at?: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  role: string;
  items: { id: string; label: string }[];
  created_at?: string;
}

export interface DailyChecklist {
  id: string;
  user_id: string;
  date: string;
  items: ChecklistItem[];
  completed_count: number;
  total_count: number;
  is_complete: boolean;
  created_at?: string;
}

export type GoalScope = 'company' | 'individual';
export type GoalStatus = 'on_track' | 'at_risk' | 'off_track' | 'done';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  scope: GoalScope;
  owner_id?: string;
  period: string;
  progress: number;
  target_value: number;
  current_value: number;
  linked_project_id?: string;
  status: GoalStatus;
  created_at?: string;
  owner?: Profile;
  linked_project?: Project;
}

export interface WorkLog {
  id: string;
  user_id: string;
  date: string;
  summary: string;
  hours: number;
  linked_task_ids?: string[];
  created_at?: string;
  user?: Profile;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'mention' | 'reminder' | 'digest' | 'goal_status';
  payload: Record<string, unknown>;
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
  color?: string;
  scope: EventScope;
  project_id?: string;
  created_by: string;
  recurrence_rule: RecurrenceRule;
  reminder_offset_minutes?: number;
  reminder_sent?: boolean;
  created_at?: string;
  project?: Project;
  creator?: Profile;
}
