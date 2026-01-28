import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
    cc?: number;
}

export const Knob: React.FC<KnobProps> = ({ label, min, max, value, onChange, cc }) => {
    const [dragging, setDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startValue, setStartValue] = useState(0);
    const knobRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragging) return;
            e.preventDefault();
            const deltaY = startY - e.clientY;
            const range = max - min;
            const sensitivity = 200; // Pixels to full range
            const deltaValue = (deltaY / sensitivity) * range;
            
            let newValue = startValue + deltaValue;
            newValue = Math.max(min, Math.min(max, newValue));
            
            onChange(newValue);
        };

        const handleMouseUp = () => {
            setDragging(false);
            document.body.style.cursor = 'default';
        };

        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ns-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, startY, startValue, min, max, onChange]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        setStartY(e.clientY);
        setStartValue(value);
    };

    // Calculate rotation (-135deg to +135deg)
    const percentage = (value - min) / (max - min);
    const rotation = -135 + (percentage * 270);

    return (
        <div className="flex flex-col items-center gap-2 select-none group">
            <div 
                ref={knobRef}
                className="relative w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-800 border-2 border-slate-700 shadow-lg cursor-ns-resize group-hover:border-cyan-500/50 transition-colors"
                onMouseDown={handleMouseDown}
            >
                {/* Indicator Dot */}
                <div 
                    className="absolute top-1/2 left-1/2 w-full h-full pointer-events-none"
                    style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
                >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                </div>
                
                {/* Center Cap */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-900 border border-slate-700 opacity-80"></div>
            </div>
            
            <div className="text-center">
                <span className="block text-[10px] md:text-xs font-bold text-slate-300 tracking-wider">{label}</span>
                <span className="block text-[9px] text-slate-600 font-mono mt-0.5">
                    {value.toFixed(1)} {cc && <span className="text-slate-700 ml-1">CC{cc}</span>}
                </span>
            </div>
        </div>
    );
};