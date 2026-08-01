'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Goal, GoalScope, GoalStatus, Project, Profile } from '@/types';
import { Target, Plus, TrendingUp, AlertTriangle, CheckCircle2, XCircle, FolderKanban } from 'lucide-react';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<GoalScope>('company');
  const [period, setPeriod] = useState('2026-Q3');
  const [targetValue, setTargetValue] = useState(100);
  const [currentValue, setCurrentValue] = useState(0);
  const [linkedProjectId, setLinkedProjectId] = useState('');
  const [status, setStatus] = useState<GoalStatus>('on_track');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchGoalsData();
  }, []);

  const fetchGoalsData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (profile?.role === 'admin') setIsAdmin(true);
    }

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*, owner:profiles(*), linked_project:projects(*)')
      .order('created_at', { ascending: false });

    if (goalsData) setGoals(goalsData as any);

    const { data: projectsData } = await supabase.from('projects').select('*');
    if (projectsData) setProjects(projectsData as any);

    const { data: teamData } = await supabase.from('profiles').select('*').eq('status', 'active');
    if (teamData) setTeamMembers(teamData as any);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const calculatedProgress = Math.min(100, Math.round((currentValue / (targetValue || 1)) * 100));

    const { error } = await supabase.from('goals').insert({
      title,
      description,
      scope,
      period,
      target_value: targetValue,
      current_value: currentValue,
      progress: calculatedProgress,
      linked_project_id: linkedProjectId || null,
      status,
      owner_id: scope === 'individual' ? currentUserId : null,
    });

    if (!error) {
      setTitle('');
      setDescription('');
      setIsModalOpen(false);
      fetchGoalsData();
    }
    setLoading(false);
  };

  const handleUpdateProgress = async (goalId: string, newCurrent: number, target: number) => {
    const calculatedProgress = Math.min(100, Math.round((newCurrent / (target || 1)) * 100));
    let newStatus: GoalStatus = 'on_track';
    if (calculatedProgress >= 100) newStatus = 'done';
    else if (calculatedProgress < 40) newStatus = 'at_risk';

    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, current_value: newCurrent, progress: calculatedProgress, status: newStatus } : g
      )
    );

    await supabase
      .from('goals')
      .update({ current_value: newCurrent, progress: calculatedProgress, status: newStatus })
      .eq('id', goalId);
  };

  const statusBadges = {
    on_track: { label: 'On Track', color: 'bg-emerald-950/60 border-emerald-600 text-emerald-400', icon: TrendingUp },
    at_risk: { label: 'At Risk', color: 'bg-amber-950/60 border-amber-600 text-amber-300', icon: AlertTriangle },
    off_track: { label: 'Off Track', color: 'bg-red-950/60 border-[#E10600] text-red-200', icon: XCircle },
    done: { label: 'Done', color: 'bg-blue-950/60 border-blue-600 text-blue-300', icon: CheckCircle2 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-[#E10600]" />
            Goals & OKRs (Quarterly)
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Track company Objectives & Key Results and roll up project progress.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E10600]/20 transition"
        >
          <Plus className="w-4 h-4" /> Add Objective / OKR
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const badge = statusBadges[goal.status] || statusBadges.on_track;
          const BadgeIcon = badge.icon;
          return (
            <div key={goal.id} className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0A0A0A] border border-[#262626] text-[#A3A3A3]">
                  {goal.period} • {goal.scope}
                </span>

                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold flex items-center gap-1 ${badge.color}`}>
                  <BadgeIcon className="w-3.5 h-3.5" />
                  {badge.label}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-white mb-1">{goal.title}</h2>
                <p className="text-xs text-[#A3A3A3]">{goal.description || 'No detailed description'}</p>
              </div>

              {/* Linked Project tag */}
              {goal.linked_project && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0A0A0A] border border-[#262626] text-xs text-[#E5E5E5]">
                  <FolderKanban className="w-3.5 h-3.5 text-[#E10600]" />
                  <span>Linked: {goal.linked_project.name}</span>
                </div>
              )}

              {/* Progress bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Progress: {goal.progress}%</span>
                  <span className="text-[#A3A3A3]">{goal.current_value} / {goal.target_value}</span>
                </div>
                <div className="w-full h-2.5 bg-[#0A0A0A] rounded-full overflow-hidden border border-[#262626]">
                  <div
                    className="h-full bg-[#E10600] transition-all duration-300 shadow-sm shadow-[#E10600]/50"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              {/* Quick progress update controls */}
              <div className="pt-2 border-t border-[#262626] flex items-center justify-between">
                <span className="text-[11px] text-[#737373]">Update Key Result:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateProgress(goal.id, Math.max(0, goal.current_value - 5), goal.target_value)}
                    className="px-2 py-1 bg-[#1F1F1F] hover:bg-[#262626] text-white text-xs rounded border border-[#333333]"
                  >
                    -5
                  </button>
                  <button
                    onClick={() => handleUpdateProgress(goal.id, Math.min(goal.target_value, goal.current_value + 5), goal.target_value)}
                    className="px-2 py-1 bg-[#E10600]/20 hover:bg-[#E10600]/30 text-[#FF3B3B] text-xs font-bold rounded border border-[#E10600]/40"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-base font-bold text-white">Add Goal / OKR</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#737373] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Objective Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ship Relentive OS Agency Dashboard"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Scope</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as GoalScope)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                  >
                    <option value="company">Company Level</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>

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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Target Numeric Value</label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Current Progress</label>
                  <input
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
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
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#E10600] hover:bg-[#FF3B3B] text-white shadow-md shadow-[#E10600]/20"
                >
                  {loading ? 'Creating...' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
