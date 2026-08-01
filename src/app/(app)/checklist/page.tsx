'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DailyChecklist, ChecklistItem, Profile, ChecklistTemplate } from '@/types';
import { CheckSquare, Flame, Calendar, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function DailyChecklistPage() {
  const [todayChecklist, setTodayChecklist] = useState<DailyChecklist | null>(null);
  const [pastChecklists, setPastChecklists] = useState<DailyChecklist[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [carriedOverItems, setCarriedOverItems] = useState<ChecklistItem[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadChecklistData();
  }, []);

  const loadChecklistData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) setUserProfile(profile as any);

    // Fetch today's checklist
    let { data: todayData } = await supabase
      .from('daily_checklists')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', todayStr)
      .single();

    // Auto-generate today's checklist from template if not existing
    if (!todayData) {
      const { data: templates } = await supabase
        .from('checklist_templates')
        .select('*')
        .limit(1);

      const templateItems = (templates && templates[0]?.items) || [
        { id: '1', label: 'Review assigned GitHub pull requests & issue queue' },
        { id: '2', label: 'Sync task status & estimated hours on project board' },
        { id: '3', label: 'Commit clean, tested code with clear commit message' },
        { id: '4', label: 'Log daily work summary & hours in Relentive OS' },
      ];

      const initialItems: ChecklistItem[] = templateItems.map((item: any) => ({
        id: item.id || String(Math.random()),
        label: item.label,
        done: false,
      }));

      const { data: created } = await supabase
        .from('daily_checklists')
        .insert({
          user_id: session.user.id,
          date: todayStr,
          items: initialItems,
          completed_count: 0,
          total_count: initialItems.length,
          is_complete: false,
        })
        .select()
        .single();

      todayData = created;
    }

    if (todayData) setTodayChecklist(todayData as any);

    // Fetch past 90 days checklists for streak calculation & GitHub heatmap
    const { data: history } = await supabase
      .from('daily_checklists')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });

    if (history) {
      setPastChecklists(history as any);
      calculateStreak(history as any);
      findCarriedOverItems(history as any);
    }

    setLoading(false);
  };

  const calculateStreak = (checklists: DailyChecklist[]) => {
    let streak = 0;
    // Sort descending by date
    const sorted = [...checklists].sort((a, b) => b.date.localeCompare(a.date));

    for (const c of sorted) {
      if (c.is_complete) {
        streak++;
      } else if (c.date === todayStr) {
        // Today is in progress, continue counting past days
        continue;
      } else {
        break;
      }
    }
    setStreakCount(streak);
  };

  const findCarriedOverItems = (checklists: DailyChecklist[]) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayList = checklists.find((c) => c.date === yesterdayStr);
    if (yesterdayList && yesterdayList.items) {
      const incomplete = yesterdayList.items.filter((item: ChecklistItem) => !item.done);
      setCarriedOverItems(incomplete);
    }
  };

  const toggleItem = async (itemId: string) => {
    if (!todayChecklist) return;

    const updatedItems = todayChecklist.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, done: !item.done, completed_at: !item.done ? new Date().toISOString() : undefined };
      }
      return item;
    });

    const completedCount = updatedItems.filter((i) => i.done).length;
    const isComplete = completedCount === updatedItems.length && updatedItems.length > 0;

    // Optimistic UI
    setTodayChecklist({
      ...todayChecklist,
      items: updatedItems,
      completed_count: completedCount,
      is_complete: isComplete,
    });

    await supabase
      .from('daily_checklists')
      .update({
        items: updatedItems,
        completed_count: completedCount,
        is_complete: isComplete,
      })
      .eq('id', todayChecklist.id);
  };

  return (
    <div className="space-y-6">
      {/* Header & Streak Counter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#E10600]" />
            Daily Checklist & Streak Tracker
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Enforce daily agency standards, log progress, and maintain your contribution streak.
          </p>
        </div>

        {/* Streak Counter Badge */}
        <div className="bg-[#141414] border border-[#E10600]/40 rounded-xl p-4 flex items-center gap-4 shadow-xl shadow-[#E10600]/10">
          <div className="w-12 h-12 rounded-xl bg-[#E10600] flex items-center justify-center shadow-lg shadow-[#E10600]/40">
            <Flame className="w-7 h-7 text-white animate-bounce" />
          </div>
          <div>
            <div className="text-2xl font-black text-white tracking-tight">{streakCount} Days</div>
            <span className="text-[11px] font-semibold text-[#FF3B3B] uppercase tracking-wider">
              Active Completion Streak
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Checklist + Carried Over Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Checklist Card */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Today's Standards ({formatDate(todayStr)})
              </h2>
              <p className="text-xs text-[#A3A3A3]">
                {todayChecklist?.completed_count || 0} of {todayChecklist?.total_count || 0} completed
              </p>
            </div>

            {todayChecklist?.is_complete ? (
              <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-600 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Checklist Complete!
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-[#E10600]/15 border border-[#E10600]/50 text-[#FF3B3B] text-xs font-bold">
                In Progress
              </span>
            )}
          </div>

          {/* Items Checklist List */}
          <div className="space-y-2.5">
            {todayChecklist?.items.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-3.5 rounded-lg border transition cursor-pointer flex items-start gap-3 ${
                  item.done
                    ? 'bg-[#0A0A0A] border-[#262626] text-[#737373]'
                    : 'bg-[#1F1F1F] border-[#333333] hover:border-[#E10600] text-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => {}}
                  className="mt-0.5 w-4 h-4 accent-[#E10600] cursor-pointer"
                />
                <span className={`text-xs font-medium ${item.done ? 'line-through' : ''}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Carried Over Items Card */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#262626] pb-3">
            <AlertCircle className="w-4 h-4 text-[#FF3B3B]" />
            <h3 className="text-sm font-bold text-white">Carried Over Incomplete Items</h3>
          </div>

          {carriedOverItems.length === 0 ? (
            <p className="text-xs text-[#A3A3A3] italic py-4">
              All items from previous days were completed on schedule. No pending carry-overs!
            </p>
          ) : (
            <div className="space-y-2">
              {carriedOverItems.map((item) => (
                <div key={item.id} className="p-3 bg-[#0A0A0A] border border-[#7A0000]/50 rounded-lg text-xs text-[#E5E5E5]">
                  <span className="text-[10px] text-[#FF3B3B] font-semibold block mb-0.5">FLAGGED CARRY-OVER</span>
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* GitHub-style Contribution Heatmap */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#E10600]" />
          Contribution & Checklist Completion Heatmap
        </h3>
        <p className="text-xs text-[#A3A3A3]">
          Visual record of daily checklist completion performance over past months.
        </p>

        {/* Heatmap grid */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {Array.from({ length: 60 }).map((_, idx) => {
            const d = new Date();
            d.setDate(d.getDate() - (59 - idx));
            const dateStr = d.toISOString().split('T')[0];
            const check = pastChecklists.find((c) => c.date === dateStr);

            let bgClass = 'bg-[#1F1F1F] border-[#262626]'; // Empty / No entry
            if (check?.is_complete) {
              bgClass = 'bg-[#E10600] shadow-sm shadow-[#E10600]/50 border-[#FF3B3B]'; // Fully complete
            } else if (check && check.completed_count > 0) {
              bgClass = 'bg-[#7A0000] border-[#E10600]'; // Partial
            }

            return (
              <div
                key={dateStr}
                title={`${dateStr}: ${check?.completed_count || 0} completed`}
                className={`w-4 h-4 rounded-sm border contribution-cell ${bgClass}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
