'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO or datetime-local format
  onChange: (newValue: string) => void;
  label?: string;
}

export function DateTimePicker({ value, onChange, label }: DateTimePickerProps) {
  const initialDate = value ? new Date(value) : new Date();

  const [selectedDate, setSelectedDate] = useState<Date>(isNaN(initialDate.getTime()) ? new Date() : initialDate);
  const [viewMonth, setViewMonth] = useState<Date>(isNaN(initialDate.getTime()) ? new Date() : initialDate);
  const [hour, setHour] = useState<number>(initialDate.getHours() % 12 || 12);
  const [minute, setMinute] = useState<number>(Math.floor(initialDate.getMinutes() / 15) * 15);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initialDate.getHours() >= 12 ? 'PM' : 'AM');
  const [isOpen, setIsOpen] = useState(false);

  const emitChange = (d: Date, h: number, m: number, period: 'AM' | 'PM') => {
    let finalHour = h % 12;
    if (period === 'PM') finalHour += 12;

    const updated = new Date(d.getFullYear(), d.getMonth(), d.getDate(), finalHour, m);
    const tzOffset = updated.getTimezoneOffset() * 60000;
    const isoLocal = new Date(updated.getTime() - tzOffset).toISOString().slice(0, 16);
    onChange(isoLocal);
  };

  const handleDateSelect = (day: number) => {
    const newD = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    setSelectedDate(newD);
    emitChange(newD, hour, minute, ampm);
  };

  const handleHourSelect = (h: number) => {
    setHour(h);
    emitChange(selectedDate, h, minute, ampm);
  };

  const handleMinuteSelect = (m: number) => {
    setMinute(m);
    emitChange(selectedDate, hour, m, ampm);
  };

  const handleAmpmToggle = (period: 'AM' | 'PM') => {
    setAmpm(period);
    emitChange(selectedDate, hour, minute, period);
  };

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-semibold text-[#A3A3A3] uppercase">{label}</label>}

      {/* Input Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E10600] rounded-lg p-2.5 text-xs text-white flex items-center justify-between transition hover:border-[#E10600]/50"
      >
        <span className="flex items-center gap-2 font-mono">
          <CalendarIcon className="w-3.5 h-3.5 text-[#E10600]" />
          {selectedDate.toDateString()} at {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} {ampm}
        </span>
        <Clock className="w-3.5 h-3.5 text-[#737373]" />
      </button>

      {/* Centered Modal Pop-Up */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <span className="font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#E10600]" /> Select Date & Time
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#737373] hover:text-white p-1 rounded-lg hover:bg-[#262626]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Month Navigation Header */}
            <div className="flex items-center justify-between bg-[#0A0A0A] p-2 rounded-xl border border-[#262626]">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                className="p-1 hover:bg-[#262626] rounded text-[#A3A3A3] hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-white">
                {monthNames[month]} {year}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                className="p-1 hover:bg-[#262626] rounded text-[#A3A3A3] hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mini Calendar Grid */}
            <div>
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#A3A3A3] mb-1">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSel =
                    selectedDate.getDate() === day &&
                    selectedDate.getMonth() === month &&
                    selectedDate.getFullYear() === year;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDateSelect(day)}
                      className={`h-7 rounded text-xs font-semibold flex items-center justify-center transition ${
                        isSel
                          ? 'bg-[#E10600] text-white shadow-md font-bold scale-105'
                          : 'hover:bg-[#262626] text-[#E5E5E5]'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Wheel Time Selector */}
            <div className="pt-3 border-t border-[#262626] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#A3A3A3]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#E10600]" /> Select Time Wheel
                </span>
                <div className="flex items-center p-0.5 bg-[#0A0A0A] border border-[#262626] rounded-md">
                  <button
                    type="button"
                    onClick={() => handleAmpmToggle('AM')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      ampm === 'AM' ? 'bg-[#E10600] text-white' : 'text-[#A3A3A3]'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAmpmToggle('PM')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      ampm === 'PM' ? 'bg-[#E10600] text-white' : 'text-[#A3A3A3]'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Hour Wheel */}
                <div>
                  <span className="text-[10px] text-[#A3A3A3] block mb-1">Hour</span>
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-[#0A0A0A] border border-[#262626] rounded-lg p-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleHourSelect(h)}
                        className={`w-full text-center py-1 rounded text-xs font-mono transition ${
                          hour === h ? 'bg-[#E10600] text-white font-bold' : 'hover:bg-[#262626] text-[#A3A3A3]'
                        }`}
                      >
                        {String(h).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minute Wheel */}
                <div>
                  <span className="text-[10px] text-[#A3A3A3] block mb-1">Minute</span>
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-[#0A0A0A] border border-[#262626] rounded-lg p-1">
                    {[0, 15, 30, 45].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMinuteSelect(m)}
                        className={`w-full text-center py-1 rounded text-xs font-mono transition ${
                          minute === m ? 'bg-[#E10600] text-white font-bold' : 'hover:bg-[#262626] text-[#A3A3A3]'
                        }`}
                      >
                        :{String(m).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 bg-[#E10600] hover:bg-[#FF3B3B] text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              Confirm Date & Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
