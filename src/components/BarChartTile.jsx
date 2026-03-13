import React, { useState } from 'react';
import { CHART_COLORS } from '../constants';

export default function BarChartTile({ data, metricId, nameLookup = {} }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative">
      <div className="flex-1 w-full flex items-end gap-3 px-4 pt-8 overflow-visible">
        {data.map((row, i) => {
          const val = row.kpis.find((k) => k.id === metricId)?.value || 0;
          const maxVal = Math.max(...data.map((d) => d.kpis.find((k) => k.id === metricId)?.value || 0));
          const height = maxVal > 0 ? (val / maxVal) * 90 : 5;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center h-full justify-end relative z-0"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div
                className="w-full rounded-t-xl transition-all relative cursor-pointer overflow-hidden shadow-sm"
                style={{ height: `${Math.max(height, 5)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              >
                <div className={`absolute inset-0 bg-white transition-opacity pointer-events-none ${hoveredIdx === i ? 'opacity-30' : 'opacity-0'}`} />
              </div>
            </div>
          );
        })}
      </div>
      <div className={`mt-2 h-10 shrink-0 flex items-center justify-center transition-all duration-300 ${hoveredIdx !== null ? 'opacity-100' : 'opacity-0'}`}>
        {hoveredIdx !== null && (
          <div className="flex items-center gap-4 bg-[#232D4B] text-white px-5 py-2.5 rounded-full shadow-xl border border-white/10">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[hoveredIdx % CHART_COLORS.length] }} />
            <span className="text-[10px] font-black uppercase tracking-widest">{nameLookup[data[hoveredIdx].queueId] || data[hoveredIdx].queueId}</span>
            <span className="w-px h-3 bg-white/20" />
            <span className="text-[10px] font-black text-[#E57200]">{(data[hoveredIdx].kpis.find((k) => k.id === metricId)?.value || 0).toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
