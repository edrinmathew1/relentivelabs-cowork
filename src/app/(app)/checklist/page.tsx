'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DailyChecklist, ChecklistItem, Profile } from '@/types';
import { CheckSquare, Flame, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ChecklistPage() {
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [carriedOverItems, setCarriedOverItems] = useState<ChecklistItem[]>([]);
  const [allChecklists, setAllChecklists] = useState<DailyChecklist[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  const supabase = createClient();
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadChecklistData();
  }, []);

  const loadChecklistData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (profileData) setProfile(profileData as Profile);

      // Load all checklists for user
      const { data: userLists } = await supabase
        .from('daily_checklists')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });

      if (userLists) {
        setAllChecklists(userLists as DailyChecklist[]);
        calculateStreak(userLists as DailyChecklist[]);
      }

      // Load today checklist
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
        // Fallback default template
        const defaultItems: ChecklistItem[] = [
          { id: '1', label: 'Review assigned GitHub pull requests & issue queue', completed: false },
          { id: '2', label: 'Sync task status & estimated hours on project board', completed: false },
          { id: '3', label: 'Commit clean, tested code with clear commit message', completed: false },
          { id: '4', label: 'Log daily work summary & hours in Relentive OS', completed: false },
          { id: '5', label: 'Clear urgent blockings & respond to @mentions', completed: false },
        ];
        setItems(defaultItems);
      }

      // Calculate carried over items from yesterday
      if (userLists) {
        calculateCarriedOver(userLists as DailyChecklist[]);
      }
    } catch (err) {
      console.error('Load checklist error:', err);
    }
  };

  const calculateStreak = (lists: DailyChecklist[]) => {
    let streak = 0;
    const completedDates = new Set(lists.filter((l) => l.is_complete).map((l) => l.date));

    let checkDate = new Date();
    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (completedDates.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today is not complete yet, check if yesterday was complete
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

    const completedCount = updatedItems.filter((i) => i.completed).length;
    const totalCount = updatedItems.length;
    const isComplete = completedCount === totalCount;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { error } = await supabase.from('daily_checklists').upsert(
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

      if (!error) {
        loadChecklistData();
      }
    } catch (err) {
      console.error('Toggle checklist item error:', err);
    }
  };

  // Contribution Heatmap Grid
  const generateHeatmapGrid = () => {
    const cells = [];
    const completedSet = new Set(allChecklists.filter((l) => l.is_complete).map((l) => l.date));

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
            Daily Engineering Standards
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Maintain daily operational excellence, build streak momentum & track progress.
          </p>
        </div>

        {/* Active Streak Badge */}
        <div className="flex items-center gap-2 bg-[#141414] border border-[#262626] px-4 py-2 rounded-xl shadow-lg self-start">
          <Flame className="w-5 h-5 text-[#E10600] animate-bounce" />
          <div>
            <span className="text-xs font-bold text-white block">Active Streak</span>
            <span className="text-sm font-extrabold text-[#FF3B3B] font-mono">{streakDays} Days</span>
          </div>
        </div>
      </div>

      {/* Today Checklist & Carried Over Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Main Checklist */}
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

          <div className="space-y-2">
            {items.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer ${
                  item.completed
                    ? 'bg-[#0A0A0A] border-[#262626] text-[#737373] line-through'
                    : 'bg-[#0A0A0A] border-[#262626] text-white hover:border-[#E10600]/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(item.completed)}
                  onChange={() => handleToggleItem(item.id)}
                  className="w-4 h-4 accent-[#E10600] rounded cursor-pointer"
                />
                <span className="text-xs font-medium">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Carried Over & Heatmap Info */}
        <div className="space-y-4">
          {/* Carried Over Incomplete Items */}
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

          {/* GitHub-Style Contribution Heatmap */}
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
