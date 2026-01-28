import React, { useState } from 'react';

interface VirtualKeyboardProps {
    activeNotes: Set<number>;
    onNoteOn: (note: number) => void;
    onNoteOff: (note: number) => void;
    onPitchBend: (val: number) => void;
    onModWheel: (val: number) => void;
    smartChordMode: boolean;
    splitPoint: number;
}

type KeyboardSize = 49 | 61 | 76 | 88;

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ 
    activeNotes, 
    onNoteOn, 
    onNoteOff,
    onPitchBend,
    onModWheel,
    smartChordMode,
    splitPoint
}) => {
    const [size, setSize] = useState<KeyboardSize>(61);

    const getRange = (s: KeyboardSize): { start: number, end: number } => {
        switch (s) {
            case 88: return { start: 21, end: 108 };
            case 76: return { start: 28, end: 103 };
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

    // Generate keys
    const keys = [];
    for (let i = start; i <= end; i++) {
        keys.push({ midi: i, black: isBlackKey(i), label: getNoteLabel(i) });
    }

    const handlePitchReset = (e: any) => {
        e.target.value = "0";
        onPitchBend(0);
    };

    return (
        <div className="flex flex-col h-full w-full gap-2">
            
            {/* Control Strip for Keyboard */}
            <div className="flex-none flex justify-between items-center bg-slate-900/50 p-1 rounded border border-slate-800">
                <div className="flex gap-1">
                    {[49, 61, 76, 88].map((s) => (
                        <button
                            key={s}
                            onClick={() => setSize(s as KeyboardSize)}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded ${size === s ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                {smartChordMode && (
                    <div className="text-[9px] text-amber-500 font-bold px-2 border border-amber-500/30 rounded bg-amber-900/10 animate-pulse">
                        SMART CHORD ON (SPLIT: {getNoteLabel(splitPoint)})
                    </div>
                )}
            </div>

            {/* Keyboard & Wheels Container */}
            <div className="flex-1 flex gap-2 min-h-0">
                {/* Wheels */}
                <div className="w-12 md:w-16 flex-none bg-slate-900 rounded border border-slate-700 flex flex-col p-1 gap-1">
                     <div className="flex-1 relative bg-slate-950 rounded border border-slate-800 overflow-hidden">
                        <input type="range" min="-1" max="1" step="0.01" defaultValue="0" 
                            className="absolute -rotate-90 w-[200%] h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 z-10"
                            onTouchEnd={handlePitchReset} onMouseUp={handlePitchReset} onChange={(e) => onPitchBend(parseFloat(e.target.value))}
                        />
                        <div className="absolute top-1/2 w-full h-0.5 bg-slate-700"></div>
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 font-mono">PITCH</span>
                     </div>
                     <div className="flex-1 relative bg-slate-950 rounded border border-slate-800 overflow-hidden">
                        <input type="range" min="0" max="1" step="0.01" defaultValue="0" 
                             className="absolute -rotate-90 w-[200%] h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 z-10"
                             onChange={(e) => onModWheel(parseFloat(e.target.value))}
                        />
                        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-cyan-900/50 to-transparent"></div>
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 font-mono">MOD</span>
                     </div>
                </div>

                {/* Keys Area */}
                <div className="flex-1 bg-black rounded border-t-4 border-slate-800 relative overflow-hidden flex">
                    {/* White Keys */}
                    {keys.filter(k => !k.black).map((k) => {
                        const isActive = activeNotes.has(k.midi);
                        const isChordZone = smartChordMode && k.midi < splitPoint;
                        
                        return (
                            <div 
                                key={k.midi}
                                className={`flex-1 h-full border-r border-slate-800/50 rounded-b-sm flex flex-col justify-end items-center pb-2 select-none relative
                                    ${isActive ? 'bg-cyan-400' : 'bg-slate-100 hover:bg-white'}
                                    ${isChordZone ? 'bg-amber-50 hover:bg-amber-100' : ''}
                                `}
                                onMouseDown={() => onNoteOn(k.midi)}
                                onMouseUp={() => onNoteOff(k.midi)}
                                onMouseLeave={() => isActive && onNoteOff(k.midi)}
                                onTouchStart={(e) => { e.preventDefault(); onNoteOn(k.midi); }}
                                onTouchEnd={(e) => { e.preventDefault(); onNoteOff(k.midi); }}
                            >
                                <span className="text-[8px] text-slate-400 font-mono mb-1 pointer-events-none">{k.label}</span>
                                {isChordZone && <div className="absolute bottom-6 w-1.5 h-1.5 rounded-full bg-amber-500/50"></div>}
                            </div>
                        );
                    })}

                    {/* Black Keys Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex">
                        {keys.map((k, i, arr) => {
                            if (!k.black) return null;
                            // Calculate position based on percentage
                            // We need to know which "White Key index" this falls after
                            const whiteKeysTotal = arr.filter(x => !x.black).length;
                            const whiteKeysBefore = arr.slice(0, i).filter(x => !x.black).length;
                            
                            // Width of a white key in %
                            const whiteKeyWidth = 100 / whiteKeysTotal;
                            const leftPos = (whiteKeysBefore * whiteKeyWidth) - (whiteKeyWidth * 0.35); // Slight offset
                            const width = whiteKeyWidth * 0.7;

                            const isActive = activeNotes.has(k.midi);
                            const isChordZone = smartChordMode && k.midi < splitPoint;

                            return (
                                <div 
                                    key={k.midi}
                                    className="absolute top-0 h-[60%] pointer-events-auto z-10"
                                    style={{ left: `${leftPos}%`, width: `${width}%` }}
                                >
                                    <div 
                                        className={`w-full h-full rounded-b border-x border-b border-slate-950 shadow-lg
                                            ${isActive ? 'bg-cyan-500' : 'bg-slate-900'}
                                            ${isChordZone && !isActive ? 'bg-amber-900 border-amber-800' : ''}
                                        `}
                                        onMouseDown={() => onNoteOn(k.midi)}
                                        onMouseUp={() => onNoteOff(k.midi)}
                                        onMouseLeave={() => isActive && onNoteOff(k.midi)}
                                        onTouchStart={(e) => { e.preventDefault(); onNoteOn(k.midi); }}
                                        onTouchEnd={(e) => { e.preventDefault(); onNoteOff(k.midi); }}
                                    ></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};