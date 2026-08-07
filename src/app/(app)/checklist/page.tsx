'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DailyChecklist, ChecklistItem, Profile, Task } from '@/types';
import { CheckSquare, Flame, Calendar, ArrowRight, CheckCircle2, Plus, Trash2, Laptop, Palette, TrendingUp, Shield, Zap } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type RoleCategory = 'hybrid' | 'engineering' | 'management' | 'operations' | 'design';

const ROLE_TEMPLATES: Record<RoleCategory, { name: string; icon: any; items: string[] }> = {
  hybrid: {
    name: 'Hybrid (Tech + Executive) ⚡',
    icon: Zap,
    items: [
      'Review assigned GitHub pull requests & issue queue',
      'Review team workload distribution & task allocation',
      'Sync task status & estimated hours on project board',
      'Check OKR goals status & company milestones',
      'Commit clean, tested code with clear commit message',
      'Log daily executive & engineering work summary',
    ],
  },
  engineering: {
    name: 'Engineering & Tech 💻',
    icon: Laptop,
    items: [
      'Review assigned GitHub pull requests & issue queue',
      'Sync task status & estimated hours on project board',
      'Commit clean, tested code with clear commit message',
      'Log daily work summary & hours in Relentive OS',
      'Clear urgent blockings & respond to @mentions',
    ],
  },
  management: {
    name: 'Executive & Admin ⚡',
    icon: Shield,
    items: [
      'Review team workload distribution & task allocation',
      'Check OKR goals status & company milestones',
      'Review client progress & generate weekly digest report',
      'Unblock team members & respond to @mentions',
      'Log executive daily operational summary',
    ],
  },
  operations: {
    name: 'Operations & Sales 📈',
    icon: TrendingUp,
    items: [
      'Review client leads, inquiries & active pipeline',
      'Update project target dates & status on agency board',
      'Clear high-priority messages & client communications',
      'Log daily work summary & operational updates',
      'Check OKR goals progress & team blockers',
    ],
  },
  design: {
    name: 'Design & Creative 🎨',
    icon: Palette,
    items: [
      'Review design feedback & asset requests',
      'Sync Figma component updates & UI deliverables',
      'Update task progress & upload brand docs',
      'Log daily creative work summary & hours',
      'Clear urgent design reviews & @mentions',
    ],
  },
};

