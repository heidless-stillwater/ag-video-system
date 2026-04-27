'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, LayoutGrid, Zap, Book, Shield, Video, PlayCircle } from 'lucide-react';

const apps = [
  { name: 'PromptMaster', url: 'http://localhost:5173', icon: Zap, color: 'text-amber-400', desc: 'Central Registry' },
  { name: 'PromptTool', url: 'http://localhost:3001', icon: LayoutGrid, color: 'text-indigo-400', desc: 'AI Image Studio' },
  { name: 'Resources', url: 'http://localhost:3002', icon: Book, color: 'text-emerald-400', desc: 'Sovereign Library' },
  { name: 'VideoSystem', url: 'http://localhost:3000', icon: Video, color: 'text-rose-400', desc: 'AI Documentary Engine' },
  { name: 'Accreditation', url: 'http://localhost:3003', icon: Shield, color: 'text-blue-400', desc: 'Compliance Hub' },
  { name: 'PlanTune', url: 'http://localhost:3004', icon: PlayCircle, color: 'text-purple-400', desc: 'Strategy Engine' },
];

export function SuiteSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group"
      >
        <LayoutGrid size={16} className="text-slate-400 group-hover:text-white transition-colors" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white hidden sm:block">Suite</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-3 left-0 w-80 bg-[#0c0c14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-4 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Stillwater Ecosystem</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {apps.map((app) => (
              <a 
                key={app.name}
                href={app.url}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-all ${app.color}`}>
                  <app.icon size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-primary transition-colors">{app.name}</div>
                  <div className="text-[9px] text-white/40 font-medium uppercase tracking-tight mt-0.5">{app.desc}</div>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em]">Sovereign Node v1.2</p>
          </div>
        </div>
      )}
    </div>
  );
}
