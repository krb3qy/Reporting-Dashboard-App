import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RefreshCw, PlusCircle, MoreVertical, Layout, Table, Calculator, Trash2, LogOut,
} from 'lucide-react';
import { AVAILABLE_RAW_METRICS } from './constants';
import PieChartTile from './components/PieChartTile';
import BarChartTile from './components/BarChartTile';
import FilterEngine from './components/FilterEngine';
import FormulaStudio from './components/FormulaStudio';
import DateRangePicker from './components/DateRangePicker';
import AnalyticsView from './components/AnalyticsView';
import { init as gcInit, isAuthenticated, logout } from './services/gcAuth';
import { queryConversationAggregates, getQueues, getDivisions, getSkills, getWrapUpCodes, getUsers, buildAggregateFilter } from './services/gcApi';
import { formatValue } from './utils/format';

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

function generateMockData(queueOpts) {
  return {
    results: queueOpts.map((q) => ({
      group: { queueId: q.id },
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

function buildNameLookup(filterOptions) {
  const map = {};
  for (const key of Object.keys(filterOptions)) {
    const opts = filterOptions[key];
    if (Array.isArray(opts) && opts.length > 0 && typeof opts[0] === 'object' && opts[0].id) {
      for (const o of opts) map[o.id] = o.name;
    }
  }
  return map;
}

const TABS = [
  { id: 'dashboard', label: 'Visuals', icon: Layout },
  { id: 'table', label: 'Analytics', icon: Table },
  { id: 'config', label: 'Custom Logic', icon: Calculator },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metricsConfig, setMetricsConfig] = useState([
    { id: Date.now() + 1, name: 'Answer Rate', formula: '(tAnswered_count / nOffered_count) * 100', chartType: 'pie', size: '1x1', unit: 'percent' },
    { id: Date.now() + 2, name: 'Avg Handle Time', formula: '(tTalk_sum + tHeld_sum + tAcw_sum) / tAnswered_count / 1000', chartType: 'bar', size: '1x1', unit: 'seconds' },
    { id: Date.now() + 3, name: 'Abandon Rate', formula: '(tAbandon_count / nOffered_count) * 100', chartType: 'bar', size: '2x1', unit: 'percent' },
  ]);
  const [newMetric, setNewMetric] = useState({ name: '', formula: '', chartType: 'bar', size: '1x1', unit: 'count' });
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterValues, setFilterValues] = useState({ queues: [], divisions: [], mediaTypes: [], direction: [], wrapUpCode: [], skills: [], users: [], dnis: [], ani: [], disconnectType: [], interactionType: [], usedRouting: [] });
  const [collapsedFilters, setCollapsedFilters] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);
  const [rawData, setRawData] = useState({ results: [] });
  const [filterOptions, setFilterOptions] = useState(MOCK_FILTER_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  const [dateStart, setDateStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [dateEnd, setDateEnd] = useState(() => new Date());

  const nameLookup = useMemo(() => buildNameLookup(filterOptions), [filterOptions]);

  const initialLoadDone = useRef(false);

  // Sidebar + header date picker visible only on Visuals and Custom Logic tabs
  const showSidebar = activeTab !== 'table';

  // Auto-authenticate on mount
  useEffect(() => {
    const result = gcInit();
    if (result.authenticated) {
      setAuthenticated(true);
    } else if (result.dev) {
      setRawData(generateMockData(MOCK_FILTER_OPTIONS.queues));
    }
  }, []);

  // Load filter options once when authenticated
  useEffect(() => {
    if (!authenticated || optionsLoaded) return;
    loadFilterOptions();
  }, [authenticated]);

  // Query data when filters/dates change (Visuals tab data)
  useEffect(() => {
    if (!authenticated || !initialLoadDone.current) return;
    const timer = setTimeout(() => queryData(), 600);
    return () => clearTimeout(timer);
  }, [filterValues, dateStart, dateEnd]);

  async function loadFilterOptions() {
    setLoading(true);
    setError(null);
    try {
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

      setOptionsLoaded(true);
      await queryData();
      initialLoadDone.current = true;
    } catch (err) {
      setError(err.message);
      setRawData(generateMockData(MOCK_FILTER_OPTIONS.queues));
    } finally {
      setLoading(false);
    }
  }

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

  function handleDateChange(start, end) {
    setDateStart(start);
    setDateEnd(end);
  }

  const processedData = useMemo(() => {
    return (rawData.results || []).map((row) => {
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
  }, [rawData, metricsConfig]);

  const deleteMetric = (id) => setMetricsConfig(metricsConfig.filter((m) => m.id !== id));
  const toggleSize = (id) => setMetricsConfig(metricsConfig.map((m) => (m.id === id ? { ...m, size: m.size === '1x1' ? '2x1' : '1x1' } : m)));

  function handleRefresh() {
    if (authenticated) {
      queryData();
    } else {
      setRawData(generateMockData(MOCK_FILTER_OPTIONS.queues));
    }
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
    <div className="flex flex-col h-screen bg-[#F4F7F9] text-slate-900 overflow-hidden font-sans">
      {/* Unified header bar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center shrink-0 shadow-sm z-30">
        {/* Logo */}
        <div className="h-full flex items-center justify-center px-6">
          <img src={import.meta.env.BASE_URL + "logo.svg"} alt="UVA Health" className="h-10" />
        </div>

        {/* Tab nav */}
        <nav className="flex items-center gap-1 px-4 h-full">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                  isActive
                    ? 'bg-[#E57200] text-white shadow-md shadow-[#E57200]/20'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-[#232D4B]'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Right side controls — only for non-analytics tabs */}
        {showSidebar && (
          <div className="flex items-center gap-4 px-8">
            <DateRangePicker startDate={dateStart} endDate={dateEnd} onChange={handleDateChange} />
            <button onClick={handleRefresh} className="p-2 text-[#4D4D4F] hover:text-[#E57200] transition-colors">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}

        {/* Logout */}
        {authenticated && (
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 mr-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#E57200] transition-colors"
          >
            <LogOut size={14} />
          </button>
        )}
      </header>

      {/* Debug bar — remove after testing */}
      <div className="bg-slate-800 text-white text-[10px] font-mono px-8 py-1 flex gap-6 shrink-0 z-20">
        <span>auth: {authenticated ? 'yes' : 'no'}</span>
        <span>options: {optionsLoaded ? 'loaded' : 'pending'}</span>
        <span>results: {rawData.results?.length ?? 0}</span>
        <span>processed: {processedData.length}</span>
        <span>loading: {loading ? 'yes' : 'no'}</span>
        {error && <span className="text-red-400">ERR: {error}</span>}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — only for Visuals and Custom Logic */}
        {showSidebar && (
          <aside className="w-72 bg-[#232D4B] flex flex-col shadow-2xl z-10 shrink-0">
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
            </div>
          </aside>
        )}

        {/* Main content */}
        {activeTab === 'table' ? (
          <AnalyticsView
            filterOptions={filterOptions}
            nameLookup={nameLookup}
            authenticated={authenticated}
          />
        ) : (
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
                    <div className="flex-1 overflow-visible">
                      {m.chartType === 'pie' ? (
                        <PieChartTile data={processedData} metricId={m.id} metricName={m.name} unit={m.unit} nameLookup={nameLookup} />
                      ) : (
                        <BarChartTile data={processedData} metricId={m.id} metricName={m.name} unit={m.unit} nameLookup={nameLookup} />
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
          </main>
        )}
      </div>
    </div>
  );
}
