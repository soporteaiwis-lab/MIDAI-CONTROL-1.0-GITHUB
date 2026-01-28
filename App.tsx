import React from 'react';
import { Header } from './components/Header';
import { SamplerDeck } from './components/SamplerDeck';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white selection:bg-cyan-500/30">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        
        <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl md:text-5xl font-tech font-bold text-white tracking-tight">
                AI-Ready <span className="text-cyan-500">Sampler</span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
                Connect your MIDI keyboard, upload sounds to the cloud, and perform live with zero latency.
            </p>
        </div>

        <SamplerDeck />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40 pointer-events-none grayscale">
             {/* Placeholders for future AI features mentioned in prompt */}
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="h-2 w-20 bg-slate-700 rounded mb-4"></div>
                <h3 className="font-tech text-lg text-slate-500 mb-2">AI Pattern Gen</h3>
                <p className="text-xs text-slate-600">Coming soon in v1.1</p>
            </div>
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="h-2 w-20 bg-slate-700 rounded mb-4"></div>
                <h3 className="font-tech text-lg text-slate-500 mb-2">MIDI Mapping</h3>
                <p className="text-xs text-slate-600">Coming soon in v1.2</p>
            </div>
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="h-2 w-20 bg-slate-700 rounded mb-4"></div>
                <h3 className="font-tech text-lg text-slate-500 mb-2">Stem Splitting</h3>
                <p className="text-xs text-slate-600">Coming soon in v2.0</p>
            </div>
        </div>

      </main>

      <footer className="w-full border-t border-slate-900 bg-slate-950 py-8 mt-12 text-center">
        <p className="text-slate-600 text-xs">
            © 2024 midAI-Control. Powered by Tone.js & React.
        </p>
      </footer>
    </div>
  );
};

export default App;