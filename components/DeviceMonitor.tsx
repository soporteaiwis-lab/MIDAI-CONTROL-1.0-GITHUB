import React, { useEffect, useState } from 'react';

interface DeviceMonitorProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DeviceMonitor: React.FC<DeviceMonitorProps> = ({ isOpen, onClose }) => {
    const [midiInputs, setMidiInputs] = useState<string[]>([]);
    const [midiOutputs, setMidiOutputs] = useState<string[]>([]);
    const [audioState, setAudioState] = useState<string>('Unknown');
    const [sampleRate, setSampleRate] = useState<number>(0);

    useEffect(() => {
        if (!isOpen) return;

        // Check Audio Context
        if (window.Tone && window.Tone.context) {
            setAudioState(window.Tone.context.state);
            setSampleRate(window.Tone.context.rawContext.sampleRate);
        }

        // Check MIDI
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then((access: any) => {
                const inputs: string[] = [];
                const outputs: string[] = [];
                
                access.inputs.forEach((input: any) => {
                    inputs.push(`${input.name || 'Unknown Device'} (${input.manufacturer})`);
                });
                
                access.outputs.forEach((output: any) => {
                    outputs.push(`${output.name || 'Unknown Device'} (${output.manufacturer})`);
                });

                setMidiInputs(inputs);
                setMidiOutputs(outputs);

                // Listen for connection changes
                access.onstatechange = (e: any) => {
                    console.log("MIDI State Change", e);
                };
            }).catch((err: any) => {
                console.error("MIDI Access Failed", err);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-cyan-400 font-tech tracking-wider text-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        SYSTEM DIAGNOSTICS
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 font-mono text-xs">
                    
                    {/* Audio Engine Section */}
                    <div>
                        <h3 className="text-slate-500 font-bold mb-2 border-b border-slate-800 pb-1">AUDIO ENGINE (Tone.js)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                <div className="text-slate-600 mb-1">CONTEXT STATE</div>
                                <div className={`text-lg ${audioState === 'running' ? 'text-green-400' : 'text-amber-400'}`}>
                                    {audioState.toUpperCase()}
                                </div>
                            </div>
                            <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                <div className="text-slate-600 mb-1">SAMPLE RATE</div>
                                <div className="text-lg text-cyan-400">{sampleRate} Hz</div>
                            </div>
                        </div>
                    </div>

                    {/* MIDI Section */}
                    <div>
                        <h3 className="text-slate-500 font-bold mb-2 border-b border-slate-800 pb-1">MIDI CONNECTIVITY</h3>
                        
                        <div className="mb-4">
                            <div className="text-slate-400 mb-2 flex items-center gap-2">
                                <span className="text-cyan-600">IN</span> INPUT DEVICES
                            </div>
                            {midiInputs.length > 0 ? (
                                <ul className="space-y-1">
                                    {midiInputs.map((name, i) => (
                                        <li key={i} className="bg-slate-800/50 p-2 rounded text-green-300 border border-green-900/30 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                            {name}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-slate-600 italic p-2 border border-dashed border-slate-800 rounded">No MIDI inputs detected</div>
                            )}
                        </div>

                        <div>
                            <div className="text-slate-400 mb-2 flex items-center gap-2">
                                <span className="text-amber-600">OUT</span> OUTPUT DEVICES
                            </div>
                            {midiOutputs.length > 0 ? (
                                <ul className="space-y-1">
                                    {midiOutputs.map((name, i) => (
                                        <li key={i} className="bg-slate-800/50 p-2 rounded text-amber-300 border border-amber-900/30 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                            {name}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-slate-600 italic p-2 border border-dashed border-slate-800 rounded">No MIDI outputs detected</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-blue-900/10 border border-blue-900/30 p-3 rounded text-blue-200">
                        <strong>TIP:</strong> If your MIDI controller is not showing up, try reconnecting the USB cable and refreshing the page. Chrome requires HTTPS for MIDI access.
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-950 p-3 border-t border-slate-800 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-cyan-900/30 hover:bg-cyan-500 hover:text-black border border-cyan-700/50 text-cyan-400 px-4 py-2 rounded text-xs font-bold transition-all"
                    >
                        CLOSE DIAGNOSTICS
                    </button>
                </div>
            </div>
        </div>
    );
};