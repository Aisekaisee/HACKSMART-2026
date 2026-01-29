import requests
import time
import sys
import json

BASE_URL = "http://localhost:8001"

def test_health():
    print("Testing /health...")
    resp = requests.get(f"{BASE_URL}/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
    print("MATCH")

def test_list_baselines():
    print("Testing /configs/baselines...")
    resp = requests.get(f"{BASE_URL}/configs/baselines")
    assert resp.status_code == 200
    configs = resp.json()
    assert len(configs) > 0
    assert "baseline_example.yaml" in configs
    print(f"MATCH: Found {len(configs)} baselines")

def test_run_baseline():
    print("Testing /simulation/baseline...")
    # Get config first
    resp = requests.get(f"{BASE_URL}/configs/baselines/baseline_example.yaml")
    assert resp.status_code == 200
    config = resp.json()
    
    # Run simulation
    start = time.time()
    resp = requests.post(f"{BASE_URL}/simulation/baseline", json=config)
    assert resp.status_code == 200
    result = resp.json()
    duration = time.time() - start
    
    # Check KPIs
    kpis = result["kpis"]["city_kpis"]
    print(f"MATCH: Simulation took {duration:.2f}s")
    print(f"  Avg Wait Time: {kpis['avg_wait_time']:.2f}")
    assert "costs" in result

def test_create_and_run_scenario():
    print("Testing Scenario Creation and Comparison...")
    
    # 1. Create Scenario
    new_scenario = {
        "name": "Test Scenario Auto",
        "description": "Created via API test",
        "add_stations": [],
        "modify_stations": {
            "WDL_01": {"chargers": 20}
        }
    }
    
    resp = requests.post(f"{BASE_URL}/configs/scenarios", json=new_scenario)
    assert resp.status_code == 201
    created = resp.json()
    filename = created["filename"]
    print(f"MATCH: Created scenario {filename}")
    
    # 2. Run Comparison
    # Get baseline
    base_resp = requests.get(f"{BASE_URL}/configs/baselines/baseline_example.yaml")
    base_config = base_resp.json()
    
    payload = {
        "baseline": base_config,
        "scenario": created["config"]
    }
    
    resp = requests.post(f"{BASE_URL}/simulation/compare", json=payload)
    if resp.status_code != 200:
        print("Error:", resp.text)
    assert resp.status_code == 200
    result = resp.json()
    
    base_waits = result["baseline_kpis"]["city_kpis"]["avg_wait_time"]
    scen_waits = result["scenario_kpis"]["city_kpis"]["avg_wait_time"]
    
    print(f"MATCH: Base Wait {base_waits:.2f} vs Scen Wait {scen_waits:.2f}")

def test_separate_kpis():
    print("Testing Separate KPI Endpoints...")
    res = requests.get(f"{BASE_URL}/configs/baselines/baseline_example.yaml")
    config = res.json()
    
    # 1. City KPIs with Validation
    print("  > Testing /simulation/baseline/city-kpis")
    resp = requests.post(f"{BASE_URL}/simulation/baseline/city-kpis", json=config)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "kpis" in data
    assert "validation" in data
    assert "avg_wait_time" in data["kpis"]
    # Check validation details
    passed = data["validation"]["passed"]
    print(f"    Validation Passed: {passed}")
    
    # 2. Station KPIs
    print("  > Testing /simulation/baseline/station-kpis")
    resp = requests.post(f"{BASE_URL}/simulation/baseline/station-kpis", json=config)
    assert resp.status_code == 200, resp.text
    stations = resp.json()
    assert isinstance(stations, list)
    assert len(stations) > 0
    assert "station_id" in stations[0]
    print(f"    Returned {len(stations)} stations")

if __name__ == "__main__":
    try:
        # Wait for server to start
        for i in range(10):
            try:
                requests.get(f"{BASE_URL}/health")
                break
            except:
                time.sleep(1)
        else:
            print("Server did not start")
            sys.exit(1)
            
        test_health()
        test_list_baselines()
        test_run_baseline()
        test_create_and_run_scenario()
        test_separate_kpis()
        print("\nALL TESTS PASSED")
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def test_separate_kpis():
    print("Testing Separate KPI Endpoints...")
    res = requests.get(f"{BASE_URL}/configs/baselines/baseline_example.yaml")
    config = res.json()
    
    # 1. City KPIs with Validation
    print("  > Testing /simulation/baseline/city-kpis")
    resp = requests.post(f"{BASE_URL}/simulation/baseline/city-kpis", json=config)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "kpis" in data
    assert "validation" in data
    assert "avg_wait_time" in data["kpis"]
    # Check validation details
    passed = data["validation"]["passed"]
    print(f"    Validation Passed: {passed}")
    
    # 2. Station KPIs
    print("  > Testing /simulation/baseline/station-kpis")
    resp = requests.post(f"{BASE_URL}/simulation/baseline/station-kpis", json=config)
    assert resp.status_code == 200, resp.text
    stations = resp.json()
    assert isinstance(stations, list)
    assert len(stations) > 0
    assert "station_id" in stations[0]
    print(f"    Returned {len(stations)} stations")
