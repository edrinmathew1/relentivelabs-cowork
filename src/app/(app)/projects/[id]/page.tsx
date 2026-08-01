'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Project, Task, Profile, TaskStatus } from '@/types';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskModal } from '@/components/tasks/task-modal';
import { Calendar, Users, Plus, ArrowLeft, FolderKanban } from 'lucide-react';
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

  const supabase = createClient();

  useEffect(() => {
    if (projectId) fetchProjectAndTasks();
  }, [projectId]);

  const fetchProjectAndTasks = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);

      // Resilient Project query with fallback
      let { data: projectData, error: projErr } = await supabase
        .from('projects')
        .select('*, owner:profiles!owner_id(*)')
        .eq('id', projectId)
        .maybeSingle();

      if (projErr || !projectData) {
        console.warn('Project detail join fallback:', projErr);
        const { data: fallbackProject } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .maybeSingle();
        projectData = fallbackProject;
      }

      if (projectData) setProject(projectData as any);

      // Resilient Tasks query with fallback
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

  const handleCreateTask = async (status: TaskStatus = 'todo') => {
    if (!projectId) return;
    try {
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title: 'New Project Task',
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
          <Plus className="w-4 h-4" /> Add Project Task
        </button>
      </div>

      {/* Project Metadata Banner */}
      <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs text-[#A3A3A3]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">Status:</span>
          <span className="px-2 py-0.5 rounded bg-[#0A0A0A] border border-[#262626] text-white capitalize">
            {project.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#E10600]" />
          <span>Target Date: {formatDate(project.target_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-[#E10600]" />
          <span>Owner: {project.owner?.full_name || 'Team'}</span>
        </div>
      </div>

      {/* Project Kanban Board */}
      <KanbanBoard
        tasks={tasks}
        onTaskMove={handleTaskMove}
        onTaskClick={(t) => {
          setSelectedTask(t);
          setIsModalOpen(true);
        }}
        onAddTask={(status) => handleCreateTask(status)}
      />

      {/* Task Modal */}
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
