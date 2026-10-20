import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayStr } from '@/lib/date';
import type { ExerciseLog } from '@/lib/types';
import { useMotionTracker, hasMotionSensors } from '@/hooks/useMotionTracker';
import {
  Play, Pause, Square, Flame, Clock, Activity, Zap, Timer,
  Footprints, PersonStanding, Bike, Dumbbell, Move3d,
  Radio, RadioTower, RefreshCw, AlertCircle,
} from 'lucide-react';

const EXERCISE_TYPES = [
  { id: 'walking', label: 'Walking', icon: Footprints, met: 3.5, color: 'from-blue-400 to-indigo-500' },
  { id: 'running', label: 'Running', icon: Activity, met: 9.8, color: 'from-orange-400 to-red-500' },
  { id: 'jumping', label: 'Jumping', icon: Move3d, met: 8.0, color: 'from-purple-400 to-pink-500' },
  { id: 'stretching', label: 'Stretching', icon: PersonStanding, met: 2.3, color: 'from-teal-400 to-cyan-500' },
  { id: 'sports', label: 'Sports', icon: Dumbbell, met: 6.0, color: 'from-amber-400 to-orange-500' },
  { id: 'cycling', label: 'Cycling', icon: Bike, met: 7.5, color: 'from-green-400 to-emerald-500' },
];

const DEFAULT_WEIGHT_KG = 45;