export default function ChecklistPage() {
  const [selectedRole, setSelectedRole] = useState<RoleCategory>('hybrid');
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [carriedOverItems, setCarriedOverItems] = useState<ChecklistItem[]>([]);
  const [allChecklists, setAllChecklists] = useState<DailyChecklist[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [newPersonalLabel, setNewPersonalLabel] = useState('');

  const supabase = createClient();
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const savedRole = (localStorage.getItem('relentive_checklist_role') as RoleCategory) || 'hybrid';
    setSelectedRole(savedRole);
    loadChecklistData(savedRole);
  }, []);

  const loadChecklistData = async (role: RoleCategory = selectedRole) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (profileData) setProfile(profileData as Profile);

      const { data: userTasks } = await supabase.from('tasks').select('*').eq('assignee_id', session.user.id);
      if (userTasks) setTasks(userTasks as Task[]);

      const { data: userLists } = await supabase
        .from('daily_checklists')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });

      if (userLists) {
        setAllChecklists(userLists as DailyChecklist[]);
        calculateFairStreak(userLists as DailyChecklist[], (userTasks as Task[]) || []);
      }

      const { data: todayList } = await supabase
        .from('daily_checklists')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (todayList) {
        setChecklist(todayList as DailyChecklist);
        setItems(todayList.items as ChecklistItem[]);
      } else {
        const defaultTemplate = ROLE_TEMPLATES[role].items.map((label, idx) => ({
          id: `item_${idx + 1}`,
          label,
          completed: false,
        }));
        setItems(defaultTemplate);
      }

      if (userLists) {
        calculateCarriedOver(userLists as DailyChecklist[]);
      }
    } catch (err) {
      console.error('Load checklist error:', err);
    }
  };

  const handleRoleChange = (role: RoleCategory) => {
    setSelectedRole(role);
    localStorage.setItem('relentive_checklist_role', role);

    const defaultTemplate = ROLE_TEMPLATES[role].items.map((label, idx) => ({
      id: `item_${idx + 1}`,
      label,
      completed: false,
    }));
    setItems(defaultTemplate);
    saveChecklistToDb(defaultTemplate);
  };

  // Fair Streak Calculation: A day counts if completed >= 3 items OR completed at least 1 task!
  const calculateFairStreak = (lists: DailyChecklist[], userTasks: Task[]) => {
    const listDates = lists.filter((l) => (l.completed_count || 0) >= 3 || l.is_complete).map((l) => l.date);
    const taskDates = userTasks
      .filter((t) => t.status === 'done' && t.updated_at)
      .map((t) => t.updated_at.split('T')[0]);

    const activeDates = new Set([...listDates, ...taskDates]);

    let streak = 0;
    let checkDate = new Date();

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
    setStreakDays(streak);
  };

  const calculateCarriedOver = (checklists: DailyChecklist[]) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayList = checklists.find((c) => c.date === yesterdayStr);
    if (yesterdayList && yesterdayList.items) {
      const incomplete = yesterdayList.items.filter((item: ChecklistItem) => !item.completed);
      setCarriedOverItems(incomplete);
    }
  };

  const handleToggleItem = async (itemId: string) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setItems(updatedItems);
    await saveChecklistToDb(updatedItems);
  };

  const handleAddPersonalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonalLabel.trim()) return;

    const newItem: ChecklistItem = {
      id: `personal_${Date.now()}`,
      label: `[Personal] ${newPersonalLabel.trim()}`,
      completed: false,
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setNewPersonalLabel('');
    await saveChecklistToDb(updatedItems);
  };

  const handleRemoveItem = async (itemId: string) => {
    const updatedItems = items.filter((i) => i.id !== itemId);
    setItems(updatedItems);
    await saveChecklistToDb(updatedItems);
  };

  const saveChecklistToDb = async (updatedItems: ChecklistItem[]) => {
    const completedCount = updatedItems.filter((i) => i.completed).length;
    const totalCount = updatedItems.length;
    const isComplete = totalCount > 0 && completedCount === totalCount;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await supabase.from('daily_checklists').upsert(
        {
          user_id: session.user.id,
          date: todayStr,
          items: updatedItems as any,
          completed_count: completedCount,
          total_count: totalCount,
          is_complete: isComplete,
        },
        { onConflict: 'user_id,date' }
      );
      loadChecklistData();
    } catch (err) {
      console.error('Save checklist error:', err);
    }
  };

  const generateHeatmapGrid = () => {
    const cells = [];
    const completedSet = new Set(allChecklists.filter((l) => (l.completed_count || 0) >= 3 || l.is_complete).map((l) => l.date));

    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const isComplete = completedSet.has(dStr);

      cells.push({
        date: dStr,
        isComplete,
      });
    }
    return cells;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#E10600]" />
            Daily Operational Checklist & Role Standards
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Tailored checklists for single-role and hybrid (Tech + Executive) team members.
          </p>
        </div>

        {/* Active Streak Badge */}
        <div className="flex items-center gap-2 bg-[#141414] border border-[#262626] px-4 py-2 rounded-xl shadow-lg self-start">
          <Flame className="w-5 h-5 text-[#E10600] animate-bounce" />
          <div>
            <span className="text-xs font-bold text-white block">Active Daily Streak</span>
            <span className="text-sm font-extrabold text-[#FF3B3B] font-mono">{streakDays} Days</span>
          </div>
        </div>
      </div>

      {/* Role Template Selector Tabs */}
      <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-3 shadow-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Choose Your Work Role Template</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(ROLE_TEMPLATES) as RoleCategory[]).map((roleKey) => {
            const tmpl = ROLE_TEMPLATES[roleKey];
            const Icon = tmpl.icon;
            const isSelected = selectedRole === roleKey;

            return (
              <button
                key={roleKey}
                onClick={() => handleRoleChange(roleKey)}
                className={`p-3 rounded-lg border font-bold text-xs flex items-center gap-2 transition ${
                  isSelected
                    ? 'bg-[#0A0A0A] border-[#E10600] text-white shadow-md shadow-[#E10600]/20'
                    : 'bg-[#0A0A0A] border-[#262626] text-[#A3A3A3] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-[#E10600]' : 'text-[#737373]'}`} />
                <span className="truncate">{tmpl.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today Checklist Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#E10600]" />
              Today&apos;s Checklist ({formatDate(todayStr)})
            </h2>
            <span className="text-xs font-mono font-bold text-[#E10600]">
              {items.filter((i) => i.completed).length} / {items.length} Completed
            </span>
          </div>

          <form onSubmit={handleAddPersonalItem} className="flex gap-2 p-2 bg-[#0A0A0A] border border-[#262626] rounded-xl">
            <input
              type="text"
              value={newPersonalLabel}
              onChange={(e) => setNewPersonalLabel(e.target.value)}
              placeholder="+ Add a custom personal daily item..."
              className="flex-1 bg-transparent px-2 text-xs text-white outline-none placeholder-[#525252]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Personal Item
            </button>
          </form>

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  item.completed
                    ? 'bg-[#0A0A0A] border-[#262626] text-[#737373] line-through'
                    : 'bg-[#0A0A0A] border-[#262626] text-white hover:border-[#E10600]/50'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={Boolean(item.completed)}
                    onChange={() => handleToggleItem(item.id)}
                    className="w-4 h-4 accent-[#E10600] rounded cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-medium">{item.label}</span>
                </label>

                {item.id.startsWith('personal_') && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-[#737373] hover:text-[#FF3B3B] rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3] flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-[#E10600]" /> Carried Over Items
            </h3>
            {carriedOverItems.length === 0 ? (
              <p className="text-xs text-[#737373]">No incomplete items carried over from yesterday!</p>
            ) : (
              <div className="space-y-1.5">
                {carriedOverItems.map((item, idx) => (
                  <div key={idx} className="p-2 bg-[#0A0A0A] border border-[#262626] rounded-lg text-xs text-[#FF3B3B]">
                    ⚠️ {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E10600]" />
              Past 90 Days Execution Heatmap
            </h3>

            <div className="grid grid-cols-10 gap-1.5 pt-1">
              {generateHeatmapGrid().map((cell, idx) => (
                <div
                  key={idx}
                  title={`${cell.date}: ${cell.isComplete ? 'Complete' : 'Incomplete'}`}
                  className={`w-3.5 h-3.5 rounded-sm transition ${
                    cell.isComplete ? 'bg-[#E10600] shadow-sm shadow-[#E10600]/50' : 'bg-[#0A0A0A] border border-[#262626]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
