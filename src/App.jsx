import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshCw, PlusCircle, MoreVertical, Layout, Table, Calculator, Trash2, LogOut,
} from 'lucide-react';
import { AVAILABLE_RAW_METRICS, STATIC_FILTER_OPTIONS } from './constants';
import PieChartTile from './components/PieChartTile';
import BarChartTile from './components/BarChartTile';
import SidebarBtn from './components/SidebarBtn';
import FilterEngine from './components/FilterEngine';
import FormulaStudio from './components/FormulaStudio';
import DateRangePicker from './components/DateRangePicker';
import { init as gcInit, isAuthenticated, logout } from './services/gcAuth';
import { queryConversationAggregates, getQueues, getDivisions, getSkills, getWrapUpCodes, getUsers, buildAggregateFilter } from './services/gcApi';

// Mock filter options (used when not authenticated)
const MOCK_FILTER_OPTIONS = {
  queues: [
    { id: 'gen_surg', name: 'General_Surg' },
    { id: 'peds', name: 'Pediatrics' },
    { id: 'cardio', name: 'Cardiology' },
    { id: 'er', name: 'ER_Main' },
    { id: 'billing', name: 'Billing_Dept' },
  ],
  divisions: [
    { id: 'main', name: 'Main Campus' },
    { id: 'north', name: 'North Clinic' },
    { id: 'child', name: 'Childrens' },
  ],
};

function generateMockData(queueOpts, divisionOpts) {
  return {
    results: queueOpts.map((q) => ({
      group: {
        queueId: q.id,
        divisionId: divisionOpts[Math.floor(Math.random() * divisionOpts.length)].id,
        mediaType: Math.random() > 0.8 ? 'callback' : 'voice',
      },
      data: [
        {
          metrics: AVAILABLE_RAW_METRICS.map((m) => ({
            metric: m,
            stats: { count: Math.floor(Math.random() * 500) + 50, sum: Math.floor(Math.random() * 1000000) },
          })),
        },
      ],
    })),
  };
}

