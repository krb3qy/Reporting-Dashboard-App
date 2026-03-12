import React from 'react';

export default function SidebarBtn({ active, label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
        active
          ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/30'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon} {label}
    </button>
  );
}
