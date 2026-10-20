/*
# Add smartwatch BLE tables to GREENFIT

## Overview
Single-tenant app (no sign-in). Two new tables for storing the saved BLE
device and sync'd watch health data.

## New Tables

1. `watch_devices` — stores the selected BLE smartwatch for reconnection.
   - `device_id` (text, unique) — the browser-assigned Bluetooth device ID
   - `device_name` (text) — the watch name (e.g. "BW8 Ultra")
   - `is_connected` (boolean) — last known connection state
   - `last_connected_at` (timestamptz) — when last connected
   - `manufacturer` (text) — from Device Information Service if available
   - `model_number` (text) — from Device Information Service if available
   - `firmware_revision` (text) — from Device Information Service if available

2. `watch_data_log` — stores sync'd health data from the watch per date.
   - `log_date` (date) — the date the data was synced
   - `steps` (integer, nullable)
   - `heart_rate` (integer, nullable) — bpm
   - `calories` (integer, nullable) — kcal
   - `distance` (integer, nullable) — meters
   - `battery` (integer, nullable) — percentage 0-100
   - `sleep_hours` (integer, nullable)
   - `sleep_minutes` (integer, nullable)
   - `synced_at` (timestamptz) — when the data was read from the watch

## Security
- RLS enabled on both tables.
- All policies allow anon + authenticated CRUD (single-tenant, no auth).
*/

-- 1. Watch devices
CREATE TABLE IF NOT EXISTS watch_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  device_name text DEFAULT '',
  is_connected boolean DEFAULT false,
  last_connected_at timestamptz,
  manufacturer text DEFAULT '',
  model_number text DEFAULT '',
  firmware_revision text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE watch_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_watch_devices" ON watch_devices;
CREATE POLICY "anon_select_watch_devices" ON watch_devices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_watch_devices" ON watch_devices;
CREATE POLICY "anon_insert_watch_devices" ON watch_devices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_watch_devices" ON watch_devices;
CREATE POLICY "anon_update_watch_devices" ON watch_devices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_watch_devices" ON watch_devices;
CREATE POLICY "anon_delete_watch_devices" ON watch_devices FOR DELETE
  TO anon, authenticated USING (true);

-- 2. Watch data log
CREATE TABLE IF NOT EXISTS watch_data_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL,
  steps integer,
  heart_rate integer,
  calories integer,
  distance integer,
  battery integer,
  sleep_hours integer,
  sleep_minutes integer,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE watch_data_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_watch_data" ON watch_data_log;
CREATE POLICY "anon_select_watch_data" ON watch_data_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_watch_data" ON watch_data_log;
CREATE POLICY "anon_insert_watch_data" ON watch_data_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_watch_data" ON watch_data_log;
CREATE POLICY "anon_update_watch_data" ON watch_data_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_watch_data" ON watch_data_log;
CREATE POLICY "anon_delete_watch_data" ON watch_data_log FOR DELETE
  TO anon, authenticated USING (true);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_watch_data_log_date ON watch_data_log(log_date);
