import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayStr } from '@/lib/date';
import type { WaterLog } from '@/lib/types';
import { Droplet, Plus, Minus, Droplets } from 'lucide-react';

const GOAL = 8;

export function WaterView() {
  const today = getTodayStr();
  const [glasses, setGlasses] = useState(0);
  const [logId, setLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [today]);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from('water_log')
      .select('*')
      .eq('log_date', today)
      .maybeSingle();
    if (data) {
      setGlasses(data.glasses);
      setLogId(data.id);
    } else {
      setGlasses(0);
      setLogId(null);
    }
    setLoading(false);
  }

  async function updateGlasses(delta: number) {
    const newVal = Math.max(0, Math.min(20, glasses + delta));
    setGlasses(newVal);
    if (logId) {
      await supabase.from('water_log').update({ glasses: newVal }).eq('id', logId);
    } else {
      const { data } = await supabase
        .from('water_log')
        .insert({ log_date: today, glasses: newVal })
        .select()
        .maybeSingle();
      if (data) setLogId(data.id);
    }
  }

  const percentage = Math.min(100, (glasses / GOAL) * 100);
  const liters = (glasses * 0.25).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Main water visual */}
      <div className="glass rounded-3xl p-6 text-center">
        <div className="relative w-48 h-56 mx-auto mb-4">
          {/* Glass body */}
          <div className="absolute inset-0 rounded-b-3xl rounded-t-xl border-4 border-cyan-200 bg-cyan-50 overflow-hidden">
            {/* Water fill */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-400 to-blue-300 transition-all duration-500 ease-out"
              style={{ height: `${percentage}%` }}
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-white/30 rounded-full" style={{ animation: 'float 2s ease-in-out infinite' }} />
            </div>
          </div>
          {/* Glass marks */}
          <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="border-t border-cyan-200/50 mx-2" />
            ))}
          </div>
          {/* Count */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="font-display text-5xl font-bold text-slate-800 drop-shadow-lg">
                {glasses}
              </div>
              <div className="text-sm font-semibold text-slate-500">/ {GOAL} glasses</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <Droplets className="w-5 h-5 text-cyan-500" />
          <span className="font-bold text-slate-700">{liters} liters</span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => updateGlasses(-1)}
            disabled={loading || glasses === 0}
            className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center text-cyan-600 hover:bg-cyan-50 active:scale-90 transition-all disabled:opacity-40"
          >
            <Minus className="w-6 h-6" />
          </button>
          <button
            onClick={() => updateGlasses(1)}
            disabled={loading}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg flex items-center justify-center text-white hover:shadow-xl active:scale-90 transition-all"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700">Daily Goal</span>
          <span className="text-sm font-semibold text-slate-500">{glasses} / {GOAL} glasses</span>
        </div>
        <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {glasses >= GOAL && (
          <div className="text-center mt-3 text-green-600 font-bold animate-pop-in">
            <Droplet className="w-5 h-5 inline mr-1" />
            Hydration goal reached! Great job!
          </div>
        )}
      </div>

      {/* Quick add buttons */}
      <div>
        <h3 className="font-display text-lg font-bold text-slate-800 mb-3">Quick Add</h3>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => updateGlasses(n)}
              disabled={loading}
              className="aspect-square rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex flex-col items-center justify-center text-cyan-700 font-bold hover:from-cyan-200 hover:to-blue-200 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-lg">{n}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
