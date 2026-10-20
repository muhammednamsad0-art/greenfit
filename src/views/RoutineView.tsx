import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayStr } from '@/lib/date';
import type { RoutineItem, RoutineCompletion } from '@/lib/types';
import {
  Droplet, Activity, Apple, Footprints, Wind, Sparkles, NotebookPen, Moon,
  CheckCircle2, Circle, Plus, Trash2, Sunrise, Sun, Sunset,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Droplet, Activity, Apple, Footprints, Wind, Sparkles, NotebookPen, Moon,
};

const TIME_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  morning: { label: 'Morning', icon: Sunrise, color: 'text-amber-500' },
  afternoon: { label: 'Afternoon', icon: Sun, color: 'text-orange-500' },
  evening: { label: 'Evening', icon: Sunset, color: 'text-indigo-500' },
};

export function RoutineView() {
  const today = getTodayStr();
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [completions, setCompletions] = useState<RoutineCompletion[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('morning');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [today]);

  async function loadData() {
    setLoading(true);
    const { data: itemsData } = await supabase.from('routine_items').select('*').order('sort_order');
    setItems(itemsData || []);
    const { data: compData } = await supabase
      .from('routine_completions')
      .select('*')
      .eq('completion_date', today);
    setCompletions(compData || []);
    setLoading(false);
  }

  async function toggleItem(itemId: string) {
    const existing = completions.find((c) => c.routine_item_id === itemId);
    if (existing) {
      await supabase.from('routine_completions').delete().eq('id', existing.id);
      setCompletions(completions.filter((c) => c.id !== existing.id));
    } else {
      const { data } = await supabase
        .from('routine_completions')
        .insert({ routine_item_id: itemId, completion_date: today, completed: true })
        .select()
        .single();
      if (data) setCompletions([...completions, data]);
    }
  }

  async function addItem() {
    if (!newName.trim()) return;
    const maxOrder = Math.max(0, ...items.map((i) => i.sort_order));
    const { data } = await supabase
      .from('routine_items')
      .insert({
        name: newName.trim(),
        icon: 'CheckCircle2',
        time_of_day: newTime,
        sort_order: maxOrder + 1,
      })
      .select()
      .single();
    if (data) setItems([...items, data]);
    setNewName('');
    setShowAdd(false);
  }

  async function deleteItem(id: string) {
    await supabase.from('routine_items').delete().eq('id', id);
    setItems(items.filter((i) => i.id !== id));
  }

  const grouped = ['morning', 'afternoon', 'evening'].map((time) => ({
    time,
    items: items.filter((i) => i.time_of_day === time).sort((a, b) => a.sort_order - b.sort_order),
  }));

  const totalItems = items.length;
  const completedCount = completions.length;
  const progress = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700">Today's Routine</span>
          <span className="text-sm font-semibold text-slate-500">{completedCount} / {totalItems} done</span>
        </div>
        <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && totalItems > 0 && (
          <div className="text-center mt-2 text-green-600 font-bold animate-pop-in">
            <CheckCircle2 className="w-5 h-5 inline mr-1" />
            All done! Amazing routine!
          </div>
        )}
      </div>

      {/* Routine groups */}
      {grouped.map(({ time, items: groupItems }) => {
        const info = TIME_LABELS[time];
        const TimeIcon = info.icon;
        return (
          <div key={time}>
            <div className="flex items-center gap-2 mb-3">
              <TimeIcon className={`w-5 h-5 ${info.color}`} />
              <h3 className="font-display text-lg font-bold text-slate-800">{info.label}</h3>
              <span className="text-sm text-slate-400 font-semibold">
                ({groupItems.filter((i) => completions.some((c) => c.routine_item_id === i.id)).length}/{groupItems.length})
              </span>
            </div>
            <div className="space-y-2">
              {groupItems.length === 0 && (
                <div className="text-sm text-slate-400 px-4 py-3 rounded-xl bg-white/40">
                  No {info.label.toLowerCase()} tasks yet.
                </div>
              )}
              {groupItems.map((item) => {
                const done = completions.some((c) => c.routine_item_id === item.id);
                const Icon = ICON_MAP[item.icon] || CheckCircle2;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-3 flex items-center gap-3 border-2 transition-all card-hover ${
                      done
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                        : 'bg-white/70 border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      disabled={loading}
                      className="shrink-0"
                    >
                      {done ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-300" />
                      )}
                    </button>
                    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                      done ? 'bg-green-100' : 'bg-slate-100'
                    }`}>
                      <Icon className={`w-4 h-4 ${done ? 'text-green-600' : 'text-slate-400'}`} />
                    </div>
                    <span className={`flex-1 text-sm font-semibold ${
                      done ? 'text-slate-400 line-through' : 'text-slate-700'
                    }`}>
                      {item.name}
                    </span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-slate-200 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Add new */}
      {showAdd ? (
        <div className="glass rounded-2xl p-4 space-y-3 animate-slide-up">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New routine task..."
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-green-400 outline-none text-slate-700"
            autoFocus
          />
          <div className="flex gap-2">
            {['morning', 'afternoon', 'evening'].map((t) => (
              <button
                key={t}
                onClick={() => setNewTime(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  newTime === t
                    ? 'bg-gradient-to-r from-green-400 to-teal-500 text-white'
                    : 'bg-white/60 text-slate-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={addItem}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold active:scale-95 transition-all"
            >
              Add Task
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewName(''); }}
              className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-600 font-bold active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-bold hover:border-green-400 hover:text-green-600 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Custom Task
        </button>
      )}
    </div>
  );
}
