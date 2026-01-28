import React from 'react';
import { Header } from './components/Header';
import { SamplerDeck } from './components/SamplerDeck';

const App: React.FC = () => {
  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden select-none touch-none">
      <div className="flex-none z-50">
          <Header />
      </div>
      
      {/* Main Workspace - Flex Grow to take remaining height */}
      <main className="flex-1 relative flex flex-col min-h-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-black pointer-events-none z-0"></div>
        
        {/* Content Container */}
        <div className="relative z-10 w-full h-full flex flex-col p-2 md:p-4 gap-4">
            <SamplerDeck />
        </div>
      </main>
    </div>
  );
};

export default App;