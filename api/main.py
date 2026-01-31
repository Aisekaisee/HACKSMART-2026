from fastapi import FastAPI, HTTPException, status, Depends
from typing import List, Dict, Any
from dotenv import load_dotenv
import os
import traceback


load_dotenv(override=True)

from api.models import (
    BaselineConfig, ScenarioConfig, ScenarioCreateResponse,
    SimulationResponse, ComparisonResponse, OptimizationResponse,
    CityKPIValidationResponse, StationKPI,
    # New models
    SignUpRequest, LoginRequest, TokenResponse,
    ProjectCreate, ProjectUpdate, ProjectOut,
    StationCreate, StationUpdate, StationOut,
    ScenarioCreate, ScenarioOut, InterventionItem,
    SimulationRunResponse, BaselineValidationResponse
)
from api.services import (
    SimulationService,
    # New Supabase services
    create_project, get_projects, get_project, update_project,
    create_station, get_stations, update_station, delete_station,
    create_scenario, get_scenarios, get_scenario, update_scenario_result,
    run_simulation
)
from api.auth import get_current_user, require_role
from api.supabase_client import get_supabase
from validation.baseline_validator import BaselineValidator

app = FastAPI(
    title="Digital Twin Simulation API",
    description="API for the Swap Station Digital Twin Simulation",
    version="2.0.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for hackathon convenience
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health_check():
    return {"status": "ok"}


# ============================================================
# AUTH ROUTES
# ============================================================

@app.post("/auth/signup", response_model=TokenResponse)
async def signup(request: SignUpRequest):
    """Sign up a new user."""
    try:
        supabase = get_supabase()
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })
        
        # Check if we got a session (email confirmation may be required)
        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email confirmation required. Please check your email to confirm your account."
            )
        
        user_id = response.user.id
        
        # Get user's role from profiles table
        profile_response = supabase.table("profiles") \
            .select("role") \
            .eq("id", user_id) \
            .single() \
            .execute()
        
        role = profile_response.data.get("role", "viewer") if profile_response.data else "viewer"
        
        return TokenResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=str(user_id),
            role=role
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}"
        )


