import React, { useState, useMemo } from 'react';
import { UVA_COLORS, CHART_COLORS } from '../constants';
import { formatValue } from '../utils/format';

const MAX_SLICES = 10;

export default function PieChartTile({ data, metricId, metricName, unit, nameLookup = {} }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Sort by value descending, take top N, bucket the rest as "Other"
  const { slices, sliceTotal, avg } = useMemo(() => {
    const withVal = data.map((row) => {
      const val = row.kpis.find((k) => k.id === metricId)?.value || 0;
      return { ...row, _val: val };
    }).sort((a, b) => b._val - a._val);

    const allTotal = withVal.reduce((acc, r) => acc + r._val, 0);
    const average = withVal.length > 0 ? allTotal / withVal.length : 0;

    if (withVal.length <= MAX_SLICES) {
      const st = withVal.reduce((acc, r) => acc + r._val, 0);
      return { slices: withVal, sliceTotal: st, avg: average };
    }

    const top = withVal.slice(0, MAX_SLICES - 1);
    const otherItems = withVal.slice(MAX_SLICES - 1);
    const otherCount = otherItems.length;

    // Display value: average for percent/seconds, sum for counts
    let otherDisplayVal;
    if (unit === 'percent' || unit === 'seconds') {
      otherDisplayVal = otherItems.reduce((acc, r) => acc + r._val, 0) / otherCount;
    } else {
      otherDisplayVal = otherItems.reduce((acc, r) => acc + r._val, 0);
    }

    top.push({
      _val: otherDisplayVal,
      _isOther: true,
      _otherCount: otherCount,
      queueId: `other_${otherCount}`,
      kpis: [{ id: metricId, value: otherDisplayVal }],
    });

    // Slice total = sum of displayed slice values (makes a full pie)
    const st = top.reduce((acc, r) => acc + r._val, 0);
    return { slices: top, sliceTotal: st, avg: average };
  }, [data, metricId, unit]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">No Data</span>
      </div>
    );
  }

  function getSliceName(slice) {
    if (slice._isOther) return `Other (${slice._otherCount})`;
    return nameLookup[slice.queueId] || slice.queueId;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative overflow-hidden">
      <div className="relative w-40 h-40 lg:w-52 lg:h-52 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {slices.map((slice, i) => {
            const percent = sliceTotal > 0 ? (slice._val / sliceTotal) * 100 : 0;
            const offset = slices
              .slice(0, i)
              .reduce((acc, s) => acc + (sliceTotal > 0 ? (s._val / sliceTotal) * 100 : 0), 0);
            return (
              <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} className="cursor-pointer">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={hoveredIdx === i ? '14' : '12'} strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-offset} pathLength="100" className="transition-all duration-200" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="white" strokeWidth="14" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-offset} pathLength="100" className={`transition-opacity duration-200 pointer-events-none ${hoveredIdx === i ? 'opacity-30' : 'opacity-0'}`} />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black" style={{ color: UVA_COLORS.blue }}>
            {hoveredIdx !== null ? formatValue(slices[hoveredIdx]._val, unit) : formatValue(avg, unit)}
          </span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
            {hoveredIdx !== null ? getSliceName(slices[hoveredIdx]) : 'Avg'}
          </span>
        </div>
      </div>

      {/* Tooltip */}
      <div className={`mt-2 h-10 flex items-center justify-center transition-all duration-300 ${hoveredIdx !== null ? 'opacity-100' : 'opacity-0'}`}>
        {hoveredIdx !== null && (
          <div className="flex items-center gap-3 bg-[#232D4B] text-white px-5 py-2.5 rounded-full shadow-xl border border-white/10">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[hoveredIdx % CHART_COLORS.length] }} />
            <span className="text-[10px] font-black uppercase tracking-widest">{getSliceName(slices[hoveredIdx])}</span>
            <span className="w-px h-3 bg-white/20" />
            <span className="text-[10px] font-bold text-slate-400">{metricName}</span>
            <span className="text-[10px] font-black text-[#E57200]">{formatValue(slices[hoveredIdx]._val, unit)}</span>
          </div>
        )}
      </div>

      {/* "Showing top N" note */}
      {data.length > MAX_SLICES && (
        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          Top {MAX_SLICES - 1} of {data.length} queues
        </div>
      )}
    </div>
  );
}
