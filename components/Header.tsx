import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-2 px-4 md:px-6 flex justify-between items-center bg-slate-900/90 backdrop-blur-md border-b border-cyan-900/30 sticky top-0 z-50 h-12 md:h-14 shrink-0">
      <div className="flex items-center gap-2 select-none">
        <div className="relative w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-cyan-500 rounded-full blur-md opacity-20 animate-pulse"></div>
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
        </div>
        <div className="flex items-baseline gap-2">
            <h1 className="text-lg md:text-xl font-tech font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 leading-none">
                midAI<span className="text-white font-light ml-1">CONTROL</span>
            </h1>
            <span className="hidden sm:inline-block text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">v1.0</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[9px] md:text-[10px] text-slate-300 font-mono hidden sm:inline">SYSTEM ONLINE</span>
        </div>
      </div>
    </header>
  );
};