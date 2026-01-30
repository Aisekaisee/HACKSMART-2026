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

  // Initial Load
  useEffect(() => {
    const fetchBaselines = async () => {
      try {
        const list = await api.listBaselines();
        setBaselines(list);
        if (list.length > 0) {
          setSelectedBaselineName(list[0]);
        }
      } catch (err) {
        console.error("Failed to load baselines", err);
        setError("Failed to load baselines");
      }
    };
    fetchBaselines();
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
    setSelectedStationId
  };
};
