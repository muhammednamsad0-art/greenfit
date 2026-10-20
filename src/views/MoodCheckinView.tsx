import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayStr } from '@/lib/date';
import type { MoodCheckin } from '@/lib/types';
import { Smile, Frown, Meh, Heart, ThumbsUp, Zap, Send } from 'lucide-react';

const MOODS = [
  { id: 'amazing', label: 'Amazing', icon: Zap, color: 'from-green-400 to-emerald-500', bg: 'bg-green-100', text: 'text-green-600' },
  { id: 'happy', label: 'Happy', icon: Smile, color: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-100', text: 'text-yellow-600' },
  { id: 'okay', label: 'Okay', icon: ThumbsUp, color: 'from-blue-400 to-cyan-500', bg: 'bg-blue-100', text: 'text-blue-600' },
  { id: 'neutral', label: 'Neutral', icon: Meh, color: 'from-slate-400 to-slate-500', bg: 'bg-slate-100', text: 'text-slate-600' },
  { id: 'tired', label: 'Tired', icon: Heart, color: 'from-orange-400 to-red-500', bg: 'bg-orange-100', text: 'text-orange-600' },
  { id: 'sad', label: 'Sad', icon: Frown, color: 'from-indigo-400 to-blue-500', bg: 'bg-indigo-100', text: 'text-indigo-600' },
];

export function MoodCheckinView() {
  const today = getTodayStr();
  const [todayMood, setTodayMood] = useState<MoodCheckin | null>(null);
  const [history, setHistory] = useState<MoodCheckin[]>([]);
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    loadData();
  }, [today]);

  async function loadData() {
    const { data: todayData } = await supabase
      .from('mood_checkins')
      .select('*')
      .eq('checkin_date', today)
      .maybeSingle();
    setTodayMood(todayData || null);
    if (todayData) setSelected(todayData.mood);

    const { data: histData } = await supabase
      .from('mood_checkins')
      .select('*')
      .order('checkin_date', { ascending: false })
      .limit(14);
    setHistory(histData || []);
  }

  async function submitMood(moodId: string) {
    setSelected(moodId);
    if (todayMood) {
      const { data } = await supabase
        .from('mood_checkins')
        .update({ mood: moodId, note })
        .eq('id', todayMood.id)
        .select()
        .single();
      if (data) setTodayMood(data);
    } else {
      const { data } = await supabase
        .from('mood_checkins')
        .insert({ checkin_date: today, mood: moodId, note })
        .select()
        .single();
      if (data) {
        setTodayMood(data);
        setHistory([data, ...history]);
      }
    }
  }

  async function saveNote() {
    if (todayMood) {
      const { data } = await supabase
        .from('mood_checkins')
        .update({ note })
        .eq('id', todayMood.id)
        .select()
        .single();
      if (data) setTodayMood(data);
    }
    setShowNote(false);
  }

  const moodCounts = MOODS.map((m) => ({
    ...m,
    count: history.filter((h) => h.mood === m.id).length,
  }));
  const totalCheckins = history.length;
  const mostCommon = moodCounts.sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-6">
      {/* Today's check-in */}
      <div className="glass rounded-3xl p-6">
        <h3 className="font-display text-lg font-bold text-slate-800 mb-1">How are you feeling today?</h3>
        <p className="text-sm text-slate-500 mb-4">Tap your mood to check in</p>
        <div className="grid grid-cols-3 gap-3">
          {MOODS.map((m) => {
            const Icon = m.icon;
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                onClick={() => submitMood(m.id)}
                className={`rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all active:scale-95 ${
                  isSelected
                    ? `bg-gradient-to-br ${m.color} border-transparent shadow-lg animate-pop-in`
                    : 'bg-white/60 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-8 h-8 ${isSelected ? 'text-white' : m.text}`} />
                <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {todayMood && (
          <div className="mt-4 animate-slide-up">
            {!showNote ? (
              <button
                onClick={() => { setNote(todayMood.note || ''); setShowNote(true); }}
                className="text-sm text-blue-500 font-semibold hover:text-blue-600"
              >
                {todayMood.note ? 'Edit note' : '+ Add a note about your mood'}
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-400 outline-none text-slate-700 text-sm resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveNote}
                    className="px-4 py-2 rounded-xl bg-blue-500 text-white font-bold text-sm flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setShowNote(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 text-slate-600 font-bold text-sm active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mood summary */}
      {totalCheckins > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="font-display text-base font-bold text-slate-800 mb-3">Classroom Mood Summary</h3>
          <div className="flex items-center gap-3 mb-4">
            {(() => {
              const Icon = mostCommon.icon;
              return (
                <>
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${mostCommon.bg}`}>
                    <Icon className={`w-6 h-6 ${mostCommon.text}`} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">
                      Most common: {mostCommon.label}
                    </div>
                    <div className="text-xs text-slate-500">
                      Based on {totalCheckins} check-in{totalCheckins !== 1 ? 's' : ''}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="space-y-2">
            {moodCounts.filter((m) => m.count > 0).map((m) => {
              const pct = (m.count / totalCheckins) * 100;
              const Icon = m.icon;
              return (
                <div key={m.id} className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${m.text} shrink-0`} />
                  <span className="text-xs font-semibold text-slate-500 w-16 shrink-0">{m.label}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${m.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-6 text-right">{m.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-bold text-slate-800 mb-3">Recent Check-ins</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((c) => {
              const mood = MOODS.find((m) => m.id === c.mood);
              const Icon = mood?.icon || Meh;
              return (
                <div key={c.id} className="glass rounded-2xl p-3 flex items-center gap-3 animate-slide-up">
                  <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${mood?.bg || 'bg-slate-100'}`}>
                    <Icon className={`w-4 h-4 ${mood?.text || 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-700">{mood?.label || c.mood}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(c.checkin_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {c.note ? ` · ${c.note}` : ''}
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
