import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 14 Days', days: 14 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
];

function toLocalDateStr(d) {
  return d.toISOString().split('T')[0];
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(toLocalDateStr(startDate));
  const [customEnd, setCustomEnd] = useState(toLocalDateStr(endDate));
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function applyPreset(days) {
    const now = new Date();
    const end = now;
    let start;
    if (days === 0) {
      start = startOfDay(now);
    } else if (days === 1) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      start = startOfDay(yesterday);
      end.setTime(startOfDay(now).getTime());
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - days);
      start = startOfDay(start);
    }
    onChange(start, end);
    setCustomStart(toLocalDateStr(start));
    setCustomEnd(toLocalDateStr(end));
    setOpen(false);
  }

  function applyCustom() {
    const s = new Date(customStart + 'T00:00:00');
    const e = new Date(customEnd + 'T23:59:59');
    if (!isNaN(s) && !isNaN(e) && s <= e) {
      onChange(s, e);
      setOpen(false);
    }
  }

  // Format display
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isSameDay = startOfDay(startDate).getTime() === startOfDay(endDate).getTime();
  const displayLabel = isSameDay ? fmt(startDate) : `${fmt(startDate)} - ${fmt(endDate)}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
      >
        <Calendar size={14} className="text-[#E57200]" />
        <span className="text-[11px] font-bold text-[#232D4B]">{displayLabel}</span>
        <ChevronDown size={12} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4">
          {/* Presets */}
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days)}
                className="text-[10px] font-bold text-[#232D4B] px-3 py-2 rounded-lg hover:bg-[#E57200]/10 hover:text-[#E57200] transition-colors text-left"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom range */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Custom Range</div>
            <div className="flex gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="flex-1 text-[10px] font-bold text-[#232D4B] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-[#E57200]"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="flex-1 text-[10px] font-bold text-[#232D4B] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-[#E57200]"
              />
            </div>
            <button
              onClick={applyCustom}
              className="w-full bg-[#E57200] text-white text-[10px] font-black uppercase py-2 rounded-lg hover:brightness-110 transition-all"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