// Build a name lookup map from all {id, name} filter options
function buildNameLookup(filterOptions) {
  const map = {};
  for (const key of Object.keys(filterOptions)) {
    const opts = filterOptions[key];
    if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === 'object' && opts[0].id) {
      for (const o of opts) {
        map[o.id] = o.name;
      }
    }
  }
  return map;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metricsConfig, setMetricsConfig] = useState([
    { id: Date.now() + 1, name: 'Answer Rate', formula: '(tAnswered_count / nOffered_count) * 100', chartType: 'pie', size: '1x1' },
    { id: Date.now() + 2, name: 'AHT (Sec)', formula: '(tTalk_sum + tHeld_sum + tAcw_sum) / tAnswered_count / 1000', chartType: 'bar', size: '1x1' },
    { id: Date.now() + 3, name: 'Abandon %', formula: '(nAbandoned_count / nOffered_count) * 100', chartType: 'bar', size: '2x1' },
  ]);
  const [newMetric, setNewMetric] = useState({ name: '', formula: '', chartType: 'bar', size: '1x1' });
  const [activeFilters, setActiveFilters] = useState(['queues', 'mediaTypes', 'direction']);
  const [filterValues, setFilterValues] = useState({ queues: [], divisions: [], mediaTypes: [], direction: [], wrapUpCode: [], skills: [], users: [], dnis: [], ani: [], disconnectType: [], interactionType: [], usedRouting: [] });
  const [collapsedFilters, setCollapsedFilters] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);
  const [rawData, setRawData] = useState({ results: [] });
  const [filterOptions, setFilterOptions] = useState(MOCK_FILTER_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  // Date range — default to today
  const [dateStart, setDateStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [dateEnd, setDateEnd] = useState(() => new Date());

  // Name lookup map for resolving UUIDs to display names
  const nameLookup = useMemo(() => buildNameLookup(filterOptions), [filterOptions]);

  // Auto-authenticate on mount
  useEffect(() => {
    const result = gcInit();
    if (result.authenticated) {
      setAuthenticated(true);
    } else if (result.dev) {
      setRawData(generateMockData(MOCK_FILTER_OPTIONS.queues, MOCK_FILTER_OPTIONS.divisions));
    }
  }, []);

  // Load live data when authenticated
  useEffect(() => {
    if (authenticated) {
      loadLiveData();
    }
  }, [authenticated]);

  async function loadLiveData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch all filter option sets in parallel
      const [queuesRes, divisionsRes, skillsRes, wrapUpRes, usersRes] = await Promise.all([
        getQueues(),
        getDivisions(),
        getSkills().catch(() => ({ entities: [] })),
        getWrapUpCodes().catch(() => ({ entities: [] })),
        getUsers().catch(() => ({ entities: [] })),
      ]);

      setFilterOptions((prev) => ({
        ...prev,
        queues: (queuesRes.entities || []).map((q) => ({ id: q.id, name: q.name })).sort((a, b) => a.name.localeCompare(b.name)),
        divisions: (divisionsRes.entities || []).map((d) => ({ id: d.id, name: d.name })).sort((a, b) => a.name.localeCompare(b.name)),
        skills: (skillsRes.entities || []).map((s) => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name)),
        wrapUpCode: (wrapUpRes.entities || []).map((w) => ({ id: w.id, name: w.name })).sort((a, b) => a.name.localeCompare(b.name)),
        users: (usersRes.entities || []).map((u) => ({ id: u.id, name: u.name })).sort((a, b) => a.name.localeCompare(b.name)),
      }));

      // Query aggregates with current date range
      const interval = `${dateStart.toISOString()}/${dateEnd.toISOString()}`;
      const filter = buildAggregateFilter(filterValues);

      const data = await queryConversationAggregates({
        interval,
        groupBy: ['queueId'],
        filter,
      });

      setRawData(data);
    } catch (err) {
      setError(err.message);
      setRawData(generateMockData(MOCK_FILTER_OPTIONS.queues, MOCK_FILTER_OPTIONS.divisions));
    } finally {
      setLoading(false);
    }
  }

  function handleDateChange(start, end) {
    setDateStart(start);
    setDateEnd(end);
  }

  const processedData = useMemo(() => {
    return (rawData.results || [])
      .filter((res) => {
        // All filter comparisons now use IDs
        const qMatch = !filterValues.queues?.length || filterValues.queues.includes(res.group.queueId);
        const dMatch = !filterValues.divisions?.length || filterValues.divisions.includes(res.group.divisionId);
        const mMatch = !filterValues.mediaTypes?.length || filterValues.mediaTypes.includes(res.group.mediaType);
        const dirMatch = !filterValues.direction?.length || filterValues.direction.includes(res.group.direction);
        return qMatch && dMatch && mMatch && dirMatch;
      })
      .map((row) => {
        const statsDict = {};
        (row.data?.[0]?.metrics || []).forEach((m) => {
          statsDict[`${m.metric}_count`] = m.stats.count;
          statsDict[`${m.metric}_sum`] = m.stats.sum;
        });
        const kpis = metricsConfig.map((m) => {
          let formula = m.formula;
          Object.keys(statsDict).forEach((key) => (formula = formula.replace(new RegExp(`\\b${key}\\b`, 'g'), statsDict[key])));
          try {
            return { ...m, value: new Function(`return ${formula}`)() || 0 };
          } catch {
            return { ...m, value: 0 };
          }
        });
        return { ...row.group, kpis, stats: statsDict };
      });
  }, [rawData, metricsConfig, filterValues]);

  const deleteMetric = (id) => setMetricsConfig(metricsConfig.filter((m) => m.id !== id));
  const toggleSize = (id) => setMetricsConfig(metricsConfig.map((m) => (m.id === id ? { ...m, size: m.size === '1x1' ? '2x1' : '1x1' } : m)));

  function handleRefresh() {
    if (authenticated) {
      loadLiveData();
    } else {
      setRawData(generateMockData(MOCK_FILTER_OPTIONS.queues, MOCK_FILTER_OPTIONS.divisions));
    }
  }

  // Resolve a UUID to a display name, falling back to the raw value
  function resolveName(id) {
    return nameLookup[id] || id;
  }

  // Iframe security check — commented out for testing
  // const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // let isInIframe = true;
  // try {
  //   isInIframe = window.top !== window.self;
  // } catch {
  //   isInIframe = true;
  // }
  // if (!isDev && !isInIframe) {
  //   return (
  //     <div className="flex items-center justify-center h-screen bg-[#232D4B] text-white">
  //       <div className="text-center p-12">
  //         <h1 className="text-2xl font-black mb-4">Access Denied</h1>
  //         <p className="text-slate-400">This application must be accessed through Genesys Cloud.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="flex h-screen bg-[#F4F7F9] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-[#232D4B] flex flex-col shadow-2xl z-20">
        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-center">
          <img src={import.meta.env.BASE_URL + "logo.svg"} alt="UVA Health" className="h-12" />
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <FilterEngine
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            filterValues={filterValues}
            setFilterValues={setFilterValues}
            filterOptions={filterOptions}
            collapsedFilters={collapsedFilters}
            setCollapsedFilters={setCollapsedFilters}
            nameLookup={nameLookup}
          />

          <nav className="space-y-2 pt-5 border-t border-white/5">
            <SidebarBtn active={activeTab === 'dashboard'} label="Visuals" icon={<Layout size={16} />} onClick={() => setActiveTab('dashboard')} />
            <SidebarBtn active={activeTab === 'table'} label="Analytics" icon={<Table size={16} />} onClick={() => setActiveTab('table')} />
            <SidebarBtn active={activeTab === 'config'} label="Custom Logic" icon={<Calculator size={16} />} onClick={() => setActiveTab('config')} />
          </nav>
        </div>

        {/* Logout */}
        {authenticated && (
          <div className="p-5 border-t border-white/5">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[#4D4D4F] uppercase tracking-widest">Command Center</span>
            <h1 className="text-lg font-black text-[#232D4B]">OPERATIONAL DASHBOARD</h1>
          </div>
          <div className="flex items-center gap-4">
            <DateRangePicker startDate={dateStart} endDate={dateEnd} onChange={handleDateChange} />
            <button onClick={handleRefresh} className="p-2 text-[#4D4D4F] hover:text-[#E57200] transition-colors">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 auto-rows-[420px]">
              {metricsConfig.map((m) => (
                <div
                  key={m.id}
                  className={`bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 flex flex-col relative group transition-all duration-300 ${m.size === '2x1' ? 'lg:col-span-2' : ''}`}
                >
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#232D4B] flex items-center gap-3">
                      <span className="w-2 h-6 bg-[#E57200] rounded-full" /> {m.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button onClick={() => setActiveMenu(activeMenu === m.id ? null : m.id)} className="p-2 text-slate-300 hover:text-slate-600">
                          <MoreVertical size={18} />
                        </button>
                        {activeMenu === m.id && (
                          <div className="absolute right-0 top-10 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2">
                            <button
                              onClick={() => { toggleSize(m.id); setActiveMenu(null); }}
                              className="w-full text-left px-4 py-2 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Layout size={14} /> Toggle Size
                            </button>
                            <button
                              onClick={() => { deleteMetric(m.id); setActiveMenu(null); }}
                              className="w-full text-left px-4 py-2 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-visible">
                    {m.chartType === 'pie' ? (
                      <PieChartTile data={processedData} metricId={m.id} nameLookup={nameLookup} />
                    ) : (
                      <BarChartTile data={processedData} metricId={m.id} nameLookup={nameLookup} />
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setActiveTab('config')}
                className="border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 hover:text-[#E57200] hover:border-[#E57200]/30 transition-all gap-4 group"
              >
                <PlusCircle size={48} className="group-hover:scale-110 transition-transform" />
                <span className="font-black uppercase tracking-[0.2em] text-xs">Add Dashboard Metric</span>
              </button>
            </div>
          )}

          {activeTab === 'config' && (
            <FormulaStudio
              metricsConfig={metricsConfig}
              setMetricsConfig={setMetricsConfig}
              newMetric={newMetric}
              setNewMetric={setNewMetric}
            />
          )}

          {activeTab === 'table' && (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Queue</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Division</th>
                      {metricsConfig.map((m) => (
                        <th key={m.id} className="p-8 text-[10px] font-black uppercase tracking-widest text-[#E57200]">{m.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-8 text-xs font-black text-[#232D4B]">{resolveName(row.queueId)}</td>
                        <td className="p-8 text-xs font-bold text-[#4D4D4F]">{resolveName(row.divisionId)}</td>
                        {row.kpis.map((k) => (
                          <td key={k.id} className="p-8 text-xs font-black text-slate-700">{k.value.toFixed(1)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
