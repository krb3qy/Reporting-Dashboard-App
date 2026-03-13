import React, { useState, useMemo } from 'react';
import {
  X, ChevronDown, ChevronRight, PlusCircle, Filter, Search,
  Headphones, Building2, Radio, ArrowLeftRight, Tag, Zap, User,
  Phone, PhoneIncoming, PhoneOff, MessageSquare, GitBranch,
} from 'lucide-react';
import { FILTER_TYPES, STATIC_FILTER_OPTIONS } from '../constants';

const ICON_MAP = {
  Headphones, Building2, Radio, ArrowLeftRight, Tag, Zap, User,
  Phone, PhoneIncoming, PhoneOff, MessageSquare, GitBranch,
};

export default function FilterEngine({
  activeFilters,
  setActiveFilters,
  filterValues,
  setFilterValues,
  filterOptions,
  collapsedFilters,
  setCollapsedFilters,
}) {
  const [searchTerms, setSearchTerms] = useState({});

  function toggleValue(filterId, opt) {
    setFilterValues((p) => ({
      ...p,
      [filterId]: (p[filterId] || []).includes(opt)
        ? p[filterId].filter((x) => x !== opt)
        : [...(p[filterId] || []), opt],
    }));
  }

  function removeFilter(filterId) {
    setActiveFilters((prev) => prev.filter((f) => f !== filterId));
    setFilterValues((p) => ({ ...p, [filterId]: [] }));
  }

  function clearFilterValues(filterId) {
    setFilterValues((p) => ({ ...p, [filterId]: [] }));
  }

  return (
    <section>
      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E57200] mb-5 flex items-center gap-2">
        <Filter size={12} /> Filters
      </h2>
      <div className="space-y-3">
        {activeFilters.map((filterId) => {
          const typeInfo = FILTER_TYPES.find((f) => f.id === filterId);
          if (!typeInfo) return null;

          const options = typeInfo.searchable
            ? (filterOptions[filterId] || [])
            : (STATIC_FILTER_OPTIONS[filterId] || filterOptions[filterId] || []);
          const Icon = ICON_MAP[typeInfo.iconName];
          const isCollapsed = collapsedFilters[filterId];
          const selected = filterValues[filterId] || [];
          const searchTerm = searchTerms[filterId] || '';

          return (
            <FilterBlock
              key={filterId}
              filterId={filterId}
              typeInfo={typeInfo}
              Icon={Icon}
              options={options}
              isCollapsed={isCollapsed}
              selected={selected}
              searchTerm={searchTerm}
              onSetSearchTerm={(val) => setSearchTerms((p) => ({ ...p, [filterId]: val }))}
              onToggleCollapse={() => setCollapsedFilters((p) => ({ ...p, [filterId]: !p[filterId] }))}
              onRemoveFilter={() => removeFilter(filterId)}
              onClearValues={() => clearFilterValues(filterId)}
              onToggleValue={(opt) => toggleValue(filterId, opt)}
            />
          );
        })}
      </div>

      {/* Add Filter */}
      {FILTER_TYPES.filter((ft) => !activeFilters.includes(ft.id)).length > 0 && (
        <div className="pt-4 mt-5 border-t border-white/5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E57200] mb-3">Add Filter</h2>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_TYPES.filter((ft) => !activeFilters.includes(ft.id)).map((ft) => {
              const Ic = ICON_MAP[ft.iconName];
              return (
                <button
                  key={ft.id}
                  onClick={() => {
                    setActiveFilters([...activeFilters, ft.id]);
                    setFilterValues((p) => ({ ...p, [ft.id]: p[ft.id] || [] }));
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-[9px] font-bold uppercase transition-colors"
                >
                  {Ic && <Ic size={10} />} {ft.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function FilterBlock({
  filterId, typeInfo, Icon, options, isCollapsed, selected, searchTerm,
  onSetSearchTerm, onToggleCollapse, onRemoveFilter, onClearValues, onToggleValue,
}) {
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return typeInfo.searchable ? [] : options;
    const term = searchTerm.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(term));
  }, [options, searchTerm, typeInfo.searchable]);

  const displayOptions = typeInfo.searchable
    ? filteredOptions.slice(0, 20)
    : options;

  return (
    <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
      {/* Header — chevron left, label center, actions right */}
      <div className="flex items-center px-3 py-2.5 gap-2">
        <button onClick={onToggleCollapse} className="text-slate-400 hover:text-white shrink-0">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <button onClick={onToggleCollapse} className="flex-1 flex items-center gap-2 text-[10px] font-black uppercase text-slate-300 hover:text-white text-left min-w-0">
          {Icon && <Icon size={13} className="shrink-0" />}
          <span className="truncate">{typeInfo.label}</span>
          {selected.length > 0 && (
            <span className="bg-[#E57200] text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center shrink-0">
              {selected.length}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {selected.length > 0 && (
            <button onClick={onClearValues} className="text-slate-500 hover:text-[#E57200] transition-colors" title="Clear selections">
              <X size={12} />
            </button>
          )}
          <button onClick={onRemoveFilter} className="text-slate-600 hover:text-red-400 transition-colors" title="Remove filter">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selected.map((val) => (
                <button
                  key={val}
                  onClick={() => onToggleValue(val)}
                  className="flex items-center gap-1 bg-[#E57200] text-white text-[9px] font-bold px-2 py-1 rounded-lg hover:bg-[#E57200]/80 transition-colors"
                >
                  <span className="truncate max-w-[140px]">{val}</span> <X size={10} className="shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Search input for searchable filters */}
          {typeInfo.searchable && (
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSetSearchTerm(e.target.value)}
                placeholder={`Search ${typeInfo.label.toLowerCase()}...`}
                className="w-full bg-white/5 border border-white/10 text-white text-[10px] pl-7 pr-3 py-2 rounded-lg outline-none focus:border-[#E57200]/50 placeholder:text-slate-500"
              />
            </div>
          )}

          {/* Search results for searchable filters */}
          {typeInfo.searchable && searchTerm && (
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {displayOptions.length === 0 ? (
                <div className="text-[9px] text-slate-500 py-2 text-center">No results</div>
              ) : (
                displayOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { onToggleValue(opt); onSetSearchTerm(''); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                      selected.includes(opt)
                        ? 'bg-[#E57200]/20 text-[#E57200]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {opt}
                  </button>
                ))
              )}
              {filteredOptions.length > 20 && (
                <div className="text-[8px] text-slate-500 text-center py-1">
                  +{filteredOptions.length - 20} more — refine search
                </div>
              )}
            </div>
          )}

          {/* Chip toggles for non-searchable filters */}
          {!typeInfo.searchable && (
            <div className="flex flex-wrap gap-1">
              {displayOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onToggleValue(opt)}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                    selected.includes(opt)
                      ? 'bg-[#E57200] text-white shadow-lg shadow-[#E57200]/20'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
