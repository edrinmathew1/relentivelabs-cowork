'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Task, DailyChecklist, Project, GitHubCommit } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  LayoutDashboard,
  CheckCircle2,
  Flame,
  Clock,
  TrendingUp,
  Award,
  BarChart2,
  Users,
  GitCommit,
  ExternalLink,
  Activity,
  Zap,
  GitBranch,
  PieChart as PieIcon,
  CheckSquare,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<DailyChecklist[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);

  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileData) setProfile(profileData as any);

      const { data: teamData } = await supabase.from('profiles').select('*').eq('status', 'active');
      if (teamData) setTeamMembers(teamData as any);

      const { data: tasksData } = await supabase.from('tasks').select('*');
      if (tasksData) setTasks(tasksData as any);

      const { data: checklistsData } = await supabase.from('daily_checklists').select('*');
      if (checklistsData) setChecklists(checklistsData as any);

      const { data: projectsData } = await supabase.from('projects').select('*');
      if (projectsData) setProjects(projectsData as any);

      let { data: commitData, error: commitErr } = await supabase
        .from('github_commits')
        .select('*')
        .order('committed_at', { ascending: false })
        .limit(20);

      if (commitErr) console.warn('Commits query warning:', commitErr.message);
      if (commitData) setCommits(commitData as any);
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    }
  };

  const handleGenerateWeeklyReport = async () => {
    setGeneratingReport(true);
    setReportSuccessMsg(null);

    try {
      const res = await fetch('/api/reports/weekly', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report generation failed');

      setReportSuccessMsg('Weekly Executive Report generated & saved to Docs!');
      setTimeout(() => setReportSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Weekly report error:', err);
    }
    setGeneratingReport(false);
  };

  const isAdmin = profile?.role === 'admin';

  // 1. Completed Tasks Per Member (Bar Chart Data)
  const memberTaskData = teamMembers.map((member) => {
    const completed = tasks.filter((t) => t.assignee_id === member.id && t.status === 'done').length;
    return {
      name: member.full_name?.split(' ')[0] || member.email.split('@')[0],
      completed,
    };
  });

  // 2. 8-Week Velocity Line Chart Data
  const velocityData = Array.from({ length: 8 }).map((_, idx) => {
    const weekNum = 8 - idx;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (idx * 7));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - ((idx + 1) * 7));

    const completedInWeek = tasks.filter((t) => {
      if (t.status !== 'done' || !t.updated_at) return false;
      const doneTime = new Date(t.updated_at).getTime();
      return doneTime >= startDate.getTime() && doneTime <= endDate.getTime();
    }).length;

    return {
      week: `W${weekNum}`,
      completed: completedInWeek,
    };
  }).reverse();

  // 3. Task Priority Breakdown (Pie Chart Data)
  const priorityCounts = {
    urgent: tasks.filter((t) => t.priority === 'urgent').length,
    high: tasks.filter((t) => t.priority === 'high').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    low: tasks.filter((t) => t.priority === 'low').length,
  };
  const priorityPieData = [
    { name: 'Urgent 🔥', value: priorityCounts.urgent || 1, color: '#E10600' },
    { name: 'High', value: priorityCounts.high || 1, color: '#FF3B3B' },
    { name: 'Medium', value: priorityCounts.medium || 1, color: '#3B82F6' },
    { name: 'Low', value: priorityCounts.low || 1, color: '#A3A3A3' },
  ];

  // 4. Task Status Distribution (Bar Chart Data)
  const statusCounts = [
    { name: 'Backlog', count: tasks.filter((t) => t.status === 'backlog').length },
    { name: 'To Do', count: tasks.filter((t) => t.status === 'todo').length },
    { name: 'In Progress', count: tasks.filter((t) => t.status === 'in_progress').length },
    { name: 'Review', count: tasks.filter((t) => t.status === 'review').length },
    { name: 'Done', count: tasks.filter((t) => t.status === 'done').length },
  ];

  // 5. Unified Daily Streak Leaderboard
  const leaderboardData = teamMembers.map((member) => {
    const listDates = checklists.filter((c) => c.user_id === member.id && c.is_complete).map((c) => c.date);
    const taskDates = tasks
      .filter((t) => t.assignee_id === member.id && t.status === 'done' && t.updated_at)
      .map((t) => t.updated_at.split('T')[0]);

    const activeDates = new Set([...listDates, ...taskDates]);
    let streak = 0;
    let checkDate = new Date();
    const todayStr = new Date().toISOString().split('T')[0];

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (activeDates.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (dStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return {
      id: member.id,
      name: member.full_name || member.email,
      avatar: member.avatar_url,
      streak,
    };
  }).sort((a, b) => b.streak - a.streak);

  const totalDoneTasks = tasks.filter((t) => t.status === 'done').length;
  const personalTasks = tasks.filter((t) => t.assignee_id === profile?.id);
  const personalDoneTasks = personalTasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-[#E10600]" />
          {isAdmin ? 'Admin Agency Analytics & Performance Dashboard' : 'Member Productivity Dashboard'}
        </h1>
        <p className="text-xs text-[#A3A3A3] mt-1">
          Realtime velocity metrics, productivity graphs, GitHub codebase activity & streak leaderboards.
        </p>
      </div>

      {reportSuccessMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500 text-emerald-300 rounded-xl text-xs flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{reportSuccessMsg}</span>
          </div>
          <Link href="/docs" className="text-xs font-bold underline text-white">View Report in Docs →</Link>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#E10600]" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {isAdmin ? totalDoneTasks : personalDoneTasks}
          </div>
          <span className="text-[10px] text-emerald-400">Realtime synced</span>
        </div>

        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>GitHub Commits Synced</span>
            <GitCommit className="w-4 h-4 text-[#E10600]" />
          </div>
          <div className="text-2xl font-extrabold text-[#FF3B3B]">{commits.length}</div>
          <span className="text-[10px] text-[#A3A3A3]">From connected GitHub repos</span>
        </div>

        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>Active Team Members</span>
            <Users className="w-4 h-4 text-[#E10600]" />
          </div>
          <div className="text-2xl font-extrabold text-white">{teamMembers.length}</div>
          <span className="text-[10px] text-[#A3A3A3]">Active agency accounts</span>
        </div>

        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>Total Projects</span>
            <TrendingUp className="w-4 h-4 text-[#E10600]" />
          </div>
          <div className="text-2xl font-extrabold text-[#FF3B3B]">{projects.length}</div>
          <span className="text-[10px] text-[#A3A3A3]">Active client & internal tracks</span>
        </div>
      </div>

      {/* SECTION 1: PRODUCTIVITY & PERFORMANCE GRAPHS GRID */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2 border-b border-[#262626] pb-2">
          <BarChart2 className="w-5 h-5 text-[#E10600]" />
          Productivity & Velocity Analytics Graphs
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph 1: Completed Tasks Per Team Member */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E10600]" />
              Completed Tasks Per Team Member
            </h3>
            <div className="h-64 bg-[#0A0A0A] p-3 rounded-xl border border-[#262626]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberTaskData}>
                  <XAxis dataKey="name" stroke="#A3A3A3" fontSize={11} />
                  <YAxis stroke="#A3A3A3" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '8px', color: '#FFFFFF' }}
                    itemStyle={{ color: '#FF3B3B' }}
                  />
                  <Bar dataKey="completed" fill="#E10600" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 2: 8-Week Team Velocity Line Chart with Report Generator BELOW */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#E10600]" />
                Team Velocity Trend (Past 8 Weeks)
              </h3>
              <div className="h-52 bg-[#0A0A0A] p-3 rounded-xl border border-[#262626]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={velocityData}>
                    <XAxis dataKey="week" stroke="#A3A3A3" fontSize={11} />
                    <YAxis stroke="#A3A3A3" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '8px', color: '#FFFFFF' }} />
                    <Line type="monotone" dataKey="completed" stroke="#FF3B3B" strokeWidth={3} dot={{ fill: '#E10600' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weekly Report Generator Button Positioned Directly Below Velocity Graph */}
            <div className="pt-2 border-t border-[#262626] flex items-center justify-between gap-3">
              <span className="text-xs text-[#A3A3A3]">Generate & save this week&apos;s executive report to Docs:</span>
              <button
                onClick={handleGenerateWeeklyReport}
                disabled={generatingReport}
                className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E10600]/20 transition shrink-0"
              >
                <Zap className="w-4 h-4" />
                {generatingReport ? 'Generating Report...' : '⚡ Generate Weekly Report'}
              </button>
            </div>
          </div>

          {/* Graph 3: Task Priority Breakdown (Pie Chart) */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#E10600]" />
              Task Priority Allocation
            </h3>
            <div className="h-60 bg-[#0A0A0A] p-3 rounded-xl border border-[#262626] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '8px', color: '#FFFFFF' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 4: Task Status Distribution (Bar Chart) */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#E10600]" />
              Task Pipeline Status Breakdown
            </h3>
            <div className="h-60 bg-[#0A0A0A] p-3 rounded-xl border border-[#262626]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusCounts}>
                  <XAxis dataKey="name" stroke="#A3A3A3" fontSize={11} />
                  <YAxis stroke="#A3A3A3" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '8px', color: '#FFFFFF' }} />
                  <Bar dataKey="count" fill="#FF3B3B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: DEDICATED CODEBASE & GITHUB COMMITS SECTION */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2 border-b border-[#262626] pb-2">
          <GitBranch className="w-5 h-5 text-[#E10600]" />
          Codebase & GitHub Activity Stream
        </h2>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#E10600]" />
                Recent Real-Time GitHub Commits Stream
              </h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Chronological feed of code commits synced from connected GitHub repositories.
              </p>
            </div>
            <Link
              href="/settings"
              className="px-3 py-1.5 bg-[#0A0A0A] hover:bg-[#262626] border border-[#262626] text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#E10600]" /> Manage GitHub Repos
            </Link>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {commits.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#737373] bg-[#0A0A0A] rounded-xl border border-[#262626]">
                No GitHub commits synced yet. Connect your repository under Settings!
              </div>
            ) : (
              commits.map((c) => (
                <div key={c.id} className="p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#141414] border border-[#E10600] flex items-center justify-center shrink-0 overflow-hidden">
                      {c.author_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.author_avatar_url} alt={c.author_name || 'Author'} className="w-full h-full object-cover" />
                      ) : (
                        <GitCommit className="w-4 h-4 text-[#E10600]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#E10600] font-bold">{c.commit_sha.substring(0, 7)}</span>
                        <span className="font-bold text-white line-clamp-1">{c.message}</span>
                      </div>
                      <p className="text-[10px] text-[#A3A3A3]">
                        By <strong>{c.author_name || 'Developer'}</strong> • {formatDate(c.committed_at)}
                      </p>
                    </div>
                  </div>

                  {c.commit_url && (
                    <a
                      href={c.commit_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-[#A3A3A3] hover:text-[#E10600] hover:bg-[#141414] rounded transition shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: DAILY STREAKS SECTION */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2 border-b border-[#262626] pb-2">
          <Flame className="w-5 h-5 text-[#E10600]" />
          Daily Streaks & Consistency Leaderboard
        </h2>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[#E10600]" />
                Unified Daily Streak Rankings
              </h3>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Streaks increment when team members complete daily checklists OR ship tasks.
              </p>
            </div>
            <Link
              href="/checklist"
              className="px-3 py-1.5 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg transition"
            >
              Go to Daily Checklist →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {leaderboardData.map((item, idx) => (
              <div key={item.id} className="p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[#E10600] text-sm">#{idx + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
                    {item.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      item.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="font-semibold text-white truncate">{item.name}</span>
                </div>

                <span className="font-bold text-[#FF3B3B] flex items-center gap-1 shrink-0 bg-[#E10600]/10 border border-[#E10600]/30 px-2.5 py-1 rounded-lg">
                  <Flame className="w-3.5 h-3.5 text-[#E10600]" />
                  {item.streak} Days
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