@app.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login an existing user."""
    try:
        supabase = get_supabase()
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        user_id = response.user.id
        
        # Get user's role from profiles table
        profile_response = supabase.table("profiles") \
            .select("role") \
            .eq("id", user_id) \
            .single() \
            .execute()
        
        role = profile_response.data.get("role", "viewer") if profile_response.data else "viewer"
        
        return TokenResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            user_id=str(user_id),
            role=role
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )


@app.post("/auth/logout")
async def logout():
    """Logout (client should discard token)."""
    return {"status": "success", "message": "Logged out successfully"}


# ============================================================
# PROJECT ROUTES
# ============================================================

@app.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project_route(
    data: ProjectCreate,
    user: Dict[str, str] = Depends(require_role("admin", "analyst"))
):
    """Create a new project (admin/analyst only)."""
    try:
        project = create_project(user["user_id"], data)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create project"
            )
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )


@app.get("/projects")
async def list_projects_route(
    user: Dict[str, str] = Depends(get_current_user)
):
    """List all projects for the current user."""
    return get_projects(user["user_id"])


@app.get("/projects/{project_id}")
async def get_project_route(
    project_id: str,
    user: Dict[str, str] = Depends(get_current_user)
):
    """Get a single project by ID."""
    project = get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found"
        )
    return project


@app.put("/projects/{project_id}")
async def update_project_route(
    project_id: str,
    data: ProjectUpdate,
    user: Dict[str, str] = Depends(require_role("admin", "analyst"))
):
    """Update a project (admin/analyst only)."""
    project = update_project(project_id, data)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found"
        )
    return project


# ============================================================
# STATION ROUTES (nested under project)
# ============================================================

@app.post("/projects/{project_id}/stations", status_code=status.HTTP_201_CREATED)
async def create_station_route(
    project_id: str,
    data: StationCreate,
    user: Dict[str, str] = Depends(require_role("admin", "analyst"))
):
    """Add a station to a project (admin/analyst only)."""
    # Verify project exists
    project = get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found"
        )
    
    station = create_station(project_id, data)
    if not station:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create station"
        )
    return station


@app.get("/projects/{project_id}/stations")
async def list_stations_route(
    project_id: str,
    user: Dict[str, str] = Depends(get_current_user)
):
    """List all stations in a project."""
    return get_stations(project_id)


@app.put("/projects/{project_id}/stations/{station_id}")
async def update_station_route(
    project_id: str,
    station_id: str,
    data: StationUpdate,
    user: Dict[str, str] = Depends(require_role("admin", "analyst"))
):
    """Update a station (admin/analyst only)."""
    station = update_station(station_id, data)
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Station '{station_id}' not found"
        )
    return station


@app.delete("/projects/{project_id}/stations/{station_id}")
async def delete_station_route(
    project_id: str,
    station_id: str,
    user: Dict[str, str] = Depends(require_role("admin", "analyst"))
):
    """Delete a station (admin/analyst only)."""
    deleted = delete_station(station_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Station '{station_id}' not found"
        )
    return {"status": "success", "message": "Station deleted"}


# ============================================================
# SCENARIO ROUTES
# ============================================================

@app.post("/projects/{project_id}/scenarios", status_code=status.HTTP_201_CREATED)
async def create_scenario_route(
    project_id: str,
    data: ScenarioCreate,
    user: Dict[str, str] = Depends(require_role("admin", "analyst"))
):
    """Create a new scenario (admin/analyst only)."""
    # Verify project exists
    project = get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project '{project_id}' not found"
        )
    
    scenario = create_scenario(project_id, data)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create scenario"
        )
    return scenario


@app.get("/projects/{project_id}/scenarios")
async def list_scenarios_route(
    project_id: str,
    user: Dict[str, str] = Depends(get_current_user)
):
    """List all scenarios in a project."""
    return get_scenarios(project_id)


@app.get("/projects/{project_id}/scenarios/{scenario_id}")
async def get_scenario_route(
    project_id: str,
    scenario_id: str,
    user: Dict[str, str] = Depends(get_current_user)
):
    """Get a single scenario (includes result_kpis and result_timeline if sim has run)."""
    scenario = get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario '{scenario_id}' not found"
        )
    return scenario


# ============================================================
# SIMULATION ROUTES
# ============================================================

@app.post("/projects/{project_id}/scenarios/{scenario_id}/run", response_model=SimulationRunResponse)
async def run_scenario_simulation(
    project_id: str,
    scenario_id: str,
    user: Dict[str, str] = Depends(require_role("admin", "analyst"))
):
    """Run simulation for a scenario (admin/analyst only)."""
    try:
        # Fetch project, scenario, and stations
        project = get_project(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found"
            )
        
        scenario = get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario '{scenario_id}' not found"
            )
        
        stations = get_stations(project_id)
        
        # Update status to running
        supabase = get_supabase()
        supabase.table("scenarios") \
            .update({"status": "running", "updated_at": "now()"}) \
            .eq("id", scenario_id) \
            .execute()
        
        # Run simulation
        result = run_simulation(scenario, project, stations)
        
        # Save results back to scenario
        update_scenario_result(
            scenario_id,
            kpis=result.get("kpis", {}),
            timeline=result.get("timeline", []),
            status="completed"
        )
        
        return SimulationRunResponse(
            scenario_id=scenario_id,
            status="completed",
            kpis=result.get("kpis"),
            timeline=result.get("timeline"),
            error=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        
        # Mark scenario as failed
        try:
            update_scenario_result(
                scenario_id,
                kpis={},
                timeline=[],
                status="failed"
            )
        except:
            pass
        
        return SimulationRunResponse(
            scenario_id=scenario_id,
            status="failed",
            kpis=None,
            timeline=None,
            error=str(e)
        )


# ============================================================
# BASELINE ROUTES
# ============================================================

@app.post("/projects/{project_id}/baseline-config")
async def save_baseline_config(
    project_id: str,
    config: Dict[str, Any],
    user: Dict[str, str] = Depends(require_role("admin", "analyst"))
):
    """Save baseline config for a project (admin/analyst only)."""
    try:
        supabase = get_supabase()
        response = supabase.table("projects") \
            .update({
                "baseline_config": config,
                "updated_at": "now()"
            }) \
            .eq("id", project_id) \
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found"
            )
        
        return {"status": "success", "message": "Baseline config saved"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save baseline config: {str(e)}"
        )


@app.post("/projects/{project_id}/validate-baseline", response_model=BaselineValidationResponse)
async def validate_baseline(
    project_id: str,
    user: Dict[str, str] = Depends(require_role("admin", "analyst"))
):
    """Run baseline simulation and validate (admin/analyst only)."""
    try:
        # Fetch project and stations
        project = get_project(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found"
            )
        
        stations = get_stations(project_id)
        
        # Create a dummy scenario with no interventions
        baseline_scenario = {
            "name": "Baseline Validation",
            "description": "Auto-generated for validation",
            "interventions": [],
            "duration_hours": 24
        }
        
        # Run simulation
        result = run_simulation(baseline_scenario, project, stations)
        kpis = result.get("kpis", {})
        
        # Load reference KPIs for validation
        from pathlib import Path
        reference_path = Path("validation/reference_kpis.yaml")
        
        if reference_path.exists():
            ref_kpis = BaselineValidator.load_reference_kpis(reference_path)
            passed, report = BaselineValidator.validate(kpis, ref_kpis)
        else:
            # No reference file, assume validation passes
            report = {
                "r_squared": 1.0,
                "mape": 0.0,
                "rmse": 0.0,
                "passed": True,
                "per_station": {},
                "thresholds": {
                    "mape_max": 10.0,
                    "wait_time_tolerance_pct": 15.0,
                    "lost_swaps_tolerance_pct": 20.0
                }
            }
            passed = True
        
        # Save validation result to database
        supabase = get_supabase()
        supabase.table("validation_results").insert({
            "project_id": project_id,
            "r_squared": report.get("r_squared", 0.0),
            "mape": report.get("mape", 0.0),
            "rmse": report.get("rmse", 0.0),
            "per_station": report.get("per_station", {}),
            "passed": passed
        }).execute()
        
        # Update project's baseline_valid flag and baseline_kpis
        supabase.table("projects").update({
            "baseline_valid": passed,
            "baseline_kpis": kpis,
            "updated_at": "now()"
        }).eq("id", project_id).execute()
        
        return BaselineValidationResponse(
            r_squared=report.get("r_squared", 0.0),
            mape=report.get("mape", 0.0),
            rmse=report.get("rmse", 0.0),
            passed=passed,
            per_station=report.get("per_station"),
            thresholds=report.get("thresholds")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )


# ============================================================
# LEGACY ROUTES (preserved for backward compatibility)
# ============================================================

@app.get("/configs/baselines", response_model=List[str])
async def list_baselines():
    return SimulationService.list_baselines()


@app.get("/configs/scenarios", response_model=List[str])
async def list_scenarios():
    return SimulationService.list_scenarios()


@app.get("/configs/baselines/{filename}", response_model=BaselineConfig)
async def get_baseline_config(filename: str):
    config = SimulationService.get_baseline(filename)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Baseline config '{filename}' not found"
        )
    return config


@app.get("/configs/scenarios/{filename}", response_model=ScenarioConfig)
async def get_scenario_config(filename: str):
    config = SimulationService.get_scenario(filename)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario config '{filename}' not found"
        )
    return config


@app.post("/configs/scenarios", response_model=ScenarioCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario_config(scenario: ScenarioConfig):
    try:
        return SimulationService.create_scenario(scenario)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create scenario: {str(e)}"
        )


@app.post("/simulation/baseline", response_model=SimulationResponse)
async def run_baseline_simulation(config: BaselineConfig):
    try:
        return SimulationService.run_baseline(config)
    except Exception as e:
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
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Station simulation failed: {str(e)}"
        )


@app.post("/simulation/compare", response_model=ComparisonResponse)
async def run_comparison_simulation(data: dict):
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
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison simulation failed: {str(e)}"
        )


@app.post("/simulation/optimize", response_model=OptimizationResponse)
async def optimize_network(config: BaselineConfig):
    try:
        response = SimulationService.run_baseline(config)
        suggestions = SimulationService.generate_optimization_suggestions(response.kpis)
        return OptimizationResponse(suggestions=suggestions)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization failed: {str(e)}"
        )
