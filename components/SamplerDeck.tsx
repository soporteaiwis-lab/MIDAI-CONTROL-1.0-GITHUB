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
                // Create Master Filter if not exists
                if (!filterRef.current) {
                    filterRef.current = new window.Tone.Filter(20000, "lowpass").toDestination();
                }
            }
        } catch (error) { console.error(error); }
    };

    const loadSample = async (url: string, name: string) => {
        await initializeAudio();
        setStatus(AppStatus.LOADING);
        setFileName("LOADING...");
        setIsPlaying(false);

        // 1. Cleanup old player completely
        if (playerRef.current) {
            playerRef.current.stop();
            playerRef.current.disconnect();
            playerRef.current.dispose();
            playerRef.current = null;
        }

        // 2. Create new player
        const player = new window.Tone.Player({
            url: url,
            loop: false,
            autostart: false,
            onload: () => {
                setStatus(AppStatus.READY);
                setFileName(name.toUpperCase());
                
                // Connect to filter chain
                if (filterRef.current) {
                    player.connect(filterRef.current);
                } else {
                    player.toDestination();
                }
                
                playerRef.current = player;
                updateAudioParams();
                
                // Audio feedback (short blip) to confirm load
                const feedback = new window.Tone.Oscillator("C6", "sine").toDestination();
                feedback.volume.value = -20;
                feedback.start().stop("+0.05");
            },
            onerror: (err: any) => {
                console.error("Load error:", err);
                setFileName("LOAD ERROR");
                setStatus(AppStatus.ERROR);
            }
        });
    };

    const updateAudioParams = () => {
        if (!playerRef.current) return;
        // Map 0-1 volume to Decibels (-Infinity to +6db approx)
        // Let's use a safe range: 0 = -60db, 1 = 0db
        const db = volume <= 0.01 ? -Infinity : 20 * Math.log10(volume);
        playerRef.current.volume.value = db;
        
        playerRef.current.fadeIn = attack;
        playerRef.current.fadeOut = decay;
        
        if (filterRef.current) {
            // Ramp for smoothness
            const freq = Math.max(20, Math.min(20000, filterFreq));
            filterRef.current.frequency.rampTo(freq, 0.1);
        }
    };

    useEffect(() => { updateAudioParams(); }, [volume, attack, decay, filterFreq]);

    // MIDI Setup
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

    // --- Core Playback Logic ---

    const playSound = (note: number) => {
         if (playerRef.current && playerRef.current.loaded) {
            // Sampler Pitch Logic:
            // C4 (60) is usually the root key for samples unless mapped otherwise.
            // Formula: playbackRate = 2 ^ ((note - root) / 12)
            const baseRate = Math.pow(2, (note - 60) / 12);
            
            // If re-triggering, stop first to reset position (monophonic behavior for single sample)
            if (playerRef.current.state === 'started') {
                playerRef.current.stop();
            }
            
            playerRef.current.playbackRate = baseRate;
            playerRef.current.start();
            setIsPlaying(true);
        }
    };

    const triggerNoteOn = async (note: number) => {
        if (status === AppStatus.OFFLINE) await initializeAudio();

        setActiveNotes(prev => new Set(prev).add(note));

        if (smartChordMode && note < splitPoint) {
            // Trigger Root
            playSound(note);
            // Visual feedback for chord (simulated)
            setActiveNotes(prev => new Set(prev).add(note + 4).add(note + 7));
        } else {
            playSound(note);
        }
    };

    const triggerNoteOff = (note: number) => {
        if (sustainRef.current) {
            sustainedNotesRef.current.add(note);
            // Don't remove from visuals yet if sustained
            return; 
        }

        // Cleanup visuals
        setActiveNotes(prev => { 
            const n = new Set(prev); 
            n.delete(note);
            if (smartChordMode && note < splitPoint) {
                n.delete(note + 4);
                n.delete(note + 7);
            }
            return n; 
        });

        // Stop sound if no notes are held (Monophonic logic)
        // Ideally we check if *this* specific note was the last one triggered, 
        // but for a simple sampler, stopping when all keys are up is a safe fallback.
        setTimeout(() => {
             // check ref again in case of rapid changes
             if (activeNotes.size <= 1) { // 1 because we just deleted one in the set updater above but state updates are async
                 if (playerRef.current && playerRef.current.state === 'started') {
                     // Allow decay
                     // playerRef.current.stop("+"+decay); 
                     // Or just let it fade out if envelope handles it, but Tone.Player needs explicit stop usually
                 }
                 setIsPlaying(false);
             }
        }, 10);
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
                     <div className="h-32 bg-black rounded-t-lg border-x-2 border-t-2 border-slate-700 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] p-4 relative overflow-hidden flex flex-col justify-between shrink-0">
                        {/* Scanlines */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start z-30">
                             <div className="flex flex-col">
                                 <h2 className="text-cyan-600 font-tech text-[10px] tracking-widest mb-0.5">ACTIVE WAVEFORM</h2>
                                 <div className="text-cyan-100 font-mono text-lg truncate max-w-[250px] tracking-tighter shadow-cyan-500/50 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                                    {status === AppStatus.LOADING ? <span className="animate-pulse">LOADING DATA...</span> : (fileName || "NO SAMPLE LOADED")}
                                 </div>
                             </div>
                             <div className={`px-2 py-0.5 rounded text-[9px] font-bold border ${midiEnabled ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'bg-red-900/30 border-red-500 text-red-400'}`}>
                                 {midiEnabled ? 'MIDI LINK' : 'NO MIDI'}
                             </div>
                        </div>
                        
                        <div className="w-full h-12 relative z-10 opacity-80">
                            <Visualizer isActive={isPlaying} />
                        </div>
                     </div>

                     {/* Library Browser - Styled as Hardware Interface */}
                     <div className="flex-1 min-h-0 bg-slate-950 border-x-2 border-b-2 border-slate-700 rounded-b-lg p-1 relative shadow-inner">
                         <CloudLibrary onLoadSample={loadSample} />
                     </div>
                 </div>

                 {/* RIGHT: KNOBS & FADERS (Col 10-12) */}
                 <div className="col-span-12 md:col-span-3 flex flex-col gap-4 z-10 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg p-2 border border-slate-700 shadow-xl">
                     <div className="text-[10px] text-center text-slate-400 font-tech tracking-[0.2em] border-b border-slate-700 pb-1 mb-2">GLOBAL PARAMS</div>
                     <div className="grid grid-cols-2 gap-y-6 gap-x-2 justify-items-center py-2 flex-1 content-start">
                        <Knob label="MASTER VOL" min={0} max={1} value={volume} onChange={setVolume} cc={7} />
                        <Knob label="CUTOFF" min={20} max={20000} value={filterFreq} onChange={setFilterFreq} cc={74} />
                        <Knob label="ATTACK" min={0} max={2} value={attack} onChange={setAttack} cc={73} />
                        <Knob label="DECAY" min={0} max={2} value={decay} onChange={setDecay} cc={72} />
                     </div>

                     <div className="mt-auto p-3 bg-black/40 rounded border border-slate-800">
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] text-amber-500 font-bold tracking-wider">SMART CHORD</span>
                            <button 
                                onClick={() => setSmartChordMode(!smartChordMode)}
                                className={`w-8 h-4 rounded-full transition-colors relative ${smartChordMode ? 'bg-amber-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${smartChordMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                         </div>
                         <div className="text-[8px] text-slate-500 font-mono leading-tight">
                             AI Harmonizer active on low octaves.
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