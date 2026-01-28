import React from 'react';

interface VirtualKeyboardProps {
    activeNotes: Set<number>;
    onNoteOn: (note: number) => void;
    onNoteOff: (note: number) => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ activeNotes, onNoteOn, onNoteOff }) => {
    // Generate C3 to B4 (2 octaves)
    // MIDI numbers: C3=48, C4=60, C5=72. Let's do 48 to 72.
    const startNote = 48;
    const endNote = 72;
    
    const isBlackKey = (n: number) => {
        const k = n % 12;
        return k === 1 || k === 3 || k === 6 || k === 8 || k === 10;
    };

    const keys = [];
    for (let i = startNote; i <= endNote; i++) {
        keys.push({ midi: i, black: isBlackKey(i) });
    }

    return (
        <div className="w-full h-32 md:h-40 bg-slate-950 rounded-lg border border-slate-800 relative overflow-hidden flex select-none shadow-inner">
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
                        className={`flex-1 border-r border-slate-400/20 last:border-r-0 relative transition-colors duration-75
                            ${isActive ? 'bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)_inset]' : 'bg-slate-200 hover:bg-white'}
                        `}
                    >
                         <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 pointer-events-none">
                             {k.midi % 12 === 0 ? `C${Math.floor(k.midi/12)-1}` : ''}
                         </span>
                    </div>
                );
            })}

            {/* Black Keys overlay */}
            <div className="absolute inset-0 flex pointer-events-none">
                {/* We need to match the spacing of white keys. 
                    This is a simplified grid approach. 
                    A real piano has uneven black key spacing. 
                    For this demo, we can use absolute positioning based on index.
                */}
                {/* 
                   Implementation Trick: 
                   Render separate layer. Calculate left % based on white key index.
                */}
            </div>
            {keys.map((k, index) => {
                if (!k.black) return null;
                 // Find number of white keys before this note to calculate position
                const whiteKeysBefore = keys.slice(0, index).filter(x => !x.black).length;
                const totalWhiteKeys = keys.filter(x => !x.black).length;
                const leftPos = (whiteKeysBefore * (100 / totalWhiteKeys)) - ( (100 / totalWhiteKeys) * 0.35 ); // approximate offset
                
                const isActive = activeNotes.has(k.midi);

                return (
                    <div 
                        key={k.midi}
                        style={{ left: `${leftPos}%`, width: `${100/totalWhiteKeys * 0.7}%` }}
                        className="absolute top-0 h-[60%] z-10 pointer-events-auto"
                    >
                        <div 
                             onMouseDown={() => onNoteOn(k.midi)}
                             onMouseUp={() => onNoteOff(k.midi)}
                             onMouseLeave={() => isActive && onNoteOff(k.midi)}
                             onTouchStart={(e) => { e.preventDefault(); onNoteOn(k.midi); }}
                             onTouchEnd={(e) => { e.preventDefault(); onNoteOff(k.midi); }}
                             className={`w-full h-full rounded-b-sm border border-slate-900 transition-colors duration-75
                                ${isActive ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]' : 'bg-slate-900 shadow-md'}
                             `}
                        ></div>
                    </div>
                );
            })}
        </div>
    );
};