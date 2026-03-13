import React, { useState } from 'react';
import { Calculator, PlusCircle, Trash2, ChevronDown, ChevronRight, Search } from 'lucide-react';

// Curated metric groups with human-readable labels
const METRIC_GROUPS = [
  {
    label: 'Volume',
    metrics: [
      { key: 'nOffered', name: 'Offered' },
      { key: 'nConnected', name: 'Connected' },
      { key: 'nConversations', name: 'Conversations' },
      { key: 'nTransferred', name: 'Transferred' },
      { key: 'nBlindTransferred', name: 'Blind Transferred' },
      { key: 'nConsultTransferred', name: 'Consult Transferred' },
      { key: 'nConsult', name: 'Consult' },
      { key: 'nError', name: 'Errors' },
      { key: 'nOverSla', name: 'Over SLA' },
    ],
  },
  {
    label: 'Outbound',
    metrics: [
      { key: 'nOutbound', name: 'Outbound' },
      { key: 'nOutboundAttempted', name: 'Outbound Attempted' },
      { key: 'nOutboundConnected', name: 'Outbound Connected' },
      { key: 'nOutboundAbandoned', name: 'Outbound Abandoned' },
    ],
  },
  {
    label: 'Durations',
    metrics: [
      { key: 'tAbandon', name: 'Abandon' },
      { key: 'tAcd', name: 'ACD' },
      { key: 'tAcw', name: 'After Contact Work' },
      { key: 'tAlert', name: 'Alert' },
      { key: 'tAnswered', name: 'Answered' },
      { key: 'tConnected', name: 'Connected' },
      { key: 'tContacting', name: 'Contacting' },
      { key: 'tDialing', name: 'Dialing' },
      { key: 'tHandle', name: 'Handle' },
      { key: 'tHeld', name: 'Held' },
      { key: 'tHeldComplete', name: 'Held Complete' },
      { key: 'tIvr', name: 'IVR' },
      { key: 'tTalk', name: 'Talk' },
      { key: 'tTalkComplete', name: 'Talk Complete' },
      { key: 'tWait', name: 'Wait' },
      { key: 'tNotResponding', name: 'Not Responding' },
      { key: 'tFlowOut', name: 'Flow Out' },
      { key: 'tShortAbandon', name: 'Short Abandon' },
      { key: 'tVoicemail', name: 'Voicemail' },
    ],
  },
  {
    label: 'Monitoring',
    metrics: [
      { key: 'tMonitoring', name: 'Monitoring' },
      { key: 'tMonitoringComplete', name: 'Monitoring Complete' },
      { key: 'tCoaching', name: 'Coaching' },
      { key: 'tCoachingComplete', name: 'Coaching Complete' },
      { key: 'tBarging', name: 'Barging' },
      { key: 'tScreenMonitoring', name: 'Screen Monitoring' },
    ],
  },
  {
    label: 'Response Times',
    metrics: [
      { key: 'tAgentResponseTime', name: 'Agent Response' },
      { key: 'tUserResponseTime', name: 'User Response' },
      { key: 'tFirstConnect', name: 'First Connect' },
      { key: 'tFirstDial', name: 'First Dial' },
      { key: 'tFirstResponse', name: 'First Response' },
      { key: 'tFirstEngagement', name: 'First Engagement' },
    ],
  },
  {
    label: 'Service Level',
    metrics: [
      { key: 'oServiceLevel', name: 'Service Level' },
      { key: 'oServiceTarget', name: 'Service Target' },
    ],
  },
];

