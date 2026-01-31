# Frontend Implementation — React + TypeScript + Tailwind v4 + shadcn/ui + Redux

> **Tech Stack:** React 18, TypeScript, Vite, TailwindCSS v4, shadcn/ui, Redux Toolkit, React Router v6, Leaflet
> **Approach:** Give Cursor high-level goals, let it implement the details

---

## SETUP — Initial Project Configuration

**Do this manually first:**

```bash
cd frontend

# Install dependencies
npm install react-router-dom @reduxjs/toolkit react-redux leaflet react-leaflet d3-delaunay

# Install TypeScript and types
npm install -D typescript @types/react @types/react-dom @types/leaflet

# Initialize shadcn/ui (it will prompt you for config)
npx shadcn@latest init

# When prompted, choose:
# - TypeScript: Yes
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
# - Tailwind config location: tailwind.config.js
# - Components directory: src/components/ui
# - Utils: src/lib/utils
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## STEP 1 — TypeScript Configuration & Project Structure

**Prompt for Cursor:**

> Set up a clean TypeScript React project structure. Update or create `tsconfig.json` with strict mode enabled and path aliases configured (`@/` pointing to `src/`).
>
> Create this folder structure:
> ```
> src/
> ├── components/
> │   ├── ui/           (shadcn components go here)
> │   ├── auth/
> │   ├── dashboard/
> │   ├── simulation/
> │   └── shared/
> ├── features/         (Redux slices)
> ├── hooks/
> ├── lib/              (utils, api client)
> ├── pages/
> ├── types/            (TypeScript interfaces)
> ├── App.tsx
> ├── main.tsx
> └── index.css
> ```
>
> Create `src/types/index.ts` with basic interfaces for: User, Project, Station, Scenario, KPI, SimulationResult. Use proper TypeScript typing.

---

## STEP 2 — Tailwind Dark Theme Setup

**Prompt for Cursor:**

> Configure Tailwind v4 for a dark-themed simulation dashboard. In the Tailwind config, set dark mode to 'class'. Extend the theme with custom colors for the app:
> - Primary: blue (keep default blue-500, blue-600, etc.)
> - Background: very dark navy (zinc-950, slate-950 range)
> - Card backgrounds: slightly lighter (slate-900)
> - Borders: slate-800
> - Text: slate-50 for primary, slate-400 for secondary
>
> In `src/index.css`, add the @tailwind directives and set `<html class="dark">` by default. Add custom styles for scrollbars to match the dark theme.

---

## STEP 3 — API Client with TypeScript

**Prompt for Cursor:**

> Create `src/lib/api.ts` — a typed API client using fetch.
>
> Export a `createApiClient(token: string | null)` function that returns an object with methods grouped by resource (auth, projects, stations, scenarios).
>
> Each method should be properly typed with request/response types from `src/types/`. Handle errors by parsing the JSON response and throwing typed errors. Include proper authorization headers with Bearer token.
>
> API routes:
> - POST /auth/login, /auth/signup, /auth/logout
> - GET/POST/PUT /projects (CRUD)
> - GET/POST/PUT/DELETE /projects/:id/stations
> - GET/POST /projects/:id/scenarios
> - POST /projects/:id/scenarios/:scenarioId/run

---

## STEP 4 — Redux Store Setup

**Prompt for Cursor:**

> Set up Redux Toolkit store in `src/store/index.ts`.
>
> Create slices in `src/features/`:
> - **authSlice.ts** — manages user, token, loading state. Actions: login, logout, setUser
> - **projectsSlice.ts** — manages projects list, current project. Actions: setProjects, setCurrentProject, addProject, updateProject
> - **stationsSlice.ts** — manages stations array. Actions: setStations, addStation, updateStation, removeStation
> - **scenariosSlice.ts** — manages scenarios, selected scenario, simulation results. Actions: setScenarios, addScenario, setSimulationResult
> - **uiSlice.ts** — manages UI state like modals open/closed, selected station, loading states
>
> Configure the store to persist auth state to sessionStorage using redux-persist (install if needed). Export typed hooks: useAppDispatch, useAppSelector.

---

## STEP 5 — Auth Hook with Redux

**Prompt for Cursor:**

> Create `src/hooks/useAuth.ts` that wraps Redux auth state.
>
> On mount, check sessionStorage for saved auth token and user data. If found, dispatch to Redux. Export functions:
> - `login(email, password)` — calls API, dispatches setUser, saves to sessionStorage
> - `signup(email, password)` — same flow
> - `logout()` — clears Redux state and sessionStorage
>
> Return: { user, token, isAuthenticated, loading, login, signup, logout }

---

## STEP 6 — Router with Protected Routes

**Prompt for Cursor:**

> Create `src/App.tsx` with React Router v6. Wrap everything in Redux Provider.
>
> Routes:
> - `/` — LandingPage (public)
> - `/login` — AuthPage (public)
> - `/dashboard` — ProjectsPage (protected)
> - `/project/:projectId` — SimulationPage (protected)
>
> Create a ProtectedRoute wrapper component that checks if user is authenticated. If not, redirect to /login. Show a loading screen while checking auth state on initial mount.

---

## STEP 7 — Install shadcn/ui Components

**Prompt for Cursor:**

> Install these shadcn/ui components using `npx shadcn@latest add`:
> - button
> - card
> - input
> - label
> - select
> - dialog (for modals)
> - tabs
> - slider
> - dropdown-menu
> - toast (Sonner)
> - badge
> - separator
>
> These will be used throughout the app. Make sure they're in `src/components/ui/`.

---

## STEP 8 — Landing Page

**Prompt for Cursor:**

> Create `src/pages/LandingPage.tsx`.
>
> Full-screen hero section with dark gradient background. Center aligned content:
> - Large heading: "Digital Twin Swap Station Simulator"
> - Subheading: "Optimize your EV battery swap network with real-time simulations"
> - Two shadcn Button components: "Sign In" and "Get Started" → both navigate to /login
>
> Use Tailwind for styling, add subtle animations (fade-in on mount). Make it visually striking but professional.

---

## STEP 9 — Auth Page (Login/Signup)

**Prompt for Cursor:**

> Create `src/pages/AuthPage.tsx`.
>
> Centered Card (shadcn) with toggle between login and signup modes. Form fields using shadcn Input and Label components. Show validation errors inline.
>
> Use the useAuth hook to call login or signup functions. Show loading state on Button during API call. On success, navigate to /dashboard. On error, display using shadcn toast (Sonner).
>
> Style with Tailwind dark theme. Make inputs stand out against the dark card background.

---

## STEP 10 — Projects Dashboard Page

**Prompt for Cursor:**

> Create `src/pages/ProjectsPage.tsx`.
>
> Layout:
> - Header: title "My Projects", user info (email + role badge), logout button
> - If role is admin or analyst: show "Create Project" form with shadcn Input and Button
> - Projects grid: responsive (3 cols desktop, 2 tablet, 1 mobile) using CSS Grid
>
> On mount: fetch projects from API, dispatch to Redux. Each project is a shadcn Card showing name, description, created date. Click navigates to /project/:id.
>
> Use shadcn Badge to show role. Use shadcn toast for feedback (project created, errors).

---

## STEP 11 — Simulation Page Layout (Shell)

**Prompt for Cursor:**

> Create `src/pages/SimulationPage.tsx`.
>
> Three-panel layout using CSS Grid:
> - Left sidebar (320px): controls
> - Center (flex-1): map
> - Right sidebar (360px): dashboard
> - Top header (60px): project name, back button, user info
>
> On mount: fetch project, stations, scenarios from API using the projectId param. Dispatch all to Redux.
>
> For now, render placeholder divs for each section with "Coming soon" text. We'll fill them in next steps.

---

## STEP 12 — Left Sidebar Component (Controls Shell)

**Prompt for Cursor:**

> Create `src/components/simulation/LeftSidebar.tsx`.
>
> Scrollable container with collapsible sections using shadcn Collapsible or Accordion:
> 1. **Station Management** — list of stations, three buttons: Add, Edit, Remove
> 2. **Interventions** — list of added interventions, "Add Intervention" dropdown menu
> 3. **Simulation Controls** — duration selector (shadcn Select), Run Simulation button
>
> Wire up Redux to display stations from state. Don't implement the full logic yet — just the UI shell with placeholder onClick handlers.

---

## STEP 13 — Station Modals (Add/Edit/Remove)

**Prompt for Cursor:**

> Create three modal components using shadcn Dialog in `src/components/simulation/`:
>
> **AddStationModal.tsx** — form with inputs for station_id, name, lat, lon, chargers, bays, inventory_cap. Use shadcn Input, Label, Button. On submit, call API to create station, dispatch to Redux, close modal.
>
> **EditStationModal.tsx** — same form but pre-filled with selected station data. Station ID is read-only.
>
> **RemoveStationModal.tsx** — shadcn Select to pick station, confirmation message, Remove button. Calls API delete, dispatches to Redux.
>
> Use TypeScript for all props and form state. Show loading state on buttons. Use toast for success/error feedback.

---

## STEP 14 — Wire Station Modals to Sidebar

**Prompt for Cursor:**

> Update `src/components/simulation/LeftSidebar.tsx` to actually open and use the station modals.
>
> Add local state for modal visibility (showAddModal, showEditModal, showRemoveModal). Wire the buttons in the Station Management section to toggle these.
>
> Import the modal components and render them at the bottom of the sidebar. Pass callbacks that dispatch Redux actions and update the stations list.

---

## STEP 15 — Intervention Form Component

**Prompt for Cursor:**

> Create `src/components/simulation/InterventionForm.tsx`.
>
> Dynamic form that changes based on intervention type (weather, event, replenishment). Use shadcn Select, Slider, Input components.
>
> **Weather:** condition dropdown, multiplier slider (0.5-2.0), start/end hour inputs
> **Event:** event name, lat/lon inputs, radius, multiplier slider, start/end hour
> **Replenishment:** policy dropdown, station selector, params textarea (JSON)
>
> On submit, return the intervention object to parent. Parent adds it to a local interventions array in state.

---

## STEP 16 — Add Interventions List to Sidebar

**Prompt for Cursor:**

> Update `src/components/simulation/LeftSidebar.tsx` Interventions section.
>
> Add local state for interventions array. Show the list as small Cards with type badge, description, and remove button (X icon).
>
> "Add Intervention" button opens a shadcn DropdownMenu with three options: Weather, Event, Replenishment. Selecting one shows the InterventionForm component inline or in a Dialog. When form submits, add to the interventions array.

---

## STEP 17 — Run Simulation Logic

**Prompt for Cursor:**

> Update the Simulation Controls section in `src/components/simulation/LeftSidebar.tsx`.
>
> Duration selector using shadcn Select (24h, 1 week, 1 month). Run Simulation button that:
> 1. Creates a scenario via API (passes interventions array and duration)
> 2. Runs the scenario via API
> 3. Dispatches result to Redux (scenariosSlice)
> 4. Shows success toast
>
> Show loading spinner on button while running. Disable all controls during simulation. Handle errors with toast notifications.

---

## STEP 18 — Leaflet Map Component

**Prompt for Cursor:**

> Create `src/components/simulation/SimulationMap.tsx`.
>
> Use react-leaflet: MapContainer, TileLayer, Marker, Popup, Circle. Import leaflet CSS. Center on Delhi (28.6, 77.2), zoom 11. Use dark tile layer (CartoDB Dark Matter).
>
> Get stations from Redux. Render a Marker for each station at [lat, lon]. Popup shows station details. onClick dispatches setSelectedStation to Redux (uiSlice).
>
> If there's an event location in state (from intervention form preview), render a Circle with radius. Color stations by utilization if simulation results exist (get from Redux scenariosSlice).
>
> Use TypeScript for all props and component typing.

---

## STEP 19 — Right Sidebar KPI Dashboard

**Prompt for Cursor:**

> Create `src/components/simulation/RightSidebar.tsx`.
>
> Two tabs using shadcn Tabs: Overview and Station Detail.
>
> **Overview tab:** 6 KPI cards in a 2-col grid. Each card is a shadcn Card showing title, large value, unit. If baseline KPIs exist, show comparison (baseline value, arrow, % change). Use conditional coloring (green = improvement, red = worse).
>
> Get KPIs from Redux (scenariosSlice.simulationResult.kpis). The 6 cards: Avg Wait Time, Lost Swaps, Idle Inventory %, Charger Utilization %, Operational Cost (with expandable breakdown), City Throughput.
>
> **Station Detail tab:** Show the selected station's metrics from kpis.per_station[station_id]. If no station selected, show "Click a station on the map".

---

## STEP 20 — KPI Card Component

**Prompt for Cursor:**

> Create `src/components/simulation/KPICard.tsx` — reusable component.
>
> Props: title, value, unit, baseline (optional), improvementDirection ("lower" | "higher"), breakdown (optional for cost).
>
> shadcn Card with title at top, large value in center, unit next to it. If baseline exists, show comparison: baseline value (muted), arrow icon, % change (colored). If breakdown exists, show expandable details section.
>
> Use Tailwind for layout and colors. Make it visually clear and easy to scan.

---

## STEP 21 — Comparison Table

**Prompt for Cursor:**

> Add a Baseline vs Scenario comparison table below the KPI cards in RightSidebar.tsx Overview tab.
>
> Only show if both currentKpis and baselineKpis exist in Redux. Use a simple HTML table (or shadcn Table component if you added it).
>
> 4 columns: Metric | Baseline | Scenario | Change. One row per KPI. Change column shows colored delta with arrow. Style with Tailwind, alternating row backgrounds, clean typography.

---

## STEP 22 — Playback Controls (Timeline Scrubber)

**Prompt for Cursor:**

> Add playback controls to the Simulation Controls section in LeftSidebar.tsx. Only show after a simulation completes.
>
> Use shadcn Slider for timeline scrubber (min=0, max=timeline.length-1). Speed selector with shadcn Buttons (1x, 2x, 5x, 10x).
>
> On scrubber change, dispatch setCurrentTimelineFrame to Redux. Map and dashboard components should read this frame index and update displayed data accordingly (station colors on map, KPI values in dashboard).

---

## STEP 23 — Loading States & Error Handling

**Prompt for Cursor:**

> Add proper loading and error UI across all components.
>
> Create `src/components/shared/LoadingSpinner.tsx` — centered spinner using Tailwind animations or lucide-react icons.
>
> In ProjectsPage, SimulationPage: show loading spinner while fetching data on mount. In modals: disable buttons and show inline spinner during API calls. Use shadcn toast (Sonner) for all error messages.
>
> Add try-catch blocks around all API calls. Display user-friendly error messages, not raw error objects.

---

## STEP 24 — Redux Persistence

**Prompt for Cursor:**

> Configure redux-persist to save auth state to sessionStorage.
>
> Wrap the auth slice with persistReducer. Update store config to use persistStore. In App.tsx, wrap the app with PersistGate from redux-persist. This ensures the user stays logged in on page refresh.
>
> Don't persist projects, stations, scenarios slices — only auth.

---

## STEP 25 — Voronoi Overlay (Optional)

**Prompt for Cursor:**

> In SimulationMap.tsx, add an optional Voronoi diagram overlay.
>
> Add a toggle button (shadcn Switch or Checkbox) in map controls. When enabled, use d3-delaunay to compute Voronoi cells from station coordinates. Render as GeoJSON layer on the map with semi-transparent fills and thin borders.
>
> Color each cell to match the station's marker color. Only show when toggle is on.

---

## STEP 26 — Responsive Design

**Prompt for Cursor:**

> Make the app fully responsive using Tailwind breakpoints (sm, md, lg, xl).
>
> SimulationPage: stack sidebars vertically on tablets and below. On mobile, hide sidebars by default and show hamburger menu to toggle them. ProjectsPage grid: 1 col mobile, 2 cols tablet, 3 cols desktop. All modals: full-screen on mobile, centered card on desktop.

---

## STEP 27 — Keyboard Shortcuts

**Prompt for Cursor:**

> Create `src/hooks/useKeyboardShortcuts.ts` that listens for keydown events.
>
> Add shortcuts: R to run simulation, Escape to close modals, Enter to submit forms. Show a help dialog (triggered by ? key) that lists all shortcuts using shadcn Dialog.

---

## STEP 28 — Final Polish

**Prompt for Cursor:**

> Polish pass across the entire app:
> - Consistent spacing (use Tailwind's spacing scale)
> - Smooth transitions (transition-all duration-200)
> - Hover states on all interactive elements
> - Focus rings on all inputs and buttons
> - Loading skeletons instead of blank screens
> - Proper TypeScript types everywhere (no `any` types)
> - Accessibility: aria-labels, keyboard navigation, focus management
> - Toast notifications for all user actions
>
> Test the full flow: signup → create project → add stations → add interventions → run simulation → view results.

---

## You're Done! 🎉

**Start the dev server:**
```bash
npm run dev
```

**Make sure:**
- FastAPI backend is running on port 8000 with CORS enabled for localhost:5173
- The `.env` file exists with VITE_API_BASE_URL
- Tailwind is compiling (you should see styled components, not unstyled HTML)

**Common issues:**
- If Tailwind isn't working: check that `@tailwind` directives are in index.css
- If shadcn components look wrong: make sure you ran `npx shadcn@latest init`
- If TypeScript errors: make sure tsconfig.json has path aliases configured
- If Redux isn't persisting: check that PersistGate is wrapping the app