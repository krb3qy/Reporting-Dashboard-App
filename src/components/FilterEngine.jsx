import React from 'react';
import { Activity, Globe, Phone, X, ChevronDown, ChevronRight, PlusCircle, Filter } from 'lucide-react';
import { FILTER_TYPES } from '../constants';

const ICON_MAP = { Activity, Globe, Phone };

export default function FilterEngine({
  activeFilters,
  setActiveFilters,
  filterValues,
  setFilterValues,
  filterOptions,
  collapsedFilters,
  setCollapsedFilters,
}) {
  return (
    <section>
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-6 flex items-center gap-2">
        <Filter size={12} /> Filter Engine
      </h2>
      <div className="space-y-4">
        {activeFilters.map((filterId) => {
          const typeInfo = FILTER_TYPES.find((f) => f.id === filterId);
          if (!typeInfo) return null;
          const options = filterOptions[filterId];
          const Icon = ICON_MAP[typeInfo.iconName];

          return (
            <div key={filterId} className="relative group bg-white/5 rounded-2xl p-4 border border-white/5">
              <button
                onClick={() => setActiveFilters((prev) => prev.filter((f) => f !== filterId))}
                className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-opacity z-10"
              >
                <X size={14} />
              </button>
              <button
                onClick={() => setCollapsedFilters((p) => ({ ...p, [filterId]: !p[filterId] }))}
                className="w-full flex justify-between items-center text-[10px] font-black uppercase text-slate-300"
              >
                <span className="flex items-center gap-2">
                  {Icon && <Icon size={14} />} {typeInfo.label}
                </span>
                {collapsedFilters[filterId] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              {!collapsedFilters[filterId] && (
                <div className="grid grid-cols-1 gap-1.5 mt-4">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() =>
                        setFilterValues((p) => ({
                          ...p,
                          [filterId]: p[filterId].includes(opt) ? p[filterId].filter((x) => x !== opt) : [...p[filterId], opt],
                        }))
                      }
                      className={`text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                        filterValues[filterId]?.includes(opt)
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                          : 'text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-4 mt-6 border-t border-white/5">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mb-4">Add Filter Layer</h2>
        <div className="flex flex-wrap gap-2">
          {FILTER_TYPES.filter((ft) => !activeFilters.includes(ft.id)).map((ft) => (
            <button
              key={ft.id}
              onClick={() => setActiveFilters([...activeFilters, ft.id])}
              className="flex items-center gap-1 px-2 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[9px] font-black uppercase transition-colors"
            >
              <PlusCircle size={10} /> {ft.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
