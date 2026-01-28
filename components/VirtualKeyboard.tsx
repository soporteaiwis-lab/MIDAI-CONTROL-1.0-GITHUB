import React, { useState, useEffect, useRef } from 'react';

interface VirtualKeyboardProps {
    activeNotes: Set<number>;
    onNoteOn: (note: number) => void;
    onNoteOff: (note: number) => void;
    onPitchBend: (val: number) => void;
    onModWheel: (val: number) => void;
}

type KeyboardSize = 49 | 61 | 76 | 88;

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ 
    activeNotes, 
    onNoteOn, 
    onNoteOff,
    onPitchBend,
    onModWheel
}) => {
    const [size, setSize] = useState<KeyboardSize>(61);
    const [octaveShift, setOctaveShift] = useState(0);

    // Calculate MIDI range based on size
    // 88 keys: A0 (21) to C8 (108)
    // 61 keys: C2 (36) to C7 (96)
    // 49 keys: C2 (36) to C6 (84)
    const getRange = (s: KeyboardSize): { start: number, end: number } => {
        switch (s) {
            case 88: return { start: 21, end: 108 };
            case 76: return { start: 28, end: 103 }; // E1 to G7
            case 49: return { start: 36, end: 84 };
            case 61: default: return { start: 36, end: 96 };
        }
    };

    const { start, end } = getRange(size);

    const isBlackKey = (n: number) => {
        const k = n % 12;
        return k === 1 || k === 3 || k === 6 || k === 8 || k === 10;
    };

    const getNoteLabel = (midi: number) => {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const note = notes[midi % 12];
        const octave = Math.floor(midi / 12) - 1;
        return `${note}${octave}`;
    };

    const keys = [];
    for (let i = start; i <= end; i++) {
        keys.push({ midi: i, black: isBlackKey(i), label: getNoteLabel(i) });
    }

    // Wheel Logic
    const handlePitchReset = (e: React.MouseEvent | React.TouchEvent) => {
        const input = e.target as HTMLInputElement;
        input.value = "0"; // Reset to center
        onPitchBend(0);
    };

    return (
        <div className="flex flex-col gap-2">
            {/* Control Bar */}
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Keys:</span>
                    <div className="flex bg-slate-800 rounded p-0.5">
                        {[49, 61, 76, 88].map((s) => (
                            <button
                                key={s}
                                onClick={() => setSize(s as KeyboardSize)}
                                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${size === s ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                    Range: {getNoteLabel(start)} - {getNoteLabel(end)}
                </div>
            </div>

            <div className="flex h-40 md:h-56 gap-2 bg-slate-900 rounded-xl border border-slate-700 p-2 shadow-2xl">
                
                {/* Wheels Section */}
                <div className="w-16 md:w-20 bg-slate-950 rounded-lg border border-slate-800 flex flex-row justify-center gap-2 p-2 relative shadow-inner">
                    
                    {/* Pitch Bend */}
                    <div className="flex flex-col items-center justify-between h-full w-1/2">
                        <span className="text-[9px] text-slate-500 font-mono rotate-180 mb-1" style={{writingMode: 'vertical-lr'}}>PITCH</span>
                        <div className="relative h-full w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden group">
                             <input 
                                type="range" 
                                min="-1" 
                                max="1" 
                                step="0.01" 
                                defaultValue="0"
                                onMouseUp={handlePitchReset}
                                onTouchEnd={handlePitchReset}
                                onChange={(e) => onPitchBend(parseFloat(e.target.value))}
                                className="absolute -rotate-90 origin-center w-[150px] h-[40px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 cursor-ns-resize z-10"
                             />
                             {/* Visual Indicator for Pitch */}
                             <div className="absolute top-1/2 w-full h-1 bg-slate-700 -translate-y-1/2"></div>
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-8 bg-gradient-to-t from-slate-700 to-slate-600 rounded shadow-md pointer-events-none transition-transform duration-75"
                                  style={{ transform: `translate(-50%, calc(-50% + ${0}px))` }} // Simplified visual for now, React state for wheel visual is heavy
                             ></div>
                        </div>
                    </div>

                    {/* Modulation */}
                    <div className="flex flex-col items-center justify-between h-full w-1/2">
                        <span className="text-[9px] text-slate-500 font-mono rotate-180 mb-1" style={{writingMode: 'vertical-lr'}}>MOD</span>
                        <div className="relative h-full w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                             <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.01" 
                                defaultValue="0"
                                onChange={(e) => onModWheel(parseFloat(e.target.value))}
                                className="absolute -rotate-90 origin-center w-[150px] h-[40px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 cursor-ns-resize z-10"
                             />
                             {/* Visual Indicator for Mod (Bottom to Top) */}
                             <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-t from-slate-800 to-slate-700 border border-slate-600 rounded shadow-md pointer-events-none"></div>
                        </div>
                    </div>
                </div>

                {/* Piano Keys Container (Scrollable) */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden relative rounded-lg border border-slate-800 bg-black scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <div className="flex h-full min-w-max relative select-none">
                        
                        {/* White Keys */}
                        {keys.map((k) => {
                            if (k.black) return null;
                            const isActive = activeNotes.has(k.midi);
                            return (
                                <div 
                                    key={k.midi}
                                    onMouseDown={() => onNoteOn(k.midi)}
                                    onMouseUp={() => onNoteOff(k.midi)}
                                    onMouseLeave={() => isActive && onNoteOff(k.midi)}
                                    onTouchStart={(e) => { e.preventDefault(); onNoteOn(k.midi); }}
                                    onTouchEnd={(e) => { e.preventDefault(); onNoteOff(k.midi); }}
                                    className={`w-10 md:w-12 h-full border-r border-slate-800/50 flex flex-col justify-end items-center pb-2 relative transition-colors duration-75 active:bg-cyan-200
                                        ${isActive ? 'bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)_inset]' : 'bg-slate-100 hover:bg-white'}
                                    `}
                                >
                                    <span className="text-[10px] font-bold text-slate-400 pointer-events-none select-none mb-1">
                                        {k.label}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Black Keys Layer */}
                         <div className="absolute inset-0 pointer-events-none flex">
                            {/* We iterate again to place black keys absolutely based on white key flow */}
                            {keys.map((k, i) => {
                                if (!k.black) return null;
                                // Logic: Find which white key this black key is after.
                                // midi 37 (C#) is after 36 (C).
                                // Visual offset: It sits between index of white keys.
                                // Simplest way in a flex row: 
                                // Calculate position based on the count of white keys before it.
                                const whiteKeysBefore = keys.slice(0, i).filter(x => !x.black).length;
                                
                                const isActive = activeNotes.has(k.midi);

                                return (
                                    <div 
                                        key={k.midi}
                                        className="absolute top-0 h-[60%] w-6 md:w-8 z-10 pointer-events-auto"
                                        style={{ 
                                            // 40px/48px is approx width of white key. We need to be dynamic or fixed.
                                            // Let's rely on calculation: (WhiteKeyCount * Width) - (HalfBlackWidth)
                                            // Using calc with rem/px for the width of white keys defined above (w-10 = 2.5rem, w-12 = 3rem)
                                            // Note: This CSS approach relies on fixed width white keys.
                                            left: `calc(${whiteKeysBefore} * var(--key-width) - (var(--key-width) / 2.2))`
                                        }}
                                    >
                                        <div 
                                            onMouseDown={() => onNoteOn(k.midi)}
                                            onMouseUp={() => onNoteOff(k.midi)}
                                            onMouseLeave={() => isActive && onNoteOff(k.midi)}
                                            onTouchStart={(e) => { e.preventDefault(); onNoteOn(k.midi); }}
                                            onTouchEnd={(e) => { e.preventDefault(); onNoteOff(k.midi); }}
                                            className={`w-full h-full rounded-b-md border border-slate-950 transition-colors duration-75 shadow-lg
                                                ${isActive ? 'bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.6)]' : 'bg-slate-900 bg-gradient-to-b from-slate-800 to-black'}
                                            `}
                                        ></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                :root {
                    --key-width: 2.5rem; /* w-10 */
                }
                @media (min-width: 768px) {
                    :root {
                        --key-width: 3rem; /* w-12 */
                    }
                }
            `}</style>
        </div>
    );
};