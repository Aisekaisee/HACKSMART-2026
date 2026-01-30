import React, { useState } from 'react';
import { Sparkles, ArrowRight, Zap, CheckCircle } from 'lucide-react';

const AIOptimizer = ({ isOptimizing, suggestions, onApplySuggestion, onAutoFixAll }) => {
  if (isOptimizing) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-4 text-center animate-pulse">
         <Sparkles size={48} className="text-primary mb-4" />
         <h3 className="text-sm font-bold text-text-main">AI Engine Running...</h3>
         <p className="text-xs text-text-muted mt-2">Analyzing 2,400+ data points for bottlenecks</p>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
      return (
          <div className="p-4 text-center border-2 border-dashed border-white/5 rounded-xl m-4">
              <p className="text-xs text-text-muted">No optimization suggestions needed. Network is healthy! 🚀</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
        <div className="p-4 bg-gradient-to-r from-primary/20 to-transparent border-b border-panel-border">
             <div className="flex justify-between items-center">
                 <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                     <Sparkles size={16} className="text-primary" /> 
                     AI Insights
                 </h3>
                 <span className="text-[10px] bg-primary text-bg-dark px-2 py-0.5 rounded font-bold">{suggestions.length} Findings</span>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {suggestions.map((s, idx) => (
                <div key={idx} className="bg-panel border border-panel-border p-3 rounded-lg hover:border-primary/50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                         <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border
                            ${s.priority === 'high' ? 'border-danger/30 text-danger bg-danger/5' : 
                              s.priority === 'medium' ? 'border-accent/30 text-accent bg-accent/5' : 'border-primary/30 text-primary bg-primary/5'
                            }`}>
                            {s.priority} Priority
                         </span>
                         {s.station_id && <span className="text-[10px] font-mono text-text-muted">{s.station_id}</span>}
                    </div>
                    
                    <p className="text-xs text-text-main mb-3 leading-relaxed">
                        {s.description}
                    </p>
                    
                    <button 
                        onClick={() => onApplySuggestion(s)}
                        className="w-full py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-primary hover:text-bg-dark text-text-muted rounded transition-all flex items-center justify-center gap-2"
                    >
                        <Zap size={10} fill="currentColor" /> Apply Fix
                    </button>
                </div>
            ))}
        </div>

        <div className="p-4 border-t border-panel-border bg-panel">
            <button 
                onClick={onAutoFixAll}
                className="w-full py-3 bg-gradient-to-r from-primary to-emerald-600 text-bg-dark font-bold text-xs uppercase tracking-widest rounded shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
                <CheckCircle size={14} /> Auto-Fix All Issues
            </button>
        </div>
    </div>
  );
};

export default AIOptimizer;
