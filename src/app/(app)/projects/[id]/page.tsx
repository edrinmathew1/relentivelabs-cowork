'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Project, Task, Profile, TaskStatus, ProjectStatus } from '@/types';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskModal } from '@/components/tasks/task-modal';
import { Calendar, Users, Plus, ArrowLeft, FolderKanban, CheckCircle2, UserCheck, Shield, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Active Tab View State inside Project
  const [activeTab, setActiveTab] = useState<'board' | 'available' | 'workload'>('board');

  const supabase = createClient();

  useEffect(() => {
    if (projectId) fetchProjectAndTasks();
  }, [projectId]);

  const fetchProjectAndTasks = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);

      let { data: projectData, error: projErr } = await supabase
        .from('projects')
        .select('*, owner:profiles!owner_id(*)')
        .eq('id', projectId)
        .maybeSingle();

      if (projErr || !projectData) {
        const { data: fallbackProject } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .maybeSingle();
        projectData = fallbackProject;
      }

      if (projectData) setProject(projectData as any);

      let { data: tasksData, error: taskErr } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(*)')
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (taskErr || !tasksData) {
        const { data: fallbackTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId)
          .order('position', { ascending: true });
        tasksData = fallbackTasks;
      }

      if (tasksData) setTasks(tasksData as any);

      const { data: teamData } = await supabase.from('profiles').select('*').eq('status', 'active');
      if (teamData) setTeamMembers(teamData as any);
    } catch (err) {
      console.error('Fetch project detail error:', err);
    }
    setLoading(false);
  };

  // Header Attribute Change Handlers
  const handleUpdateProjectStatus = async (newStatus: ProjectStatus) => {
    if (!project) return;
    setProject({ ...project, status: newStatus });
    await supabase.from('projects').update({ status: newStatus }).eq('id', project.id);
  };

  const handleUpdateTargetDate = async (newDate: string) => {
    if (!project) return;
    setProject({ ...project, target_date: newDate });
    await supabase.from('projects').update({ target_date: newDate }).eq('id', project.id);
  };

  const handleUpdateOwner = async (newOwnerId: string) => {
    if (!project) return;
    const newOwner = teamMembers.find((m) => m.id === newOwnerId);
    setProject({ ...project, owner_id: newOwnerId, owner: newOwner });
    await supabase.from('projects').update({ owner_id: newOwnerId }).eq('id', project.id);
  };

  const handleTaskMove = async (taskId: string, newStatus: TaskStatus, newPosition: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, position: newPosition } : t))
    );
    try {
      await supabase.from('tasks').update({ status: newStatus, position: newPosition }).eq('id', taskId);
    } catch (err) {
      console.error('Task move error:', err);
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

  const handleCreateTask = async (status: TaskStatus = 'todo', titleOverride?: string) => {
    if (!projectId) return;
    try {
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title: titleOverride || 'New Project Task',
          status,
          created_by: currentUserId,
          priority: 'medium',
        })
        .select('*')
        .single();

      if (newTask) {
        setTasks((prev) => [...prev, newTask as any]);
        setSelectedTask(newTask as any);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Create task error:', err);
    }
  };

  // 1-Click Task Claiming Handler
  const handleClaimTask = async (taskId: string) => {
    if (!currentUserId) return;
    const me = teamMembers.find((m) => m.id === currentUserId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignee_id: currentUserId, assignee: me } : t))
    );
    await supabase.from('tasks').update({ assignee_id: currentUserId }).eq('id', taskId);
  };

  const handleAssignTask = async (taskId: string, assigneeId: string) => {
    const assignee = teamMembers.find((m) => m.id === assigneeId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignee_id: assigneeId, assignee } : t))
    );
    await supabase.from('tasks').update({ assignee_id: assigneeId }).eq('id', taskId);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#A3A3A3] animate-pulse">
        Loading project board...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-[#141414] border border-[#262626] rounded-xl text-center space-y-3">
        <FolderKanban className="w-8 h-8 text-[#737373] mx-auto" />
        <h2 className="text-sm font-bold text-white">Project Not Found</h2>
        <p className="text-xs text-[#A3A3A3]">This project may have been deleted or moved.</p>
        <Link href="/projects" className="inline-block px-4 py-2 bg-[#E10600] text-white text-xs font-bold rounded-lg">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#E10600] mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{project.name}</h1>
          <p className="text-xs text-[#A3A3A3] mt-0.5">{project.description || 'No description'}</p>
        </div>

        <button
          onClick={() => handleCreateTask('todo')}
          className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E10600]/20 transition self-start"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Interactive Clickable Project Header Banner */}
      <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs text-[#A3A3A3]">
        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">Status:</span>
          <select
            value={project.status}
            onChange={(e) => handleUpdateProjectStatus(e.target.value as ProjectStatus)}
            className="bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] text-white rounded-lg px-2.5 py-1 text-xs outline-none capitalize cursor-pointer font-bold"
          >
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="shipped">Shipped</option>
          </select>
        </div>

        {/* Target Date Picker */}
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#E10600]" />
          <span>Target Date:</span>
          <input
            type="date"
            value={project.target_date || ''}
            onChange={(e) => handleUpdateTargetDate(e.target.value)}
            className="bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] text-white rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer"
          />
        </div>

        {/* Owner Selector */}
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-[#E10600]" />
          <span>Owner:</span>
          <select
            value={project.owner_id || ''}
            onChange={(e) => handleUpdateOwner(e.target.value)}
            className="bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] text-white rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer"
          >
            <option value="">Unassigned Owner</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Project View Tabs Header */}
      <div className="flex items-center p-1 bg-[#141414] border border-[#262626] rounded-xl text-xs w-fit">
        <button
          onClick={() => setActiveTab('board')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
            activeTab === 'board' ? 'bg-[#E10600] text-white shadow-md' : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> Kanban Board
        </button>

        <button
          onClick={() => setActiveTab('available')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
            activeTab === 'available' ? 'bg-[#E10600] text-white shadow-md' : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          <List className="w-4 h-4" /> Available Tasks Pool & Claim Hub
        </button>

        <button
          onClick={() => setActiveTab('workload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
            activeTab === 'workload' ? 'bg-[#E10600] text-white shadow-md' : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Team Workload Distribution
        </button>
      </div>

      {/* Tab 1: Kanban Board */}
      {activeTab === 'board' && (
        <KanbanBoard
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onTaskClick={(t) => {
            setSelectedTask(t);
            setIsModalOpen(true);
          }}
          onAddTask={(status) => handleCreateTask(status)}
          onTaskDelete={handleTaskDelete}
        />
      )}

      {/* Tab 2: Available Tasks Pool & Claim Hub */}
      {activeTab === 'available' && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <List className="w-4 h-4 text-[#E10600]" />
                Available Project Tasks Pool
              </h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Define tasks for team members to pick up or 1-click claim for yourself.
              </p>
            </div>
            <button
              onClick={() => handleCreateTask('todo')}
              className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Define New Task
            </button>
          </div>

          <div className="divide-y divide-[#262626] border border-[#262626] rounded-xl overflow-hidden bg-[#0A0A0A]">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#737373]">
                No tasks created for this project yet. Click &quot;Define New Task&quot; above!
              </div>
            ) : (
              tasks.map((t) => (
                <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#141414] transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{t.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                        t.status === 'done'
                          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500'
                          : 'bg-[#141414] text-[#E5E5E5] border border-[#262626]'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A3A3A3] line-clamp-1">{t.description || 'No description'}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Assignee Selector */}
                    <select
                      value={t.assignee_id || ''}
                      onChange={(e) => handleAssignTask(t.id, e.target.value)}
                      className="bg-[#141414] border border-[#262626] text-white rounded-lg px-2.5 py-1 text-xs outline-none"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>

                    {/* 1-Click Claim Task Button */}
                    {t.assignee_id !== currentUserId && t.status !== 'done' && (
                      <button
                        onClick={() => handleClaimTask(t.id)}
                        className="px-3 py-1 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-sm"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Claim Task
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Team Workload Distribution */}
      {activeTab === 'workload' && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="border-b border-[#262626] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E10600]" />
              Team Workload & Task Allocation
            </h3>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Assigned tasks breakdown per team member for {project.name}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member) => {
              const assignedTasks = tasks.filter((t) => t.assignee_id === member.id);
              const doneTasks = assignedTasks.filter((t) => t.status === 'done').length;

              return (
                <div key={member.id} className="p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{member.full_name}</h4>
                    <span className="text-[10px] font-mono text-[#E10600]">
                      {doneTasks}/{assignedTasks.length} Done
                    </span>
                  </div>

                  <div className="w-full bg-[#141414] h-2 rounded-full overflow-hidden border border-[#262626]">
                    <div
                      className="bg-[#E10600] h-full transition-all duration-300"
                      style={{
                        width: `${assignedTasks.length > 0 ? (doneTasks / assignedTasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <p className="text-[10px] text-[#A3A3A3]">
                    {assignedTasks.length === 0 ? 'No tasks assigned' : `${assignedTasks.length} task(s) allocated`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teamMembers={teamMembers}
        onTaskUpdated={fetchProjectAndTasks}
        currentUserId={currentUserId}
      />
    </div>
  );
}