export default function FormulaStudio({ metricsConfig, setMetricsConfig, newMetric, setNewMetric }) {
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [metricSearch, setMetricSearch] = useState('');

  const addMetric = () => {
    if (!newMetric.name || !newMetric.formula) return;
    setMetricsConfig([...metricsConfig, { ...newMetric, id: Date.now() }]);
    setNewMetric({ name: '', formula: '', chartType: 'bar', size: '1x1', unit: 'count' });
  };

  const deleteMetric = (id) => setMetricsConfig(metricsConfig.filter((m) => m.id !== id));

  function insertMetric(key, suffix) {
    const token = `${key}_${suffix}`;
    setNewMetric({ ...newMetric, formula: newMetric.formula + (newMetric.formula && !newMetric.formula.endsWith(' ') ? ' ' : '') + token });
  }

  // Filter metrics by search
  const filteredGroups = metricSearch
    ? METRIC_GROUPS.map((g) => ({
        ...g,
        metrics: g.metrics.filter((m) => m.name.toLowerCase().includes(metricSearch.toLowerCase()) || m.key.toLowerCase().includes(metricSearch.toLowerCase())),
      })).filter((g) => g.metrics.length > 0)
    : METRIC_GROUPS;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <section className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-200">
        <h3 className="font-black text-sm uppercase tracking-widest mb-10 text-[#232D4B] flex items-center gap-3">
          <Calculator className="text-[#E57200]" /> Formula Studio
        </h3>
        <div className="grid grid-cols-3 gap-8 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Metric Display Name</label>
            <input
              value={newMetric.name}
              onChange={(e) => setNewMetric({ ...newMetric, name: e.target.value })}
              className="w-full bg-slate-50 border-0 p-4 rounded-2xl font-bold focus:ring-2 focus:ring-[#E57200] outline-none"
              placeholder="e.g. Total Handle Efficiency"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Visualization Type</label>
            <select
              value={newMetric.chartType}
              onChange={(e) => setNewMetric({ ...newMetric, chartType: e.target.value })}
              className="w-full bg-slate-50 border-0 p-4 rounded-2xl font-bold outline-none"
            >
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart (1x1 Only)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Value Format</label>
            <select
              value={newMetric.unit || 'count'}
              onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
              className="w-full bg-slate-50 border-0 p-4 rounded-2xl font-bold outline-none"
            >
              <option value="count">Count / Number</option>
              <option value="percent">Percentage (%)</option>
              <option value="seconds">Duration (seconds → m:ss)</option>
              <option value="milliseconds">Duration (ms → m:ss)</option>
            </select>
          </div>
        </div>

        {/* Formula textarea */}
        <div className="space-y-2 mb-6">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Calculation Formula</label>
          <textarea
            value={newMetric.formula}
            onChange={(e) => setNewMetric({ ...newMetric, formula: e.target.value })}
            className="w-full bg-[#232D4B] text-[#E57200] p-6 rounded-2xl font-mono text-sm min-h-[120px] focus:ring-2 focus:ring-[#E57200] outline-none shadow-inner"
            placeholder="(tTalk_sum + tHeld_sum + tAcw_sum) / tAnswered_count / 1000"
          />
        </div>

        {/* Metric reference panel */}
        <div className="bg-slate-50 rounded-2xl border border-slate-100 mb-8 overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-3 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Insert Metric</span>
            <div className="flex-1 relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={metricSearch}
                onChange={(e) => setMetricSearch(e.target.value)}
                placeholder="Search metrics..."
                className="w-full bg-white border border-slate-200 text-[11px] font-bold text-[#232D4B] pl-8 pr-3 py-2 rounded-lg outline-none focus:border-[#E57200]"
              />
            </div>
            <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase">
              <span className="bg-[#232D4B] text-white px-2 py-0.5 rounded">_count</span>
              <span>= occurrences</span>
              <span className="bg-[#232D4B] text-[#E57200] px-2 py-0.5 rounded ml-2">_sum</span>
              <span>= total value</span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredGroups.map((group) => {
              const isOpen = metricSearch || expandedGroup === group.label;
              return (
                <div key={group.label}>
                  {!metricSearch && (
                    <button
                      onClick={() => setExpandedGroup(isOpen ? null : group.label)}
                      className="w-full flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#232D4B] hover:bg-slate-100 transition-colors"
                    >
                      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {group.label}
                      <span className="text-slate-400 font-bold normal-case">({group.metrics.length})</span>
                    </button>
                  )}
                  {isOpen && (
                    <div className="px-5 pb-3 grid grid-cols-2 gap-1.5">
                      {group.metrics.map((m) => (
                        <div key={m.key} className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500 flex-1 truncate">{m.name}</span>
                          <button
                            onClick={() => insertMetric(m.key, 'count')}
                            className="text-[8px] font-black bg-white border border-slate-200 text-[#232D4B] px-2 py-1 rounded hover:bg-[#E57200]/10 hover:text-[#E57200] hover:border-[#E57200]/30 transition-colors"
                          >
                            count
                          </button>
                          <button
                            onClick={() => insertMetric(m.key, 'sum')}
                            className="text-[8px] font-black bg-white border border-slate-200 text-[#E57200] px-2 py-1 rounded hover:bg-[#E57200]/10 hover:border-[#E57200]/30 transition-colors"
                          >
                            sum
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={addMetric}
          className="w-full bg-[#E57200] text-white font-black py-5 rounded-2xl shadow-xl shadow-[#E57200]/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
        >
          <PlusCircle size={20} /> Deploy New Metric
        </button>
      </section>

      <section className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-200">
        <h3 className="font-black text-sm uppercase tracking-widest mb-8 text-[#232D4B]">Active KPI Stack</h3>
        <div className="space-y-3">
          {metricsConfig.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase text-[#232D4B]">{m.name}</span>
                <code className="text-[9px] text-slate-400">{m.formula}</code>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-black text-slate-300 uppercase">
                  {m.chartType} &bull; {m.size} &bull; {m.unit || 'count'}
                </span>
                <button onClick={() => deleteMetric(m.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
