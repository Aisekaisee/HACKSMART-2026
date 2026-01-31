import React, { useState } from 'react';
import MainLayout from './components/layout/MainLayout';
import StationMap from './components/map/StationMap';
import InterventionPanel from './components/sidebar/InterventionPanel';
import StationInfo from './components/sidebar/StationInfo';
import KPIDashboard from './components/dashboard/KPIDashboard';
import SimulationPlayback from './components/dashboard/SimulationPlayback';
import AIOptimizer from './components/sidebar/AIOptimizer';
import { useSimulation } from './hooks/useSimulation';

function App() {
  const { 
    baselines, 
    selectedBaselineName, 
    setSelectedBaselineName, 
    baselineConfig,
    scenarioConfig,
    updateScenario,
    runSimulation,
    results,
    loading,
    error,
    selectedStationId,
    setSelectedStationId,
    // Opt
    optimizeNetwork,
    suggestions,
    isOptimizing,
    applySuggestion,
    autoFixAll,
    // Scenario Save/Load
    savedScenarios,
    saveScenario,
    loadScenario
  } = useSimulation();
  
  // -- Add Station UX State --
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [addStationData, setAddStationData] = useState(null);
  const [sidebarMode, setSidebarMode] = useState('intervention'); // intervention | ai

  // Playback state - track which hour snapshot to visualize on map
  const [playbackSnapshot, setPlaybackSnapshot] = useState(null);

  const handleLocationPicked = (latlng) => {
      setIsPickingLocation(false);
      // Pre-fill form
      setAddStationData({
          station_id: `NEW_${Math.floor(Math.random() * 1000)}`,
          tier: 'medium',
          bays: 4,
          chargers: 6,
          inventory_capacity: 40,
          lat: latlng.lat,
          lon: latlng.lng,
          initial_charged: 30
      });
  };

  const handleConfirmAddStation = () => {
      if (!addStationData) return;
      
      const newStations = [...(scenarioConfig.add_stations || []), addStationData];
      updateScenario({ add_stations: newStations });
      
      setAddStationData(null);
  };

  const handleCancelAddStation = () => {
      setIsPickingLocation(false);
      setAddStationData(null);
  };

  // Handle playback hour change - can be used to update map markers
  const handlePlaybackHourChange = (hour, snapshot) => {
      setPlaybackSnapshot(snapshot);
  };

  // Determine stations to display
  // Merge baseline + scenario additions
  let stationsToDisplay = baselineConfig ? [...baselineConfig.stations] : [];
  if (scenarioConfig && scenarioConfig.add_stations) {
      stationsToDisplay = [...stationsToDisplay, ...scenarioConfig.add_stations];
  }
  
  // Filter removed?
  if (scenarioConfig && scenarioConfig.remove_station_ids) {
      stationsToDisplay = stationsToDisplay.filter(s => !scenarioConfig.remove_station_ids.includes(s.station_id));
  }
  
  // Find selected station object
  const selectedStation = stationsToDisplay.find(s => s.station_id === selectedStationId);
  
  // Find KPI data
  let stationKpi = null;
  let baselineStationKpi = null; // New var

  if (selectedStationId) {
      if (results && results.scenario && results.scenario.kpis && results.scenario.kpis.stations) {
          stationKpi = results.scenario.kpis.stations.find(s => s.station_id === selectedStationId);
      }
      
      // Fallback: if only baseline ran (initial state)
      if (!stationKpi && results && results.baseline && results.baseline.kpis && results.baseline.kpis.stations) {
           stationKpi = results.baseline.kpis.stations.find(s => s.station_id === selectedStationId);
      }

      // Always find baseline ref for comparison
      if (results && results.baseline && results.baseline.kpis && results.baseline.kpis.stations) {
           baselineStationKpi = results.baseline.kpis.stations.find(s => s.station_id === selectedStationId);
      }
  }

  // Extract hourly snapshots from results for playback
  const hourlySnapshots = results?.baseline?.hourly_snapshots || results?.scenario?.hourly_snapshots || [];

  return (
    <MainLayout
      leftPanel={
        <div className="flex flex-col h-full">
            {/* Sidebar Toggle */}
            <div className="flex border-b border-panel-border">
                <button 
                    onClick={() => setSidebarMode('intervention')}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${sidebarMode === 'intervention' ? 'bg-white/5 border-b-2 border-primary text-primary' : 'text-text-muted'}`}
                >
                    Interventions
                </button>
                <button 
                    onClick={() => { setSidebarMode('ai'); optimizeNetwork(); }}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${sidebarMode === 'ai' ? 'bg-white/5 border-b-2 border-accent text-accent' : 'text-text-muted hover:text-accent'}`}
                >
                   <span className="animate-pulse">✨</span> AI Pilot
                </button>
            </div>

            {sidebarMode === 'intervention' ? (
                <InterventionPanel 
                    baselines={baselines}
                    selectedBaselineName={selectedBaselineName}
                    onSelectBaseline={setSelectedBaselineName}
                    scenarioConfig={scenarioConfig}
                    onUpdateScenario={updateScenario}
                    onRunSimulation={runSimulation}
                    loading={loading}
                    // Add Station Props
                    isPickingLocation={isPickingLocation}
                    setIsPickingLocation={setIsPickingLocation}
                    addStationData={addStationData}
                    setAddStationData={setAddStationData}
                    onConfirmAddStation={handleConfirmAddStation}
                    onCancelAddStation={handleCancelAddStation}
                    // Scenario Save/Load
                    savedScenarios={savedScenarios}
                    onSaveScenario={saveScenario}
                    onLoadScenario={loadScenario}
                />
            ) : (
                <AIOptimizer 
                    isOptimizing={isOptimizing}
                    suggestions={suggestions}
                    onApplySuggestion={applySuggestion}
                    onAutoFixAll={autoFixAll}
                />
            )}
        </div>
      }
      mapPanel={
        <StationMap 
            stations={stationsToDisplay} 
            onStationSelect={setSelectedStationId}
            selectedStationId={selectedStationId}
            isPickingLocation={isPickingLocation}
            onLocationPicked={handleLocationPicked}
            // Pass KPI data for coloring (Use scenario if avail, else baseline)
            kpiData={results?.scenario?.kpis || results?.baseline?.kpis}
            // Pass playback snapshot for dynamic visualization
            playbackSnapshot={playbackSnapshot}
        />
      }
      rightPanel={
        <StationInfo 
            station={selectedStation}
            kpiData={stationKpi}
            baselineKpiData={baselineStationKpi} // Pass reference
        />
      }
      bottomPanel={
        <div className="flex gap-4 h-full">
          {/* KPI Dashboard - takes most space */}
          <div className="flex-1">
            <KPIDashboard results={results} />
          </div>
          {/* Simulation Playback - compact sidebar */}
          {hourlySnapshots.length > 0 && (
            <div className="w-72 shrink-0">
              <SimulationPlayback 
                hourlySnapshots={hourlySnapshots}
                onHourChange={handlePlaybackHourChange}
                stations={stationsToDisplay}
              />
            </div>
          )}
        </div>
      }
    />
  );
}

export default App;

