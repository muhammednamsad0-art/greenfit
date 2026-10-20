import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayStr } from '@/lib/date';
import {
  TreePine, Play, Pause, RotateCcw, Clock, Award,
  Sun, Moon, CloudRain, Bird,
} from 'lucide-react';

const DURATIONS = [
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '25 min', seconds: 1500 },
  { label: '5 min', seconds: 300 },
];

const SCENES = [
  { id: 'forest', label: 'Forest', icon: TreePine, color: 'from-green-400 to-emerald-500' },
  { id: 'sunset', label: 'Sunset', icon: Sun, color: 'from-orange-400 to-amber-500' },
  { id: 'night', label: 'Night Sky', icon: Moon, color: 'from-indigo-400 to-purple-500' },
  { id: 'rain', label: 'Rain', icon: CloudRain, color: 'from-blue-400 to-cyan-500' },
];

export function ForestFocusView() {
  const today = getTodayStr();
  const [duration, setDuration] = useState(900);
  const [scene, setScene] = useState(SCENES[0]);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(900);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
  }, [today]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            // Session complete
            setRunning(false);
            saveSession(duration);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  async function loadData() {
    const { data } = await supabase.from('focus_sessions').select('*').eq('log_date', today);
    if (data) {
      setCompletedToday(data.length);
      setTotalFocusTime(data.reduce((s: number, r: { duration_seconds: number }) => s + r.duration_seconds, 0));
    }
  }

  async function saveSession(seconds: number) {
    await supabase.from('focus_sessions').insert({
      log_date: today,
      duration_seconds: seconds,
      scene: scene.id,
    });
    loadData();
  }

  function start() {
    setRemaining(duration);
    setRunning(true);
  }

  function stop() {
    setRunning(false);
    setRemaining(duration);
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  const progress = running ? ((duration - remaining) / duration) * 100 : 0;
  const SceneIcon = scene.icon;

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className={`rounded-3xl p-5 bg-gradient-to-br ${scene.color} text-white shadow-xl relative overflow-hidden transition-all duration-1000`}>
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative flex items-center gap-3">
          <SceneIcon className="w-10 h-10 shrink-0" />
          <div>
            <h3 className="font-display text-lg font-bold">Forest Focus</h3>
            <p className="text-sm text-white/90">Stay focused with nature-inspired timers — no distractions, just you and the outdoors</p>
          </div>
        </div>
      </div>

      {/* Scene selector */}
      <div>
        <label className="text-sm font-semibold text-slate-600 mb-2 block">Choose Your Scene</label>
        <div className="grid grid-cols-4 gap-2">
          {SCENES.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => { setScene(s); if (!running) {} }}
                disabled={running}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
                  scene.id === s.id
                    ? `bg-gradient-to-br ${s.color} text-white shadow-md`
                    : 'bg-white/60 text-slate-600'
                } disabled:opacity-50`}
              >
                <Icon className="w-5 h-5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration selector */}
      {!running && remaining === duration && (
        <div>
          <label className="text-sm font-semibold text-slate-600 mb-2 block">Focus Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.label}
                onClick={() => { setDuration(d.seconds); setRemaining(d.seconds); }}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${
                  duration === d.seconds
                    ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md'
                    : 'bg-white/60 text-slate-600'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timer display */}
      <div className="glass rounded-3xl p-8 text-center">
        {/* Animated nature scene background */}
        <div className={`relative w-48 h-48 mx-auto mb-4 rounded-full bg-gradient-to-br ${scene.color} overflow-hidden shadow-2xl`}>
          {/* Progress ring */}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
            <circle
              cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 46}`}
              strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {running ? (
              <>
                <SceneIcon className="w-8 h-8 text-white/80 mb-1 animate-float" />
                <div className="font-display text-4xl font-bold text-white tabular-nums">{formatTime(remaining)}</div>
              </>
            ) : (
              <>
                <SceneIcon className="w-12 h-12 text-white/80 mb-2" />
                <div className="font-display text-2xl font-bold text-white">{formatTime(duration)}</div>
              </>
            )}
          </div>
          {/* Floating particles */}
          {running && scene.id === 'forest' && <Bird className="absolute top-6 right-8 w-5 h-5 text-white/50 animate-float" />}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {!running && remaining === duration ? (
            <button
              onClick={start}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Focus
            </button>
          ) : running ? (
            <button
              onClick={() => setRunning(false)}
              className="px-6 py-3 rounded-2xl bg-orange-500 text-white font-bold shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              <Pause className="w-5 h-5" />
              Pause
            </button>
          ) : (
            <button
              onClick={start}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Resume
            </button>
          )}
          <button
            onClick={stop}
            className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <Award className="w-6 h-6 text-amber-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{completedToday}</div>
          <div className="text-xs text-slate-500 font-semibold">Sessions Today</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <Clock className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{Math.floor(totalFocusTime / 60)}m</div>
          <div className="text-xs text-slate-500 font-semibold">Total Focus Time</div>
        </div>
      </div>

      {/* Tip */}
      <div className="glass rounded-2xl p-4">
        <p className="text-sm text-slate-500 text-center">
          <TreePine className="w-4 h-4 inline mr-1 text-green-400" />
          Put away your phone, close other tabs, and focus fully on your task. Each completed session is saved automatically.
        </p>
      </div>
    </div>
  );
}
