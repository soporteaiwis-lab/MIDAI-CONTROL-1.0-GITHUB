import React from 'react';
import { Header } from './components/Header';
import { SamplerDeck } from './components/SamplerDeck';

const App: React.FC = () => {
  return (
    // h-[100dvh] ensures it fits perfectly on mobile browsers with dynamic address bars
    <div className="h-[100dvh] w-screen bg-slate-950 flex flex-col overflow-hidden select-none touch-none">
      <div className="flex-none z-50">
          <Header />
      </div>
      
      {/* Main Workspace - Flex Grow to take remaining height */}
      <main className="flex-1 relative flex flex-col min-h-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-black pointer-events-none z-0"></div>
        
        {/* Content Container - Compact padding for better fit */}
        <div className="relative z-10 w-full h-full flex flex-col px-2 pb-2 pt-1 gap-2">
            <SamplerDeck />
        </div>
      </main>
    </div>
  );
};

export default App;