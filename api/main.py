from fastapi import FastAPI, HTTPException, status
from typing import List

from api.models import (
    BaselineConfig, ScenarioConfig, SimulationResponse, 
    ComparisonResponse, ScenarioCreateResponse,
    CityKPIValidationResponse, StationKPI
)
from api.services import SimulationService

app = FastAPI(
    title="Digital Twin Simulation API",
    description="API for the Swap Station Digital Twin Simulation",
    version="1.0.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for hackathon convenience
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Health Check ---

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# --- Configuration Endpoints ---

@app.get("/configs/baselines", response_model=List[str])
async def list_baselines():
    return SimulationService.list_baselines()

@app.get("/configs/scenarios", response_model=List[str])
async def list_scenarios():
    return SimulationService.list_scenarios()

@app.get("/configs/baselines/{filename}", response_model=BaselineConfig)
async def get_baseline(filename: str):
    config = SimulationService.get_baseline(filename)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Baseline config '{filename}' not found"
        )
    return config

@app.get("/configs/scenarios/{filename}", response_model=ScenarioConfig)
async def get_scenario(filename: str):
    config = SimulationService.get_scenario(filename)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario config '{filename}' not found"
        )
    return config

@app.post("/configs/scenarios", response_model=ScenarioCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(scenario: ScenarioConfig):
    try:
        return SimulationService.create_scenario(scenario)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create scenario: {str(e)}"
        )

# --- Simulation Endpoints ---

@app.post("/simulation/baseline", response_model=SimulationResponse)
async def run_baseline_simulation(config: BaselineConfig):
    try:
        return SimulationService.run_baseline(config)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation failed: {str(e)}"
        )

@app.post("/simulation/baseline/city-kpis", response_model=CityKPIValidationResponse)
async def run_baseline_city_validated(config: BaselineConfig):
    try:
        return SimulationService.run_baseline_city_validated(config)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"City validation failed: {str(e)}"
        )

@app.post("/simulation/baseline/station-kpis", response_model=List[StationKPI])
async def run_baseline_stations(config: BaselineConfig):
    try:
        return SimulationService.run_baseline_stations(config)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Station simulation failed: {str(e)}"
        )

@app.post("/simulation/compare", response_model=ComparisonResponse)
async def run_comparison_simulation(data: dict):
    # Expecting {"baseline": BaselineConfig, "scenario": ScenarioConfig}
    # We can use a Pydantic model for the body, but for flexibility using dict first
    # Better: Use a dedicated request model
    try:
        baseline_data = data.get("baseline")
        scenario_data = data.get("scenario")
        
        if not baseline_data or not scenario_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request must include 'baseline' and 'scenario' objects"
            )
            
        baseline = BaselineConfig(**baseline_data)
        scenario = ScenarioConfig(**scenario_data)
        
        return SimulationService.run_comparison(baseline, scenario)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison simulation failed: {str(e)}"
        )
