# Supabase Setup & Implementation — Complete Guide

---

## PART 1 — Create Your Supabase Project

1. Go to **https://supabase.com**
2. Click **"Start your free project"**
3. Sign in with GitHub or email
4. Click **"New Project"**
5. Fill in:
   - **Name:** `digital-twin-swap` (or anything you want)
   - **Database Password:** pick a strong password and **save it somewhere** — you will need it later
   - **Region:** pick the one closest to you (Asia South for India)
6. Click **"Create Project"**
7. Wait 1–2 minutes for it to initialize. You will land on the project dashboard.

---

## PART 2 — Run the Database Schema

This is the big one. You need to run SQL that creates all your tables, triggers, security policies, and indexes in one go.

**How to get to the SQL editor:**

1. On the left sidebar of your Supabase dashboard, click the icon that looks like a database/table (it says **"SQL Editor"** on hover)
2. You will see a blank editor with a green **"Run"** button (or a play icon) in the top right

**Now paste this entire block into the editor and run it:**

```sql
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
```

**After pasting:**
1. Click the green **Run** button (top right)
2. You should see a success message at the bottom saying all statements executed
3. If any statement fails, it will show the exact line and error — most likely a duplicate table if you run it twice. That is fine, just means it already exists.

**Verify it worked:**
1. On the left sidebar click the **Table Editor** icon (looks like a grid)
2. You should see these 6 tables listed: `profiles`, `projects`, `stations`, `scenarios`, `validation_results`
3. Click on `profiles` — you should see the columns: id, display_name, role, created_at
4. Click on `stations` — verify you see: id, project_id, station_id, name, latitude, longitude, chargers, bays, inventory_cap, active, created_at, updated_at

---

## PART 3 — Configure Authentication

1. On the left sidebar, click **Authentication** (the lock icon)
2. Click **Settings** (or **Configuration** depending on the version)
3. Find **Site URL** — set it to:
   ```
   http://localhost:5173
   ```
   This is your Vite dev server. Supabase redirects back here after email verification. If you skip this step, login will silently fail.

4. Find **Email Confirmations** — there will be a toggle or checkbox. **Turn it OFF** for development. This means signup immediately returns a session with tokens instead of asking the user to verify their email first. You can turn it back on before production.

5. Click **Save** (if there is a save button — some versions auto-save).

---

## PART 4 — Copy the Environment Variables

You need four values from the Supabase dashboard. Here is exactly where to find each one:

**Go to Settings > API** (gear icon on left sidebar, then "API" in the top tabs)

You will see a page with several sections. Copy these values:

| Variable name | Where to find it | Example of what it looks like |
|---|---|---|
| `SUPABASE_URL` | Under the heading **"Project URL"** | `https://abcdefghijk.supabase.co` |
| `SUPABASE_ANON_KEY` | Under **"Project API keys"** → the row labeled **anon** | `eyJhbGciOi...` (a very long string) |
| `SUPABASE_SERVICE_ROLE_KEY` | Under **"Project API keys"** → the row labeled **service_role** | `eyJhbGciOi...` (different long string) |

Now go to **Settings > API > Secrets** (there might be a "Secrets" sub-tab or section lower on the same page):

| Variable name | Where to find it |
|---|---|
| `SUPABASE_JWT_SECRET` | Under **"JWT Secret"** — click the eye/reveal icon to see it |

---

## PART 5 — Create the .env Files

You need **two** .env files — one for the Python backend, one for the React frontend. They use different keys from Supabase for security reasons (the backend gets the powerful service_role key, the frontend only gets the weaker anon key).

### Backend .env (at your project root, same level as `api/` folder)

Create a file called `.env` here:

```
your-project/
├── .env          ← THIS FILE
├── api/
├── simulation/
├── frontend/
└── ...
```

Put this content in it (replace the placeholder values with what you copied from the dashboard):

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...your anon key here...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...your service role key here...
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

### Frontend .env (inside the `frontend/` folder)

Create a file called `.env` here:

```
your-project/
├── frontend/
│   ├── .env      ← THIS FILE
│   ├── src/
│   ├── package.json
│   └── ...
```

