'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Task, Profile, TaskComment, TaskActivityLog, TaskPriority, TaskStatus, GitHubCommit } from '@/types';
import { TiptapEditor } from '@/components/ui/tiptap-editor';
import { X, Calendar, User, Clock, Tag, MessageSquare, History, CheckCircle2, AlertTriangle, Send, GitCommit, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  teamMembers: Profile[];
  onTaskUpdated: () => void;
  currentUserId?: string;
}

export function TaskModal({
  task,
  isOpen,
  onClose,
  teamMembers,
  onTaskUpdated,
  currentUserId,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState<number>(0);
  const [actualHours, setActualHours] = useState<number>(0);
  const [tagsStr, setTagsStr] = useState('');

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activityLogs, setActivityLogs] = useState<TaskActivityLog[]>([]);
  const [linkedCommits, setLinkedCommits] = useState<GitHubCommit[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'commits' | 'activity'>('comments');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'medium');
      setAssigneeId(task.assignee_id || '');
      setDueDate(task.due_date || '');
      setEstimatedHours(task.estimated_hours || 0);
      setActualHours(task.actual_hours || 0);
      setTagsStr((task.tags || []).join(', '));

      fetchCommentsAndActivity(task.id);
    }
  }, [task]);

  const fetchCommentsAndActivity = async (taskId: string) => {
    const { data: commentsData } = await supabase
      .from('task_comments')
      .select('*, author:profiles(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (commentsData) setComments(commentsData as any);

    const { data: activityData } = await supabase
      .from('task_activity_log')
      .select('*, actor:profiles(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (activityData) setActivityLogs(activityData as any);

    let { data: commitData, error: commitErr } = await supabase
      .from('github_commits')
      .select('*')
      .eq('linked_task_id', taskId)
      .order('committed_at', { ascending: false });

    if (commitErr) {
      console.warn('Task commits query warning:', commitErr.message);
    }
    if (commitData) setLinkedCommits(commitData as any);
  };

  if (!isOpen || !task) return null;

  const handleSave = async () => {
    setSaving(true);
    const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);

    const statusChanged = task.status !== status;
    const assigneeChanged = task.assignee_id !== assigneeId;

    const { error } = await supabase
      .from('tasks')
      .update({
        title,
        description,
        status,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        estimated_hours: Number(estimatedHours),
        actual_hours: Number(actualHours),
        tags,
      })
      .eq('id', task.id);

    if (!error) {
      if (statusChanged && currentUserId) {
        await supabase.from('task_activity_log').insert({
          task_id: task.id,
          actor_id: currentUserId,
          action: `status_changed`,
          meta: { from: task.status, to: status },
        });
      }
      if (assigneeChanged && currentUserId) {
        await supabase.from('task_activity_log').insert({
          task_id: task.id,
          actor_id: currentUserId,
          action: `reassigned`,
          meta: { assignee_id: assigneeId },
        });

        if (assigneeId) {
          await supabase.from('notifications').insert({
            user_id: assigneeId,
            type: 'task_assigned',
            payload: {
              title: 'Task Assigned',
              message: `You were assigned to "${title}"`,
              task_id: task.id,
            },
          });
        }
      }

      onTaskUpdated();
      setSaving(false);
      onClose();
    } else {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId) return;

    const mentionRegex = /@(\w+)/g;
    const matches = Array.from(newComment.matchAll(mentionRegex));
    const mentionedNames = matches.map((m) => m[1].toLowerCase());

    const mentionedUserIds = teamMembers
      .filter((m) => mentionedNames.some((name) => m.full_name.toLowerCase().includes(name)))
      .map((m) => m.id);

    const { data: insertedComment } = await supabase
      .from('task_comments')
      .insert({
        task_id: task.id,
        author_id: currentUserId,
        body: newComment,
        mentions: mentionedUserIds,
      })
      .select('*, author:profiles(*)')
      .single();

    if (insertedComment) {
      setComments((prev) => [...prev, insertedComment as any]);
      setNewComment('');

      for (const userId of mentionedUserIds) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'mention',
          payload: {
            title: 'You were mentioned in a comment',
            message: `Mentioned in "${title}"`,
            task_id: task.id,
          },
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#262626] bg-[#0A0A0A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#E10600] px-2 py-0.5 rounded bg-[#E10600]/10 border border-[#E10600]/30">
              TASK-{task.id.substring(0, 6).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-[#E10600]/20 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#737373] hover:text-white rounded-lg hover:bg-[#262626]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task Title..."
                className="w-full bg-transparent text-xl font-bold text-white placeholder-[#525252] outline-none border-b border-transparent focus:border-[#E10600] py-1 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">
                Description & Notes
              </label>
              <TiptapEditor
                content={description}
                onChange={(html) => setDescription(html)}
              />
            </div>

            {/* Comments, GitHub Commits & Activity Tab Container */}
            <div className="border border-[#262626] rounded-xl bg-[#0A0A0A] overflow-hidden">
              <div className="flex border-b border-[#262626] bg-[#141414]">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                    activeTab === 'comments'
                      ? 'border-[#E10600] text-white bg-[#0A0A0A]'
                      : 'border-transparent text-[#737373] hover:text-[#A3A3A3]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Comments ({comments.length})
                </button>
                <button
                  onClick={() => setActiveTab('commits')}
                  className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                    activeTab === 'commits'
                      ? 'border-[#E10600] text-white bg-[#0A0A0A]'
                      : 'border-transparent text-[#737373] hover:text-[#A3A3A3]'
                  }`}
                >
                  <GitCommit className="w-3.5 h-3.5 text-[#E10600]" /> Commits ({linkedCommits.length})
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                    activeTab === 'activity'
                      ? 'border-[#E10600] text-white bg-[#0A0A0A]'
                      : 'border-transparent text-[#737373] hover:text-[#A3A3A3]'
                  }`}
                >
                  <History className="w-3.5 h-3.5" /> Activity Log ({activityLogs.length})
                </button>
              </div>

              <div className="p-4">
                {activeTab === 'comments' && (
                  <div className="space-y-4">
                    <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                      {comments.length === 0 ? (
                        <p className="text-xs text-[#737373] text-center py-4">
                          No comments yet. Type below and use @name to mention a teammate.
                        </p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="p-3 bg-[#141414] border border-[#262626] rounded-lg text-xs space-y-1">
                            <div className="flex items-center justify-between text-[#A3A3A3]">
                              <span className="font-semibold text-white">
                                {c.author?.full_name || 'Team Member'}
                              </span>
                              <span className="text-[10px] text-[#737373]">{formatDate(c.created_at)}</span>
                            </div>
                            <div
                              className="text-[#E5E5E5] prose prose-invert max-w-none text-xs"
                              dangerouslySetInnerHTML={{ __html: c.body }}
                            />
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-[#262626]">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment... Use @name to mention"
                        className="flex-1 bg-[#141414] border border-[#262626] focus:border-[#E10600] rounded-lg px-3 py-2 text-xs text-white placeholder-[#525252] outline-none"
                      />
                      <button
                        type="submit"
                        className="bg-[#E10600] hover:bg-[#FF3B3B] text-white p-2 rounded-lg text-xs font-semibold transition flex items-center justify-center"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}

                {activeTab === 'commits' && (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {linkedCommits.length === 0 ? (
                      <p className="text-xs text-[#737373] text-center py-4">
                        No GitHub commits linked to this task yet. Include <code className="text-[#E10600]">#{task.id.split('-')[0]}</code> in your git commit message!
                      </p>
                    ) : (
                      linkedCommits.map((commit) => (
                        <div key={commit.id} className="p-3 bg-[#141414] border border-[#262626] rounded-lg text-xs space-y-1 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[#E10600] font-bold">
                                {commit.commit_sha.substring(0, 7)}
                              </span>
                              <span className="font-semibold text-white">{commit.message}</span>
                            </div>
                            <p className="text-[10px] text-[#A3A3A3]">
                              By {commit.author_name} ({commit.author_email}) on {formatDate(commit.committed_at)}
                            </p>
                          </div>
                          {commit.commit_url && (
                            <a
                              href={commit.commit_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#E10600] hover:text-[#FF3B3B] p-1 rounded hover:bg-[#262626]"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {activityLogs.length === 0 ? (
                      <p className="text-xs text-[#737373] text-center py-4">No activity logged yet.</p>
                    ) : (
                      activityLogs.map((log) => (
                        <div key={log.id} className="text-xs text-[#A3A3A3] flex items-center justify-between py-1 border-b border-[#1F1F1F]">
                          <span>
                            <strong className="text-white">{log.actor?.full_name || 'System'}</strong> {log.action.replace('_', ' ')}
                            {log.meta?.to ? ` to "${log.meta.to}"` : ''}
                          </span>
                          <span className="text-[10px] text-[#737373]">{formatDate(log.created_at)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Attributes Column */}
          <div className="space-y-4 bg-[#0A0A0A] p-4 rounded-xl border border-[#262626]">
            <div>
              <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-[#141414] border border-[#262626] focus:border-[#E10600] text-white rounded-lg p-2 text-xs outline-none capitalize"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-[#141414] border border-[#262626] focus:border-[#E10600] text-white rounded-lg p-2 text-xs outline-none capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent 🔥</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] focus:border-[#E10600] text-white rounded-lg p-2 text-xs outline-none"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] focus:border-[#E10600] text-white rounded-lg p-2 text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-wider mb-1">
                  Est. Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number(e.target.value))}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#E10600] text-white rounded-lg p-2 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#737373] uppercase tracking-wider mb-1">
                  Actual Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={actualHours}
                  onChange={(e) => setActualHours(Number(e.target.value))}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#E10600] text-white rounded-lg p-2 text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="frontend, api, bug"
                className="w-full bg-[#141414] border border-[#262626] focus:border-[#E10600] text-white rounded-lg p-2 text-xs outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
