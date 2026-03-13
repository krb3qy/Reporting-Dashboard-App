import React, { useState, useMemo } from 'react';
import { CHART_COLORS } from '../constants';
import { formatValue } from '../utils/format';

const MAX_BARS = 15;

export default function BarChartTile({ data, metricId, metricName, unit, nameLookup = {} }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Sort descending, take top N
  const { bars, maxVal, totalCount } = useMemo(() => {
    const withVal = data.map((row) => {
      const val = row.kpis.find((k) => k.id === metricId)?.value || 0;
      return { ...row, _val: val };
    }).sort((a, b) => b._val - a._val);

    const top = withVal.slice(0, MAX_BARS);
    const max = top.length > 0 ? Math.max(...top.map((b) => b._val)) : 0;
    return { bars: top, maxVal: max, totalCount: withVal.length };
  }, [data, metricId]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">No Data</span>
      </div>
    );
  }

  function getBarName(bar) {
    return nameLookup[bar.queueId] || bar.queueId;
  }

  return (
    <div className="flex flex-col w-full h-full relative">
      <div className="flex-1 w-full flex items-end gap-2 px-4 pt-8 overflow-visible">
        {bars.map((bar, i) => {
          const height = maxVal > 0 ? (bar._val / maxVal) * 90 : 5;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center h-full justify-end relative z-0"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Value label on top of bar */}
              <div className={`text-[8px] font-black text-slate-400 mb-1 transition-opacity ${hoveredIdx === i ? 'opacity-100' : 'opacity-0'}`}>
                {formatValue(bar._val, unit)}
              </div>
              <div
                className="w-full rounded-t-lg transition-all relative cursor-pointer overflow-hidden shadow-sm"
                style={{ height: `${Math.max(height, 3)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              >
                <div className={`absolute inset-0 bg-white transition-opacity pointer-events-none ${hoveredIdx === i ? 'opacity-30' : 'opacity-0'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      <div className={`mt-2 h-10 shrink-0 flex items-center justify-center transition-all duration-300 ${hoveredIdx !== null ? 'opacity-100' : 'opacity-0'}`}>
        {hoveredIdx !== null && (
          <div className="flex items-center gap-3 bg-[#232D4B] text-white px-5 py-2.5 rounded-full shadow-xl border border-white/10">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[hoveredIdx % CHART_COLORS.length] }} />
            <span className="text-[10px] font-black uppercase tracking-widest">{getBarName(bars[hoveredIdx])}</span>
            <span className="w-px h-3 bg-white/20" />
            <span className="text-[10px] font-bold text-slate-400">{metricName}</span>
            <span className="text-[10px] font-black text-[#E57200]">{formatValue(bars[hoveredIdx]._val, unit)}</span>
          </div>
        )}
      </div>

      {/* "Showing top N" note */}
      {totalCount > MAX_BARS && (
        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center pb-1">
          Top {MAX_BARS} of {totalCount} queues
        </div>
      )}
    </div>
  );
}
