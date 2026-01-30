import React, { useState } from 'react';
import MainLayout from './components/layout/MainLayout';
import StationMap from './components/map/StationMap';
import InterventionPanel from './components/sidebar/InterventionPanel';
import StationInfo from './components/sidebar/StationInfo';
import KPIDashboard from './components/dashboard/KPIDashboard';
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
  } = useSimulation();
  
  // -- Add Station UX State --
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [addStationData, setAddStationData] = useState(null);

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

  return (
    <MainLayout
      leftPanel={
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
        />
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
        <KPIDashboard results={results} />
      }
    />
  );
}

export default App;
