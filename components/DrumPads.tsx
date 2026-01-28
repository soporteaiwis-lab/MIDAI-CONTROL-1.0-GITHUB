import React, { useRef, useEffect } from 'react';

export const DrumPads: React.FC = () => {
    // Refs for synths
    const kickRef = useRef<any>(null);
    const snareRef = useRef<any>(null);
    const hatRef = useRef<any>(null);
    const tomRef = useRef<any>(null);

    useEffect(() => {
        if (!window.Tone) return;
        
        // Initialize simple synths for pads
        kickRef.current = new window.Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        }).toDestination();

        snareRef.current = new window.Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
        }).toDestination();

        hatRef.current = new window.Tone.MetalSynth({
            frequency: 200, envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
            harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
        }).toDestination();
        hatRef.current.volume.value = -10;

        tomRef.current = new window.Tone.MembraneSynth({
            pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" }
        }).toDestination();

        return () => {
            kickRef.current?.dispose();
            snareRef.current?.dispose();
            hatRef.current?.dispose();
            tomRef.current?.dispose();
        };
    }, []);

    const triggerPad = (type: 'kick' | 'snare' | 'hat' | 'tom' | 'crash' | 'clap', padId: number) => {
        if (!window.Tone || window.Tone.context.state !== 'running') {
            window.Tone?.start();
        }

        const btn = document.getElementById(`pad-${padId}`);
        if (btn) {
            btn.classList.add('bg-cyan-400', 'shadow-[0_0_15px_cyan]');
            setTimeout(() => btn.classList.remove('bg-cyan-400', 'shadow-[0_0_15px_cyan]'), 100);
        }

        switch (type) {
            case 'kick': kickRef.current?.triggerAttackRelease("C1", "8n"); break;
            case 'snare': snareRef.current?.triggerAttackRelease("8n"); break;
            case 'hat': hatRef.current?.triggerAttackRelease("32n"); break;
            case 'tom': tomRef.current?.triggerAttackRelease("G2", "8n"); break;
            case 'crash': hatRef.current?.triggerAttackRelease("16n", undefined, 0.8); break; // Variation
            case 'clap': snareRef.current?.triggerAttackRelease("16n"); break; // Variation
        }
    };

    const pads = [
        { id: 1, label: 'KICK', type: 'kick' },
        { id: 2, label: 'SNARE', type: 'snare' },
        { id: 3, label: 'CLAP', type: 'clap' },
        { id: 4, label: 'CRASH', type: 'crash' },
        { id: 5, label: 'TOM 1', type: 'tom' },
        { id: 6, label: 'TOM 2', type: 'tom' },
        { id: 7, label: 'HI-HAT', type: 'hat' },
        { id: 8, label: 'OPEN-H', type: 'hat' },
    ];

    return (
        <div className="grid grid-cols-4 md:grid-cols-2 gap-2 h-full">
            {pads.map((pad) => (
                <button
                    key={pad.id}
                    id={`pad-${pad.id}`}
                    onMouseDown={() => triggerPad(pad.type as any, pad.id)}
                    onTouchStart={(e) => { e.preventDefault(); triggerPad(pad.type as any, pad.id); }}
                    className="relative group bg-slate-800 rounded-lg border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all duration-75 flex items-center justify-center overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                    <span className="font-tech text-[10px] text-slate-400 group-hover:text-white pointer-events-none select-none">
                        {pad.label}
                    </span>
                </button>
            ))}
        </div>
    );
};