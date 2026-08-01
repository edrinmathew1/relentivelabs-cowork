'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Tag } from 'lucide-react';

interface CalendarEventItem {
  id: string;
  title: string;
  start: string; // ISO date string or YYYY-MM-DD
  end?: string;
  allDay?: boolean;
  color?: string;
  type?: string;
  raw?: any;
}

interface CustomCalendarProps {
  events: CalendarEventItem[];
  onEventClick?: (event: CalendarEventItem) => void;
}

export function CustomCalendar({ events, onEventClick }: CustomCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Generate Month Days Grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();

  // Total grid cells (usually 35 or 42)
  const gridCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    gridCells.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Next month leading days
  const remainingCells = 42 - gridCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    gridCells.push({
      date: new Date(year, month + 1, d),
      isCurrentMonth: false,
    });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to format date key YYYY-MM-DD
  const getDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return (
    <div className="space-y-4 font-sans text-white">
      {/* Calendar Header & View Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] rounded-lg text-xs font-bold text-[#E5E5E5] transition"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-[#141414] rounded-lg border border-[#262626] text-[#A3A3A3] hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-[#141414] rounded-lg border border-[#262626] text-[#A3A3A3] hover:text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-base font-extrabold text-white tracking-wide">
            {monthNames[month]} {year}
          </h2>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-[#141414] border border-[#262626] rounded-lg text-xs">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 rounded-md font-semibold transition ${
              viewMode === 'month' ? 'bg-[#E10600] text-white shadow-sm' : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-md font-semibold transition ${
              viewMode === 'week' ? 'bg-[#E10600] text-white shadow-sm' : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded-md font-semibold transition ${
              viewMode === 'day' ? 'bg-[#E10600] text-white shadow-sm' : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Month View Grid */}
      {viewMode === 'month' && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-2xl">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-[#262626] bg-[#0A0A0A] text-center text-[11px] font-bold text-[#A3A3A3] uppercase tracking-wider py-2.5">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#262626] bg-[#141414]">
            {gridCells.map((cell, idx) => {
              const dateKey = getDateKey(cell.date);
              const isToday = dateKey === todayStr;

              // Filter events for this cell date
              const dayEvents = events.filter((e) => {
                if (!e.start) return false;
                const eKey = e.start.includes('T') ? e.start.split('T')[0] : e.start;
                return eKey === dateKey;
              });

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition ${
                    !cell.isCurrentMonth ? 'bg-[#0A0A0A]/40 opacity-40' : 'hover:bg-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-[#E10600] text-white shadow-md'
                          : cell.isCurrentMonth
                          ? 'text-[#E5E5E5]'
                          : 'text-[#737373]'
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-mono text-[#A3A3A3]">
                        {dayEvents.length} item{dayEvents.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 overflow-y-auto max-h-[75px] pr-0.5">
                    {dayEvents.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onEventClick && onEventClick(item)}
                        className="px-2 py-1 rounded text-[11px] font-medium truncate cursor-pointer transition hover:scale-[1.02] shadow-sm flex items-center gap-1.5"
                        style={{
                          backgroundColor: item.color ? `${item.color}25` : '#E1060025',
                          borderLeft: `3px solid ${item.color || '#E10600'}`,
                          color: '#FFFFFF',
                        }}
                      >
                        <span className="truncate">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week / Day View List */}
      {(viewMode === 'week' || viewMode === 'day') && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#E10600]" />
              Schedule List ({viewMode.toUpperCase()} VIEW)
            </h3>
            <span className="text-xs text-[#A3A3A3]">Showing upcoming events & deadlines</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {events.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#737373]">
                No events or deadlines found for this filter.
              </div>
            ) : (
              events.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onEventClick && onEventClick(item)}
                  className="p-3 bg-[#0A0A0A] border border-[#262626] hover:border-[#E10600] rounded-xl flex items-center justify-between cursor-pointer transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color || '#E10600' }}
                      />
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#A3A3A3] pl-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#E10600]" />
                        {item.start ? item.start.split('T')[0] : 'All Day'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
