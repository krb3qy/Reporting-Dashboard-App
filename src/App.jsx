import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, PlusCircle, MoreVertical, Layout, Table, Calculator, Trash2, LogIn, LogOut, Settings,
} from 'lucide-react';
import { AVAILABLE_RAW_METRICS } from './constants';
import PieChartTile from './components/PieChartTile';
import BarChartTile from './components/BarChartTile';
import SidebarBtn from './components/SidebarBtn';
import FilterEngine from './components/FilterEngine';
import FormulaStudio from './components/FormulaStudio';
import { handleAuthCallback, isAuthenticated, login, logout, getClientId, setClientId } from './services/gcAuth';
import { queryConversationAggregates, getQueues, getDivisions, buildAggregateFilter } from './services/gcApi';

// Mock filter options (used when not authenticated)
const MOCK_FILTER_OPTIONS = {
  queues: ['General_Surg', 'Pediatrics', 'Cardiology', 'ER_Main', 'Billing_Dept'],
  divisions: ['Main Campus', 'North Clinic', 'Childrens'],
  mediaTypes: ['voice', 'callback'],
};

function generateMockData(queues, divisions) {
  return {
    results: queues.map((q) => ({
      group: {
        queueId: q,
        divisionId: divisions[Math.floor(Math.random() * divisions.length)],
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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metricsConfig, setMetricsConfig] = useState([
    { id: Date.now() + 1, name: 'Answer Rate', formula: '(tAnswered_count / nOffered_count) * 100', chartType: 'pie', size: '1x1' },
    { id: Date.now() + 2, name: 'AHT (Sec)', formula: '(tTalk_sum + tHold_sum + tAcw_sum) / tAnswered_count / 1000', chartType: 'bar', size: '1x1' },
    { id: Date.now() + 3, name: 'Abandon %', formula: '(nAbandoned_count / nOffered_count) * 100', chartType: 'bar', size: '2x1' },
  ]);
  const [newMetric, setNewMetric] = useState({ name: '', formula: '', chartType: 'bar', size: '1x1' });
  const [activeFilters, setActiveFilters] = useState(['queues', 'divisions', 'mediaTypes']);
  const [filterValues, setFilterValues] = useState({ queues: [], divisions: [], mediaTypes: [] });
  const [collapsedFilters, setCollapsedFilters] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);
  const [rawData, setRawData] = useState({ results: [] });
  const [filterOptions, setFilterOptions] = useState(MOCK_FILTER_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(getClientId());
  const [showSettings, setShowSettings] = useState(false);

  // Handle OAuth callback on mount
  useEffect(() => {
    const gotToken = handleAuthCallback();
    if (gotToken || isAuthenticated()) {
      setAuthenticated(true);
    }
  }, []);

  // Load data on mount or auth change
  useEffect(() => {
    if (authenticated) {
      loadLiveData();
    } else {
      setRawData(generateMockData(MOCK_FILTER_OPTIONS.queues, MOCK_FILTER_OPTIONS.divisions));
    }
  }, [authenticated]);

  async function loadLiveData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch filter options from GC
      const [queuesRes, divisionsRes] = await Promise.all([getQueues(), getDivisions()]);
      const queueOptions = queuesRes.entities?.map((q) => q.name) || [];
      const divisionOptions = divisionsRes.entities?.map((d) => d.name) || [];
      setFilterOptions({
        queues: queueOptions,
        divisions: divisionOptions,
        mediaTypes: ['voice', 'callback', 'chat', 'email', 'message'],
      });

      // Query aggregates
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const interval = `${dayStart.toISOString()}/${now.toISOString()}`;
      const filter = buildAggregateFilter(filterValues);

      const data = await queryConversationAggregates({
        interval,
        groupBy: ['queueId'],
        filter,
      });

      setRawData(data);
    } catch (err) {
      setError(err.message);
      // Fall back to mock data
      setRawData(generateMockData(MOCK_FILTER_OPTIONS.queues, MOCK_FILTER_OPTIONS.divisions));
    } finally {
      setLoading(false);
    }
  }

  const processedData = useMemo(() => {
    return rawData.results
      .filter((res) => {
        const qMatch = filterValues.queues.length === 0 || filterValues.queues.includes(res.group.queueId);
        const dMatch = filterValues.divisions.length === 0 || filterValues.divisions.includes(res.group.divisionId);
        const mMatch = filterValues.mediaTypes?.length === 0 || filterValues.mediaTypes?.includes(res.group.mediaType);
        return qMatch && dMatch && mMatch;
      })
      .map((row) => {
        const statsDict = {};
        row.data[0].metrics.forEach((m) => {
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

  function handleSaveClientId() {
    setClientId(clientIdInput.trim());
    setShowSettings(false);
  }

  // Iframe security check: refuse to render outside GC iframe (except localhost dev)
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isDev && window.top === window.self) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="text-center p-12">
          <h1 className="text-2xl font-black mb-4">Access Denied</h1>
          <p className="text-slate-400">This application must be accessed through Genesys Cloud.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F4F7F9] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-[#1A2238] flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-white/5 flex flex-col items-center">
          <div className="font-black text-white text-xl tracking-tighter">
            UVA<span className="text-orange-500">HEALTH</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <FilterEngine
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            filterValues={filterValues}
            setFilterValues={setFilterValues}
            filterOptions={filterOptions}
            collapsedFilters={collapsedFilters}
            setCollapsedFilters={setCollapsedFilters}
          />

          <nav className="space-y-2 pt-6 border-t border-white/5">
            <SidebarBtn active={activeTab === 'dashboard'} label="Visuals" icon={<Layout size={16} />} onClick={() => setActiveTab('dashboard')} />
            <SidebarBtn active={activeTab === 'table'} label="Analytics" icon={<Table size={16} />} onClick={() => setActiveTab('table')} />
            <SidebarBtn active={activeTab === 'config'} label="Custom Logic" icon={<Calculator size={16} />} onClick={() => setActiveTab('config')} />
          </nav>
        </div>

        {/* Auth controls at bottom of sidebar */}
        <div className="p-6 border-t border-white/5 space-y-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <Settings size={16} /> Settings
          </button>
          {authenticated ? (
            <button
              onClick={() => { logout(); setAuthenticated(false); }}
              className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <LogOut size={16} /> Logout
            </button>
          ) : (
            <button
              onClick={() => { try { login(); } catch (e) { setError(e.message); } }}
              className="w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-orange-600 text-white hover:bg-orange-700 transition-all"
            >
              <LogIn size={16} /> Connect to GC
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Command Center</span>
            <h1 className="text-lg font-black text-[#232D4B]">OPERATIONAL DASHBOARD</h1>
          </div>
          <div className="flex items-center gap-6">
            {!authenticated && (
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Mock Data</span>
            )}
            {loading && (
              <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest animate-pulse">Loading...</span>
            )}
            {error && (
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest" title={error}>Error</span>
            )}
            <button onClick={handleRefresh} className="p-2 text-slate-400 hover:text-orange-500 transition-colors">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12">
          {/* Settings modal */}
          {showSettings && (
            <div className="max-w-lg mx-auto mb-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
              <h3 className="font-black text-sm uppercase tracking-widest mb-6 text-[#232D4B] flex items-center gap-3">
                <Settings className="text-orange-500" /> OAuth Configuration
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Client ID (Implicit Grant)</label>
                  <input
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    className="w-full bg-slate-50 border-0 p-4 rounded-2xl font-mono text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Paste your GC OAuth Client ID here"
                  />
                </div>
                <button
                  onClick={handleSaveClientId}
                  className="w-full bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-600/20 hover:bg-orange-700 transition-all uppercase tracking-widest"
                >
                  Save Client ID
                </button>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 auto-rows-[420px]">
              {metricsConfig.map((m) => (
                <div
                  key={m.id}
                  className={`bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 flex flex-col relative group transition-all duration-300 ${m.size === '2x1' ? 'lg:col-span-2' : ''}`}
                >
                  <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#232D4B] flex items-center gap-3">
                      <span className="w-2 h-6 bg-orange-500 rounded-full" /> {m.name}
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
                      <PieChartTile data={processedData} metricId={m.id} />
                    ) : (
                      <BarChartTile data={processedData} metricId={m.id} />
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setActiveTab('config')}
                className="border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 hover:text-orange-500 hover:border-orange-200 transition-all gap-4 group"
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
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Queue Entity</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Division</th>
                      {metricsConfig.map((m) => (
                        <th key={m.id} className="p-8 text-[10px] font-black uppercase tracking-widest text-orange-500">{m.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-8 text-xs font-black text-[#232D4B] uppercase">{row.queueId}</td>
                        <td className="p-8 text-xs font-bold text-slate-400">{row.divisionId}</td>
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
