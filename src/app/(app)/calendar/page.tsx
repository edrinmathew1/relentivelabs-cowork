'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { CalendarEvent, EventType, EventScope, RecurrenceRule, Project, Profile, Task, Goal } from '@/types';
import { Calendar as CalendarIcon, Plus, Filter } from 'lucide-react';

const FullCalendarWrapper = dynamic(
  () => import('@/components/calendar/full-calendar-wrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="p-12 text-center text-xs text-[#A3A3A3] animate-pulse">
        Loading Calendar OS Schedule...
      </div>
    ),
  }
);

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [myEventsOnly, setMyEventsOnly] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('meeting');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState('#E10600');
  const [scope, setScope] = useState<EventScope>('company');
  const [projectId, setProjectId] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>('none');
  const [reminderOffset, setReminderOffset] = useState<number>(1440);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchCalendarData();

    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchCalendarData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCalendarData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) setCurrentProfile(profile as any);

      const { data: eventsData } = await supabase
        .from('events')
        .select('*, project:projects(*), creator:profiles(*)')
        .order('start_at', { ascending: true });

      if (eventsData) setEvents(eventsData as any);

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, project:projects(*)')
        .not('due_date', 'is', null);

      if (tasksData) setTasks(tasksData as any);

      const { data: goalsData } = await supabase
        .from('goals')
        .select('*, linked_project:projects(*)');

      if (goalsData) setGoals(goalsData as any);

      const { data: projectsData } = await supabase.from('projects').select('*');
      if (projectsData) setProjects(projectsData as any);
    } catch (err) {
      console.error('Calendar fetch error:', err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;

    setSaving(true);

    try {
      const { error } = await supabase.from('events').insert({
        title,
        description,
        event_type: eventType,
        start_at: startAt || new Date().toISOString(),
        end_at: endAt || null,
        all_day: allDay,
        color,
        scope: currentProfile.role === 'admin' ? scope : 'personal',
        project_id: projectId || null,
        created_by: currentProfile.id,
        recurrence_rule: recurrenceRule,
        reminder_offset_minutes: Number(reminderOffset),
        reminder_sent: false,
      });

      if (!error) {
        setTitle('');
        setDescription('');
        setIsModalOpen(false);
        fetchCalendarData();
      }
    } catch (err) {
      console.error('Event creation error:', err);
    }
    setSaving(false);
  };

  const fullCalendarItems = [
    ...(events || [])
      .filter((e) => {
        if (!e) return false;
        if (myEventsOnly && e.created_by !== currentProfile?.id) return false;
        if (filterType !== 'all' && e.event_type !== filterType) return false;
        if (filterProject !== 'all' && e.project_id !== filterProject) return false;
        return true;
      })
      .map((e) => ({
        id: `event-${e.id}`,
        title: `[${(e.event_type || 'event').toUpperCase()}] ${e.title || ''}`,
        start: e.start_at,
        end: e.end_at || undefined,
        allDay: Boolean(e.all_day),
        backgroundColor: e.color || '#E10600',
        borderColor: e.color || '#E10600',
        textColor: '#FFFFFF',
      })),

    ...(tasks || [])
      .filter((t) => {
        if (!t) return false;
        if (filterType !== 'all' && filterType !== 'task_due') return false;
        if (filterProject !== 'all' && t.project_id !== filterProject) return false;
        if (myEventsOnly && t.assignee_id !== currentProfile?.id) return false;
        return true;
      })
      .map((t) => ({
        id: `task-${t.id}`,
        title: `📌 Task Due: ${t.title || ''}`,
        start: t.due_date,
        allDay: true,
        backgroundColor: t.priority === 'urgent' ? '#7A0000' : '#141414',
        borderColor: t.priority === 'urgent' ? '#E10600' : '#262626',
        textColor: t.priority === 'urgent' ? '#FF3B3B' : '#E5E5E5',
      })),

    ...(goals || [])
      .filter((g) => {
        if (!g) return false;
        if (filterType !== 'all' && filterType !== 'goal_end') return false;
        if (filterProject !== 'all' && g.linked_project_id !== filterProject) return false;
        return true;
      })
      .map((g) => ({
        id: `goal-${g.id}`,
        title: `🎯 Goal Target: ${g.title || ''}`,
        start: new Date().toISOString().split('T')[0],
        allDay: true,
        backgroundColor: '#0F291E',
        borderColor: '#3FBF6C',
        textColor: '#3FBF6C',
      })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[#E10600]" />
            Calendar OS (Agency Master Schedule)
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Integrated month/week/day schedule auto-populated with tasks, goals, meetings, and agency milestones.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#E10600] hover:bg-[#FF3B3B] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E10600]/20 transition"
        >
          <Plus className="w-4 h-4" /> Add Event / Milestone
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-[#141414] border border-[#262626] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-[#A3A3A3]">
            <Filter className="w-3.5 h-3.5 text-[#E10600]" /> Filters:
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0A0A0A] border border-[#262626] text-white rounded px-2.5 py-1 outline-none"
          >
            <option value="all">All Event Types</option>
            <option value="meeting">Meetings</option>
            <option value="milestone">Milestones</option>
            <option value="deadline">Deadlines</option>
            <option value="task_due">Task Due Dates</option>
            <option value="goal_end">Goal Target Dates</option>
            <option value="holiday">Holidays / Off-Days</option>
            <option value="custom">Custom Events</option>
          </select>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-[#0A0A0A] border border-[#262626] text-white rounded px-2.5 py-1 outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs text-[#E5E5E5] cursor-pointer">
          <input
            type="checkbox"
            checked={myEventsOnly}
            onChange={(e) => setMyEventsOnly(e.target.checked)}
            className="accent-[#E10600]"
          />
          <span>My Events / Tasks Only</span>
        </label>
      </div>

      {/* Dynamic FullCalendar Container */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-2xl overflow-hidden text-xs text-white">
        <FullCalendarWrapper events={fullCalendarItems} />
      </div>

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-base font-bold text-white">Add Calendar Event / Milestone</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#737373] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 SaaS Sprint Review or Client Sync"
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Meeting agenda, location link, or milestone notes..."
                  className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none capitalize"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="milestone">Milestone</option>
                    <option value="deadline">Deadline</option>
                    <option value="holiday">Holiday / Off-Day</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Color Accent</label>
                  <div className="flex items-center gap-2 pt-1">
                    {['#E10600', '#FF3B3B', '#3FBF6C', '#3B82F6', '#8B5CF6', '#F59E0B'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          color === c ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Recurrence Rule</label>
                  <select
                    value={recurrenceRule}
                    onChange={(e) => setRecurrenceRule(e.target.value as RecurrenceRule)}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none capitalize"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Email Reminder</label>
                  <select
                    value={reminderOffset}
                    onChange={(e) => setReminderOffset(Number(e.target.value))}
                    className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                  >
                    <option value={15}>15 Minutes Before</option>
                    <option value={60}>1 Hour Before</option>
                    <option value={1440}>1 Day Before</option>
                    <option value={2880}>2 Days Before</option>
                  </select>
                </div>
              </div>

              {currentProfile?.role === 'admin' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Event Visibility Scope</label>
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value as EventScope)}
                      className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none capitalize"
                    >
                      <option value="company">Agency-Wide (Everyone)</option>
                      <option value="project">Project Scoped</option>
                      <option value="personal">Personal Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A3A3A3] uppercase mb-1">Linked Project</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#262626] text-white rounded-lg p-2.5 text-xs outline-none"
                    >
                      <option value="">No Project Link</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

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
                  {saving ? 'Saving...' : 'Add to Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
