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
    
    // View State (Mobile/Tablet Only)
    const [activeTab, setActiveTab] = useState<'pads' | 'studio' | 'fx'>('studio');
    
    // Feature Toggles
    const [smartChordMode, setSmartChordMode] = useState(false);
    const [splitPoint, setSplitPoint] = useState(60); 

    // Audio Output State
    const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Parameters
    const [volume, setVolume] = useState(0.8);
    const [attack, setAttack] = useState(0.01);
    const [decay, setDecay] = useState(0.5);
    const [filterFreq, setFilterFreq] = useState(20000);
    
    // Refs for Audio Engine
    const samplerRef = useRef<any>(null);
    const filterRef = useRef<any>(null);
    const sustainRef = useRef(false);
    const sustainedNotesRef = useRef<Set<number>>(new Set());

    // Refs for Event Listeners (Fixing Stale Closures)
    const stateRef = useRef({
        smartChordMode,
        splitPoint,
        status,
        volume,
        filterFreq
    });

    useEffect(() => {
        stateRef.current = { smartChordMode, splitPoint, status, volume, filterFreq };
    }, [smartChordMode, splitPoint, status, volume, filterFreq]);

    const initializeAudio = async () => {
        if (!window.Tone) return;
        try {
            if (window.Tone.context.state !== 'running') await window.Tone.start();
            
            // Only update status if we are currently offline
            if (stateRef.current.status === AppStatus.OFFLINE) {
                setStatus(AppStatus.READY);
                // Create Master Filter if not exists
                if (!filterRef.current) {
                    filterRef.current = new window.Tone.Filter(20000, "lowpass").toDestination();
                }
            }
        } catch (error) { console.error("Audio Init Error", error); }
    };

    const loadSample = async (url: string, name: string) => {
        await initializeAudio();
        setStatus(AppStatus.LOADING);
        setFileName("LOADING...");
        setIsPlaying(false);

        // Cleanup old sampler
        if (samplerRef.current) {
            samplerRef.current.releaseAll();
            samplerRef.current.dispose();
            samplerRef.current = null;
        }

        // Initialize Polyphonic Sampler
        const sampler = new window.Tone.Sampler({
            urls: { "C4": url },
            release: 1,
            onload: () => {
                setStatus(AppStatus.READY);
                setFileName(name.toUpperCase());
                
                if (filterRef.current) sampler.connect(filterRef.current);
                else sampler.toDestination();
                
                samplerRef.current = sampler;
                updateAudioParams();
                
                // Feedback sound
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
        if (!samplerRef.current) return;
        
        const db = volume <= 0.01 ? -Infinity : 20 * Math.log10(volume);
        samplerRef.current.volume.value = db;
        
        // Tone.Sampler wraps voices. We set the envelope properties if exposed.
        // Note: In some Tone versions, attack/release might need to be set on the envelope of voices,
        // but Tone.Sampler typically proxies 'attack' and 'release' to the amplitude envelope.
        if (samplerRef.current.attack !== undefined) samplerRef.current.attack = attack;
        if (samplerRef.current.release !== undefined) samplerRef.current.release = decay;

        if (filterRef.current) {
            const freq = Math.max(20, Math.min(20000, filterFreq));
            filterRef.current.frequency.rampTo(freq, 0.1);
        }
    };

    useEffect(() => { updateAudioParams(); }, [volume, attack, decay, filterFreq]);

    // MIDI Setup
    useEffect(() => {
        const handleMIDIMessage = (message: any) => {
            const [statusByte, data1, data2] = message.data;
            const cmd = statusByte & 0xF0;
            if (cmd === 144 && data2 > 0) triggerNoteOn(data1);
            else if (cmd === 128 || (cmd === 144 && data2 === 0)) triggerNoteOff(data1);
            else if (cmd === 176) handleCC(data1, data2);
        };

        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then((access: any) => {
                setMidiEnabled(true);
                // Attach listener to all inputs
                for (let input of access.inputs.values()) {
                    input.onmidimessage = handleMIDIMessage;
                }
                
                // Handle new connections
                access.onstatechange = (e: any) => {
                    if (e.port.type === 'input' && e.port.state === 'connected') {
                        e.port.onmidimessage = handleMIDIMessage;
                    }
                };

            }).catch((err) => {
                console.error("MIDI Access Error", err);
                setMidiEnabled(false);
            });
        }
    }, []);

    const triggerNoteOn = async (note: number) => {
        const currentCheck = stateRef.current;
        if (currentCheck.status === AppStatus.OFFLINE) await initializeAudio();
        
        setActiveNotes(prev => new Set(prev).add(note));
        setIsPlaying(true);

        if (samplerRef.current && samplerRef.current.loaded) {
            const freq = window.Tone.Frequency(note, "midi").toNote();
            
            if (currentCheck.smartChordMode && note < currentCheck.splitPoint) {
                // Triad Chord
                const third = window.Tone.Frequency(note + 4, "midi").toNote();
                const fifth = window.Tone.Frequency(note + 7, "midi").toNote();
                
                samplerRef.current.triggerAttack([freq, third, fifth]);
                
                setActiveNotes(prev => new Set(prev).add(note + 4).add(note + 7));
            } else {
                samplerRef.current.triggerAttack(freq);
            }
        }
    };

    const triggerNoteOff = (note: number) => {
        const currentCheck = stateRef.current;
        
        if (sustainRef.current) {
            sustainedNotesRef.current.add(note);
            return; 
        }

        if (samplerRef.current && samplerRef.current.loaded) {
            const freq = window.Tone.Frequency(note, "midi").toNote();

            if (currentCheck.smartChordMode && note < currentCheck.splitPoint) {
                const third = window.Tone.Frequency(note + 4, "midi").toNote();
                const fifth = window.Tone.Frequency(note + 7, "midi").toNote();
                samplerRef.current.triggerRelease([freq, third, fifth]);
            } else {
                samplerRef.current.triggerRelease(freq);
            }
        }

        setActiveNotes(prev => { 
            const n = new Set(prev); 
            n.delete(note);
            if (currentCheck.smartChordMode && note < currentCheck.splitPoint) {
                n.delete(note + 4);
                n.delete(note + 7);
            }
            return n; 
        });
        
        setTimeout(() => {
             // Visualizer logic: if we don't have many active notes, dim the lights
             setIsPlaying(prev => prev && activeNotes.size > 0); 
        }, 50);
    };

    const handleCC = (cc: number, value: number) => {
        const norm = value / 127;
        if (cc === 64) {
            sustainRef.current = value > 63;
            if (!sustainRef.current) {
                sustainedNotesRef.current.forEach(n => triggerNoteOff(n));
                sustainedNotesRef.current.clear();
            }
        }
        if (cc === 7) setVolume(norm);
        if (cc === 74) setFilterFreq(20 + (19980 * norm));
    };

    return (
        <div className="flex flex-col h-full w-full gap-2 overflow-hidden">
            
            {/* MOBILE TABS */}
            <div className="lg:hidden shrink-0 grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button onClick={() => setActiveTab('pads')} className={`py-2 rounded font-bold text-[10px] tracking-wider transition-colors ${activeTab === 'pads' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>PADS</button>
                <button onClick={() => setActiveTab('studio')} className={`py-2 rounded font-bold text-[10px] tracking-wider transition-colors ${activeTab === 'studio' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>STUDIO</button>
                <button onClick={() => setActiveTab('fx')} className={`py-2 rounded font-bold text-[10px] tracking-wider transition-colors ${activeTab === 'fx' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>FX</button>
            </div>

            {/* MAIN WORKSPACE */}
            <div className="flex-1 bg-slate-900 rounded-xl border-t border-slate-700 shadow-2xl p-1 md:p-2 grid grid-cols-12 gap-2 min-h-0 overflow-hidden relative">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-30 pointer-events-none"></div>

                 {/* LEFT: DRUMS */}
                 <div className={`col-span-12 lg:col-span-3 flex-col gap-2 z-10 min-h-0 h-full ${activeTab === 'pads' ? 'flex' : 'hidden lg:flex'}`}>
                     <div className="flex-1 bg-slate-950/50 rounded-lg p-2 border border-slate-800 shadow-inner min-h-0 overflow-hidden flex flex-col justify-center">
                         <DrumPads />
                     </div>
                     <div className="shrink-0">
                        <RhythmControl />
                     </div>
                 </div>

                 {/* CENTER: STUDIO */}
                 <div className={`col-span-12 lg:col-span-6 flex-col gap-2 z-10 min-h-0 h-full overflow-hidden ${activeTab === 'studio' ? 'flex' : 'hidden lg:flex'}`}>
                     <div className="shrink-0 min-h-[50px] max-h-[128px] h-auto flex-none bg-black rounded-t-lg border-x-2 border-t-2 border-slate-700 shadow-inner p-2 md:p-4 relative overflow-hidden flex flex-col justify-between group">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] z-20 bg-[length:100%_2px] pointer-events-none"></div>
                        <div className="flex justify-between items-start z-30">
                             <div className="flex flex-col min-w-0">
                                 <h2 className="text-cyan-600 font-tech text-[9px] lg:text-[10px] tracking-widest mb-0.5 landscape-compact">ACTIVE WAVEFORM</h2>
                                 <div className="text-cyan-100 font-mono text-xs md:text-lg truncate max-w-full tracking-tighter shadow-cyan-500/50 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                                    {status === AppStatus.LOADING ? <span className="animate-pulse">LOADING...</span> : (fileName || "NO DATA")}
                                 </div>
                             </div>
                             <div className={`shrink-0 ml-2 px-1 py-0.5 rounded text-[8px] font-bold border ${midiEnabled ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'bg-red-900/30 border-red-500 text-red-400'}`}>
                                 {midiEnabled ? 'MIDI LINK' : 'NO MIDI'}
                             </div>
                        </div>
                        <div className="w-full h-8 lg:h-12 relative z-10 opacity-80 mt-1 landscape-compact block">
                            <Visualizer isActive={isPlaying} />
                        </div>
                     </div>
                     <div className="flex-1 min-h-0 bg-slate-950 border-x-2 border-b-2 border-slate-700 rounded-b-lg p-1 relative shadow-inner overflow-hidden flex flex-col">
                         <CloudLibrary onLoadSample={loadSample} />
                     </div>
                 </div>

                 {/* RIGHT: FX */}
                 <div className={`col-span-12 lg:col-span-3 flex-col gap-2 z-10 min-h-0 h-full ${activeTab === 'fx' ? 'flex' : 'hidden lg:flex'}`}>
                     <div className="flex-1 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg p-2 border border-slate-700 shadow-xl flex flex-col min-h-0 overflow-y-auto">
                        <div className="text-[10px] text-center text-slate-400 font-tech tracking-[0.2em] border-b border-slate-700 pb-1 mb-1 shrink-0">GLOBAL PARAMS</div>
                        <div className="grid grid-cols-2 gap-2 content-start p-1 flex-1 items-center">
                            <Knob label="VOL" min={0} max={1} value={volume} onChange={setVolume} cc={7} />
                            <Knob label="CUT" min={20} max={20000} value={filterFreq} onChange={setFilterFreq} cc={74} />
                            <Knob label="ATK" min={0} max={2} value={attack} onChange={setAttack} cc={73} />
                            <Knob label="DEC" min={0.1} max={3} value={decay} onChange={setDecay} cc={72} />
                        </div>
                     </div>
                     <div className="shrink-0 p-2 bg-black/40 rounded border border-slate-800">
                         <div className="flex items-center justify-between">
                            <span className="text-[9px] text-amber-500 font-bold tracking-wider">SMART CHORD</span>
                            <button 
                                onClick={() => setSmartChordMode(!smartChordMode)}
                                className={`w-8 h-4 rounded-full transition-colors relative ${smartChordMode ? 'bg-amber-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${smartChordMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </button>
                         </div>
                     </div>
                 </div>
            </div>

            {/* KEYBOARD */}
            <div className="flex-none z-20 h-[100px] md:h-[25vh] lg:h-[30vh] min-h-[90px] max-h-[300px]">
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