export interface AppState {
  id: string;
  user_id: string;
  school_name: string;
  grade: string;
  division: string;
  student_count: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  total_points: number;
}

export interface ChallengeCompletion {
  id: string;
  challenge_id: string;
  challenge_date: string;
  completed: boolean;
  points_earned: number;
  double_impact: boolean;
}

export interface WaterLog {
  id: string;
  log_date: string;
  glasses: number;
}

export interface ExerciseLog {
  id: string;
  log_date: string;
  movement_count: number;
  duration_seconds: number;
  calories_burned: number;
  exercise_type: string;
}

export interface RoutineItem {
  id: string;
  name: string;
  icon: string;
  time_of_day: string;
  sort_order: number;
}

export interface RoutineCompletion {
  id: string;
  routine_item_id: string;
  completion_date: string;
  completed: boolean;
}

export interface MoodCheckin {
  id: string;
  checkin_date: string;
  mood: string;
  note: string;
}

export interface PostureCapture {
  id: string;
  capture_date: string;
  mood_estimate: string;
  posture_estimate: string;
}

export interface AiMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface Trophy {
  id: string;
  trophy_id: string;
  name: string;
  description: string;
  earned_date: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: 'health' | 'eco';
  points: number;
  icon: string;
}

export interface WatchDevice {
  id: string;
  device_id: string;
  device_name: string;
  is_connected: boolean;
  last_connected_at: string | null;
  manufacturer: string;
  model_number: string;
  firmware_revision: string;
}

export interface WatchDataLog {
  id: string;
  log_date: string;
  steps: number | null;
  heart_rate: number | null;
  calories: number | null;
  distance: number | null;
  battery: number | null;
  sleep_hours: number | null;
  sleep_minutes: number | null;
  synced_at: string;
}
