'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Task, TaskStatus, Profile, Project } from '@/types';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskModal } from '@/components/tasks/task-modal';
import { LayoutGrid, List, Calendar as CalendarIcon, Plus, Filter, Flame, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('tasks-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);

      const { data: projectsData } = await supabase.from('projects').select('*');
      if (projectsData) setProjects(projectsData as any);

      let { data: tasksData, error: taskErr } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*), project:projects!project_id(*)')
        .order('position', { ascending: true });

      if (taskErr || !tasksData) {
        const { data: fallbackTasks } = await supabase
          .from('tasks')
          .select('*')
          .order('position', { ascending: true });
        tasksData = fallbackTasks;
      }

      if (tasksData) setTasks(tasksData as any);

      const { data: teamData } = await supabase.from('profiles').select('*').eq('status', 'active');
      if (teamData) setTeamMembers(teamData as any);
    } catch (err) {
      console.error('Fetch initial tasks error:', err);
    }
  };

  const handleTaskMove = async (taskId: string, newStatus: TaskStatus, newPosition: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, position: newPosition } : t))
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, position: newPosition })
        .eq('id', taskId);

      if (!error && currentUserId) {
        await supabase.from('task_activity_log').insert({
          task_id: taskId,
          actor_id: currentUserId,
          action: 'status_changed',
          meta: { to: newStatus },
        });
      }
    } catch (err) {
      console.error('Task move DB error:', err);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  const handleCreateNewTask = async (defaultStatus: TaskStatus = 'todo') => {
    setErrorMsg(null);

    try {
      let targetProjectId = projects.length > 0 ? projects[0].id : null;

      if (!targetProjectId) {
        const { data: autoProject, error: projErr } = await supabase
          .from('projects')
          .insert({
            name: 'General Agency Board',
            description: 'Default project track',
            status: 'active',
            owner_id: currentUserId || null,
          })
          .select()
          .single();

        if (projErr || !autoProject) {
          throw new Error('Failed to create project for task. ' + (projErr?.message || ''));
        }

        targetProjectId = autoProject.id;
        setProjects([autoProject as any]);
      }

      const { data: newTask, error: insertErr } = await supabase
        .from('tasks')
        .insert({
          title: 'New Agency Task',
          status: defaultStatus,
          project_id: targetProjectId,
          created_by: currentUserId || null,
          priority: 'medium',
        })
        .select('*')
        .single();

      if (insertErr || !newTask) {
        throw new Error(insertErr?.message || 'Failed to insert task');
      }

      if (newTask) {
        setTasks((prev) => [...prev, newTask as any]);
        setSelectedTask(newTask as any);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      console.error('Create task error:', err);
      setErrorMsg(err.message || 'Could not add task.');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterProject !== 'all' && t.project_id !== filterProject) return false;
    if (filterAssignee !== 'all' && t.assignee_id !== filterAssignee) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Tasks Board</h1>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Realtime Kanban drag-and-drop, Trash delete zone & compact task view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher Tabs */}
          <div className="flex items-center p-1 bg-[#141414] border border-[#262626] rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'kanban' ? 'bg-[#E10600] text-white shadow-sm' : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'list' ? 'bg-[#E10600] text-white shadow-sm' : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'calendar' ? 'bg-[#E10600] text-white shadow-sm' : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>

          {/* Create Task Button */}
          <button
            onClick={() => handleCreateNewTask('todo')}
            className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#E10600]/20 transition"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-[#7A0000]/30 border border-[#E10600] text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-2.5 bg-[#141414] border border-[#262626] rounded-lg text-xs">
        <Filter className="w-3.5 h-3.5 text-[#E10600]" />
        <span className="font-semibold text-[#A3A3A3]">Filter:</span>

        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="bg-[#0A0A0A] border border-[#262626] text-white rounded px-2 py-1 outline-none"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="bg-[#0A0A0A] border border-[#262626] text-white rounded px-2 py-1 outline-none"
        >
          <option value="all">All Assignees</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
      </div>

      {/* View Modes */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskMove={handleTaskMove}
          onTaskClick={(t) => {
            setSelectedTask(t);
            setIsModalOpen(true);
          }}
          onAddTask={(status) => handleCreateNewTask(status)}
          onTaskDelete={handleTaskDelete}
        />
      )}

      {viewMode === 'list' && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-[#E5E5E5]">
            <thead className="bg-[#0A0A0A] border-b border-[#262626] uppercase text-[10px] text-[#A3A3A3]">
              <tr>
                <th className="p-3 font-semibold">Task Title</th>
                <th className="p-3 font-semibold">Project</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Priority</th>
                <th className="p-3 font-semibold">Assignee</th>
                <th className="p-3 font-semibold">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {filteredTasks.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => {
                    setSelectedTask(t);
                    setIsModalOpen(true);
                  }}
                  className="hover:bg-[#1A1A1A] cursor-pointer transition"
                >
                  <td className="p-3 font-medium text-white">{t.title}</td>
                  <td className="p-3 text-[#A3A3A3]">{t.project?.name || 'General'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-[#0A0A0A] border border-[#262626] capitalize">
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 capitalize font-semibold font-mono text-[#E10600]">
                    {t.priority}
                  </td>
                  <td className="p-3 text-[#A3A3A3]">{t.assignee?.full_name || 'Unassigned'}</td>
                  <td className="p-3 text-[#737373]">{formatDate(t.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 text-center">
          <CalendarIcon className="w-8 h-8 text-[#E10600] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white mb-1">Calendar Schedule View</h3>
          <p className="text-xs text-[#A3A3A3] mb-4">Showing tasks scheduled by due date.</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-left">
            {filteredTasks.filter((t) => t.due_date).map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTask(t);
                  setIsModalOpen(true);
                }}
                className="p-3 bg-[#0A0A0A] border border-[#262626] hover:border-[#E10600] rounded-lg cursor-pointer transition"
              >
                <span className="text-[10px] text-[#E10600] font-mono font-bold block mb-1">
                  📅 {formatDate(t.due_date)}
                </span>
                <p className="text-xs font-semibold text-white line-clamp-1">{t.title}</p>
                <span className="text-[10px] text-[#737373] capitalize mt-1 block">{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teamMembers={teamMembers}
        onTaskUpdated={fetchInitialData}
        currentUserId={currentUserId}
      />
    </div>
  );
}
