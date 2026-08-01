'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Project, Profile, ProjectStatus } from '@/types';
import Link from 'next/link';
import { Plus, FolderKanban, Calendar, Users, ArrowRight, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('planning');
  const [targetDate, setTargetDate] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchProjectsAndTeam();
  }, []);

  const fetchProjectsAndTeam = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
    }

    const { data: projectsData, error: projErr } = await supabase
      .from('projects')
      .select('*, owner:profiles(*)')
      .order('created_at', { ascending: false });

    if (projErr) console.error('Fetch projects error:', projErr);
    if (projectsData) setProjects(projectsData as any);

    const { data: teamData } = await supabase.from('profiles').select('*').eq('status', 'active');
    if (teamData) setTeamMembers(teamData as any);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          name,
          description,
          status,
          owner_id: currentUserId || null,
          target_date: targetDate || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (newProject) {
        if (selectedMembers.length > 0) {
          const memberRows = selectedMembers.map((userId) => ({
            project_id: newProject.id,
            user_id: userId,
          }));
          await supabase.from('project_members').insert(memberRows);
        }

        setName('');
        setDescription('');
        setSelectedMembers([]);
        setIsModalOpen(false);
        fetchProjectsAndTeam();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create project');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-[#E10600]" />
            Agency Projects
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Active SaaS client builds, internal products & system architecture tracks.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E10600]/20 transition"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#E10600]/50 rounded-xl p-5 transition flex flex-col justify-between group shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0A0A0A] border border-[#262626] text-[#E5E5E5] group-hover:border-[#E10600]/50 transition">
                  {project.status.replace('_', ' ')}
                </span>
                <ArrowRight className="w-4 h-4 text-[#737373] group-hover:text-[#E10600] transition" />
              </div>

              <h2 className="text-lg font-bold text-white group-hover:text-[#FF3B3B] transition mb-1">
                {project.name}
              </h2>
              <p className="text-xs text-[#A3A3A3] line-clamp-2 mb-4">
                {project.description || 'No project description provided.'}
              </p>
            </div>

            <div className="pt-4 border-t border-[#262626] flex items-center justify-between text-xs text-[#737373]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#E10600]" />
                <span>Target: {formatDate(project.target_date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{project.owner?.full_name || 'Team'}</span>
              </div>
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full p-12 text-center bg-[#141414] border border-[#262626] rounded-xl">
            <FolderKanban className="w-10 h-10 text-[#737373] mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No projects created yet</p>
            <p className="text-xs text-[#A3A3A3] mt-1">Click &quot;New Project&quot; to create your first client build track.</p>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-base font-bold text-white">Create New Agency Project</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#737373] hover:text-white">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#7A0000]/30 border border-[#E10600] text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#E10600] shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Relentive OS SaaS Build"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Core objective, key deliverables, stack details..."
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none capitalize"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="shipped">Shipped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Assign Team Members</label>
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-[#0A0A0A] border border-[#262626] rounded-lg">
                  {teamMembers.map((member) => (
                    <label key={member.id} className="flex items-center gap-2 text-xs text-[#E5E5E5] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMembers([...selectedMembers, member.id]);
                          else setSelectedMembers(selectedMembers.filter((id) => id !== member.id));
                        }}
                        className="accent-[#E10600]"
                      />
                      <span>{member.full_name} ({member.title || member.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#262626] text-[#A3A3A3] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E10600] hover:bg-[#FF3B3B] text-white shadow-md shadow-[#E10600]/20"
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
