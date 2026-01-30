import React from 'react';

const MainLayout = ({ leftPanel, mapPanel, rightPanel, bottomPanel }) => {
  return (
    <div className="h-screen w-screen grid grid-cols-12 grid-rows-12 bg-bg-dark text-text-main overflow-hidden">
      
      {/* Left Panel: Interventions (3 cols, 9 rows) */}
      <div className="col-span-3 row-span-9 border-r border-panel-border bg-panel flex flex-col z-10">
        <div className="p-4 border-b border-panel-border bg-panel flex justify-between items-center">
          <h2 className="text-xs font-bold text-text-main uppercase tracking-widest">Network Interventions</h2>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {leftPanel}
        </div>
      </div>

      {/* Center Panel: Map (5 cols, 9 rows) - Increased width by reducing right panel? No, keeping 3-6-3 ratio. */}
      <div className="col-span-6 row-span-9 bg-black relative z-0">
        {mapPanel}
      </div>

      {/* Right Panel: Station Details & Analysis (3 cols, 9 rows) */}
      <div className="col-span-3 row-span-9 border-l border-panel-border bg-panel flex flex-col z-10">
        <div className="p-4 border-b border-panel-border bg-panel">
          <h2 className="text-xs font-bold text-text-main uppercase tracking-widest">Analysis & Details</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {rightPanel}
        </div>
      </div>

      {/* Bottom Panel: KPIs (12 cols, 3 rows) */}
      <div className="col-span-12 row-span-3 border-t border-panel-border bg-panel flex flex-col z-20">
        <div className="px-6 py-2 border-b border-panel-border bg-panel flex justify-between items-center h-10">
          <h2 className="text-xs font-bold text-text-main uppercase tracking-widest">Simulation Intelligence</h2>
          <span className="text-[10px] text-text-muted font-mono">LIVE MODEL CONNECTED</span>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          {bottomPanel}
        </div>
      </div>

    </div>
  );
};

export default MainLayout;
