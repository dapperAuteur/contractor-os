'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateCalendarPickerProps {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  onDone?: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function DateCalendarPicker({ selectedDates, onChange, onDone }: DateCalendarPickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const toggleDate = (dateStr: string) => {
    if (selectedSet.has(dateStr)) {
      onChange(selectedDates.filter((d) => d !== dateStr));
    } else {
      onChange([...selectedDates, dateStr].sort());
    }
  };

  const selectWeekdays = () => {
    const dates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const day = date.getDay();
      if (day >= 1 && day <= 5) {
        dates.push(toDateStr(viewYear, viewMonth, d));
      }
    }
    const otherMonthDates = selectedDates.filter((d) => {
      const [y, m] = d.split('-').map(Number);
      return y !== viewYear || m - 1 !== viewMonth;
    });
    onChange([...otherMonthDates, ...dates].sort());
  };

  const clearMonth = () => {
    const otherMonthDates = selectedDates.filter((d) => {
      const [y, m] = d.split('-').map(Number);
      return y !== viewYear || m - 1 !== viewMonth;
    });
    onChange(otherMonthDates);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedInMonth = selectedDates.filter((d) => {
    const [y, m] = d.split('-').map(Number);
    return y === viewYear && m - 1 === viewMonth;
  }).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 min-h-11 min-w-11 flex items-center justify-center"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-slate-800">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 min-h-11 min-w-11 flex items-center justify-center"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 text-xs flex-wrap">
        <button
          type="button"
          onClick={selectWeekdays}
          className="px-2 py-1 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
        >
          Select Mon–Fri
        </button>
        <button
          type="button"
          onClick={clearMonth}
          className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
        >
          Clear Month
        </button>
        {selectedDates.length > 0 && (
          <span className="px-2 py-1 text-slate-500">
            {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} selected
            {selectedInMonth > 0 && selectedInMonth < selectedDates.length && ` (${selectedInMonth} this month)`}
          </span>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map((d) => (
          <div key={d} className="text-xs font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const isSelected = selectedSet.has(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDate(dateStr)}
              className={`
                h-9 rounded-lg text-sm font-medium transition
                ${isSelected
                  ? 'bg-amber-600 text-white hover:bg-amber-500'
                  : 'text-slate-700 hover:bg-slate-100'
                }
                ${isToday && !isSelected ? 'ring-1 ring-amber-500/60' : ''}
              `}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${dateStr}`}
              aria-pressed={isSelected}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Done button */}
      {onDone && (
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-lg bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-500 min-h-11"
          >
            Done{selectedDates.length > 0 ? ` (${selectedDates.length} day${selectedDates.length !== 1 ? 's' : ''} selected)` : ''}
          </button>
        </div>
      )}
    </div>
  );
}
