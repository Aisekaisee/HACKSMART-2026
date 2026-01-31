# Digital Twin — Step-by-Step Implementation Plan
## (Plain English instructions for AI coding assistants)

> **How to use this:** Each numbered step is one task you give to Cursor or a similar tool.
> Copy the step exactly. The AI will read your codebase and know what to change.
> Follow the order strictly — later steps depend on earlier ones.

---

---

## PART A — SIMULATION ENGINE (do this first, no frontend or DB involved)

---

### Step A1 — Make simulation duration configurable

**Give this to Cursor:**

> In `simulation/engine.py`, the simulation currently runs for a fixed duration (probably hardcoded somewhere as 24 hours or a fixed number of minutes). Make it so the engine reads a `duration_hours` key from whatever config dictionary it already receives. If that key is missing, default to 24. Convert it to total minutes internally and use that as the loop boundary. Don't change anything else about how the engine works — just make the loop length dynamic based on this one config value.

---

### Step A2 — Create a timeline recorder module

**Give this to Cursor:**

> Create a new file `simulation/timeline_recorder.py`. This module's job is simple: during a simulation run, it takes periodic snapshots of every station's state so the frontend can later replay the simulation like a video scrubber.
>
> It needs a class called `TimelineRecorder` that:
> - Takes an `interval_min` parameter at init (how often to snapshot, in simulation-minutes).
> - Has a method called `tick` that the engine will call every loop iteration. It receives the current simulation time in minutes and the stations dictionary. It should only actually record a snapshot when the current time crosses the next interval threshold — not every single tick.
> - Each snapshot is a list (one entry per station) containing: station_id, the current timestamp in minutes, queue_length, batteries_available, chargers_in_use, and cumulative swaps_completed and swaps_lost.
> - Has a method called `to_serializable` that converts all recorded frames into a plain list of dicts (no custom classes) so it can be turned into JSON later.
>
> The interval should be chosen based on duration: 15 min intervals for 24-hour sims, 60 min for weekly, 240 min for monthly. But the caller decides that — this class just accepts whatever interval it's given.

---

### Step A3 — Wire the timeline recorder into the engine

**Give this to Cursor:**

> In `simulation/engine.py`:
> 1. Import `TimelineRecorder` from `simulation.timeline_recorder`.
> 2. Before the main simulation loop starts, calculate the right interval based on `duration_hours` (15 if ≤24h, 60 if ≤168h, 240 otherwise), then instantiate `TimelineRecorder(interval_min=that_value)`.
> 3. Inside the main loop, after you update station states for the current tick, call `recorder.tick(current_time_in_minutes, self.stations)`.
> 4. After the loop finishes, when you build the return dictionary, add a new key `"timeline"` whose value is `recorder.to_serializable()`.
>
> Don't change any existing logic. Just add these three hooks into the existing flow.

---

### Step A4 — Add geo-distance helper to demand module

**Give this to Cursor:**

> In `simulation/demand.py`, add a static method (or a standalone helper function) called `haversine` that takes two lat/lon pairs and returns the distance between them in kilometers. Use the standard haversine formula with Earth radius = 6371 km. This will be used later when events (concerts, sports) need to affect only stations within a certain radius. Don't change any existing demand logic — just add this utility function.

---

### Step A5 — Expand the scenario applicator with new intervention types

**Give this to Cursor:**

> In `scenarios/applicator.py`, look at how interventions are currently dispatched (probably an if/elif chain or a dictionary of handlers keyed by intervention type). Add support for three new intervention types. Each intervention is a dictionary with a `"type"` key.
>
> **Type 1: `"weather_demand"`**
> This represents a weather condition that multiplies demand globally for a time window. The intervention dict will have: `multiplier` (a float like 1.3), `start_hour` (0-based hour in the sim), and `end_hour`. Store this as a "demand modifier" somewhere the demand module can see it — either on the applicator itself or passed through config. The demand module will check these modifiers later.
>
> **Type 2: `"event_demand"`**
> This is a location-based event like a concert. The intervention dict will have: `latitude`, `longitude`, `radius_km` (how far from the event location to affect), `multiplier`, `start_hour`, and `end_hour`. Same idea as weather but only stations within `radius_km` of the event coordinates get the multiplier. Store it as a demand modifier with a `"scope": "geo"` flag so the demand module knows to do a distance check.
>
> **Type 3: `"replenishment_policy"`**
> This changes how a station restocks batteries. The intervention dict will have: `policy` (a string like `"base_stock"`, `"s_s"`, or `"jit"`), `params` (a dict of policy-specific parameters), and optionally `station_id`. If `station_id` is provided, only change that one station. If it's null/missing, change all stations. Just set the policy and params on the station object(s) — the station's existing logic should handle the rest.
>
> Don't remove or change how existing intervention types (add_station, remove_station, modify_station) work.

