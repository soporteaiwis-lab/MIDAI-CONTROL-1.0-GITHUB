import React from 'react';

interface VisualizerProps {
    isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive }) => {
    // Generate dummy bars for the visualizer
    const bars = Array.from({ length: 24 }).map((_, i) => i);

    return (
        <div className="w-full h-16 md:h-24 flex items-end justify-between gap-1 px-4 py-2 bg-slate-950 rounded-lg border border-slate-800 shadow-inner overflow-hidden relative">
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{backgroundImage: 'linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
            </div>

            {bars.map((i) => (
                <div 
                    key={i}
                    className={`w-full rounded-t-sm transition-all duration-100 ease-in-out ${isActive ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]' : 'bg-slate-800'}`}
                    style={{ 
                        height: isActive ? `${Math.random() * 80 + 20}%` : '10%',
                        opacity: isActive ? 1 : 0.3
                    }}
                />
            ))}
        </div>
    );
};