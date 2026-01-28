import React, { useState, useEffect, useRef } from 'react';

// Define Patterns (16 steps grid)
// 1 = trigger, 0 = silence
interface DrumPattern {
    name: string;
    kick: number[];
    snare: number[];
    hat: number[];
}

const PATTERNS: Record<string, DrumPattern> = {
    'rock': {
        name: 'ROCK',
        kick:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    'pop': {
        name: 'POP',
        kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat:   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    },
    'house': {
        name: 'HOUSE',
        kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat:   [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]
    },
    'hiphop': {
        name: 'HIPHOP',
        kick:  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat:   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1]
    },
    'funk': {
        name: 'FUNK',
        kick:  [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat:   [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1]
    },
    'dnb': {
        name: 'D&B',
        kick:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hat:   [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    }
};

export const RhythmControl: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [tempo, setTempo] = useState(120);
    const [selectedPatternKey, setSelectedPatternKey] = useState('rock');
    
    // Synths Refs
    const kickRef = useRef<any>(null);
    const snareRef = useRef<any>(null);
    const hatRef = useRef<any>(null);
    
    const loopRef = useRef<any>(null);
    const patternRef = useRef(PATTERNS['rock']);
    const stepRef = useRef(0);

    // Update Pattern Ref immediately when state changes
    useEffect(() => {
        patternRef.current = PATTERNS[selectedPatternKey];
    }, [selectedPatternKey]);

    // Initialize Synths
    useEffect(() => {
        if (!window.Tone) return;

        // Kick
        kickRef.current = new window.Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
            volume: -2
        }).toDestination();

        // Snare
        snareRef.current = new window.Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0 },
            volume: -8
        }).toDestination();

        // Hat
        hatRef.current = new window.Tone.MetalSynth({
            frequency: 200, envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
            harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
            volume: -15
        }).toDestination();

        return () => {
            kickRef.current?.dispose();
            snareRef.current?.dispose();
            hatRef.current?.dispose();
        };
    }, []);

    // Loop Logic
    useEffect(() => {
        if (!window.Tone) return;

        if (loopRef.current) {
            loopRef.current.cancel();
            loopRef.current.dispose();
        }

        loopRef.current = new window.Tone.Loop((time: number) => {
            const step = stepRef.current % 16;
            const pattern = patternRef.current;
            
            if (pattern) {
                if (pattern.kick[step]) kickRef.current?.triggerAttackRelease("C1", "8n", time);
                if (pattern.snare[step]) snareRef.current?.triggerAttackRelease("8n", time);
                // Randomize Hat velocity slightly for "human" feel
                if (pattern.hat[step]) hatRef.current?.triggerAttackRelease("32n", time, 0.3 + Math.random() * 0.2); 
            }

            stepRef.current++;
        }, "16n");

        return () => {
            if (loopRef.current) loopRef.current.dispose();
        };
    }, []);

    // Playback Control
    useEffect(() => {
        if (!window.Tone || !loopRef.current) return;

        window.Tone.Transport.bpm.value = tempo;

        if (isPlaying) {
             if (window.Tone.Transport.state !== 'started') window.Tone.Transport.start();
             loopRef.current.start(0);
        } else {
             loopRef.current.stop();
             stepRef.current = 0;
             // We generally don't stop Transport globally to avoid killing other scheduled events, 
             // but for this app it's fine or we can leave it running.
             window.Tone.Transport.stop(); 
        }

    }, [isPlaying, tempo]);

    const togglePlay = async () => {
        if (window.Tone.context.state !== 'running') await window.Tone.start();
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="flex flex-col gap-3 p-4 bg-slate-900 rounded border border-slate-700 h-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-slate-500 font-tech">RHYTHM ENGINE</label>
                    <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-slate-700'}`}></div>
                </div>
            </div>
            
            {/* Pattern Selector */}
            <div className="grid grid-cols-2 gap-2">
                 <select 
                    value={selectedPatternKey}
                    onChange={(e) => setSelectedPatternKey(e.target.value)}
                    className="col-span-2 bg-slate-800 text-[10px] font-mono text-cyan-400 rounded border border-slate-700 px-2 py-2 focus:outline-none focus:border-cyan-500"
                >
                    {Object.entries(PATTERNS).map(([key, p]) => (
                        <option key={key} value={key}>{p.name} PATTERN</option>
                    ))}
                </select>
            </div>

            {/* Play Button */}
            <button 
                onClick={togglePlay}
                className={`w-full py-2 text-[10px] font-bold tracking-wider rounded transition-all
                    ${isPlaying 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
                        : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/50 hover:bg-cyan-500/20'
                    }`}
            >
                {isPlaying ? 'STOP PLAYBACK' : 'START LOOP'}
            </button>

            {/* Tempo Control */}
            <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>TEMPO</span>
                    <span className="text-cyan-500">{tempo} BPM</span>
                </div>
                <input 
                    type="range" min="60" max="180" 
                    value={tempo} onChange={(e) => setTempo(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
            </div>
            
            {/* Mini Visualizer for Steps */}
            <div className="flex gap-0.5 mt-2 h-1 w-full opacity-50">
                {Array.from({length: 16}).map((_, i) => (
                    <div key={i} className={`flex-1 rounded-full ${isPlaying && (i % 4 === 0) ? 'bg-slate-600' : 'bg-slate-800'}`}></div>
                ))}
            </div>
        </div>
    );
};