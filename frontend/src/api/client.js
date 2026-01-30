import axios from 'axios';

const API_URL = 'http://localhost:8000';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Configs
  listBaselines: async () => (await client.get('/configs/baselines')).data,
  listScenarios: async () => (await client.get('/configs/scenarios')).data,
  getBaseline: async (filename) => (await client.get(`/configs/baselines/${filename}`)).data,
  getScenario: async (filename) => (await client.get(`/configs/scenarios/${filename}`)).data,
  createScenario: async (scenario) => (await client.post('/configs/scenarios', scenario)).data,

  // Simulation
  runBaseline: async (config) => (await client.post('/simulation/baseline', config)).data,
  runComparison: async (baselineName, scenarioConfig) => {
    // We need to fetch the baseline config first or pass it if we have it?
    // The API expects full objects.
    // Ideally we pass full objects.
    // Let's assume the hook handles fetching the baseline config.
    const baseline = await api.getBaseline(baselineName);
    return (await client.post('/simulation/compare', { baseline, scenario: scenarioConfig })).data;
  },
  optimize: async (baselineConfig) => (await client.post('/simulation/optimize', baselineConfig)).data
};