---

### Step A6 — Make the demand module check demand modifiers

**Give this to Cursor:**

> In `simulation/demand.py`, wherever the base demand for a station at a given hour is calculated, add a post-processing step that checks for active demand modifiers. The applicator (from the previous step) will have stored a list of modifier dicts somewhere accessible.
>
> The logic is: after you calculate the base demand number, loop through all modifiers. For each one, check if the current hour falls within its start_hour to end_hour window. If it does, check the scope: if scope is `"global"`, multiply demand by the modifier's multiplier. If scope is `"geo"`, first calculate the haversine distance from the station's coordinates to the modifier's event coordinates — only apply the multiplier if the station is within the modifier's radius_km. Multiply all applicable modifiers together (they stack). Return base_demand × total_multiplier.
>
> You'll need to pass station coordinates (lat/lon) into whatever function calculates demand, if it doesn't already have them.

---

### Step A7 — Make the KPI calculator return a cost breakdown

**Give this to Cursor:**

> In `kpis/cost_model.py`, look at how operational cost is currently calculated. It probably returns a single total number. Change it so it returns a dictionary instead with two keys: `"total"` (the same number it already calculates) and `"breakdown"` (a dict with individual line items). The breakdown should have at minimum these keys: `"charger"` (charger operation cost), `"inventory"` (cost of holding idle batteries), `"labor"` (maintenance/labor), and `"opportunity"` (revenue lost due to lost swaps — calculate this as lost_swaps × some per-swap revenue value, you can default the revenue to a reasonable number if it's not already in config).
>
> In `kpis/calculator.py`, make sure the top-level KPI dictionary it returns includes these exact keys (the frontend will look for them by name):
> - `avg_wait_time_min` (float, in minutes)
> - `lost_swaps` (integer count)
> - `lost_swaps_pct` (float, percentage of total demand)
> - `idle_inventory_pct` (float, network-wide average)
> - `charger_utilization_pct` (float, network-wide average)
> - `city_throughput_per_hour` (float)
> - `operational_cost` (the breakdown dict from cost_model)
> - `per_station` (a dict keyed by station_id, each value containing that station's individual wait time, lost swaps, idle inventory, and charger utilization)
>
> Rename or restructure existing keys if needed to match this exact shape. The frontend depends on these exact names.

---

### Step A8 — Make the baseline validator return the full validation object

**Give this to Cursor:**

> In `validation/baseline_validator.py`, make sure the validation method returns a dictionary with exactly these keys:
> - `r_squared` (float)
> - `mape` (float, on a 0–100 scale, not 0–1)
> - `rmse` (float)
> - `passed` (boolean — true if MAPE is below 10.0)
> - `per_station` (a dict keyed by station_id, with each station's individual accuracy metrics)
> - `thresholds` (a dict echoing back the acceptance thresholds: `mape_max: 10.0`, `wait_time_tolerance_pct: 15.0`, `lost_swaps_tolerance_pct: 20.0`)
>
> If any of these keys are missing from what it currently returns, add them. The `passed` flag is the single source of truth the frontend uses to show a green or red validation badge.

---

---

## PART B — SUPABASE DATABASE SETUP (do this manually, not in code)

---

### Step B1 — Create Supabase project and run schema

**Do this yourself in the Supabase dashboard (not in Cursor):**

> 1. Go to supabase.com, create a new project (or use existing).
> 2. Go to the SQL Editor tab.
> 3. Run the following SQL — this creates all tables, a trigger that auto-creates a user profile on signup, row-level security policies, and indexes. Run it as one block.
>
> Tables created:
> - `profiles` — stores user display name and role (admin/analyst/viewer). Has a trigger so a row is auto-created whenever someone signs up via Supabase Auth.
> - `projects` — each simulation project. Stores the baseline config as JSON, a flag for whether baseline is validated, and cached baseline KPIs.
> - `stations` — one row per station per project. Stores coordinates, charger count, bay count, inventory cap, and active flag.
> - `scenarios` — one row per scenario per project. Stores the list of interventions as a JSON array, duration, status (draft/running/completed/failed), and result KPIs + timeline data after a sim runs.
> - `validation_results` — stores the output of each baseline validation run.
>
> RLS policies: owners can fully CRUD their own projects and child rows. Everyone can read projects (for sharing links later). Profiles can only be read/updated by the owner.
>
> 4. After running the SQL, go to Settings > API and copy these four values into a `.env` file at your project root:
>    - SUPABASE_URL
>    - SUPABASE_ANON_KEY
>    - SUPABASE_SERVICE_ROLE_KEY
>    - SUPABASE_JWT_SECRET (under "Secrets" section)
> 5. Go to Authentication > Settings. Make sure email confirmation is turned OFF for development (so signup immediately returns a session).

---

---

## PART C — BACKEND / API (after simulation engine changes are done)

---

### Step C1 — Add Supabase dependencies

**Give this to Cursor:**

> Add `supabase>=2.0.0` and `python-jose[cryptography]>=3.3.0` to your `requirements.txt`. Don't change anything else in that file.

---

### Step C2 — Create the Supabase client module

**Give this to Cursor:**

> Create a new file `api/supabase_client.py`. It should expose a single function called `get_supabase()` that returns a Supabase client instance. It reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from environment variables (using `os.environ`). Use a module-level variable to cache the client so it's only created once. Import `create_client` and `Client` from the `supabase` package.

---

### Step C3 — Create the auth dependency module

**Give this to Cursor:**

> Create a new file `api/auth.py`. This file provides two FastAPI dependencies that routes will use to protect endpoints.
>
> **First dependency: `get_current_user`**
> - It's a FastAPI dependency that reads the Bearer token from the Authorization header (use FastAPI's `OAuth2PasswordBearer` for this).
> - Decode the JWT using the `SUPABASE_JWT_SECRET` env variable and the `jose` library. Extract the `sub` claim (that's the user's UUID).
> - Query the `profiles` table via Supabase to get that user's role.
> - Return a simple dict: `{"user_id": <uuid>, "role": <role string>}`.
> - If the token is missing, invalid, or the profile doesn't exist, raise an appropriate HTTP error (401 or 404).
>
> **Second dependency factory: `require_role`**
> - A function that takes one or more role strings (like `"admin"`, `"analyst"`) and returns a new dependency.
> - That returned dependency internally calls `get_current_user`, then checks if the user's role is in the allowed list. If not, raise a 403 error. If yes, return the user dict.
> - Usage in routes will look like: `Depends(require_role("admin", "analyst"))` — meaning only admins and analysts can access that endpoint.

---

### Step C4 — Rewrite the Pydantic models

**Give this to Cursor:**

> In `api/models.py`, replace or extend the existing models with the following. Keep any models that are still used elsewhere, but add all of these:
>
> **Auth models:** `SignUpRequest` (email + password), `LoginRequest` (email + password), `TokenResponse` (access_token, refresh_token, user_id, role).
>
> **Project models:** `ProjectCreate` (name, optional description), `ProjectUpdate` (all fields optional — name, description, baseline_config as a dict), `ProjectOut` (id, name, description, baseline_valid bool, baseline_kpis optional dict, created_at, updated_at).
>
> **Station models:** `StationCreate` (station_id as a business-key string like "STATION_07", optional name, latitude, longitude, chargers with default 5 and max 50, bays with default 50 and max 500, inventory_cap with default 100), `StationUpdate` (all fields optional), `StationOut` (all station fields including the UUID id and active flag).
>
> **Scenario models:** `InterventionItem` (type string + params dict), `ScenarioCreate` (name, optional description, list of InterventionItems, duration_hours defaulting to 24 with max 744), `ScenarioOut` (id, name, description, status, duration_hours, result_kpis optional, created_at, updated_at).
>
> **Simulation models:** `SimulationRunResponse` (scenario_id, status, optional kpis dict, optional timeline list, optional error string).
>
> **Validation model:** `BaselineValidationResponse` (r_squared, mape, rmse, passed bool, optional per_station dict, optional thresholds dict).

---

### Step C5 — Rewrite the services layer

**Give this to Cursor:**

> In `api/services.py`, replace or extend the existing services with these functions. Each one talks to Supabase (import `get_supabase` from `api.supabase_client`) and does simple CRUD:
>
> **Project services:** `create_project(owner_id, data)` — inserts a row. `get_projects(owner_id)` — returns all projects for that user, sorted by created_at descending. `get_project(project_id)` — returns one project or None. `update_project(project_id, data)` — updates only the fields that are not None in the data object.
>
> **Station services:** `create_station(project_id, data)` — inserts a station row linked to the project. `get_stations(project_id)` — returns all stations for that project. `update_station(station_id, data)` — updates only non-None fields. `delete_station(station_id)` — deletes the row, returns True if something was deleted.
>
> **Scenario services:** `create_scenario(project_id, data)` — inserts a scenario, converting the intervention list to plain dicts before inserting. `get_scenarios(project_id)` — returns all scenarios sorted by created_at descending. `get_scenario(scenario_id)` — returns one or None. `update_scenario_result(scenario_id, kpis, timeline, status)` — updates the result fields after a sim runs.
>
> **Simulation runner:** `run_simulation(scenario, project, stations)` — this is the bridge between the API and your Python simulation engine. It: (1) takes the project's baseline_config as the starting config, (2) sets duration_hours from the scenario, (3) injects the current station list into the config, (4) runs each intervention through the ScenarioApplicator, (5) creates a SimulationEngine with the final config and calls its run method, (6) returns the raw result dict (which now contains both "kpis" and "timeline" keys thanks to Part A).

---

### Step C6 — Rewrite the API routes

**Give this to Cursor:**

> In `api/main.py`, keep your existing FastAPI app instance and CORS middleware. Replace or extend the routes with the following groups. Every route that modifies data requires `Depends(require_role("admin", "analyst"))`. Read-only routes just need `Depends(get_current_user)`.
>
> **Auth routes:**
> - `POST /auth/signup` — calls Supabase `auth.sign_up`, returns the session tokens and the user's role (fetched from profiles). If no session is returned (email confirmation is on), return a 400 telling the user.
> - `POST /auth/login` — calls Supabase `auth.sign_in_with_password`, returns tokens and role.
> - `POST /auth/logout` — just returns success (token-based auth is stateless, the client discards the token).
>
> **Project routes:**
> - `POST /projects` — creates a project (admin/analyst only).
> - `GET /projects` — lists current user's projects.
> - `GET /projects/{project_id}` — gets one project.
> - `PUT /projects/{project_id}` — updates a project (admin/analyst only).
>
> **Station routes (all nested under a project):**
> - `POST /projects/{project_id}/stations` — adds a station.
> - `GET /projects/{project_id}/stations` — lists all stations in that project.
> - `PUT /projects/{project_id}/stations/{station_id}` — updates a station.
> - `DELETE /projects/{project_id}/stations/{station_id}` — removes a station.
>
> **Scenario routes:**
> - `POST /projects/{project_id}/scenarios` — creates a scenario.
> - `GET /projects/{project_id}/scenarios` — lists scenarios.
> - `GET /projects/{project_id}/scenarios/{scenario_id}` — gets one scenario (including result_kpis and result_timeline if the sim has run).
>
> **Simulation routes:**
> - `POST /projects/{project_id}/scenarios/{scenario_id}/run` — fetches the project, scenario, and stations from Supabase, calls the simulation runner from services, saves the results back to the scenario row, and returns the full SimulationRunResponse (including timeline). If the sim throws an exception, catch it, mark the scenario as "failed", and return the error message.
>
> **Baseline routes:**
> - `POST /projects/{project_id}/baseline-config` — receives a JSON body and saves it as the project's baseline_config.
> - `POST /projects/{project_id}/validate-baseline` — runs the baseline simulation (no interventions), runs the validator, saves the validation_results row, updates the project's baseline_valid flag, and returns the validation response.

---

---

## PART D — FRONTEND (do this last, after backend is working)

---

### Step D1 — Install frontend dependencies

**Give this to Cursor:**

> Inside the `frontend/` directory, run: `npm install @supabase/supabase-js react-leaflet leaflet d3-delaunay d3-geo`. Then create a `frontend/.env` file with three variables: `VITE_SUPABASE_URL` (your Supabase URL), `VITE_SUPABASE_ANON_KEY` (your anon key), and `VITE_API_BASE_URL` set to `http://localhost:8000`.

---

### Step D2 — Create the Supabase client and auth context

**Give this to Cursor:**

> Create `frontend/src/api/supabase.js` — it imports `createClient` from `@supabase/supabase-js` and exports a single client instance, using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `import.meta.env`.
>
> Create `frontend/src/hooks/useAuth.js` — a React context + provider pattern. The provider: (1) on mount, checks if there's an existing Supabase session and sets user state if so, (2) subscribes to `onAuthStateChange` so it reacts to login/logout in real time, (3) whenever a user is set, fetches their role from the `profiles` table and stores it in state. It exposes: `user`, `role`, `loading`, `login(email, password)`, `signup(email, password)`, and `logout()`. The `login` and `signup` functions just call the corresponding Supabase auth methods and throw on error.

---

### Step D3 — Create the API client wrapper

**Give this to Cursor:**

> Create `frontend/src/api/client.js`. This is a thin wrapper around `fetch` that automatically attaches the current Supabase access token as a Bearer header and prepends the API base URL. It should have one internal `request(method, path, body)` function. On non-OK responses, parse the JSON error body and throw an Error with the detail message.
>
> Then export an `api` object with these nested groups (each method calls `request` with the right HTTP method and URL):
> - `api.projects` — create, list, get, update
> - `api.stations` — create, list, update, remove (delete)
> - `api.scenarios` — create, list, get, run
> - `api.baseline` — uploadConfig, validate
>
> Match the URL paths exactly to what the backend routes defined in Step C6.

---

### Step D4 — Rewrite App.jsx as a simple router

**Give this to Cursor:**

> Rewrite `frontend/src/App.jsx`. Wrap everything in the `AuthProvider` from useAuth. Inside, create a simple component that does routing based on state (no react-router needed): if the user is not logged in, show `LoginPage`. If logged in but no project is selected, show `ProjectsPage`. If a project is selected, show `SimulationPage`. Pass `onSelect` / `onBack` callbacks to switch between pages. Show a simple loading indicator while the auth state is being determined on first mount.

---

### Step D5 — Build the Login page

**Give this to Cursor:**

> Create `frontend/src/components/LoginPage.jsx`. A centered dark-themed card with email and password inputs. Two modes: login and signup, toggled by a link at the bottom. On submit, call either `login` or `signup` from the auth context. Show inline error messages if they fail. Show a loading state on the button while the request is in flight. The styling should be dark (dark navy background, darker card, light text) to match a professional simulation tool aesthetic.

---

### Step D6 — Build the Projects page

**Give this to Cursor:**

> Create `frontend/src/components/ProjectsPage.jsx`. On mount, fetch all projects via `api.projects.list()`. Display them as a grid of cards. Each card shows: project name, description (or "No description"), a colored badge showing whether the baseline is validated (green dot + "Valid" or amber dot + "Not validated"), and the creation date. Clicking a card calls the `onSelect` prop with that project object.
>
> At the top, if the user's role is admin or analyst, show an input + button to create a new project (just a name for now). After creating, optimistically add it to the list.
>
> Show a logout button in the top-right corner. Show the user's current role next to their name.

---

### Step D7 — Build the Simulation page shell (three-panel layout)

**Give this to Cursor:**

> Create `frontend/src/components/SimulationPage.jsx`. This is the main page after a project is selected. It should have a three-panel layout:
> - **Left sidebar** (around 300px wide) — will contain controls (built in later steps). For now just show the project name at the top, a back button to go to projects, and placeholder text saying "Controls go here".
> - **Center** — the map area. For now just a solid dark background with placeholder text "Map goes here".
> - **Right sidebar** (around 320px wide) — the KPI dashboard. For now placeholder text "Dashboard goes here".
>
> On mount, fetch the station list and scenario list for the current project via the API and store them in React state. Pass stations down to the map and sidebar components as props.
>
> The overall background should be very dark (near black). Sidebars slightly lighter dark. Use CSS flexbox or grid for the layout. Make the center panel take all remaining width.

---

### Step D8 — Build the interactive map with station markers

**Give this to Cursor:**

> Create `frontend/src/components/SimulationMap.jsx`. Use `react-leaflet` (MapContainer, TileLayer, Marker, Popup, useMap). Center the map on Delhi (28.6, 77.2) with zoom 11. Use a dark tile layer (like CartoDB DarkMatter: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`).
>
> Receive the `stations` array as a prop. For each station that is active, render a Marker at its lat/lon. Color-code markers by utilization: if the station has simulation results available, use green for <60% utilization, yellow for 60–85%, red for >85%. If no sim has run yet, use a neutral blue.
>
> On clicking a marker, show a Leaflet Popup with: station name, station_id, charger count, bay count, inventory capacity, and active status.
>
> Also receive an `onStationClick` callback prop. When a marker is clicked, call it with that station's data so the right sidebar can show detailed info.
>
> If there's an `eventLocation` prop (an object with lat, lon, radius_km, and a label), render a circle on the map at that location with the given radius and a semi-transparent colored fill, plus a text label. This is for previewing where an event intervention will affect.

---

### Step D9 — Build the left sidebar controls

**Give this to Cursor:**

> Create `frontend/src/components/LeftSidebar.jsx`. This is a scrollable panel. Build it in sections, each collapsible (click the section header to expand/collapse). Style all inputs with dark backgrounds and light text to match the overall theme.
>
> **Section 1: Baseline Config**
> A dropdown (select element) with three options: "Default (from backend)", "My saved config", and "Upload file". When "Upload file" is selected, show a file input that accepts .json and .yaml/.yml files. On file select, read the file, parse it (JSON with JSON.parse, YAML — for simplicity just accept JSON for now), and call `api.baseline.uploadConfig(projectId, parsedConfig)`. Show a success/error message after upload. Show a "Validate Baseline" button that calls `api.baseline.validate(projectId)` and displays the result (passed/failed with MAPE value) in a small card below the button.
>
> **Section 2: Station Management**
> Show the current station list (just names and IDs). Three buttons: "Add Station", "Modify Station", "Remove Station".
> - Add: opens a small inline form (or modal) with fields for station_id, name, lat, lon, chargers, bays, inventory_cap. On submit calls `api.stations.create`. On success, update the local station list.
> - Modify: a dropdown to pick which station to edit, then the same fields pre-filled with current values. On submit calls `api.stations.update`.
> - Remove: a dropdown to pick which station, a confirmation message ("This will remove STATION_X — are you sure?"), and on confirm calls `api.stations.remove`.
>
> **Section 3: Interventions**
> A list of interventions that have been added to the current scenario (starts empty). An "Add Intervention" button that opens a dropdown to select the type:
> - Weather: shows a dropdown for condition (rainy/extreme_heat/sunny), a multiplier slider (0.5 to 2.0), and start/end hour pickers.
> - Event: shows inputs for event name, lat, lon, radius in km, multiplier slider, start/end hour pickers. When lat/lon are filled in, update the map's `eventLocation` prop so the circle preview appears.
> - Replenishment Policy: shows a dropdown for policy type and a station selector (or "All stations").
> Each added intervention appears in the list with a remove (X) button.
>
> **Section 4: Simulation Controls**
> A dropdown for duration: 24 hours, 1 week, 1 month. A large "Run Simulation" button. When clicked: create a scenario via `api.scenarios.create` with the current interventions and duration, then immediately call `api.scenarios.run` on it. Show a loading spinner while it's running. On completion, store the result KPIs and timeline in component state so the dashboard and playback can use them.
>
> Below the run button (only visible after a sim has completed): a playback speed selector (1x, 2x, 5x, 10x) and a timeline scrubber (a range input from 0 to the max timestamp in the timeline data). As the scrubber moves, update which frame of timeline data is "current" — pass the current frame down to the map and dashboard so they can update in real time.

---

### Step D10 — Build the right sidebar KPI dashboard

**Give this to Cursor:**

> Create `frontend/src/components/RightSidebar.jsx`. It has two modes: "Overview" (network-wide KPIs) and "Station Detail" (info for a single selected station). Toggle between them with tabs at the top.
>
> **Overview tab — show 6 KPI cards in a 2-column grid:**
> Each card has a title, a large number, and if a scenario has been run, a comparison to baseline: show the baseline value in gray, an arrow (up or down), and the percentage change. Color the arrow green if the change is an improvement (lower wait time, fewer lost swaps, higher throughput, higher utilization) and red if it's worse.
> The 6 cards are: Average Wait Time (minutes), Lost Swaps (count + percentage), Idle Inventory (%), Charger Utilization (%), Operational Cost (total, with a small expandable breakdown showing charger/inventory/labor/opportunity line items), City Throughput (swaps/hour).
>
> **Station Detail tab — show when a station is clicked on the map:**
> Display: station name and ID at the top, then the same 4 metrics (wait time, lost swaps, idle inventory, charger utilization) but for just that station. Pull these from the `per_station` key in the KPI results. If no sim has run, show dashes or "No data".
>
> **Baseline vs Scenario table (below the cards, always visible after a sim runs):**
> A simple HTML table with columns: Metric, Baseline, Scenario, Change. One row per KPI. The Change column shows the delta with a colored arrow. Style it cleanly with alternating row colors on the dark background.
>
> **Validation panel (below the table, visible after baseline validation has been run):**
> Show R², MAPE, and RMSE values. A checklist of pass/fail criteria (MAPE < 10%, etc.). An overall "Baseline Valid ✓" or "Baseline Invalid ✗" badge.

---

### Step D11 — Add the Voronoi diagram overlay (optional, do last)

**Give this to Cursor:**

> In `frontend/src/components/SimulationMap.jsx`, add an optional Voronoi overlay. This should only render if a toggle switch (passed as a prop or controlled by local state) is turned on.
>
> Use the `d3-delaunay` library to compute the Voronoi diagram from the active station coordinates. Use `d3-geo` or simple Leaflet GeoJSON to render the Voronoi cells as polygons on the map. Each cell should be filled with a very low opacity color (like 10–15% opacity) that matches the station marker's color. Add a thin border (1px) in a slightly brighter shade of the same color.
>
> To do this: (1) collect all active station [lon, lat] points into an array, (2) create a `Delaunay.from(points)` instance, (3) call `.voronoi()` on it with a bounding box covering the visible map area, (4) iterate over the cells and convert each polygon's coordinates into a GeoJSON Polygon feature, (5) render all features as a single GeoJSON layer on the map.
>
> Add a toggle button in the map controls area (top-right of the map) labeled "Coverage Zones" that shows/hides this layer.

---

---

## QUICK REFERENCE — What each feature maps to

| Your feature number | Implementation steps |
|---|---|
| 1 — Baseline config dropdown | D9 Section 1 |
| 2 — Add station | C6 station routes + D9 Section 2 |
| 3 — Remove station | C6 station routes + D9 Section 2 |
| 4 — Modify station | C6 station routes + D9 Section 2 |
| 5 — Weather/festival multiplier | A5 + A6 + D9 Section 3 |
| 6 — Events on map | A5 + A6 + D8 (circle preview) + D9 Section 3 |
| 7 — Simulation duration | A3 + D9 Section 4 |
| 8 — Playback + speed control | A2 + A3 + D9 Section 4 |
| 9 — Voronoi + animation | D11 (Voronoi) + D9 scrubber updates map |
| 10 — Station detail dashboard | D10 Station Detail tab |
| 11 — Baseline vs scenario table | D10 comparison table |
| 12 — Validation (R², MAPE) | A8 + C6 validate route + D10 validation panel |
| 13 — Finance / costing | A7 + D10 cost card |
| 14 — Role-based access | B1 (DB) + C3 (auth dep) + C6 (route guards) + D6 (UI role badge) |
