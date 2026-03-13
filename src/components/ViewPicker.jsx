import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, ChevronDown, Save, Star, Trash2, Pencil, Check, X } from 'lucide-react';

export default function ViewPicker({
  savedViews,
  activeViewId,
  defaultViewId,
  onLoadView,
  onSaveView,
  onSaveAsNew,
  onDeleteView,
  onRenameView,
  onSetDefault,
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSaving(false);
        setRenamingId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSaveNew() {
    const name = saveName.trim();
    if (!name) return;
    onSaveAsNew(name);
    setSaveName('');
    setSaving(false);
  }

  function handleRename(id) {
    const name = renameVal.trim();
    if (!name) return;
    onRenameView(id, name);
    setRenamingId(null);
  }

  const activeView = savedViews.find((v) => v.id === activeViewId);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setSaving(false); setRenamingId(null); }}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest text-[#232D4B] transition-colors"
      >
        <Bookmark size={12} className="text-[#E57200]" />
        <span className="max-w-[120px] truncate">
          {activeView ? activeView.name : 'Views'}
        </span>
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 py-2 max-h-96 overflow-y-auto">
          {/* Save current */}
          {activeViewId ? (
            <button
              onClick={() => { onSaveView(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-[#232D4B] hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
            >
              <Save size={12} className="text-[#E57200]" /> Update "{activeView?.name}"
            </button>
          ) : null}

          {/* Save as new */}
          {saving ? (
            <div className="px-4 py-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
                  placeholder="View name..."
                  className="flex-1 bg-slate-50 border border-slate-200 text-[11px] font-bold text-[#232D4B] px-3 py-1.5 rounded-lg outline-none focus:border-[#E57200]"
                  autoFocus
                />
                <button
                  onClick={handleSaveNew}
                  className="p-1.5 bg-[#E57200] text-white rounded-lg hover:bg-[#E57200]/80"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => setSaving(false)}
                  className="p-1.5 text-slate-400 hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setSaving(true)}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-[#E57200] hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
            >
              <Save size={12} /> Save Current as New View
            </button>
          )}

          {/* Saved views list */}
          {savedViews.length === 0 ? (
            <div className="px-4 py-4 text-[10px] text-slate-400 text-center">No saved views yet</div>
          ) : (
            savedViews.map((view) => {
              const isActive = view.id === activeViewId;
              const isDefault = view.id === defaultViewId;
              const isRenaming = renamingId === view.id;

              return (
                <div
                  key={view.id}
                  className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 group ${isActive ? 'bg-[#E57200]/5' : ''}`}
                >
                  {isRenaming ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="text"
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(view.id)}
                        className="flex-1 bg-slate-50 border border-slate-200 text-[11px] font-bold text-[#232D4B] px-2 py-1 rounded outline-none focus:border-[#E57200]"
                        autoFocus
                      />
                      <button onClick={() => handleRename(view.id)} className="text-green-500 hover:text-green-600">
                        <Check size={12} />
                      </button>
                      <button onClick={() => setRenamingId(null)} className="text-slate-400 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => { onLoadView(view.id); setOpen(false); }}
                        className="flex-1 text-left text-[11px] font-bold text-[#232D4B] truncate flex items-center gap-2"
                      >
                        {isDefault && <Star size={10} className="text-[#E57200] shrink-0 fill-[#E57200]" />}
                        {view.name}
                        {isActive && <span className="text-[8px] font-black text-[#E57200] uppercase">Active</span>}
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => onSetDefault(isDefault ? null : view.id)}
                          title={isDefault ? 'Remove as default' : 'Set as default'}
                          className={`p-1 rounded transition-colors ${isDefault ? 'text-[#E57200]' : 'text-slate-300 hover:text-[#E57200]'}`}
                        >
                          <Star size={11} className={isDefault ? 'fill-[#E57200]' : ''} />
                        </button>
                        <button
                          onClick={() => { setRenamingId(view.id); setRenameVal(view.name); }}
                          className="p-1 text-slate-300 hover:text-[#232D4B] transition-colors"
                          title="Rename"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => onDeleteView(view.id)}
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
