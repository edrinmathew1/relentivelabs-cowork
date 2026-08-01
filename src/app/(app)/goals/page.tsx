'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Goal, Project, Profile, GoalStatus } from '@/types';
import { Target, Plus, TrendingUp, AlertTriangle, CheckCircle2, FolderKanban } from 'lucide-react';
import Link from 'next/link';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState('2026-Q3');
  const [targetValue, setTargetValue] = useState(100);
  const [currentValue, setCurrentValue] = useState(0);
  const [status, setStatus] = useState<GoalStatus>('on_track');
  const [linkedProjectId, setLinkedProjectId] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchGoalsData();
  }, []);

  const fetchGoalsData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);

      const { data: goalsData } = await supabase
        .from('goals')
        .select('*, linked_project:projects(*), owner:profiles(*)')
        .order('created_at', { ascending: false });

      if (goalsData) setGoals(goalsData as any);

      const { data: projectsData } = await supabase.from('projects').select('*');
      if (projectsData) setProjects(projectsData as any);

      const { data: teamData } = await supabase.from('profiles').select('*').eq('status', 'active');
      if (teamData) setTeamMembers(teamData as any);
    } catch (err) {
      console.error('Fetch goals error:', err);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const progress = targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0;

      const { error } = await supabase.from('goals').insert({
        title,
        description,
        period,
        target_value: Number(targetValue),
        current_value: Number(currentValue),
        progress,
        status,
        scope: 'company',
        owner_id: currentUserId || null,
        linked_project_id: linkedProjectId || null,
      });

      if (!error) {
        setTitle('');
        setDescription('');
        setIsModalOpen(false);
        fetchGoalsData();
      }
    } catch (err) {
      console.error('Create goal error:', err);
    }
    setSaving(false);
  };

  const handleUpdateProgress = async (goalId: string, newCurrent: number, targetVal: number) => {
    const progress = targetVal > 0 ? Math.min(100, Math.round((newCurrent / targetVal) * 100)) : 0;
    let newStatus: GoalStatus = 'on_track';
    if (progress >= 100) newStatus = 'done';
    else if (progress < 40) newStatus = 'at_risk';

    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, current_value: newCurrent, progress, status: newStatus } : g))
    );

    try {
      await supabase
        .from('goals')
        .update({ current_value: newCurrent, progress, status: newStatus })
        .eq('id', goalId);
    } catch (err) {
      console.error('Update goal progress error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-[#E10600]" />
            Goals & OKRs Tracker
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Agency quarterly objectives, key results & project progress roll-ups.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E10600]/20 transition"
        >
          <Plus className="w-4 h-4" /> New Agency Goal
        </button>
      </div>

      {/* Goals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0A0A0A] border border-[#262626] text-[#E10600]">
                  {goal.period}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    goal.status === 'done'
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400'
                      : goal.status === 'at_risk'
                      ? 'bg-amber-950/50 border-amber-500 text-amber-400'
                      : goal.status === 'off_track'
                      ? 'bg-[#7A0000]/30 border-[#E10600] text-red-300'
                      : 'bg-[#0A0A0A] border-[#262626] text-white'
                  }`}
                >
                  {goal.status.replace('_', ' ')}
                </span>
              </div>

              <h2 className="text-base font-bold text-white">{goal.title}</h2>
              <p className="text-xs text-[#A3A3A3] line-clamp-2">{goal.description}</p>
            </div>

            {/* Linked Project Banner */}
            {goal.linked_project && (
              <Link
                href={`/projects/${goal.linked_project.id}`}
                className="p-2 bg-[#0A0A0A] border border-[#262626] hover:border-[#E10600] rounded-lg text-xs flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2 text-[#A3A3A3] group-hover:text-white">
                  <FolderKanban className="w-3.5 h-3.5 text-[#E10600]" />
                  <span>Linked Project: <strong className="text-white">{goal.linked_project.name}</strong></span>
                </div>
                <span className="text-[10px] text-[#E10600]">View →</span>
              </Link>
            )}

            {/* Progress Control Slider */}
            <div className="space-y-2 pt-2 border-t border-[#262626]">
              <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
                <span>Progress: {goal.current_value} / {goal.target_value}</span>
                <span className="font-mono font-bold text-white">{goal.progress}%</span>
              </div>

              <div className="w-full bg-[#0A0A0A] border border-[#262626] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#E10600] to-[#FF3B3B] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min="0"
                  max={goal.target_value || 100}
                  value={goal.current_value || 0}
                  onChange={(e) => handleUpdateProgress(goal.id, Number(e.target.value), goal.target_value || 100)}
                  className="w-full accent-[#E10600] cursor-pointer"
                />
              </div>
            </div>
          </div>
        ))}

        {goals.length === 0 && (
          <div className="col-span-full p-12 text-center bg-[#141414] border border-[#262626] rounded-xl">
            <Target className="w-10 h-10 text-[#737373] mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No agency goals created yet</p>
            <p className="text-xs text-[#A3A3A3] mt-1">Click &quot;New Agency Goal&quot; to set quarterly OKRs.</p>
          </div>
        )}
      </div>

      {/* New Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-base font-bold text-white">Create Agency OKR / Goal</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#737373] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ship 4 Production SaaS Client Apps"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key deliverables and measurable criteria..."
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Period</label>
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="2026-Q3"
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as GoalStatus)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none capitalize"
                  >
                    <option value="on_track">On Track</option>
                    <option value="at_risk">At Risk</option>
                    <option value="off_track">Off Track</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Current Value</label>
                  <input
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Target Value</label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Link to Project</label>
                <select
                  value={linkedProjectId}
                  onChange={(e) => setLinkedProjectId(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                >
                  <option value="">No Project Link</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
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
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E10600] hover:bg-[#FF3B3B] text-white shadow-md shadow-[#E10600]/20"
                >
                  {saving ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
