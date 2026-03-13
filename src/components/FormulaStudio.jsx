import React from 'react';
import { Calculator, PlusCircle, Trash2 } from 'lucide-react';
import { AVAILABLE_RAW_METRICS } from '../constants';

export default function FormulaStudio({ metricsConfig, setMetricsConfig, newMetric, setNewMetric }) {
  const addMetric = () => {
    if (!newMetric.name || !newMetric.formula) return;
    setMetricsConfig([...metricsConfig, { ...newMetric, id: Date.now() }]);
    setNewMetric({ name: '', formula: '', chartType: 'bar', size: '1x1', unit: 'count' });
  };

  const deleteMetric = (id) => setMetricsConfig(metricsConfig.filter((m) => m.id !== id));

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
        <div className="space-y-2 mb-8">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Calculation Formula</label>
          <textarea
            value={newMetric.formula}
            onChange={(e) => setNewMetric({ ...newMetric, formula: e.target.value })}
            className="w-full bg-[#232D4B] text-[#E57200] p-6 rounded-2xl font-mono text-sm min-h-[120px] focus:ring-2 focus:ring-[#E57200] outline-none shadow-inner"
            placeholder="(tTalk_sum + tHeld_sum) / tAnswered_count"
          />
          <div className="flex flex-wrap gap-2 pt-4">
            {AVAILABLE_RAW_METRICS.map((m) => (
              <button
                key={m}
                onClick={() => setNewMetric({ ...newMetric, formula: newMetric.formula + ` ${m}_count ` })}
                className="text-[9px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-[#E57200]/10 hover:text-[#E57200] transition-colors uppercase"
              >
                +{m}
              </button>
            ))}
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
