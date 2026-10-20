/*
# GREENFIT - Student Health, Wellbeing & Eco App Schema

## Overview
Single-tenant app (no sign-in). All data is shared/public, so policies use
`TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`.

## New Tables

1. `app_state` — single-row config: school name, grade, division, student count,
   current streak, longest streak, last active date, total points.
2. `challenge_completions` — tracks which challenges were completed on which date,
   points earned, and whether double impact was used.
3. `water_log` — daily water intake (glasses) per date.
4. `exercise_log` — exercise sessions: date, movement count, duration seconds,
   calories burned.
5. `routine_items` — routine template items (name, icon, time of day, order).
6. `routine_completions` — per-date completion of routine items.
7. `mood_checkins` — classroom mood check-ins per date.
8. `posture_captures` — mood & posture camera captures per date.
9. `ai_messages` — ZYRO AI assistant conversation history.
10. `trophies` — earned trophies (id, name, date earned).

## Security
- RLS enabled on every table.
- All policies allow anon + authenticated CRUD (single-tenant, no auth).
*/

-- 1. App state (single row)
CREATE TABLE IF NOT EXISTS app_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text DEFAULT '',
  grade text DEFAULT '',
  division text DEFAULT '',
  student_count integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_active_date date,
  total_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = '00000000-0000-0000-0000-000000000000')
);

INSERT INTO app_state (id) VALUES ('00000000-0000-0000-0000-000000000000')
  ON CONFLICT DO NOTHING;

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_app_state" ON app_state;
CREATE POLICY "anon_select_app_state" ON app_state FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_app_state" ON app_state;
CREATE POLICY "anon_insert_app_state" ON app_state FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_app_state" ON app_state;
CREATE POLICY "anon_update_app_state" ON app_state FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Challenge completions
CREATE TABLE IF NOT EXISTS challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id text NOT NULL,
  challenge_date date NOT NULL,
  completed boolean DEFAULT false,
  points_earned integer DEFAULT 0,
  double_impact boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (challenge_id, challenge_date)
);

ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_challenges" ON challenge_completions;
CREATE POLICY "anon_select_challenges" ON challenge_completions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_challenges" ON challenge_completions;
CREATE POLICY "anon_insert_challenges" ON challenge_completions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_challenges" ON challenge_completions;
CREATE POLICY "anon_update_challenges" ON challenge_completions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_challenges" ON challenge_completions;
CREATE POLICY "anon_delete_challenges" ON challenge_completions FOR DELETE
  TO anon, authenticated USING (true);

-- 3. Water log
CREATE TABLE IF NOT EXISTS water_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL UNIQUE,
  glasses integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE water_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_water" ON water_log;
CREATE POLICY "anon_select_water" ON water_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_water" ON water_log;
CREATE POLICY "anon_insert_water" ON water_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_water" ON water_log;
CREATE POLICY "anon_update_water" ON water_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Exercise log
CREATE TABLE IF NOT EXISTS exercise_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL,
  movement_count integer DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  calories_burned integer DEFAULT 0,
  exercise_type text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exercise_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_exercise" ON exercise_log;
CREATE POLICY "anon_select_exercise" ON exercise_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_exercise" ON exercise_log;
CREATE POLICY "anon_insert_exercise" ON exercise_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_exercise" ON exercise_log;
CREATE POLICY "anon_update_exercise" ON exercise_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_exercise" ON exercise_log;
CREATE POLICY "anon_delete_exercise" ON exercise_log FOR DELETE
  TO anon, authenticated USING (true);

-- 5. Routine items
CREATE TABLE IF NOT EXISTS routine_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT 'CheckCircle',
  time_of_day text DEFAULT 'morning',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE routine_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_routine_items" ON routine_items;
CREATE POLICY "anon_select_routine_items" ON routine_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_routine_items" ON routine_items;
CREATE POLICY "anon_insert_routine_items" ON routine_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_routine_items" ON routine_items;
CREATE POLICY "anon_update_routine_items" ON routine_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_routine_items" ON routine_items;
CREATE POLICY "anon_delete_routine_items" ON routine_items FOR DELETE
  TO anon, authenticated USING (true);

-- 6. Routine completions
CREATE TABLE IF NOT EXISTS routine_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_item_id uuid NOT NULL REFERENCES routine_items(id) ON DELETE CASCADE,
  completion_date date NOT NULL,
  completed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (routine_item_id, completion_date)
);

ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_routine_completions" ON routine_completions;
CREATE POLICY "anon_select_routine_completions" ON routine_completions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_routine_completions" ON routine_completions;
CREATE POLICY "anon_insert_routine_completions" ON routine_completions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_routine_completions" ON routine_completions;
CREATE POLICY "anon_update_routine_completions" ON routine_completions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_routine_completions" ON routine_completions;
CREATE POLICY "anon_delete_routine_completions" ON routine_completions FOR DELETE
  TO anon, authenticated USING (true);

-- 7. Mood check-ins
CREATE TABLE IF NOT EXISTS mood_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_date date NOT NULL,
  mood text NOT NULL,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mood" ON mood_checkins;
CREATE POLICY "anon_select_mood" ON mood_checkins FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mood" ON mood_checkins;
CREATE POLICY "anon_insert_mood" ON mood_checkins FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mood" ON mood_checkins;
CREATE POLICY "anon_delete_mood" ON mood_checkins FOR DELETE
  TO anon, authenticated USING (true);

-- 8. Posture captures
CREATE TABLE IF NOT EXISTS posture_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_date date NOT NULL,
  mood_estimate text DEFAULT '',
  posture_estimate text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE posture_captures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_posture" ON posture_captures;
CREATE POLICY "anon_select_posture" ON posture_captures FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_posture" ON posture_captures;
CREATE POLICY "anon_insert_posture" ON posture_captures FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_posture" ON posture_captures;
CREATE POLICY "anon_delete_posture" ON posture_captures FOR DELETE
  TO anon, authenticated USING (true);

-- 9. AI messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ai" ON ai_messages;
CREATE POLICY "anon_select_ai" ON ai_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ai" ON ai_messages;
CREATE POLICY "anon_insert_ai" ON ai_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ai" ON ai_messages;
CREATE POLICY "anon_delete_ai" ON ai_messages FOR DELETE
  TO anon, authenticated USING (true);

-- 10. Trophies
CREATE TABLE IF NOT EXISTS trophies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trophy_id text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  earned_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trophies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_trophies" ON trophies;
CREATE POLICY "anon_select_trophies" ON trophies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_trophies" ON trophies;
CREATE POLICY "anon_insert_trophies" ON trophies FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_trophies" ON trophies;
CREATE POLICY "anon_delete_trophies" ON trophies FOR DELETE
  TO anon, authenticated USING (true);

-- Seed default routine items
INSERT INTO routine_items (name, icon, time_of_day, sort_order) VALUES
  ('Drink a glass of water', 'Droplet', 'morning', 1),
  ('Stretch for 2 minutes', 'Activity', 'morning', 2),
  ('Eat a healthy breakfast', 'Apple', 'morning', 3),
  ('Take a short walk', 'Footprints', 'afternoon', 4),
  ('Practice deep breathing', 'Wind', 'afternoon', 5),
  ('Tidy your workspace', 'Sparkles', 'afternoon', 6),
  ('Reflect on your day', 'NotebookPen', 'evening', 7),
  ('Turn off screens early', 'Moon', 'evening', 8)
ON CONFLICT DO NOTHING;
