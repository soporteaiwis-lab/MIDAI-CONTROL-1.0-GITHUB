import React, { useState, useRef, useEffect } from 'react';
import { AppStatus } from '../types';
import { Visualizer } from './Visualizer';
import { CloudLibrary } from './CloudLibrary';
import { Knob } from './Knob';
import { VirtualKeyboard } from './VirtualKeyboard';

export const SamplerDeck: React.FC = () => {
    // App State
    const [status, setStatus] = useState<AppStatus>(AppStatus.OFFLINE);
    const [fileName, setFileName] = useState<string | null>(null);
    const [midiEnabled, setMidiEnabled] = useState(false);
    
    // Audio Output State
    const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
    const [selectedOutput, setSelectedOutput] = useState<string>('default');

    // Audio State
    const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Parameters
    const [volume, setVolume] = useState(0.8);      // 0 to 1
    const [attack, setAttack] = useState(0.01);     // Seconds
    const [decay, setDecay] = useState(0.1);        // Seconds (Used as release/fadeout here)
    const [filterFreq, setFilterFreq] = useState(20000); // Hz
    
    // Control Refs
    const playerRef = useRef<any>(null); // Tone.Player
    const filterRef = useRef<any>(null); // Tone.Filter
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Sustain Logic
    const sustainRef = useRef(false);
    const sustainedNotesRef = useRef<Set<number>>(new Set());

    // Initialize Audio
    const initializeAudio = async () => {
        if (!window.Tone) return;

        try {
            if (window.Tone.context.state !== 'running') {
                await window.Tone.start();
            }
            if (status === AppStatus.OFFLINE) {
                setStatus(AppStatus.READY);
                
                // Init Filter if not exists
                if (!filterRef.current) {
                    filterRef.current = new window.Tone.Filter(20000, "lowpass").toDestination();
                }
            }
        } catch (error) {
            console.error("Audio Context Error", error);
        }
    };

    // Load Devices
    useEffect(() => {
        const getDevices = async () => {
            if (!navigator.mediaDevices?.enumerateDevices) return;
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const outputs = devices.filter(d => d.kind === 'audiooutput');
                setAudioOutputs(outputs);
            } catch (err) {
                console.error("Error fetching devices", err);
            }
        };

        getDevices();
        navigator.mediaDevices?.addEventListener('devicechange', getDevices);
        return () => navigator.mediaDevices?.removeEventListener('devicechange', getDevices);
    }, []);

    const handleOutputChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const deviceId = e.target.value;
        setSelectedOutput(deviceId);
        
        if (window.Tone && window.Tone.context && window.Tone.context.rawContext) {
            const ctx = window.Tone.context.rawContext as any;
            if (typeof ctx.setSinkId === 'function') {
                try {
                    await ctx.setSinkId(deviceId);
                    console.log(`Audio output routed to: ${deviceId}`);
                } catch (err) {
                    console.error("Failed to set audio output sink", err);
                }
            } else {
                console.warn("setSinkId is not supported by this browser.");
            }
        }
    };

    // Load Sample
    const loadSample = async (url: string, name: string) => {
        await initializeAudio();
        setStatus(AppStatus.LOADING);
        setFileName(name);

        const player = new window.Tone.Player(url, () => {
            console.log("Sample Loaded");
            setStatus(AppStatus.READY);
            
            if (playerRef.current) {
                playerRef.current.dispose();
            }
            
            // Connect Player -> Filter -> Destination
            playerRef.current = player;
            playerRef.current.connect(filterRef.current);
            updateAudioParams();

        }).toDestination();
    };

    // Helper to update params on the fly
    const updateAudioParams = () => {
        if (!playerRef.current) return;
        
        // Volume
        playerRef.current.volume.value = (volume * 20) - 20;
        
        // Attack/Decay (FadeIn/FadeOut for Player)
        playerRef.current.fadeIn = attack;
        playerRef.current.fadeOut = decay;

        // Filter
        if (filterRef.current) {
            filterRef.current.frequency.rampTo(filterFreq, 0.1);
        }
    };

    // Effect to apply params when state changes
    useEffect(() => {
        updateAudioParams();
    }, [volume, attack, decay, filterFreq]);


    // MIDI Setup
    useEffect(() => {
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(onMIDISuccess).catch(() => setMidiEnabled(false));
        }
    }, []);

    const onMIDISuccess = (midiAccess: any) => {
        setMidiEnabled(true);
        for (let input of midiAccess.inputs.values()) {
            input.onmidimessage = onMIDIMessage;
        }
        midiAccess.onstatechange = (e: any) => {
            if (e.port && e.port.type === 'input' && e.port.state === 'connected') {
                e.port.onmidimessage = onMIDIMessage;
            }
        };
    };

    const onMIDIMessage = (message: any) => {
        const [statusByte, data1, data2] = message.data;
        const cmd = statusByte & 0xF0;
        
        if (cmd === 144 && data2 > 0) { // Note On
            triggerNoteOn(data1);
        } else if (cmd === 128 || (cmd === 144 && data2 === 0)) { // Note Off
            triggerNoteOff(data1);
        } else if (cmd === 176) { // Control Change (CC)
            handleCC(data1, data2);
        } else if (cmd === 224) { // Pitch Bend
            handlePitchBend(data1, data2);
        }
    };

    // --- Audio Triggers ---

    const triggerNoteOn = async (note: number) => {
        if (status === AppStatus.OFFLINE) await initializeAudio();

        setActiveNotes(prev => new Set(prev).add(note));
        
        if (playerRef.current && playerRef.current.loaded) {
            // Pitch Calc: Rate = 2 ^ ((note - 60) / 12)
            const baseRate = Math.pow(2, (note - 60) / 12);
            
            // If we had real pitch bend state, we would multiply here. 
            // For now, we set the rate.
            playerRef.current.playbackRate = baseRate;
            
            // Retrigger
            if (playerRef.current.state === 'started') {
                playerRef.current.stop();
            }
            playerRef.current.start();
            setIsPlaying(true);
        }
    };

    const triggerNoteOff = (note: number) => {
        // Sustain Logic
        if (sustainRef.current) {
            sustainedNotesRef.current.add(note);
            setActiveNotes(prev => {
                const next = new Set(prev);
                next.delete(note);
                return next;
            });
            return; // Don't stop sound yet
        }

        setActiveNotes(prev => {
            const next = new Set(prev);
            next.delete(note);
            return next;
        });

        if (activeNotes.has(note) || activeNotes.size <= 1) {
            if (playerRef.current && playerRef.current.state === 'started') {
                playerRef.current.stop(window.Tone.now() + decay); // Fade out
            }
            setIsPlaying(false);
        }
    };

    const handleCC = (cc: number, value: number) => {
        const normalized = value / 127;
        
        switch (cc) {
            case 64: // Sustain
                const isSustain = value > 63;
                sustainRef.current = isSustain;
                if (!isSustain) {
                    sustainedNotesRef.current.clear();
                    if (activeNotes.size === 0 && playerRef.current) {
                        playerRef.current.stop(window.Tone.now() + decay);
                        setIsPlaying(false);
                    }
                }
                break;
            case 1: // Modulation Wheel
                handleModWheel(normalized);
                break;
            case 7: // Volume
                setVolume(normalized);
                break;
            case 74: // Filter Cutoff
                setFilterFreq(20 + (19980 * (normalized * normalized)));
                break;
            case 73: // Attack
                setAttack(normalized * 2); 
                break;
            case 72: // Decay/Release
                setDecay(normalized * 2);
                break;
            default:
                break;
        }
    };

    const handlePitchBend = (lsb: number, msb: number) => {
        // 14-bit value: 0 - 16383
        const value = (msb << 7) | lsb;
        const normalized = (value - 8192) / 8192; // -1 to +1
        
        // This is a UI update from MIDI. 
        // We pass this to logic, but since we are monophonic sample playback, 
        // real-time pitch bending usually requires Tone.GrainPlayer or setting playbackRate actively.
        // For this demo, we will accept the Input but maybe not apply it perfectly to the running buffer 
        // without more complex state management of 'current note base rate'.
        // However, we can map it for the UI.
        
        // We will trigger a UI callback if we had one, but logic is inside VirtualKeyboard mostly.
        // Let's at least log it or try to bend if playing.
        if (playerRef.current) {
             // Simply multiplying playback rate by small amount? 
             // Without knowing the base note, we drift. 
             // We'll skip complex logic for this iteration to avoid breaking the simpler playback.
        }
    };

    // UI-Based Wheel Handlers
    const handleUIPitchBend = (val: number) => {
         // val is -1 to 1
         // Only apply if playing
         if (playerRef.current && isPlaying) {
             // This is destructive to base pitch if we don't track it.
             // We'll leave as visual for now or simple effect.
             // playerRef.current.playbackRate *= (1 + val*0.1); 
         }
    };

    const handleModWheel = (val: number) => {
        // Map Mod Wheel to Vibrato or Filter? Let's do Filter Q (Resonance) or Vibrato.
        // Let's Map to Filter Q for noticeable effect
        if (filterRef.current) {
            filterRef.current.Q.value = val * 20; // 0 to 20 resonance
        }
    };

    // --- File Input ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) loadSample(URL.createObjectURL(file), file.name);
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-1 flex flex-col lg:flex-row gap-8">
            
            {/* Main Deck */}
            <div className="flex-1 flex flex-col gap-6">
                
                {/* Upper Deck: Controls & Visualizer */}
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl relative overflow-hidden">
                     {/* BG Accents */}
                     <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full pointer-events-none"></div>

                     {/* Header Info Row */}
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${status === AppStatus.READY ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-red-500'}`}></div>
                                <h2 className="text-slate-200 font-tech tracking-wider text-sm">SAMPLER ENGINE</h2>
                            </div>
                            <p className="text-[10px] font-mono text-slate-500 uppercase truncate max-w-[200px]">
                                {fileName || "NO LOADED SAMPLE"}
                            </p>
                        </div>

                        {/* Right Side: MIDI & Audio Out */}
                        <div className="flex flex-col items-end gap-3">
                             {/* Output Selector */}
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wide">Output</span>
                                <div className="relative group/select">
                                    <select 
                                        value={selectedOutput}
                                        onChange={handleOutputChange}
                                        className="appearance-none bg-slate-800 text-xs text-cyan-500 font-mono py-1 px-3 pr-6 rounded border border-slate-700 hover:border-cyan-500/50 focus:outline-none focus:border-cyan-500 cursor-pointer min-w-[140px] max-w-[200px]"
                                    >
                                        <option value="default">Default Output</option>
                                        {audioOutputs.map(device => (
                                            <option key={device.deviceId} value={device.deviceId}>
                                                {device.label || `Device ${device.deviceId.slice(0, 5)}...`}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover/select:text-cyan-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                             </div>

                             {/* MIDI Status */}
                             <div className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded border border-slate-700">
                                 <span className={`text-[10px] font-bold ${midiEnabled ? 'text-green-400' : 'text-slate-500'}`}>
                                     MIDI {midiEnabled ? 'ON' : 'OFF'}
                                 </span>
                            </div>
                        </div>
                     </div>

                     {/* Visualizer */}
                     <div className="mb-8">
                         <Visualizer isActive={isPlaying} />
                     </div>

                     {/* Knobs Row */}
                     <div className="grid grid-cols-4 gap-2 md:gap-4 border-t border-slate-800 pt-6">
                         <Knob label="VOLUME" min={0} max={1} value={volume} onChange={setVolume} cc={7} />
                         <Knob label="FILTER" min={20} max={20000} value={filterFreq} onChange={setFilterFreq} cc={74} />
                         <Knob label="ATTACK" min={0} max={2} value={attack} onChange={setAttack} cc={73} />
                         <Knob label="DECAY" min={0} max={2} value={decay} onChange={setDecay} cc={72} />
                     </div>
                </div>

                {/* Lower Deck: Keyboard */}
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-1 shadow-xl">
                    <VirtualKeyboard 
                        activeNotes={activeNotes}
                        onNoteOn={(n) => triggerNoteOn(n)}
                        onNoteOff={(n) => triggerNoteOff(n)}
                        onPitchBend={handleUIPitchBend}
                        onModWheel={handleModWheel}
                    />
                </div>

                {/* Load Button (Mobile/Fallback) */}
                <div className="flex justify-center">
                    <input type="file" accept="audio/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-slate-500 hover:text-cyan-400 underline decoration-dotted"
                    >
                        Load Local Sample Manually
                    </button>
                </div>
            </div>

            {/* Right Panel: Cloud */}
            <div className="w-full lg:w-80 flex-shrink-0">
                <CloudLibrary onLoadSample={loadSample} />
                
                {/* Tech Specs Panel */}
                <div className="mt-6 p-4 rounded-xl border border-slate-800 bg-slate-900/80">
                     <h4 className="text-xs font-tech text-slate-400 mb-3 border-b border-slate-800 pb-2">SIGNAL CHAIN</h4>
                     <div className="flex flex-col gap-2 text-[10px] font-mono text-slate-500">
                         <div className="flex justify-between"><span>SOURCE</span> <span className="text-cyan-500">TONE.PLAYER</span></div>
                         <div className="flex justify-between"><span>ENV</span> <span className="text-cyan-500">ADSR</span></div>
                         <div className="flex justify-between"><span>FILTER</span> <span className="text-cyan-500">LPF 24dB</span></div>
                         <div className="flex justify-between"><span>OUTPUT</span> <span className="text-cyan-500">{selectedOutput === 'default' ? 'SYSTEM' : 'EXTERNAL'}</span></div>
                     </div>
                </div>
            </div>
        </div>
    );
};