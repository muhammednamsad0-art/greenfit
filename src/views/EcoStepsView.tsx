import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayStr } from '@/lib/date';
import { useMotionTracker, hasMotionSensors } from '@/hooks/useMotionTracker';
import {
  Footprints, Leaf, Cloud, Car, Bike, Bus, Train,
  TreePine, Award, TrendingDown, AlertCircle, Radio,
  Play, Square, RefreshCw,
} from 'lucide-react';

const TRANSPORT_MODES = [
  { id: 'walking', label: 'Walking', icon: Footprints, co2PerKm: 0, color: 'from-green-400 to-emerald-500', auto: true },
  { id: 'cycling', label: 'Cycling', icon: Bike, co2PerKm: 0, color: 'from-teal-400 to-cyan-500', auto: true },
  { id: 'bus', label: 'Bus', icon: Bus, co2PerKm: 89, color: 'from-amber-400 to-orange-500', auto: false },
  { id: 'car', label: 'Car', icon: Car, co2PerKm: 192, color: 'from-orange-400 to-red-500', auto: false },
  { id: 'train', label: 'Train', icon: Train, co2PerKm: 41, color: 'from-blue-400 to-indigo-500', auto: false },
];

// Average step length in meters
const STEP_LENGTH_M = 0.75;

interface EcoStepLog {
  id: string;
  log_date: string;
  steps: number;
  distance_m: number;
  co2_saved_g: number;
  transport_replaced: string;
}

export function EcoStepsView() {
  const today = getTodayStr();
  const [logs, setLogs] = useState<EcoStepLog[]>([]);
  const [selectedTransport, setSelectedTransport] = useState('bus');
  const motion = useMotionTracker();
  const sensorsAvailable = hasMotionSensors();

  useEffect(() => {
    loadLogs();
  }, [today]);

  async function loadLogs() {
    const { data } = await supabase.from('eco_step_log').select('*').eq('log_date', today);
    setLogs(data || []);
  }

  const transport = TRANSPORT_MODES.find((t) => t.id === selectedTransport)!;
  const distanceM = motion.stepCount * STEP_LENGTH_M;
  const distanceKm = distanceM / 1000;
  const co2SavedG = Math.round(distanceKm * transport.co2PerKm);

  const totalSteps = logs.reduce((s, l) => s + l.steps, 0) + motion.stepCount;
  const totalDistance = logs.reduce((s, l) => s + l.distance_m, 0) + distanceM;
  const totalCo2Saved = logs.reduce((s, l) => s + l.co2_saved_g, 0) + co2SavedG;
  const treesEquivalent = (totalCo2Saved / 21000).toFixed(2); // ~21kg CO2 per tree per year

  async function saveTrip() {
    if (motion.stepCount === 0) return;
    const { data } = await supabase
      .from('eco_step_log')
      .insert({
        log_date: today,
        steps: motion.stepCount,
        distance_m: Math.round(distanceM),
        co2_saved_g: co2SavedG,
        transport_replaced: selectedTransport,
      })
      .select()
      .single();
    if (data) setLogs([...logs, data]);
    motion.reset();
  }

  return (
    <div className="space-y-6">
      {/* Intro card */}
      <div className="rounded-3xl p-5 bg-gradient-to-br from-green-400 via-emerald-400 to-teal-400 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative flex items-center gap-3">
          <TreePine className="w-10 h-10 shrink-0" />
          <div>
            <h3 className="font-display text-lg font-bold">Eco Steps</h3>
            <p className="text-sm text-white/90">Walk or cycle instead of driving — see your CO2 savings grow in real time!</p>
          </div>
        </div>
      </div>

      {/* Sensor status */}
      <div className={`rounded-2xl p-3 flex items-center gap-2 ${
        motion.active ? 'bg-green-50 border-2 border-green-200' : 'glass border-2 border-slate-200'
      }`}>
        <Radio className={`w-4 h-4 ${motion.active ? 'text-green-500' : 'text-slate-400'}`} />
        <span className="text-xs font-semibold text-slate-500">
          {motion.active ? 'Motion sensor active — walk to track steps automatically!' : motion.error || 'Tap Start to begin auto-tracking your steps'}
        </span>
      </div>

      {/* Transport selector */}
      <div>
        <label className="text-sm font-semibold text-slate-600 mb-2 block">What are you replacing by walking/cycling?</label>
        <div className="grid grid-cols-5 gap-2">
          {TRANSPORT_MODES.filter((t) => !t.auto).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTransport(t.id)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
                  selectedTransport === t.id
                    ? `bg-gradient-to-br ${t.color} text-white shadow-md`
                    : 'bg-white/60 text-slate-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live tracking */}
      <div className="glass rounded-3xl p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Footprints className="w-5 h-5 text-blue-500" />
          <h3 className="font-display font-bold text-slate-700">Step Counter</h3>
          {motion.active && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">AUTO</span>}
        </div>
        <div className={`font-display text-6xl font-bold mb-2 transition-all ${
          motion.active && motion.intensity > 0.3 ? 'text-green-600 scale-105' : 'text-slate-800'
        }`}>
          {motion.stepCount}
        </div>
        {motion.active && (
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-4 max-w-xs mx-auto">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-teal-400 transition-all duration-150"
              style={{ width: `${motion.intensity * 100}%` }}
            />
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <div className="font-display text-xl font-bold text-slate-800">{(distanceM).toFixed(0)}</div>
            <div className="text-xs text-slate-400 font-semibold">meters</div>
          </div>
          <div>
            <div className="font-display text-xl font-bold text-slate-800">{co2SavedG}</div>
            <div className="text-xs text-slate-400 font-semibold">g CO2 saved</div>
          </div>
          <div>
            <div className="font-display text-xl font-bold text-slate-800">{(distanceKm).toFixed(2)}</div>
            <div className="text-xs text-slate-400 font-semibold">km</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => motion.active ? motion.stop() : motion.start()}
            className={`px-5 h-12 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-white font-bold active:scale-90 transition-all ${
              motion.active ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-teal-500'
            }`}
          >
            {motion.active ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Start Walking</>}
          </button>
          <button
            onClick={() => motion.reset()}
            className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Save trip */}
      <button
        onClick={saveTrip}
        disabled={motion.stepCount === 0}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-lg active:scale-95 transition-all disabled:opacity-40"
      >
        Save This Trip
      </button>

      {/* Today total */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <Footprints className="w-6 h-6 text-blue-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{totalSteps}</div>
          <div className="text-xs text-slate-500 font-semibold">Total Steps</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <TrendingDown className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{totalCo2Saved}</div>
          <div className="text-xs text-slate-500 font-semibold">g CO2 Saved</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <TreePine className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{treesEquivalent}</div>
          <div className="text-xs text-slate-500 font-semibold">Tree Equiv.</div>
        </div>
      </div>

      {/* Trips today */}
      {logs.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-bold text-slate-800 mb-3">Today's Eco Trips</h3>
          <div className="space-y-2">
            {logs.map((log) => {
              const t = TRANSPORT_MODES.find((m) => m.id === log.transport_replaced);
              const Icon = t?.icon || Car;
              return (
                <div key={log.id} className="glass rounded-2xl p-4 flex items-center gap-3 animate-slide-up">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${t?.color || 'from-orange-400 to-red-500'}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 text-sm capitalize">Replaced {log.transport_replaced}</div>
                    <div className="text-xs text-slate-500">
                      {log.steps} steps · {log.distance_m}m · {log.co2_saved_g}g CO2 saved
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
