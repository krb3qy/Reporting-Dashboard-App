import React, { useState, useMemo } from 'react';
import { UVA_COLORS, CHART_COLORS } from '../constants';

export default function PieChartTile({ data, metricId }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const totalVal = useMemo(
    () => data.reduce((acc, curr) => acc + (curr.kpis.find((k) => k.id === metricId)?.value || 0), 0),
    [data, metricId],
  );

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative">
      <div className="relative w-52 h-52 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 overflow-visible">
          {data.map((row, i) => {
            const val = row.kpis.find((k) => k.id === metricId)?.value || 0;
            const percent = totalVal > 0 ? (val / totalVal) * 100 : 0;
            const offset = data
              .slice(0, i)
              .reduce((acc, curr) => acc + ((curr.kpis.find((k) => k.id === metricId)?.value || 0) / totalVal) * 100, 0);
            return (
              <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} className="cursor-pointer">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={hoveredIdx === i ? '14' : '12'} strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-offset} pathLength="100" className="transition-all duration-200" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="white" strokeWidth="14" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-offset} pathLength="100" className={`transition-opacity duration-200 pointer-events-none ${hoveredIdx === i ? 'opacity-30' : 'opacity-0'}`} />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black" style={{ color: UVA_COLORS.blue }}>
            {hoveredIdx !== null ? (data[hoveredIdx].kpis.find((k) => k.id === metricId)?.value || 0).toFixed(0) : (totalVal / (data.length || 1)).toFixed(1)}
          </span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{hoveredIdx !== null ? 'Selected' : 'Average'}</span>
        </div>
      </div>
      <div className={`mt-6 h-10 flex items-center justify-center transition-all duration-300 ${hoveredIdx !== null ? 'opacity-100' : 'opacity-0'}`}>
        {hoveredIdx !== null && (
          <div className="flex items-center gap-4 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-xl border border-white/10">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[hoveredIdx % CHART_COLORS.length] }} />
            <span className="text-[10px] font-black uppercase tracking-widest">{data[hoveredIdx].queueId}</span>
            <span className="w-px h-3 bg-white/20" />
            <span className="text-[10px] font-black text-orange-400">{(data[hoveredIdx].kpis.find((k) => k.id === metricId)?.value || 0).toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
