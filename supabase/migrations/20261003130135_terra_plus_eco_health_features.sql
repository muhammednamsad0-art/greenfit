/*
# Add eco-health feature tables to GREENFIT

## Overview
Single-tenant app (no sign-in). New tables for Eco Steps, Eco Scanner, 
Breathing Bubble, and Forest Focus features.

## New Tables

1. `eco_step_log` — tracks eco-friendly trips (walking/cycling instead of driving)
   - log_date, steps, distance_m, co2_saved_g, transport_replaced
2. `eco_actions_log` — daily eco actions with CO2 savings
   - log_date, action_id, count
3. `focus_sessions` — Forest Focus timer sessions
   - log_date, duration_seconds, scene

## Security
- RLS enabled on all tables.
- All policies allow anon + authenticated CRUD (single-tenant, no auth).
*/

-- 1. Eco step log
CREATE TABLE IF NOT EXISTS eco_step_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL,
  steps integer NOT NULL DEFAULT 0,
  distance_m integer NOT NULL DEFAULT 0,
  co2_saved_g integer NOT NULL DEFAULT 0,
  transport_replaced text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE eco_step_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_eco_steps" ON eco_step_log;
CREATE POLICY "anon_select_eco_steps" ON eco_step_log FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_eco_steps" ON eco_step_log;
CREATE POLICY "anon_insert_eco_steps" ON eco_step_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_eco_steps" ON eco_step_log;
CREATE POLICY "anon_delete_eco_steps" ON eco_step_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_eco_step_log_date ON eco_step_log(log_date);

-- 2. Eco actions log
CREATE TABLE IF NOT EXISTS eco_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL,
  action_id text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE (log_date, action_id)
);

ALTER TABLE eco_actions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_eco_actions" ON eco_actions_log;
CREATE POLICY "anon_select_eco_actions" ON eco_actions_log FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_eco_actions" ON eco_actions_log;
CREATE POLICY "anon_insert_eco_actions" ON eco_actions_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_eco_actions" ON eco_actions_log;
CREATE POLICY "anon_update_eco_actions" ON eco_actions_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_eco_actions" ON eco_actions_log;
CREATE POLICY "anon_delete_eco_actions" ON eco_actions_log FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_eco_actions_log_date ON eco_actions_log(log_date);

-- 3. Focus sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  scene text DEFAULT 'forest',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_focus" ON focus_sessions;
CREATE POLICY "anon_select_focus" ON focus_sessions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_focus" ON focus_sessions;
CREATE POLICY "anon_insert_focus" ON focus_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_focus" ON focus_sessions;
CREATE POLICY "anon_delete_focus" ON focus_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_date ON focus_sessions(log_date);
