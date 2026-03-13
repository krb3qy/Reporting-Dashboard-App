import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  RefreshCw, PlusCircle, MoreVertical, Layout, Table, Calculator, Trash2,
  ScrollText, Menu, X,
} from 'lucide-react';
import { AVAILABLE_RAW_METRICS } from './constants';
import PieChartTile from './components/PieChartTile';
import BarChartTile from './components/BarChartTile';
import FilterEngine from './components/FilterEngine';
import FormulaStudio from './components/FormulaStudio';
import DateRangePicker from './components/DateRangePicker';
import AnalyticsView from './components/AnalyticsView';
import ViewPicker from './components/ViewPicker';
import { init as gcInit } from './services/gcAuth';
import { queryConversationAggregates, getQueues, getDivisions, getSkills, getWrapUpCodes, getUsers, getLanguages, getTeams, getOutboundCampaigns, getCurrentUser, buildAggregateFilter, getApiLogs, onApiLogUpdate } from './services/gcApi';
import { formatValue } from './utils/format';
import { getSavedViews, saveView, deleteView as deleteStoredView, renameView as renameStoredView, getDefaultViewId, setDefaultView, clearDefaultView } from './services/viewStore';

// Users who can see the DEV badge and API Log tab
const DEV_USER_IDS = [
  '368cb040-5592-4cf5-8658-a973230c67ee', // Alex Specha
  '78829cbd-cd25-4485-a96e-95452e851746',
];

const DEFAULT_METRICS = [
  { id: 'mc_1', name: 'Answer Rate', formula: '(tAnswered_count / nOffered_count) * 100', chartType: 'pie', size: '1x1', unit: 'percent' },
  { id: 'mc_2', name: 'Avg Handle Time', formula: '(tTalk_sum + tHeld_sum + tAcw_sum) / tAnswered_count / 1000', chartType: 'bar', size: '1x1', unit: 'seconds' },
  { id: 'mc_3', name: 'Abandon Rate', formula: '(tAbandon_count / nOffered_count) * 100', chartType: 'bar', size: '2x1', unit: 'percent' },
];

const DEFAULT_FILTER_VALUES = { queues: [], divisions: [], mediaTypes: [], direction: [], wrapUpCode: [], skills: [], users: [], dnis: [], ani: [], disconnectType: [], interactionType: [], usedRouting: [], messageType: [], requestedLanguageId: [], teamId: [], provider: [], purpose: [] };

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

