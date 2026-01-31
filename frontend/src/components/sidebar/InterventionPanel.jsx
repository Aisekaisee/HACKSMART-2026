import React, { useState } from 'react';
import { Plus, Trash2, Zap, CloudRain, Music, Cog, Save, FolderOpen } from 'lucide-react';

const InterventionPanel = ({ 
    baselines, 
    selectedBaselineName, 
    onSelectBaseline, 
    scenarioConfig, 
    onUpdateScenario, 
    onRunSimulation,
    loading,
    isPickingLocation,
    setIsPickingLocation,
    addStationData,
    setAddStationData,
    onConfirmAddStation,
    onCancelAddStation,
    // Scenario Save/Load
    savedScenarios = [],
    onSaveScenario,
    onLoadScenario
}) => {
    
    if (!scenarioConfig) return <div className="p-4 text-text-muted">Loading configuration...</div>;

    const [activeTab, setActiveTab] = useState('scenarios'); // scenarios | stations | tweaks
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    // Handlers
    const handlePreset = (type) => {
        if (type === 'festival') {
            onUpdateScenario({ 
                name: 'Festival Surge', 
                demand_multiplier: 1.5,
                description: 'High demand event'
            });
        }
        if (type === 'rainy') {
            onUpdateScenario({ 
                name: 'Monsoon Chaos', 
                demand_multiplier: 1.2,
                operations_override: { swap_duration: 3.5 }, // Slower swaps
                description: 'Rain slows down operations'
            });
        }
    };

    const handleSaveScenario = async () => {
        if (!onSaveScenario) return;
        setIsSaving(true);
        const result = await onSaveScenario(scenarioConfig.name);
        setIsSaving(false);
        if (result) {
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }
    };

    const handleLoadScenario = async (filename) => {
        if (!onLoadScenario || !filename) return;
        await onLoadScenario(filename);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-panel-border">
                {['scenarios', 'stations', 'tweaks'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors
                            ${activeTab === tab ? 'text-primary border-b-2 border-primary bg-white/5' : 'text-text-muted hover:text-text-main'}
                        `}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                
                {/* --- SCENARIOS TAB --- */}
                {activeTab === 'scenarios' && (
                    <>
                        <div className="space-y-2">
                             <label className="text-xs font-semibold text-text-muted uppercase">Base Model</label>
                             <select 
                                value={selectedBaselineName} 
                                onChange={(e) => onSelectBaseline(e.target.value)}
                                className="w-full bg-bg-dark border border-panel-border rounded p-2 text-xs text-text-main focus:border-primary focus:outline-none"
                            >
                                {baselines.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-text-muted uppercase">Scenario Name</label>
                            <input 
                                type="text" 
                                value={scenarioConfig.name} 
                                onChange={(e) => onUpdateScenario({ name: e.target.value })}
                                className="w-full bg-bg-dark border border-panel-border rounded p-2 text-xs text-text-main focus:border-primary focus:outline-none"
                            />
                        </div>
                        
                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-semibold text-text-muted uppercase mb-2 block">Quick Presets</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handlePreset('festival')} className="p-3 bg-bg-dark border border-panel-border rounded hover:border-primary group text-left">
                                    <div className="flex items-center gap-2 mb-1 text-primary"><Music size={14} /> <span className="text-xs font-bold">Festival</span></div>
                                    <div className="text-[10px] text-text-muted group-hover:text-text-main">1.5x Demand</div>
                                </button>
                                <button onClick={() => handlePreset('rainy')} className="p-3 bg-bg-dark border border-panel-border rounded hover:border-secondary group text-left">
                                    <div className="flex items-center gap-2 mb-1 text-secondary"><CloudRain size={14} /> <span className="text-xs font-bold">Rainy</span></div>
                                    <div className="text-[10px] text-text-muted group-hover:text-text-main">Slow Ops</div>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-text-muted uppercase">Demand Multiplier</label>
                                <span className="text-xs font-mono text-primary bg-primary/10 px-1 rounded">{scenarioConfig.demand_multiplier}x</span>
                            </div>
                            <input 
                                type="range" 
                                min="0.5" 
                                max="3.0" 
                                step="0.1" 
                                value={scenarioConfig.demand_multiplier} 
                                onChange={(e) => onUpdateScenario({ demand_multiplier: parseFloat(e.target.value) })}
                                className="w-full accent-primary h-1 bg-panel-border rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Load Saved Scenario */}
                        {savedScenarios && savedScenarios.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-text-muted uppercase flex items-center gap-2">
                                    <FolderOpen size={12} /> Load Saved
                                </label>
                                <select 
                                    onChange={(e) => handleLoadScenario(e.target.value)}
                                    className="w-full bg-bg-dark border border-panel-border rounded p-2 text-xs text-text-main focus:border-primary focus:outline-none"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select a saved scenario...</option>
                                    {savedScenarios.map(s => (
                                        <option key={s} value={s}>{s.replace('scenario_', '').replace('.yaml', '')}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Save Scenario Button */}
                        <button
                            onClick={handleSaveScenario}
                            disabled={isSaving}
                            className={`w-full py-2 text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-all
                                ${saveSuccess 
                                    ? 'bg-primary text-bg-dark' 
                                    : 'bg-white/5 border border-panel-border text-text-muted hover:text-primary hover:border-primary'
                                }
                            `}
                        >
                            <Save size={12} />
                            {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Scenario'}
                        </button>
                    </>
                )}

                {/* --- STATIONS TAB --- */}
                {activeTab === 'stations' && (
                    <div className="space-y-6">
                        {!isPickingLocation ? (
                            <button 
                                onClick={() => setIsPickingLocation(true)}
                                className="w-full py-3 border border-dashed border-panel-border rounded-lg text-text-muted hover:text-primary hover:border-primary hover:bg-white/5 transition-all text-xs font-bold uppercase flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Add Station on Map
                            </button>
                        ) : (
                            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg animate-pulse">
                                <p className="text-xs text-primary font-bold text-center">Click location on map...</p>
                                <button onClick={onCancelAddStation} className="w-full mt-2 text-[10px] text-text-muted underline">Cancel</button>
                            </div>
                        )}
                        
                        {/* New Station Form (shows when addStationData is populated) */}
                        {addStationData && (
                            <div className="p-4 bg-bg-dark border border-panel-border rounded-lg space-y-3">
                                <h4 className="text-xs font-bold text-primary uppercase border-b border-panel-border pb-2">New Station Config</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-text-muted block">ID</label>
                                        <input 
                                            value={addStationData.station_id} 
                                            onChange={e => setAddStationData({...addStationData, station_id: e.target.value})}
                                            className="w-full bg-panel border border-panel-border rounded p-1 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-text-muted block">Tier</label>
                                        <select 
                                            value={addStationData.tier} 
                                            onChange={e => setAddStationData({...addStationData, tier: e.target.value})}
                                            className="w-full bg-panel border border-panel-border rounded p-1 text-xs"
                                        >
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2 text-xs">Lat: {addStationData.lat.toFixed(3)}</div>
                                    <div className="flex items-center gap-2 text-xs">Lon: {addStationData.lon.toFixed(3)}</div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={onConfirmAddStation} className="flex-1 py-1 bg-primary text-bg-dark font-bold text-xs rounded hover:bg-emerald-400">Confirm</button>
                                    <button onClick={onCancelAddStation} className="flex-1 py-1 bg-panel border border-panel-border text-text-muted text-xs rounded hover:text-white">Cancel</button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                           <h4 className="text-xs font-bold text-text-muted uppercase">Modify Existing</h4>
                           {/* List stations to remove/modify - MVP: Just ID list */}
                           <div className="max-h-40 overflow-y-auto space-y-1">
                               {/* We can't easily access full station list here unless passed. 
                                   Assuming we pass base stations or filter from context. 
                                   For now, placeholder. 
                               */}
                               <p className="text-[10px] text-text-muted italic">Station list unavailable in MVP panel context. Use Map to select.</p>
                           </div>
                        </div>
                    </div>
                )}

                {/* --- TWEAKS TAB --- */}
                {activeTab === 'tweaks' && (
                     <div className="space-y-4">
                        <div className="bg-amber-500/10 p-3 rounded border border-amber-500/20">
                            <h4 className="flex items-center gap-2 text-amber-500 text-xs font-bold mb-2">
                                <Cog size={14} /> Operational Params
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-text-muted block">Swap Duration (min)</label>
                                    <input type="number" step="0.5" className="w-full bg-bg-dark border border-panel-border rounded p-1 text-xs text-text-main" placeholder="2.0" 
                                        onChange={e => onUpdateScenario({ operations_override: { ...scenarioConfig.operations_override, swap_duration: parseFloat(e.target.value) }})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-text-muted block">Charge Duration (min)</label>
                                    <input type="number" step="5" className="w-full bg-bg-dark border border-panel-border rounded p-1 text-xs text-text-main" placeholder="60.0" 
                                        onChange={e => onUpdateScenario({ operations_override: { ...scenarioConfig.operations_override, charge_duration: parseFloat(e.target.value) }})}
                                    />
                                </div>
                            </div>
                        </div>
                     </div>
                )}

            </div>

            {/* Run Button Area */}
            <div className="p-4 border-t border-panel-border bg-panel z-20">
                 <button 
                    onClick={onRunSimulation}
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-bold text-sm tracking-wide uppercase transition-all flex items-center justify-center gap-2
                        ${loading 
                            ? 'bg-panel-border text-text-muted cursor-wait' 
                            : 'bg-primary text-bg-dark hover:bg-emerald-400 shadow-lg shadow-emerald-900/20'
                        }
                    `}
                >
                    <Zap size={16} fill="currentColor" />
                    {loading ? 'Running Simulation...' : 'Simulate Scenario'}
                </button>
            </div>
        </div>
    );
};

export default InterventionPanel;