Put this content in it:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your anon key here...
VITE_API_BASE_URL=http://localhost:8000
```

**Why the frontend keys start with `VITE_`:** Vite (your React bundler) only exposes env variables that start with `VITE_` to the browser. Anything without that prefix stays hidden. This is how it prevents you from accidentally leaking the service_role key into client-side code.

---

## PART 6 — Make Your Backend Load the .env File

Your FastAPI backend needs to actually read the `.env` file at startup. Two things to do:

**1. Add `python-dotenv` to requirements.txt:**

Open your `requirements.txt` and add this line anywhere:

```
python-dotenv
```

**2. Load it in your main entry point:**

Open `api/main.py`. At the very top of the file, before any other imports, add these two lines:

```python
from dotenv import load_dotenv
load_dotenv()
```

That is it. Now when FastAPI starts, it reads the `.env` file and puts all the variables into `os.environ` so any code that does `os.environ["SUPABASE_URL"]` will find them.

---

## PART 7 — Verify Everything Works

Do these checks one by one. If any fail, the step number tells you where to look back.

**Check 1 — Tables exist (tests Part 2)**
1. Go to Supabase dashboard > Table Editor
2. Confirm all 6 tables are listed
3. Click `stations`, confirm the `UNIQUE` constraint exists on `(project_id, station_id)` — you can see this under the "Constraints" tab if your version has one

**Check 2 — Trigger works (tests Part 2)**
1. Go to Authentication > Users
2. Click **"Invite User"** or sign up a test user with any email + password
3. Go to Table Editor > `profiles`
4. You should see a new row appeared automatically with that user's email as the display_name and role set to `viewer`
5. If no row appeared, the trigger failed. Go back and re-run just the trigger + function block from Part 2.

**Check 3 — Auth settings correct (tests Part 3)**
1. Go to Authentication > Settings
2. Confirm Site URL shows `http://localhost:5173`
3. Confirm email confirmation is OFF

**Check 4 — Env variables are correct (tests Part 4 + 5)**
1. Open a terminal
2. `cd` into your project root (where the backend `.env` lives)
3. Run: `python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.environ.get('SUPABASE_URL'))"`
4. You should see your Supabase URL printed. If it prints `None`, the `.env` file is in the wrong folder or `python-dotenv` is not installed.

**Check 5 — Backend can connect to Supabase**
1. Open a terminal, cd to project root
2. Run:
   ```
   python -c "
   from dotenv import load_dotenv
   load_dotenv()
   from supabase import create_client
   import os
   client = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])
   result = client.table('profiles').select('*').execute()
   print('Connected. Rows in profiles:', len(result.data))
   "
   ```
3. If you see `Connected. Rows in profiles: 1` (or however many test users you created), everything is working.
4. If you get an error about `supabase` not being installed, run `pip install supabase` first.

---

## PART 8 — How to Change a User's Role (Admin Setup)

New users are automatically set to `viewer`. To make someone an admin or analyst:

**Option A — Supabase Dashboard (quickest for dev):**
1. Go to Table Editor > `profiles`
2. Find the row for the user
3. Click on the `role` cell
4. Change it from `viewer` to `admin` or `analyst`
5. Click the checkmark to save

**Option B — SQL Editor (if you need to do it programmatically):**
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE display_name = 'youremail@example.com';
```

---

## PART 9 — What Each Table Actually Stores (Quick Reference)

| Table | Purpose | Who writes to it |
|---|---|---|
| `profiles` | User display name + role | Auto-created by trigger on signup. Role changed manually by admin. |
| `projects` | The simulation project container. Holds baseline config as JSON. | API creates on user request. Baseline config + validation flag updated by API after runs. |
| `stations` | Physical swap stations. Coordinates, capacity, active/inactive. | API on user add/modify/remove. |
| `scenarios` | A "what-if" experiment. Holds the intervention list, duration, and results after sim runs. | API creates it. Simulation runner updates status + results after the engine finishes. |
| `validation_results` | Output of each baseline validation run. R², MAPE, per-station accuracy. | API writes a new row every time validation is triggered. |

---

## PART 10 — Common Mistakes and Fixes

| Mistake | What happens | Fix |
|---|---|---|
| Forgot to turn off email confirmation | Signup returns no session, login seems to work but no token comes back | Go to Auth > Settings, turn off email confirmation |
| `.env` file in wrong folder | Backend prints `None` for env variables | Backend `.env` must be at the same level as the `api/` folder. Frontend `.env` must be inside `frontend/`. |
| Ran the SQL twice | Error says "relation already exists" | This is harmless. Just means the tables already exist from the first run. Ignore it. |
| Role is stuck on `viewer` | User can't create projects or run simulations | Go to Table Editor > profiles, manually change the role to `admin` |
| RLS blocking queries | API returns empty arrays even though data exists | The service_role key bypasses RLS. If you're seeing empty results, you might accidentally be using the anon key in the backend. Check `supabase_client.py` uses `SUPABASE_SERVICE_ROLE_KEY`. |
| Trigger didn't fire | New signup has no profile row | Check if the trigger exists: go to SQL editor and run `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';` — if empty, re-run the trigger block from Part 2. |
