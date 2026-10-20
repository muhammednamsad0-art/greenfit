import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayStr, formatDate, addDays, getWeekStart, getMonthStart } from '@/lib/date';
import type { ChallengeCompletion, WaterLog, ExerciseLog, MoodCheckin } from '@/lib/types';
import { Calendar, TrendingUp, Droplet, Activity, Flame, Smile, BarChart3, Award } from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly';

export function DashboardView() {
  const [period, setPeriod] = useState<Period>('daily');
  const [challengeData, setChallengeData] = useState<ChallengeCompletion[]>([]);
  const [waterData, setWaterData] = useState<WaterLog[]>([]);
  const [exerciseData, setExerciseData] = useState<ExerciseLog[]>([]);
  const [moodData, setMoodData] = useState<MoodCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    let startDate: string;
    if (period === 'daily') {
      startDate = getTodayStr();
    } else if (period === 'weekly') {
      startDate = formatDate(getWeekStart());
    } else {
      startDate = formatDate(getMonthStart());
    }

    const [challenges, water, exercise, moods] = await Promise.all([
      supabase.from('challenge_completions').select('*').gte('challenge_date', startDate),
      supabase.from('water_log').select('*').gte('log_date', startDate),
      supabase.from('exercise_log').select('*').gte('log_date', startDate),
      supabase.from('mood_checkins').select('*').gte('checkin_date', startDate),
    ]);

    setChallengeData(challenges.data || []);
    setWaterData(water.data || []);
    setExerciseData(exercise.data || []);
    setMoodData(moods.data || []);
    setLoading(false);
  }

  const completedChallenges = challengeData.filter((c) => c.completed);
  const totalPoints = completedChallenges.reduce((s, c) => s + c.points_earned, 0);
  const totalWater = waterData.reduce((s, w) => s + w.glasses, 0);
  const totalMovements = exerciseData.reduce((s, e) => s + e.movement_count, 0);
  const totalCalories = exerciseData.reduce((s, e) => s + e.calories_burned, 0);
  const totalExerciseTime = exerciseData.reduce((s, e) => s + e.duration_seconds, 0);

  // Chart data: last 7 days
  const last7Days = [...Array(7)].map((_, i) => {
    const d = addDays(new Date(), -(6 - i));
    const dateStr = formatDate(d);
    const dayPoints = challengeData
      .filter((c) => c.challenge_date === dateStr && c.completed)
      .reduce((s, c) => s + c.points_earned, 0);
    const dayWater = waterData.find((w) => w.log_date === dateStr)?.glasses || 0;
    const dayCalories = exerciseData
      .filter((e) => e.log_date === dateStr)
      .reduce((s, e) => s + e.calories_burned, 0);
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      points: dayPoints,
      water: dayWater,
      calories: dayCalories,
    };
  });

  const maxPoints = Math.max(...last7Days.map((d) => d.points), 1);
  const maxWater = Math.max(...last7Days.map((d) => d.water), 1);
  const maxCalories = Math.max(...last7Days.map((d) => d.calories), 1);

  // Mood distribution
  const moodCounts: Record<string, number> = {};
  moodData.forEach((m) => {
    moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
  });

  const stats = [
    { icon: Award, label: 'Challenges Done', value: completedChallenges.length, color: 'from-green-400 to-emerald-500', bg: 'bg-green-100', text: 'text-green-600' },
    { icon: TrendingUp, label: 'Points Earned', value: totalPoints, color: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-100', text: 'text-yellow-600' },
    { icon: Droplet, label: 'Water Glasses', value: totalWater, color: 'from-cyan-400 to-blue-500', bg: 'bg-cyan-100', text: 'text-cyan-600' },
    { icon: Activity, label: 'Movements', value: totalMovements, color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-100', text: 'text-blue-600' },
    { icon: Flame, label: 'Est. Calories', value: totalCalories, color: 'from-orange-400 to-red-500', bg: 'bg-orange-100', text: 'text-orange-600' },
    { icon: Activity, label: 'Active Time', value: `${Math.floor(totalExerciseTime / 60)}m`, color: 'from-purple-400 to-pink-500', bg: 'bg-purple-100', text: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="glass rounded-2xl p-2 flex">
        {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${
              period === p
                ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="glass rounded-2xl p-4 text-center card-hover">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${s.bg} mb-2`}>
                <Icon className={`w-5 h-5 ${s.text}`} />
              </div>
              <div className="font-display text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 font-semibold">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-green-600" />
          <h3 className="font-display text-base font-bold text-slate-800">Last 7 Days</h3>
        </div>

        {/* Points chart */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 mb-2">Points per day</div>
          <div className="flex items-end justify-between gap-1.5 h-24">
            {last7Days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-green-400 to-emerald-400 transition-all duration-500"
                    style={{ height: `${(d.points / maxPoints) * 100}%`, minHeight: d.points > 0 ? '4px' : '0' }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">{d.label[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Water chart */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 mb-2">Water glasses per day</div>
          <div className="flex items-end justify-between gap-1.5 h-20">
            {last7Days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-cyan-400 to-blue-400 transition-all duration-500"
                    style={{ height: `${(d.water / maxWater) * 100}%`, minHeight: d.water > 0 ? '4px' : '0' }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">{d.label[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calories chart */}
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">Calories burned per day</div>
          <div className="flex items-end justify-between gap-1.5 h-20">
            {last7Days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-orange-400 to-red-400 transition-all duration-500"
                    style={{ height: `${(d.calories / maxCalories) * 100}%`, minHeight: d.calories > 0 ? '4px' : '0' }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">{d.label[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mood distribution */}
      {Object.keys(moodCounts).length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Smile className="w-5 h-5 text-rose-500" />
            <h3 className="font-display text-base font-bold text-slate-800">Mood Distribution</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(moodCounts).map(([mood, count]) => {
              const pct = (count / Object.values(moodCounts).reduce((a, b) => a + b, 0)) * 100;
              return (
                <div key={mood} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 w-16 capitalize shrink-0">{mood}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-slate-400 py-4">
          <Calendar className="w-5 h-5 inline mr-1" />
          Loading your progress...
        </div>
      )}
    </div>
  );
}
