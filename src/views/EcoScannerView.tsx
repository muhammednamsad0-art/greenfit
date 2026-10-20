import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayStr, formatDate, addDays } from '@/lib/date';
import {
  Leaf, TreePine, Recycle, Car, Utensils, Lightbulb,
  Plus, Minus, Award, Cloud, TrendingDown,
} from 'lucide-react';

const ECO_ACTIONS = [
  { id: 'no-plastic', label: 'No Plastic Today', icon: Recycle, co2: 200, color: 'from-green-400 to-emerald-500', desc: 'Avoided single-use plastics' },
  { id: 'meatless', label: 'Meatless Meal', icon: Utensils, co2: 150, color: 'from-teal-400 to-cyan-500', desc: 'Ate a plant-based meal' },
  { id: 'lights-off', label: 'Lights Off', icon: Lightbulb, co2: 100, color: 'from-amber-400 to-yellow-500', desc: 'Turned off unused lights' },
  { id: 'no-car', label: 'No Car Trip', icon: Car, co2: 300, color: 'from-orange-400 to-red-500', desc: 'Walked or cycled instead of driving' },
  { id: 'planted', label: 'Planted / Watered', icon: TreePine, co2: 250, color: 'from-green-400 to-teal-500', desc: 'Cared for a plant or tree' },
  { id: 'recycled', label: 'Recycled Waste', icon: Recycle, co2: 80, color: 'from-blue-400 to-indigo-500', desc: 'Sorted and recycled waste' },
];

const TODAY = getTodayStr();

export function EcoScannerView() {
  const [actions, setActions] = useState<Record<string, number>>({});
  const [weekTotal, setWeekTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data } = await supabase.from('eco_actions_log').select('*').eq('log_date', TODAY);
    const map: Record<string, number> = {};
    (data || []).forEach((row: { action_id: string; count: number }) => {
      map[row.action_id] = row.count;
    });
    setActions(map);

    // Week total
    const weekStart = formatDate(addDays(new Date(), -6));
    const { data: weekData } = await supabase.from('eco_actions_log').select('*').gte('log_date', weekStart);
    let total = 0;
    (weekData || []).forEach((row: { action_id: string; count: number }) => {
      const action = ECO_ACTIONS.find((a) => a.id === row.action_id);
      if (action) total += action.co2 * row.count;
    });
    setWeekTotal(total);
  }

  async function adjustAction(actionId: string, delta: number) {
    const current = actions[actionId] || 0;
    const newVal = Math.max(0, current + delta);
    setActions({ ...actions, [actionId]: newVal });

    if (newVal === 0) {
      await supabase.from('eco_actions_log').delete().eq('action_id', actionId).eq('log_date', TODAY);
    } else if (current === 0) {
      await supabase.from('eco_actions_log').insert({
        log_date: TODAY,
        action_id: actionId,
        count: newVal,
      });
    } else {
      await supabase.from('eco_actions_log').update({ count: newVal }).eq('action_id', actionId).eq('log_date', TODAY);
    }
    loadData();
  }

  const todayTotal = Object.entries(actions).reduce((sum, [id, count]) => {
    const action = ECO_ACTIONS.find((a) => a.id === id);
    return sum + (action?.co2 || 0) * count;
  }, 0);
  const treeEquiv = (todayTotal / 21000).toFixed(3);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-3xl p-5 bg-gradient-to-br from-emerald-400 via-green-400 to-teal-400 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative flex items-center gap-3">
          <Leaf className="w-10 h-10 shrink-0" />
          <div>
            <h3 className="font-display text-lg font-bold">Eco Scanner</h3>
            <p className="text-sm text-white/90">Track your daily eco actions and see your CO2 impact</p>
          </div>
        </div>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <Cloud className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{todayTotal}</div>
          <div className="text-xs text-slate-500 font-semibold">g CO2 Saved Today</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <TreePine className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{treeEquiv}</div>
          <div className="text-xs text-slate-500 font-semibold">Tree Equivalent</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <TrendingDown className="w-6 h-6 text-teal-500 mx-auto mb-1" />
          <div className="font-display text-2xl font-bold text-slate-800">{weekTotal}</div>
          <div className="text-xs text-slate-500 font-semibold">g CO2 This Week</div>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ECO_ACTIONS.map((action) => {
          const Icon = action.icon;
          const count = actions[action.id] || 0;
          return (
            <div
              key={action.id}
              className={`rounded-2xl p-4 border-2 transition-all ${
                count > 0
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                  : 'bg-white/60 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} shadow-md shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm">{action.label}</h4>
                  <p className="text-xs text-slate-500">{action.desc}</p>
                  <span className="text-xs font-bold text-green-600">~{action.co2}g CO2 saved</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => adjustAction(action.id, -1)}
                  disabled={count === 0}
                  className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-all disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-display text-xl font-bold text-slate-700 w-8 text-center">{count}</span>
                <button
                  onClick={() => adjustAction(action.id, 1)}
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-md active:scale-90 transition-all`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Achievement */}
      {todayTotal >= 500 && (
        <div className="glass rounded-2xl p-4 flex items-center gap-3 animate-pop-in">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100">
            <Award className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="font-bold text-slate-800">Eco Champion!</div>
            <div className="text-sm text-slate-500">You've saved over 500g of CO2 today — that's like planting a small tree!</div>
          </div>
        </div>
      )}
    </div>
  );
}
