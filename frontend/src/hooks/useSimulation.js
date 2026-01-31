import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export const useSimulation = () => {
  const [baselines, setBaselines] = useState([]);
  const [selectedBaselineName, setSelectedBaselineName] = useState('');
  const [baselineConfig, setBaselineConfig] = useState(null);
  
  // Scenario State
  const [scenarioConfig, setScenarioConfig] = useState(null);
  
  // Simulation Results
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selected Station for Info Panel
  const [selectedStationId, setSelectedStationId] = useState(null);

  // Saved Scenarios
  const [savedScenarios, setSavedScenarios] = useState([]);

  // Initial Load - baselines and saved scenarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [baselineList, scenarioList] = await Promise.all([
          api.listBaselines(),
          api.listScenarios()
        ]);
        setBaselines(baselineList);
        setSavedScenarios(scenarioList);
        if (baselineList.length > 0) {
          setSelectedBaselineName(baselineList[0]);
        }
      } catch (err) {
        console.error("Failed to load configs", err);
        setError("Failed to load configurations");
      }
    };
    fetchData();
  }, []);

  // Load Baseline Config when selection changes
  useEffect(() => {
    if (!selectedBaselineName) return;
    
    const loadConfig = async () => {
      setLoading(true);
      try {
        const config = await api.getBaseline(selectedBaselineName);
        setBaselineConfig(config);
        
        // Initialize a default scenario based on baseline or empty
        setScenarioConfig({
          name: "New Scenario",
          description: "Custom intervention",
          add_stations: [],
          remove_station_ids: [],
          modify_stations: {},
          demand_multiplier: 1.0,
          operations_override: {}
        });
        
        // Optionally run baseline simulation immediately??
        // Maybe wait for user action. 
        // Let's run baseline simulation to show initial state.
        const baseRes = await api.runBaseline(config);
        setResults({
            baseline: baseRes,
            scenario: null,
            comparison: null
        });

      } catch (err) {
        console.error(err);
        setError("Failed to load baseline config");
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [selectedBaselineName]);

  const runSimulation = async () => {
    if (!baselineConfig || !scenarioConfig) return;
    setLoading(true);
    try {
        // Run comparison
        const comparisonRes = await api.runComparison(selectedBaselineName, scenarioConfig);
        setResults({
            baseline: { kpis: comparisonRes.baseline_kpis, costs: comparisonRes.baseline_costs }, 
            scenario: { kpis: comparisonRes.scenario_kpis, costs: comparisonRes.scenario_costs },
            comparison: comparisonRes
        });
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const updateScenario = (updates) => {
      // If we are updating overrides, we need to merge deeply if needed, but here simple merge
      setScenarioConfig(prev => {
          // specific deep merge for operations_override if present
          if (updates.operations_override) {
              return { 
                  ...prev, 
                  ...updates, 
                  operations_override: { ...prev.operations_override, ...updates.operations_override } 
              };
          }
          return { ...prev, ...updates };
      });
  };

  // Helper to add station
  const addStationToScenario = (station) => {
      setScenarioConfig(prev => ({
          ...prev,
          add_stations: [...prev.add_stations, station]
      }));
  };

  // Optimization State
  const [suggestions, setSuggestions] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeNetwork = async () => {
    if (!baselineConfig) return;
    setIsOptimizing(true);
    try {
        const res = await api.optimize(baselineConfig);
        setSuggestions(res.suggestions);
    } catch (err) {
        console.error(err);
        setError("Optimization failed");
    } finally {
        setIsOptimizing(false);
    }
  };

  const applySuggestion = (suggestion) => {
      // Logic to convert suggestion action_payload to scenario update
      if (!suggestion.action_payload) return;
      
      const payload = suggestion.action_payload;
      const { type } = suggestion;
      
      if (type === 'add_chargers' && payload.station_id) {
          // Check if station already modified in scenarioConfig.modify_stations
          const currentMods = scenarioConfig.modify_stations[payload.station_id] || {};
          // We need to know current chargers to Add... but the API payload says "add_chargers: 2"
          // We need baseline station reference to know absolute value? 
          // Or the backend should support relative changes. 
          // Our ScenarioConfig `modify_stations` usually expects absolute values (see backend schema).
          // Wait, the backend schema is Dict[str, Dict[str, Any]]. It replaces values.
          
          // Helper: Find current chargers from baseline OR current scenario state
          // For MVP: Let's assume we read from baseline for now.
          const baseStation = baselineConfig.stations.find(s => s.station_id === payload.station_id);
          if (baseStation) {
              const currentChargers = baseStation.chargers;
              const newChargers = currentChargers + payload.add_chargers;
              
              setScenarioConfig(prev => ({
                  ...prev,
                  modify_stations: {
                      ...prev.modify_stations,
                      [payload.station_id]: { ...currentMods, chargers: newChargers }
                  }
              }));
          }
      }
      
      // Remove suggestion from list after applied?
      setSuggestions(prev => prev.filter(s => s !== suggestion));
  };
  
  const autoFixAll = () => {
      suggestions.forEach(s => applySuggestion(s));
  };

  // Save current scenario to YAML file
  const saveScenario = async (name) => {
    if (!scenarioConfig) return null;
    try {
      const toSave = { ...scenarioConfig, name: name || scenarioConfig.name };
      const result = await api.createScenario(toSave);
      // Refresh scenarios list
      const updatedList = await api.listScenarios();
      setSavedScenarios(updatedList);
      return result;
    } catch (err) {
      console.error("Failed to save scenario", err);
      setError("Failed to save scenario");
      return null;
    }
  };

  // Load a saved scenario
  const loadScenario = async (filename) => {
    try {
      const config = await api.getScenario(filename);
      setScenarioConfig(config);
      return config;
    } catch (err) {
      console.error("Failed to load scenario", err);
      setError("Failed to load scenario");
      return null;
    }
  };

  return {
    baselines,
    selectedBaselineName,
    setSelectedBaselineName,
    baselineConfig,
    scenarioConfig,
    updateScenario,
    results,
    loading,
    error,
    runSimulation,
    selectedStationId,
    setSelectedStationId,
    // Optimization
    optimizeNetwork,
    suggestions,
    isOptimizing,
    applySuggestion,
    autoFixAll,
    // Scenario Save/Load
    savedScenarios,
    saveScenario,
    loadScenario
  };
};