export function ExerciseView() {
  const today = getTodayStr();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [manualMoves, setManualMoves] = useState(0);
  const [exerciseType, setExerciseType] = useState('walking');
  const [sensorMode, setSensorMode] = useState(true);
  const [weightKg, setWeightKg] = useState(DEFAULT_WEIGHT_KG);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const motion = useMotionTracker();
  const sensorsAvailable = hasMotionSensors();

  // Auto-start timer when sensor tracking starts
  useEffect(() => {
    if (motion.active && !timerRunning) {
      setTimerRunning(true);
    }
  }, [motion.active]);

  // Auto-stop timer when sensor tracking stops
  useEffect(() => {
    if (!motion.active && timerRunning && sensorMode) {
      setTimerRunning(false);
    }
  }, [motion.active]);

  useEffect(() => {
    loadData();
  }, [today]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  async function loadData() {
    const { data } = await supabase.from('exercise_log').select('*').eq('log_date', today);
    setLogs(data || []);
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  const met = EXERCISE_TYPES.find((t) => t.id === exerciseType)?.met || 3.5;

  // Standard MET formula: calories = MET * weight(kg) * time(hours)
  // This is the scientifically validated method used by exercise physiologists.
  // No invented multipliers or arbitrary per-move additions.
  function estimateCalories(seconds: number): number {
    const hours = seconds / 3600;
    return Math.round(met * weightKg * hours);
  }

  const currentMoves = sensorMode ? motion.stepCount : manualMoves;

  async function saveSession() {
    if (elapsed === 0 && currentMoves === 0) return;
    const calories = estimateCalories(elapsed);
    const { data } = await supabase
      .from('exercise_log')
      .insert({
        log_date: today,
        movement_count: currentMoves,
        duration_seconds: elapsed,
        calories_burned: calories,
        exercise_type: exerciseType,
      })
      .select()
      .single();
    if (data) setLogs([...logs, data]);
    setElapsed(0);
    setManualMoves(0);
    setTimerRunning(false);
    motion.stop();
    motion.reset();
  }

  async function deleteLog(id: string) {
    await supabase.from('exercise_log').delete().eq('id', id);
    setLogs(logs.filter((l) => l.id !== id));
  }

  const totalMoves = logs.reduce((s, l) => s + l.movement_count, 0) + currentMoves;
  const totalTime = logs.reduce((s, l) => s + l.duration_seconds, 0) + elapsed;
  const totalCalories = logs.reduce((s, l) => s + l.calories_burned, 0) + estimateCalories(elapsed);

  const activeType = EXERCISE_TYPES.find((t) => t.id === exerciseType)!;

  return (
    <div className="space-y-6">
      {/* Sensor status */}
      {sensorMode && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 transition-all ${
          motion.active
            ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300'
            : motion.error
            ? 'bg-red-50 border-2 border-red-200'
            : 'glass border-2 border-slate-200'
        }`}>
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
            motion.active ? 'bg-green-200' : motion.error ? 'bg-red-100' : 'bg-slate-100'
          }`}>
            {motion.active ? <Radio className="w-5 h-5 text-green-600" /> : motion.error ? <AlertCircle className="w-5 h-5 text-red-500" /> : <RadioTower className="w-5 h-5 text-slate-400" />}
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-slate-800">
              {motion.active ? 'Motion Sensor Active' : motion.error ? 'Sensor Error' : 'Motion Sensor Off'}
            </div>
            <div className="text-xs text-slate-500">
              {motion.active
                ? 'Automatically detecting your movements — no buttons needed!'
                : motion.error
                ? motion.error
                : sensorsAvailable
                ? 'Tap Start to activate automatic movement detection'
                : 'This device may not have motion sensors. Use manual mode instead.'}
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            motion.active ? 'bg-green-200 text-green-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {motion.active ? 'LIVE' : 'OFF'}
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="glass rounded-2xl p-2 flex">
        <button
          onClick={() => { setSensorMode(true); motion.stop(); setManualMoves(0); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            sensorMode ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md' : 'text-slate-500'
          }`}
        >
          <Radio className="w-4 h-4" />
          Auto Sensor
        </button>
        <button
          onClick={() => { setSensorMode(false); motion.stop(); setTimerRunning(false); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            !sensorMode ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-md' : 'text-slate-500'
          }`}
        >
          <Activity className="w-4 h-4" />
          Manual
        </button>
      </div>

      {/* Weight input */}
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 shrink-0">
          <Activity className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1">
          <label className="text-sm font-semibold text-slate-600">Your Weight (kg)</label>
          <p className="text-xs text-slate-400">Used for accurate calorie calculation</p>
        </div>
        <input
          type="number"
          min="20"
          max="150"
          value={weightKg}
          onChange={(e) => setWeightKg(Math.max(20, Math.min(150, Number(e.target.value) || DEFAULT_WEIGHT_KG)))}
          className="w-20 px-3 py-2 rounded-xl bg-white border border-slate-200 text-center font-bold text-slate-800 focus:outline-none focus:border-orange-400"
        />
      </div>

      {/* Exercise type selector */}
      <div>
        <label className="text-sm font-semibold text-slate-600 mb-2 block">Activity Type</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {EXERCISE_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setExerciseType(type.id)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold capitalize transition-all ${
                  exerciseType === type.id
                    ? `bg-gradient-to-br ${type.color} text-white shadow-md`
                    : 'bg-white/60 text-slate-600 hover:bg-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main tracking card */}
      <div className="glass rounded-3xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Timer */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Timer className="w-5 h-5 text-orange-500" />
              <h3 className="font-display font-bold text-slate-700">Exercise Timer</h3>
            </div>
            <div className="font-display text-5xl font-bold text-slate-800 mb-4 tabular-nums">
              {formatTime(elapsed)}
            </div>
            {!sensorMode && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={`w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center text-white active:scale-90 transition-all ${
                    timerRunning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {timerRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <button
                  onClick={() => { setTimerRunning(false); setElapsed(0); }}
                  className="w-14 h-14 rounded-2xl bg-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-300 active:scale-90 transition-all"
                >
                  <Square className="w-5 h-5" />
                </button>
              </div>
            )}
            {sensorMode && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => motion.active ? motion.stop() : motion.start()}
                  className={`px-6 h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-white font-bold active:scale-90 transition-all ${
                    motion.active
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gradient-to-r from-green-500 to-teal-500 hover:shadow-xl'
                  }`}
                >
                  {motion.active ? <><Square className="w-5 h-5" /> Stop Tracking</> : <><Play className="w-5 h-5" /> Start Tracking</>}
                </button>
                <button
                  onClick={() => { motion.reset(); setElapsed(0); }}
                  className="w-14 h-14 rounded-2xl bg-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-300 active:scale-90 transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Movement counter */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="font-display font-bold text-slate-700">Movement Counter</h3>
              {sensorMode && motion.active && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">AUTO</span>
              )}
            </div>
            <div className={`font-display text-6xl font-bold mb-4 tabular-nums transition-all ${
              motion.active && motion.intensity > 0.3 ? 'text-blue-600 scale-105' : 'text-slate-800'
            }`}>
              {currentMoves}
            </div>
            {sensorMode ? (
              /* Live intensity bar */
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 transition-all duration-150"
                  style={{ width: `${motion.intensity * 100}%` }}
                />
              </div>
            ) : (
              /* Manual +/- buttons */
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setManualMoves(Math.max(0, manualMoves - 1))}
                  className="w-14 h-14 rounded-2xl bg-blue-100 shadow-lg flex items-center justify-center text-blue-600 hover:bg-blue-200 active:scale-90 transition-all"
                >
                  <Square className="w-5 h-5 rotate-45" />
                </button>
                <button
                  onClick={() => setManualMoves(manualMoves + 1)}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg flex items-center justify-center text-white hover:shadow-xl active:scale-90 transition-all"
                >
                  <Play className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Save session */}
        <button
          onClick={saveSession}
          disabled={elapsed === 0 && currentMoves === 0}
          className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-40"
        >
          Save Exercise Session
        </button>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <Footprints className="w-6 h-6 text-blue-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{totalMoves}</div>
          <div className="text-xs text-slate-500 font-semibold">Movements</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <Clock className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{formatTime(totalTime)}</div>
          <div className="text-xs text-slate-500 font-semibold">Active Time</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <Flame className="w-6 h-6 text-red-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{totalCalories}</div>
          <div className="text-xs text-slate-500 font-semibold">Est. Calories</div>
        </div>
      </div>

      <div className="text-xs text-center text-slate-400 px-4">
        <Zap className="w-3 h-3 inline mr-1" />
        Auto tracking uses your device's motion sensors. Calorie estimates are approximations, not medical measurements.
      </div>

      {/* Session log */}
      <div>
        <h3 className="font-display text-lg font-bold text-slate-800 mb-3">Today's Sessions</h3>
        {logs.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-slate-400">
            No exercise sessions yet today. Start moving!
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const typeInfo = EXERCISE_TYPES.find((t) => t.id === log.exercise_type);
              const Icon = typeInfo?.icon || Activity;
              return (
                <div key={log.id} className="glass rounded-2xl p-4 flex items-center gap-3 animate-slide-up">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${typeInfo?.color || 'from-orange-400 to-amber-500'}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 capitalize">{log.exercise_type}</div>
                    <div className="text-xs text-slate-500">
                      {log.movement_count} moves · {formatTime(log.duration_seconds)} · {log.calories_burned} cal
                    </div>
                  </div>
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
