import React, { useState, useRef, useEffect } from 'react';
import { AppStatus } from '../types';
import { Visualizer } from './Visualizer';
import { CloudLibrary } from './CloudLibrary';
import { Knob } from './Knob';
import { VirtualKeyboard } from './VirtualKeyboard';
import { DrumPads } from './DrumPads';
import { RhythmControl } from './RhythmControl';

export const SamplerDeck: React.FC = () => {
    // App State
    const [status, setStatus] = useState<AppStatus>(AppStatus.OFFLINE);
    const [fileName, setFileName] = useState<string | null>(null);
    const [midiEnabled, setMidiEnabled] = useState(false);
    
    // Feature Toggles
    const [smartChordMode, setSmartChordMode] = useState(false);
    const [splitPoint, setSplitPoint] = useState(60); // Middle C split by default

    // Audio Output State
    const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Parameters
    const [volume, setVolume] = useState(0.8);
    const [attack, setAttack] = useState(0.01);
    const [decay, setDecay] = useState(0.1);
    const [filterFreq, setFilterFreq] = useState(20000);
    
    const playerRef = useRef<any>(null);
    const filterRef = useRef<any>(null);
    
    // Sustain Logic
    const sustainRef = useRef(false);
    const sustainedNotesRef = useRef<Set<number>>(new Set());

    // Initialize Audio
    const initializeAudio = async () => {
        if (!window.Tone) return;
        try {
            if (window.Tone.context.state !== 'running') await window.Tone.start();
            if (status === AppStatus.OFFLINE) {
                setStatus(AppStatus.READY);
                if (!filterRef.current) {
                    filterRef.current = new window.Tone.Filter(20000, "lowpass").toDestination();
                }
            }
        } catch (error) { console.error(error); }
    };

    const loadSample = async (url: string, name: string) => {
        await initializeAudio();
        setStatus(AppStatus.LOADING);
        setFileName(name);
        const player = new window.Tone.Player(url, () => {
            setStatus(AppStatus.READY);
            if (playerRef.current) playerRef.current.dispose();
            playerRef.current = player;
            playerRef.current.connect(filterRef.current);
            updateAudioParams();
        }).toDestination();
    };

    const updateAudioParams = () => {
        if (!playerRef.current) return;
        playerRef.current.volume.value = (volume * 20) - 20;
        playerRef.current.fadeIn = attack;
        playerRef.current.fadeOut = decay;
        if (filterRef.current) filterRef.current.frequency.rampTo(filterFreq, 0.1);
    };

    useEffect(() => { updateAudioParams(); }, [volume, attack, decay, filterFreq]);

    // MIDI
    useEffect(() => {
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then((access: any) => {
                setMidiEnabled(true);
                for (let input of access.inputs.values()) input.onmidimessage = onMIDIMessage;
            }).catch(() => setMidiEnabled(false));
        }
    }, []);

    const onMIDIMessage = (message: any) => {
        const [status, data1, data2] = message.data;
        const cmd = status & 0xF0;
        if (cmd === 144 && data2 > 0) triggerNoteOn(data1);
        else if (cmd === 128 || (cmd === 144 && data2 === 0)) triggerNoteOff(data1);
        else if (cmd === 176) handleCC(data1, data2);
    };

    // --- Core Logic ---

    const playSound = (note: number) => {
         if (playerRef.current && playerRef.current.loaded) {
            // Pitch shifting for sampler
            const baseRate = Math.pow(2, (note - 60) / 12);
            playerRef.current.playbackRate = baseRate;
            if (playerRef.current.state === 'started') playerRef.current.stop();
            playerRef.current.start();
            setIsPlaying(true);
        }
    };

    const triggerNoteOn = async (note: number) => {
        if (status === AppStatus.OFFLINE) await initializeAudio();

        setActiveNotes(prev => new Set(prev).add(note));

        if (smartChordMode && note < splitPoint) {
            // Play Chord (Root + Major 3rd + Perfect 5th)
            // Note: Since we only have a Monophonic Sampler player for this demo,
            // we can't play polyphonic chords on the sample yet. 
            // *However*, we can visualize it or trigger simple backup synths if we had them.
            // For now, we will trigger the root note on the sampler.
            // Future improvement: Use PolySynth for chords.
            playSound(note); // Root
            // playSound(note + 4); // Would cut off previous in monophonic player
            // playSound(note + 7); 
        } else {
            playSound(note);
        }
    };

    const triggerNoteOff = (note: number) => {
        if (sustainRef.current) {
            sustainedNotesRef.current.add(note);
            setActiveNotes(prev => { const n = new Set(prev); n.delete(note); return n; });
            return;
        }
        setActiveNotes(prev => { const n = new Set(prev); n.delete(note); return n; });
        if (activeNotes.has(note) || activeNotes.size <= 1) {
            if (playerRef.current && playerRef.current.state === 'started') {
                playerRef.current.stop(window.Tone.now() + decay);
            }
            setIsPlaying(false);
        }
    };

    const handleCC = (cc: number, value: number) => {
        const norm = value / 127;
        if (cc === 64) sustainRef.current = value > 63;
        if (cc === 7) setVolume(norm);
        if (cc === 74) setFilterFreq(20 + (19980 * norm));
    };

    return (
        <div className="flex flex-col h-full gap-2">
            
            {/* TOP PANEL: HARDWARE CONTROLLER VIEW */}
            <div className="flex-1 bg-slate-900 rounded-xl border-t border-slate-700 shadow-2xl p-2 md:p-4 grid grid-cols-12 gap-4 min-h-0 overflow-hidden relative">
                 {/* Texture */}
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-30 pointer-events-none"></div>

                 {/* LEFT: DRUM PADS & RHYTHM (Col 1-3) */}
                 <div className="col-span-12 md:col-span-3 flex flex-col gap-4 z-10">
                     <div className="flex-1 bg-slate-950/50 rounded-lg p-2 border border-slate-800 shadow-inner">
                         <DrumPads />
                     </div>
                     <RhythmControl />
                 </div>

                 {/* CENTER: SCREEN & LIBRARY (Col 4-9) */}
                 <div className="col-span-12 md:col-span-6 flex flex-col gap-4 z-10 min-h-0">
                     {/* LCD Screen */}
                     <div className="h-32 bg-slate-950 rounded border-2 border-slate-700 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] p-4 relative overflow-hidden flex flex-col justify-between group">
                        <div className="absolute inset-0 bg-cyan-900/10 pointer-events-none"></div>
                        <div className="flex justify-between items-start">
                             <div>
                                 <h2 className="text-cyan-500 font-tech text-xs tracking-widest mb-1">MAIN OUTPUT</h2>
                                 <div className="text-white font-mono text-sm truncate max-w-[200px]">{fileName || "EMPTY SAMPLER"}</div>
                             </div>
                             <div className={`px-2 py-1 rounded text-[10px] font-bold ${midiEnabled ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>MIDI</div>
                        </div>
                        
                        <div className="w-full">
                            <Visualizer isActive={isPlaying} />
                        </div>
                     </div>

                     {/* Library Browser */}
                     <div className="flex-1 min-h-0">
                         <CloudLibrary onLoadSample={loadSample} />
                     </div>
                 </div>

                 {/* RIGHT: KNOBS & FADERS (Col 10-12) */}
                 <div className="col-span-12 md:col-span-3 flex flex-col gap-4 z-10 bg-slate-800/20 rounded p-2 border border-white/5">
                     <div className="grid grid-cols-2 gap-y-6 gap-x-2 justify-items-center py-4">
                        <Knob label="VOL" min={0} max={1} value={volume} onChange={setVolume} cc={7} />
                        <Knob label="CUTOFF" min={20} max={20000} value={filterFreq} onChange={setFilterFreq} cc={74} />
                        <Knob label="ATTACK" min={0} max={2} value={attack} onChange={setAttack} cc={73} />
                        <Knob label="DECAY" min={0} max={2} value={decay} onChange={setDecay} cc={72} />
                     </div>

                     <div className="mt-auto p-2 bg-slate-900/80 rounded border border-slate-800">
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-slate-400 font-bold">SMART CHORD</span>
                            <button 
                                onClick={() => setSmartChordMode(!smartChordMode)}
                                className={`w-8 h-4 rounded-full transition-colors ${smartChordMode ? 'bg-amber-500' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${smartChordMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                         </div>
                         <div className="text-[9px] text-slate-500 leading-tight">
                             Triggers chords on lower keys. Split: C3
                         </div>
                     </div>
                 </div>
            </div>

            {/* BOTTOM PANEL: KEYBOARD */}
            <div className="h-48 md:h-64 flex-none z-20">
                <VirtualKeyboard 
                    activeNotes={activeNotes}
                    onNoteOn={triggerNoteOn}
                    onNoteOff={triggerNoteOff}
                    smartChordMode={smartChordMode}
                    splitPoint={splitPoint}
                    onPitchBend={(v) => console.log(v)}
                    onModWheel={(v) => console.log(v)}
                />
            </div>
        </div>
    );
};