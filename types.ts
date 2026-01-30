
// Accessing Tone from window since we are using CDN
export interface ToneAudioBuffer {
    duration: number;
    loaded: boolean;
}

export interface ToneSignal {
    value: number;
    rampTo: (value: number, rampTime?: number) => void;
}

export interface ToneFilter {
    frequency: ToneSignal;
    Q: ToneSignal;
    type: string;
    dispose: () => void;
    toDestination: () => void;
    connect: (node: any) => void;
}

export interface TonePlayer {
    toDestination: () => TonePlayer;
    connect: (node: any) => TonePlayer;
    start: () => void;
    stop: (time?: number | string) => void;
    buffer: ToneAudioBuffer;
    dispose: () => void;
    volume: ToneSignal;
    playbackRate: number;
    fadeIn: number;
    fadeOut: number;
    state: 'started' | 'stopped';
}

export interface ToneOscillator {
    toDestination: () => ToneOscillator;
    start: () => ToneOscillator;
    stop: (time?: string | number) => ToneOscillator;
    volume: ToneSignal;
    dispose: () => void;
}

export interface ToneSynth {
    toDestination: () => ToneSynth;
    triggerAttackRelease: (noteOrDuration: string | number, durationOrTime?: string | number, time?: number, velocity?: number) => void;
    volume: ToneSignal;
    dispose: () => void;
}

export interface ToneSampler {
    toDestination: () => ToneSampler;
    connect: (node: any) => ToneSampler;
    triggerAttack: (note: string | string[] | number, time?: number, velocity?: number) => void;
    triggerRelease: (note: string | string[] | number, time?: number) => void;
    triggerAttackRelease: (note: string | string[] | number, duration: string | number, time?: number, velocity?: number) => void;
    releaseAll: (time?: number) => void;
    dispose: () => void;
    volume: ToneSignal;
    attack: number;
    release: number;
    loaded: boolean;
}

export interface ToneLoop {
    start: (time?: number | string) => void;
    stop: (time?: number | string) => void;
    cancel: (time?: number | string) => void;
    dispose: () => void;
}

export interface ToneTransport {
    start: (time?: number | string) => void;
    stop: (time?: number | string) => void;
    bpm: ToneSignal;
    state: 'started' | 'stopped' | 'paused';
}

export interface ToneContext {
    state: 'running' | 'suspended' | 'closed';
    resume: () => Promise<void>;
    currentTime: number;
    rawContext: AudioContext; 
}

export interface ToneFrequencyClass {
    toNote: () => string;
    toFrequency: () => number;
    toMidi: () => number;
}

export interface ToneType {
    start: () => Promise<void>;
    Player: new (url: string | ArrayBuffer | any, onload?: () => void) => TonePlayer;
    Sampler: new (options: any) => ToneSampler;
    Filter: new (frequency: number, type: string) => ToneFilter;
    MembraneSynth: new (options?: any) => ToneSynth;
    NoiseSynth: new (options?: any) => ToneSynth;
    MetalSynth: new (options?: any) => ToneSynth;
    Oscillator: new (frequency?: string | number, type?: string) => ToneOscillator;
    Loop: new (callback: (time: number) => void, interval: string | number) => ToneLoop;
    Transport: ToneTransport;
    context: ToneContext;
    loaded: () => Promise<void>;
    toFrequency: (note: string | number) => number;
    Frequency: (value: string | number, units?: string) => ToneFrequencyClass;
    now: () => number;
}

declare global {
    interface Window {
        Tone: ToneType;
    }
}

export enum AppStatus {
    OFFLINE = 'OFFLINE',
    READY = 'READY',
    LOADING = 'LOADING',
    PLAYING = 'PLAYING',
    ERROR = 'ERROR'
}