'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Task, DailyChecklist, Project } from '@/types';
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
} from 'lucide-react';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checklists, setChecklists] = useState<DailyChecklist[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
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

    const { data: tasksData } = await supabase.from('tasks').select('*, assignee:profiles(*), project:projects(*)');
    if (tasksData) setTasks(tasksData as any);

    const { data: checklistsData } = await supabase.from('daily_checklists').select('*');
    if (checklistsData) setChecklists(checklistsData as any);

    const { data: projectsData } = await supabase.from('projects').select('*');
    if (projectsData) setProjects(projectsData as any);

    setLoading(false);
  };

  const isAdmin = profile?.role === 'admin';

  // 1. Tasks per member bar chart data
  const memberTaskData = teamMembers.map((member) => {
    const completed = tasks.filter((t) => t.assignee_id === member.id && t.status === 'done').length;
    const total = tasks.filter((t) => t.assignee_id === member.id).length;
    return {
      name: member.full_name.split(' ')[0],
      completed,
      total,
    };
  });

  // 2. Real velocity trend over past 8 weeks computed dynamically
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

  // 3. Workload distribution per project
  const projectDistribution = projects.map((p) => {
    const count = tasks.filter((t) => t.project_id === p.id).length;
    return {
      name: p.name,
      value: count > 0 ? count : 1,
    };
  });

  const COLORS = ['#E10600', '#FF3B3B', '#7A0000', '#262626', '#E5E5E5'];

  // 4. Dynamic Streak Leaderboard from actual checklists
  const leaderboardData = teamMembers.map((member) => {
    const memberLists = checklists.filter((c) => c.user_id === member.id && c.is_complete);
    const streak = memberLists.length;
    return {
      id: member.id,
      name: member.full_name,
      streak,
    };
  }).sort((a, b) => b.streak - a.streak);

  // 5. Dynamic Personal Member Stats
  const personalTasks = tasks.filter((t) => t.assignee_id === profile?.id);
  const personalDoneTasks = personalTasks.filter((t) => t.status === 'done').length;
  const personalTotalTasks = personalTasks.length;
  const personalOnTimeTasks = personalTasks.filter((t) => {
    if (t.status !== 'done') return false;
    if (!t.due_date || !t.updated_at) return true;
    return new Date(t.updated_at) <= new Date(t.due_date);
  }).length;
  const personalOnTimeRate = personalDoneTasks > 0 ? Math.round((personalOnTimeTasks / personalDoneTasks) * 100) : 100;

  // Global On-Time Completion Rate
  const totalDoneTasks = tasks.filter((t) => t.status === 'done').length;
  const globalOnTimeTasks = tasks.filter((t) => {
    if (t.status !== 'done') return false;
    if (!t.due_date || !t.updated_at) return true;
    return new Date(t.updated_at) <= new Date(t.due_date);
  }).length;
  const globalOnTimeRate = totalDoneTasks > 0 ? Math.round((globalOnTimeTasks / totalDoneTasks) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#E10600]" />
            {isAdmin ? 'Admin Agency Analytics Dashboard' : 'Member Performance Dashboard'}
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Realtime team velocity, task completion rate & checklist leaderboards.
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
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
            <span>On-Time Completion</span>
            <Clock className="w-4 h-4 text-[#FF3B3B]" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {isAdmin ? `${globalOnTimeRate}%` : `${personalOnTimeRate}%`}
          </div>
          <span className="text-[10px] text-[#A3A3A3]">Calculated from task due dates</span>
        </div>

        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A3A3A3]">
            <span>Active Team Members</span>
            <Users className="w-4 h-4 text-[#E10600]" />
          </div>
          <div className="text-2xl font-extrabold text-white">{teamMembers.length}</div>
          <span className="text-[10px] text-[#A3A3A3]">Active accounts</span>
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

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks Completed Per Member (Bar Chart) */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#E10600]" />
            Completed Tasks Per Team Member
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberTaskData}>
                <XAxis dataKey="name" stroke="#737373" fontSize={11} />
                <YAxis stroke="#737373" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', borderColor: '#262626', borderRadius: '8px' }} />
                <Bar dataKey="completed" fill="#E10600" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 8-Week Velocity Line Chart */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#E10600]" />
            Team Velocity Trend (Past 8 Weeks)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData}>
                <XAxis dataKey="week" stroke="#737373" fontSize={11} />
                <YAxis stroke="#737373" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', borderColor: '#262626', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="completed" stroke="#FF3B3B" strokeWidth={3} dot={{ fill: '#E10600' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workload Distribution Pie Chart */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white">Workload Distribution Across Projects</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={projectDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {projectDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', borderColor: '#262626', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Streak Leaderboard */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-[#E10600]" />
            Checklist Streak Leaderboard
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {leaderboardData.map((item, idx) => (
              <div key={item.id} className="p-3 bg-[#0A0A0A] border border-[#262626] rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[#E10600]">#{idx + 1}</span>
                  <span className="font-semibold text-white">{item.name}</span>
                </div>
                <span className="font-bold text-[#FF3B3B] flex items-center gap-1">
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