const BASE_TABS = [
  { id: 'dashboard', label: 'Visuals', icon: Layout },
  { id: 'table', label: 'Analytics', icon: Table },
  { id: 'config', label: 'Custom Logic', icon: Calculator },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metricsConfig, setMetricsConfig] = useState(DEFAULT_METRICS);
  const [newMetric, setNewMetric] = useState({ name: '', formula: '', chartType: 'bar', size: '1x1', unit: 'count' });
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterValues, setFilterValues] = useState(DEFAULT_FILTER_VALUES);
  const [collapsedFilters, setCollapsedFilters] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);
  const [rawData, setRawData] = useState({ results: [] });
  const [filterOptions, setFilterOptions] = useState(MOCK_FILTER_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  // Dev mode
  const [isDev, setIsDev] = useState(false);
  const [showDevLog, setShowDevLog] = useState(false);
  const [apiLogs, setApiLogs] = useState(getApiLogs());
  const logEndRef = useRef(null);

  // Responsive sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Saved views
  const [savedViews, setSavedViews] = useState(getSavedViews());
  const [activeViewId, setActiveViewId] = useState(null);
  const [defaultViewId, setDefaultViewIdState] = useState(getDefaultViewId());

  const [dateStart, setDateStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [dateEnd, setDateEnd] = useState(() => new Date());

  const nameLookup = useMemo(() => buildNameLookup(filterOptions), [filterOptions]);

  const initialLoadDone = useRef(false);

  // Sidebar + header date picker visible only on Visuals and Custom Logic tabs
  const showSidebar = activeTab !== 'table' && activeTab !== 'log';

  // Build tabs list — add Log tab only when dev mode is active
  const tabs = useMemo(() => {
    if (showDevLog) {
      return [...BASE_TABS, { id: 'log', label: 'API Log', icon: ScrollText }];
    }
    return BASE_TABS;
  }, [showDevLog]);

  // --- View management ---
  function getCurrentState() {
    return {
      metricsConfig,
      activeFilters,
      filterValues,
      activeTab,
    };
  }

  function applyViewState(state) {
    if (state.metricsConfig) setMetricsConfig(state.metricsConfig);
    if (state.activeFilters) setActiveFilters(state.activeFilters);
    if (state.filterValues) setFilterValues({ ...DEFAULT_FILTER_VALUES, ...state.filterValues });
    if (state.activeTab) setActiveTab(state.activeTab);
  }

  function handleSaveAsNew(name) {
    const id = `view_${Date.now()}`;
    const view = { id, name, state: getCurrentState() };
    saveView(view);
    setSavedViews(getSavedViews());
    setActiveViewId(id);
  }

  function handleSaveView() {
    if (!activeViewId) return;
    const existing = savedViews.find((v) => v.id === activeViewId);
    if (!existing) return;
    const updated = { ...existing, state: getCurrentState() };
    saveView(updated);
    setSavedViews(getSavedViews());
  }

  function handleLoadView(id) {
    const view = savedViews.find((v) => v.id === id);
    if (!view) return;
    applyViewState(view.state);
    setActiveViewId(id);
  }

  function handleDeleteView(id) {
    deleteStoredView(id);
    setSavedViews(getSavedViews());
    if (activeViewId === id) setActiveViewId(null);
    if (defaultViewId === id) setDefaultViewIdState(null);
  }

  function handleRenameView(id, newName) {
    renameStoredView(id, newName);
    setSavedViews(getSavedViews());
  }

  function handleSetDefault(id) {
    if (id) {
      setDefaultView(id);
      setDefaultViewIdState(id);
    } else {
      clearDefaultView();
      setDefaultViewIdState(null);
    }
  }

  // Subscribe to API log updates
  useEffect(() => {
    return onApiLogUpdate((newLogs) => setApiLogs(newLogs));
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (activeTab === 'log' && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [apiLogs, activeTab]);

  // Auto-authenticate on mount
  useEffect(() => {
    const result = gcInit();
    if (result.authenticated) {
      setAuthenticated(true);
    } else if (result.dev) {
      setRawData(generateMockData(MOCK_FILTER_OPTIONS.queues));
    }
  }, []);

  // Check if current user is a dev user
  useEffect(() => {
    if (!authenticated) return;
    getCurrentUser()
      .then((user) => {
        if (DEV_USER_IDS.includes(user.id)) {
          setIsDev(true);
        }
      })
      .catch(() => {});
  }, [authenticated]);

  // Load default view on startup (after options are loaded so filters make sense)
  useEffect(() => {
    if (!optionsLoaded) return;
    const defId = getDefaultViewId();
    if (defId) {
      const views = getSavedViews();
      const defView = views.find((v) => v.id === defId);
      if (defView) {
        applyViewState(defView.state);
        setActiveViewId(defId);
      }
    }
  }, [optionsLoaded]);

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
      const [queuesRes, divisionsRes, skillsRes, wrapUpRes, usersRes, langsRes, teamsRes, campaignsRes] = await Promise.all([
        getQueues(),
        getDivisions(),
        getSkills().catch(() => ({ entities: [] })),
        getWrapUpCodes().catch(() => ({ entities: [] })),
        getUsers().catch(() => ({ entities: [] })),
        getLanguages().catch(() => ({ entities: [] })),
        getTeams().catch(() => ({ entities: [] })),
        getOutboundCampaigns().catch(() => ({ entities: [] })),
      ]);

      const sortByName = (arr) => arr.sort((a, b) => a.name.localeCompare(b.name));

      setFilterOptions((prev) => ({
        ...prev,
        queues: sortByName((queuesRes.entities || []).map((q) => ({ id: q.id, name: q.name }))),
        divisions: sortByName((divisionsRes.entities || []).map((d) => ({ id: d.id, name: d.name }))),
        skills: sortByName((skillsRes.entities || []).map((s) => ({ id: s.id, name: s.name }))),
        wrapUpCode: sortByName((wrapUpRes.entities || []).map((w) => ({ id: w.id, name: w.name }))),
        users: sortByName((usersRes.entities || []).map((u) => ({ id: u.id, name: u.name }))),
        requestedLanguageId: sortByName((langsRes.entities || []).map((l) => ({ id: l.id, name: l.name }))),
        teamId: sortByName((teamsRes.entities || []).map((t) => ({ id: t.id, name: t.name }))),
        outboundCampaignId: sortByName((campaignsRes.entities || []).map((c) => ({ id: c.id, name: c.name }))),
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

  const LOG_LEVEL_STYLES = {
    req: 'text-cyan-400',
    res: 'text-green-400',
    err: 'text-red-400',
    info: 'text-slate-400',
  };

  return (
    <div className="flex flex-col h-screen bg-[#F4F7F9] text-slate-900 overflow-hidden font-sans">
      {/* Unified header bar */}
      <header className="h-12 lg:h-16 bg-white border-b border-slate-200 flex items-center shrink-0 shadow-sm z-30">
        {/* Mobile sidebar toggle */}
        {showSidebar && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-3 text-slate-500 hover:text-[#E57200] transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        {/* Logo */}
        <div className="h-full flex items-center justify-center px-3 lg:px-6">
          <img src={import.meta.env.BASE_URL + "logo.svg"} alt="UVA Health" className="h-8 lg:h-10" />
        </div>

        {/* Tab nav */}
        <nav className="flex items-center gap-1 px-2 lg:px-4 h-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-2 lg:px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                  isActive
                    ? 'bg-[#E57200] text-white shadow-md shadow-[#E57200]/20'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-[#232D4B]'
                }`}
              >
                <Icon size={14} /> <span className="hidden lg:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* View picker */}
        <ViewPicker
          savedViews={savedViews}
          activeViewId={activeViewId}
          defaultViewId={defaultViewId}
          onLoadView={handleLoadView}
          onSaveView={handleSaveView}
          onSaveAsNew={handleSaveAsNew}
          onDeleteView={handleDeleteView}
          onRenameView={handleRenameView}
          onSetDefault={handleSetDefault}
        />

        {/* DEV badge — only for dev users */}
        {isDev && (
          <button
            onClick={() => {
              const next = !showDevLog;
              setShowDevLog(next);
              if (!next && activeTab === 'log') setActiveTab('dashboard');
            }}
            className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-colors ml-2 ${
              showDevLog
                ? 'bg-[#E57200] text-white'
                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
            }`}
            title="Toggle API Log tab"
          >
            DEV
          </button>
        )}

        {/* Right side controls — only for non-analytics/log tabs */}
        {showSidebar && (
          <div className="flex items-center gap-2 lg:gap-4 px-4 lg:px-8">
            <DateRangePicker startDate={dateStart} endDate={dateEnd} onChange={handleDateChange} />
            <button onClick={handleRefresh} className="p-2 text-[#4D4D4F] hover:text-[#E57200] transition-colors">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}

      </header>

      {/* Debug bar — dev users only */}
      {isDev && showDevLog && (
        <div className="bg-slate-800 text-white text-[10px] font-mono px-4 lg:px-8 py-1 flex gap-4 lg:gap-6 shrink-0 z-20 flex-wrap">
          <span>auth: {authenticated ? 'yes' : 'no'}</span>
          <span>options: {optionsLoaded ? 'loaded' : 'pending'}</span>
          <span>results: {rawData.results?.length ?? 0}</span>
          <span>processed: {processedData.length}</span>
          <span>loading: {loading ? 'yes' : 'no'}</span>
          {error && <span className="text-red-400">ERR: {error}</span>}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar — only for Visuals and Custom Logic */}
        {showSidebar && (
          <>
            {/* Mobile overlay */}
            {sidebarOpen && (
              <div
                className="lg:hidden fixed inset-0 bg-black/40 z-20"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <aside className={`
              bg-[#232D4B] flex flex-col shadow-2xl z-20 shrink-0 transition-transform duration-300
              fixed lg:static inset-y-0 left-0 w-72
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
              <div className="flex-1 overflow-y-auto p-5 space-y-6 pt-16 lg:pt-5">
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
          </>
        )}

        {/* Main content */}
        {activeTab === 'table' ? (
          <div className="flex-1 min-w-0 overflow-hidden">
            <AnalyticsView
              filterOptions={filterOptions}
              nameLookup={nameLookup}
              authenticated={authenticated}
            />
          </div>
        ) : activeTab === 'log' ? (
          /* API Log view */
          <main className="flex-1 overflow-hidden flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 lg:px-8 py-3 flex items-center justify-between shrink-0">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#232D4B] flex items-center gap-2">
                <ScrollText size={14} className="text-[#E57200]" /> API Request Log
                <span className="text-slate-400 font-bold normal-case">({apiLogs.length})</span>
              </h2>
              <button
                onClick={() => setApiLogs([])}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-900 p-4 lg:p-6 font-mono text-[11px] space-y-1">
              {apiLogs.length === 0 && (
                <div className="text-slate-500 text-center py-12 text-sm">No API calls yet</div>
              )}
              {apiLogs.map((entry, i) => (
                <div key={i} className={`flex gap-3 items-start py-1 border-b border-white/5 ${LOG_LEVEL_STYLES[entry.level] || 'text-slate-400'}`}>
                  <span className="text-slate-500 shrink-0 w-20">{entry.time}</span>
                  <span className={`shrink-0 w-8 font-black uppercase text-[9px] ${LOG_LEVEL_STYLES[entry.level]}`}>{entry.level}</span>
                  <span className="text-slate-200 flex-1">{entry.msg}</span>
                  {entry.data && (
                    <span className="text-slate-500 truncate max-w-[300px]">
                      {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data)}
                    </span>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-6 lg:p-12">
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 auto-rows-[minmax(320px,420px)]">
                {metricsConfig.map((m) => (
                  <div
                    key={m.id}
                    className={`bg-white rounded-2xl lg:rounded-[2.5rem] shadow-sm border border-slate-200 p-6 lg:p-10 flex flex-col relative group transition-all duration-300 ${m.size === '2x1' ? 'lg:col-span-2' : ''}`}
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
                    <div className="flex-1 overflow-hidden">
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
                  className="border-4 border-dashed border-slate-200 rounded-2xl lg:rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 hover:text-[#E57200] hover:border-[#E57200]/30 transition-all gap-4 group"
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
