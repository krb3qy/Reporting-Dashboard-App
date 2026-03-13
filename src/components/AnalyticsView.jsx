import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  RefreshCw, Columns3, Download, ChevronDown, ChevronUp, Search, X,
  Filter, Check, ChevronRight,
} from 'lucide-react';
import { ANALYTICS_COLUMNS, FILTER_TYPES_ANALYTICS, STATIC_FILTER_OPTIONS, API_QUERY_METRICS } from '../constants';
import { queryConversationAggregates, buildAggregateFilter } from '../services/gcApi';
import { formatValue } from '../utils/format';
import DateRangePicker from './DateRangePicker';

// Unique column key — some metrics appear twice (count + avg)
function colKey(col) {
  return col.colKey || `${col.key}_${col.stat}`;
}

// Extract value from a row's metrics for a given column definition
function extractValue(metricsMap, col) {
  const m = metricsMap[col.key];
  if (!m) return 0;
  if (col.stat === 'count') return m.count ?? 0;
  if (col.stat === 'sum') return m.sum ?? 0;
  if (col.stat === 'avg') {
    const count = m.count ?? 0;
    const sum = m.sum ?? 0;
    return count > 0 ? sum / count : 0;
  }
  return 0;
}

export default function AnalyticsView({ filterOptions, nameLookup, authenticated }) {
  // Own date range
  const [dateStart, setDateStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [dateEnd, setDateEnd] = useState(() => new Date());

  // Own filters
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterValues, setFilterValues] = useState(() => {
    const init = {};
    FILTER_TYPES_ANALYTICS.forEach((ft) => { init[ft.id] = []; });
    return init;
  });
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');

  // Column visibility
  const [visibleCols, setVisibleCols] = useState(() =>
    ANALYTICS_COLUMNS.filter((c) => c.defaultVisible).map(colKey)
  );
  const [showColPicker, setShowColPicker] = useState(false);

  // Sort
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  // Data
  const [rawData, setRawData] = useState({ results: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const initialLoadDone = useRef(false);

  // Refs for closing dropdowns on outside click
  const colPickerRef = useRef(null);
  const filterBarRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setShowColPicker(false);
      if (filterBarRef.current && !filterBarRef.current.contains(e.target)) setOpenFilterDropdown(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Initial query
  useEffect(() => {
    if (!authenticated) return;
    queryData();
    initialLoadDone.current = true;
  }, [authenticated]);

  // Re-query on filter/date changes (debounced)
  useEffect(() => {
    if (!authenticated || !initialLoadDone.current) return;
    const timer = setTimeout(() => queryData(), 600);
    return () => clearTimeout(timer);
  }, [filterValues, dateStart, dateEnd]);

  async function queryData() {
    setLoading(true);
    setError(null);
    try {
      const interval = `${dateStart.toISOString()}/${dateEnd.toISOString()}`;
      const filter = buildAggregateFilter(filterValues);
      const data = await queryConversationAggregates({ interval, groupBy: ['queueId'], filter });
      setRawData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Process rows
  const rows = useMemo(() => {
    return (rawData.results || []).map((row) => {
      const metricsMap = {};
      (row.data?.[0]?.metrics || []).forEach((m) => {
        metricsMap[m.metric] = m.stats;
      });
      return { queueId: row.group?.queueId, metricsMap };
    });
  }, [rawData]);

  // Visible column objects
  const activeCols = useMemo(() =>
    ANALYTICS_COLUMNS.filter((c) => visibleCols.includes(colKey(c))),
    [visibleCols]
  );

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    const col = ANALYTICS_COLUMNS.find((c) => colKey(c) === sortCol);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const va = extractValue(a.metricsMap, col);
      const vb = extractValue(b.metricsMap, col);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [rows, sortCol, sortDir]);

  function handleSort(ck) {
    if (sortCol === ck) {
      if (sortDir === 'desc') setSortDir('asc');
      else { setSortCol(null); setSortDir('desc'); }
    } else {
      setSortCol(ck);
      setSortDir('desc');
    }
  }

  function toggleCol(ck) {
    setVisibleCols((prev) =>
      prev.includes(ck) ? prev.filter((c) => c !== ck) : [...prev, ck]
    );
  }

  function toggleFilterValue(filterId, val) {
    setFilterValues((p) => ({
      ...p,
      [filterId]: (p[filterId] || []).includes(val)
        ? p[filterId].filter((x) => x !== val)
        : [...(p[filterId] || []), val],
    }));
  }

  function clearFilter(filterId) {
    setFilterValues((p) => ({ ...p, [filterId]: [] }));
    setActiveFilters((prev) => prev.filter((f) => f !== filterId));
  }

  // CSV export
  function exportCSV() {
    const headers = ['Queue', ...activeCols.map((c) => c.label)];
    const csvRows = sortedRows.map((row) => {
      const qName = nameLookup[row.queueId] || row.queueId || '';
      const vals = activeCols.map((col) => {
        const raw = extractValue(row.metricsMap, col);
        return col.unit === 'milliseconds' ? (raw / 1000).toFixed(1) : raw.toFixed(2);
      });
      return [qName, ...vals].map((v) => `"${v}"`).join(',');
    });
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${dateStart.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Group columns for picker
  const colGroups = useMemo(() => {
    const groups = {};
    ANALYTICS_COLUMNS.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }, []);

  // Active filter count
  const activeFilterCount = Object.values(filterValues).reduce((acc, v) => acc + v.length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 lg:py-4 flex items-center gap-2 lg:gap-4 flex-wrap shrink-0">
        {/* Date picker */}
        <DateRangePicker startDate={dateStart} endDate={dateEnd} onChange={(s, e) => { setDateStart(s); setDateEnd(e); }} />

        <div className="w-px h-8 bg-slate-200" />

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0" ref={filterBarRef}>
          <div className="relative">
            <button
              onClick={() => setOpenFilterDropdown(openFilterDropdown === '_add' ? null : '_add')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest text-[#232D4B] transition-colors"
            >
              <Filter size={12} className="text-[#E57200]" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-[#E57200] text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {openFilterDropdown === '_add' && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 py-2 max-h-80 overflow-y-auto">
                {FILTER_TYPES_ANALYTICS.map((ft) => {
                  const isActive = activeFilters.includes(ft.id);
                  const count = (filterValues[ft.id] || []).length;
                  return (
                    <button
                      key={ft.id}
                      onClick={() => {
                        if (!isActive) setActiveFilters([...activeFilters, ft.id]);
                        setOpenFilterDropdown(ft.id);
                        setFilterSearch('');
                      }}
                      className="w-full text-left px-4 py-2 text-[11px] font-bold text-[#232D4B] hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span>{ft.label}</span>
                      {count > 0 && <span className="text-[9px] font-black text-[#E57200]">{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active filter chips with dropdowns */}
          {activeFilters.map((filterId) => {
            const ft = FILTER_TYPES_ANALYTICS.find((f) => f.id === filterId);
            if (!ft) return null;
            const selected = filterValues[filterId] || [];
            const isOpen = openFilterDropdown === filterId;
            const isSearchable = ft.searchable;
            const options = isSearchable
              ? (filterOptions[filterId] || [])
              : (STATIC_FILTER_OPTIONS[filterId] || []);

            const filteredOpts = isSearchable
              ? (filterSearch ? options.filter((o) => o.name.toLowerCase().includes(filterSearch.toLowerCase())).slice(0, 30) : [])
              : options;

            return (
              <div key={filterId} className="relative">
                <button
                  onClick={() => { setOpenFilterDropdown(isOpen ? null : filterId); setFilterSearch(''); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-bold transition-colors ${
                    selected.length > 0
                      ? 'bg-[#E57200]/10 border-[#E57200]/30 text-[#E57200]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {ft.label}
                  {selected.length > 0 && (
                    <span className="bg-[#E57200] text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center">{selected.length}</span>
                  )}
                  <ChevronDown size={10} />
                </button>

                {isOpen && (
                  <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-3 max-h-72 overflow-hidden flex flex-col">
                    {/* Selected chips */}
                    {selected.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-slate-100">
                        {selected.map((val) => (
                          <button
                            key={val}
                            onClick={() => toggleFilterValue(filterId, val)}
                            className="flex items-center gap-1 bg-[#E57200] text-white text-[9px] font-bold px-2 py-0.5 rounded-md hover:bg-[#E57200]/80"
                          >
                            <span className="truncate max-w-[120px]">{isSearchable ? (nameLookup[val] || val) : val}</span>
                            <X size={8} />
                          </button>
                        ))}
                        <button
                          onClick={() => clearFilter(filterId)}
                          className="text-[9px] font-bold text-slate-400 hover:text-red-500 px-1"
                        >
                          Clear all
                        </button>
                      </div>
                    )}

                    {/* Search for searchable */}
                    {isSearchable && (
                      <div className="relative mb-2 shrink-0">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          placeholder={`Search ${ft.label.toLowerCase()}...`}
                          className="w-full bg-slate-50 border border-slate-200 text-[11px] font-bold text-[#232D4B] pl-8 pr-3 py-2 rounded-lg outline-none focus:border-[#E57200]"
                          autoFocus
                        />
                      </div>
                    )}

                    {/* Options */}
                    <div className="overflow-y-auto flex-1 space-y-0.5">
                      {isSearchable && !filterSearch && selected.length === 0 && (
                        <div className="text-[10px] text-slate-400 text-center py-3">Type to search...</div>
                      )}
                      {filteredOpts.map((opt) => {
                        const optId = isSearchable ? opt.id : opt;
                        const optName = isSearchable ? opt.name : opt;
                        const isSel = selected.includes(optId);
                        return (
                          <button
                            key={optId}
                            onClick={() => { toggleFilterValue(filterId, optId); if (isSearchable) setFilterSearch(''); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold flex items-center gap-2 transition-colors ${
                              isSel ? 'bg-[#E57200]/10 text-[#E57200]' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isSel ? 'bg-[#E57200] border-[#E57200]' : 'border-slate-300'
                            }`}>
                              {isSel && <Check size={9} className="text-white" />}
                            </div>
                            {optName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="w-px h-8 bg-slate-200" />

        {/* Column picker */}
        <div className="relative" ref={colPickerRef}>
          <button
            onClick={() => setShowColPicker(!showColPicker)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest text-[#232D4B] transition-colors"
          >
            <Columns3 size={12} className="text-[#E57200]" /> Columns
            <span className="text-[9px] text-slate-400 font-bold normal-case">({activeCols.length})</span>
          </button>
          {showColPicker && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 py-2 max-h-96 overflow-y-auto">
              {Object.entries(colGroups).map(([group, cols]) => (
                <div key={group}>
                  <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">{group}</div>
                  {cols.map((col) => {
                    const ck = colKey(col);
                    const isOn = visibleCols.includes(ck);
                    return (
                      <button
                        key={ck}
                        onClick={() => toggleCol(ck)}
                        className="w-full text-left px-4 py-1.5 text-[11px] font-semibold text-[#232D4B] hover:bg-slate-50 flex items-center gap-2"
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          isOn ? 'bg-[#E57200] border-[#E57200]' : 'border-slate-300'
                        }`}>
                          {isOn && <Check size={9} className="text-white" />}
                        </div>
                        {col.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Raw / Formatted toggle */}
        <button
          onClick={() => setShowRaw(!showRaw)}
          className={`px-3 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors ${
            showRaw ? 'bg-[#232D4B] border-[#232D4B] text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          {showRaw ? 'Raw' : 'Formatted'}
        </button>

        {/* Export */}
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest text-[#232D4B] transition-colors"
        >
          <Download size={12} /> Export
        </button>

        {/* Refresh */}
        <button onClick={() => queryData()} className="p-2 text-[#4D4D4F] hover:text-[#E57200] transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-8 py-2 text-[11px] font-bold text-red-600 shrink-0">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {sortedRows.length === 0 && !loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">
              {authenticated ? 'No Data — adjust filters or date range' : 'Not Authenticated'}
            </span>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky left-0 bg-slate-50 z-20 min-w-[200px]">
                  Queue
                </th>
                {activeCols.map((col) => {
                  const ck = colKey(col);
                  const isSorted = sortCol === ck;
                  return (
                    <th
                      key={ck}
                      onClick={() => handleSort(ck)}
                      className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#E57200] cursor-pointer hover:bg-slate-100 transition-colors select-none whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {isSorted && (sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5 text-[11px] font-black text-[#232D4B] sticky left-0 bg-white z-10 border-r border-slate-100">
                    {nameLookup[row.queueId] || row.queueId || '—'}
                  </td>
                  {activeCols.map((col) => {
                    const val = extractValue(row.metricsMap, col);
                    return (
                      <td key={colKey(col)} className="px-6 py-3.5 text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                        {showRaw ? (typeof val === 'number' ? val.toFixed(2) : val) : formatValue(val, col.unit)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer status */}
      <div className="bg-slate-50 border-t border-slate-200 px-8 py-2 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold text-slate-400">
          {sortedRows.length} queue{sortedRows.length !== 1 ? 's' : ''} &bull; {activeCols.length} column{activeCols.length !== 1 ? 's' : ''}
        </span>
        {loading && <span className="text-[10px] font-bold text-[#E57200]">Loading...</span>}
      </div>
    </div>
  );
}
