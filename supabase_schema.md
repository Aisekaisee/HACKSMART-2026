-- ============================================================
-- 1. CUSTOM TYPES
-- ============================================================
-- This creates an enum type so the role column can only ever
-- hold one of these three exact strings. Typos are impossible.
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'viewer');


-- ============================================================
-- 2. PROFILES TABLE
-- ============================================================
-- Every user who signs up gets a row here automatically
-- (the trigger at the bottom of this block handles that).
-- The "id" column matches auth.users exactly — one profile
-- per auth account, forever linked.
-- ============================================================

CREATE TABLE public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role         user_role   NOT NULL DEFAULT 'viewer',
  created_at   timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 3. PROJECTS TABLE
-- ============================================================
-- Each simulation project lives here.
-- baseline_config  → the full config (YAML converted to JSON) that
--                    the simulation engine reads
-- baseline_valid   → flipped to true once validation passes
-- baseline_kpis    → cached KPI results from the last baseline run
-- ============================================================

CREATE TABLE public.projects (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid        NOT NULL REFERENCES public.profiles(id),
  name            text        NOT NULL,
  description     text,
  baseline_config jsonb,
  baseline_valid  boolean     DEFAULT false,
  baseline_kpis   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 4. STATIONS TABLE
-- ============================================================
-- One row per physical swap station per project.
-- station_id   → business key your simulation engine uses
--                (e.g. "STATION_07"). NOT the UUID.
-- active       → soft delete. false = station is removed but
--                the row stays so history is preserved.
-- ============================================================

CREATE TABLE public.stations (
  id            uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid             NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  station_id    text             NOT NULL,
  name          text,
  latitude      double precision NOT NULL,
  longitude     double precision NOT NULL,
  chargers      integer          NOT NULL DEFAULT 5,
  bays          integer          NOT NULL DEFAULT 50,
  inventory_cap integer          NOT NULL DEFAULT 100,
  active        boolean          NOT NULL DEFAULT true,
  created_at    timestamptz      NOT NULL DEFAULT now(),
  updated_at    timestamptz      NOT NULL DEFAULT now(),

  UNIQUE (project_id, station_id)   -- same station_id can't appear twice in one project
);


-- ============================================================
-- 5. SCENARIOS TABLE
-- ============================================================
-- Each "what-if" experiment the user creates.
-- interventions   → JSON array of intervention objects. Each one
--                   has a "type" key and other params. The Python
--                   ScenarioApplicator reads this.
-- status          → lifecycle: draft → running → completed | failed
-- result_kpis     → the 6 KPIs + per_station breakdown after sim runs
-- result_timeline → array of snapshot frames for playback scrubber
-- ============================================================

CREATE TABLE public.scenarios (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text,
  interventions   jsonb       NOT NULL DEFAULT '[]',
  duration_hours  integer     NOT NULL DEFAULT 24,
  status          text        NOT NULL DEFAULT 'draft',
  result_kpis     jsonb,
  result_timeline jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 6. VALIDATION RESULTS TABLE
-- ============================================================
-- Stores the output of every time baseline validation is run.
-- Multiple rows can exist per project (one per validation run).
-- ============================================================

CREATE TABLE public.validation_results (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  r_squared     double precision,
  mape          double precision,
  rmse          double precision,
  per_station   jsonb,
  passed        boolean     NOT NULL DEFAULT false,
  validated_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 7. AUTO-CREATE PROFILE ON SIGNUP (trigger + function)
-- ============================================================
-- Whenever a new row appears in auth.users (i.e. someone signs
-- up), this trigger fires and inserts a matching row into
-- profiles automatically. The role defaults to 'viewer'.
-- An admin must manually change it later if needed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 8. ROW-LEVEL SECURITY (RLS)
-- ============================================================
-- RLS means every SELECT/INSERT/UPDATE/DELETE automatically
-- checks these policies. A user can only see/change their own
-- data — even if the API accidentally forgets to filter.
-- ============================================================

-- Enable RLS on every table
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;

-- ── Profiles ──
-- You can only read your own profile
CREATE POLICY "read own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- You can only update your own profile
CREATE POLICY "update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ── Projects ──
-- Full access to projects you own
CREATE POLICY "project owner full access"
  ON public.projects
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Anyone authenticated can read any project (for shared links)
CREATE POLICY "project read for all authenticated"
  ON public.projects
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── Stations ──
-- Full access only if the parent project belongs to you
CREATE POLICY "station owner access"
  ON public.stations
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

-- ── Scenarios ──
-- Same pattern as stations
CREATE POLICY "scenario owner access"
  ON public.scenarios
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

-- ── Validation Results ──
-- Same pattern
CREATE POLICY "validation owner access"
  ON public.validation_results
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 9. INDEXES (for query performance)
-- ============================================================

CREATE INDEX idx_stations_project       ON public.stations(project_id);
CREATE INDEX idx_scenarios_project      ON public.scenarios(project_id);
CREATE INDEX idx_scenarios_status       ON public.scenarios(status);
CREATE INDEX idx_validation_project     ON public.validation_results(project_id);