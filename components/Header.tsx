import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-6 md:px-10 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-cyan-900/30 sticky top-0 z-50">
      <div className="flex items-center gap-3 select-none">
        <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-500 rounded-full blur-md opacity-20 animate-pulse"></div>
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-cyan-400" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
        </div>
        <div className="flex flex-col">
            <h1 className="text-2xl font-tech font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                midAI<span className="text-white font-light ml-2">CONTROL</span>
            </h1>
            <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold">Intelligent Audio Engine v1.0</span>
        </div>
      </div>
      
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-slate-300 font-mono">SYSTEM ONLINE</span>
        </div>
      </div>
    </header>
  );
};