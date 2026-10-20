import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayStr, formatDate, addDays } from '@/lib/date';
import { CHALLENGES, TROPHY_DEFS } from '@/lib/challenges';
import type { AppState, ChallengeCompletion, Trophy } from '@/lib/types';
import { fireConfetti } from '@/components/Confetti';
import {
  Droplet, Footprints, Apple, Activity, Moon, Wind, Recycle, TreeDeciduous,
  Lightbulb, TrendingUp, FileText, Sun, Salad, Trash2, Brain, ShowerHead,
  CheckCircle2, Circle, Zap, Leaf, Heart, Award, Flame, Trophy as TrophyIcon,
  Star, Crown, Gem, Medal, Droplets,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Droplet, Footprints, Apple, Activity, Moon, Wind, Recycle, TreeDeciduous,
  Lightbulb, TrendingUp, FileText, Sun, Salad, Trash2, Brain, ShowerHead,
  Award, Flame, Trophy: TrophyIcon, Star, Crown, Gem, Medal, Droplets, Leaf, Heart,
};

interface ChallengesViewProps {
  state: AppState | null;
  onStateChange: () => void;
}

export function ChallengesView({ state, onStateChange }: ChallengesViewProps) {
  const today = getTodayStr();
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [doubleImpactUsed, setDoubleImpactUsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [today]);

  async function loadData() {
    setLoading(true);
    const { data: compData } = await supabase
      .from('challenge_completions')
      .select('*')
      .eq('challenge_date', today);
    setCompletions(compData || []);

    const { data: trophyData } = await supabase.from('trophies').select('*');
    setTrophies(trophyData || []);

    const usedDouble = (compData || []).some((c: ChallengeCompletion) => c.double_impact);
    setDoubleImpactUsed(usedDouble);
    setLoading(false);
  }

  async function toggleChallenge(challengeId: string, points: number) {
    const existing = completions.find((c) => c.challenge_id === challengeId);
    if (existing && existing.completed) {
      await supabase
        .from('challenge_completions')
        .delete()
        .eq('id', existing.id);
      await updatePoints(-existing.points_earned, false);
      setCompletions(completions.filter((c) => c.id !== existing.id));
    } else {
      const earned = doubleImpactUsed ? points * 2 : points;
      const { data } = await supabase
        .from('challenge_completions')
        .insert({
          challenge_id: challengeId,
          challenge_date: today,
          completed: true,
          points_earned: earned,
          double_impact: doubleImpactUsed,
        })
        .select()
        .single();
      if (data) {
        setCompletions([...completions, data]);
        await updatePoints(earned, true);
        fireConfetti();
      }
    }
    onStateChange();
    await checkTrophies();
  }

  async function activateDoubleImpact() {
    if (doubleImpactUsed) return;
    setDoubleImpactUsed(true);
  }

  async function updatePoints(delta: number, completed: boolean) {
    if (!state) return;
    const newPoints = Math.max(0, (state.total_points || 0) + delta);
    const lastActive = state.last_active_date;
    const todayDate = today;
    let newStreak = state.current_streak || 0;

    if (completed) {
      if (lastActive) {
        const last = formatDate(new Date(lastActive));
        const yesterday = formatDate(addDays(new Date(todayDate), -1));
        if (last === yesterday) {
          newStreak = newStreak + 1;
        } else if (last === todayDate) {
          // already active today
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
    } else {
      // uncompleting — if no other completions today, break streak
      const remaining = completions.filter((c) => c.completed && c.challenge_id !== '');
      if (remaining.length === 0) {
        newStreak = Math.max(0, newStreak - 1);
      }
    }

    const longest = Math.max(state.longest_streak || 0, newStreak);
    await supabase
      .from('app_state')
      .update({
        total_points: newPoints,
        current_streak: newStreak,
        longest_streak: longest,
        last_active_date: completed ? todayDate : state.last_active_date,
      })
      .eq('user_id', state.user_id);
  }

  async function checkTrophies() {
    const earnedIds = new Set(trophies.map((t) => trophy_id(t)));
    const newTrophies: { id: string; name: string; description: string }[] = [];

    const points = (state?.total_points || 0);
    const streak = state?.current_streak || 0;
    const completedCount = completions.filter((c) => c.completed).length;
    const doubleCount = completions.filter((c) => c.double_impact).length;

    if (completedCount >= 1 && !earnedIds.has('first-challenge')) newTrophies.push(TROPHY_DEFS[0]);
    if (streak >= 3 && !earnedIds.has('streak-3')) newTrophies.push(TROPHY_DEFS[1]);
    if (streak >= 7 && !earnedIds.has('streak-7')) newTrophies.push(TROPHY_DEFS[2]);
    if (streak >= 30 && !earnedIds.has('streak-30')) newTrophies.push(TROPHY_DEFS[3]);
    if (points >= 100 && !earnedIds.has('points-100')) newTrophies.push(TROPHY_DEFS[4]);
    if (points >= 500 && !earnedIds.has('points-500')) newTrophies.push(TROPHY_DEFS[5]);
    if (points >= 1000 && !earnedIds.has('points-1000')) newTrophies.push(TROPHY_DEFS[6]);
    if (doubleCount >= 5 && !earnedIds.has('double-impact-5')) newTrophies.push(TROPHY_DEFS[7]);

    for (const t of newTrophies) {
      await supabase.from('trophies').insert({
        trophy_id: t.id,
        name: t.name,
        description: t.description,
        earned_date: today,
      });
    }
    if (newTrophies.length > 0) {
      fireConfetti();
      await loadData();
    }
  }

  function trophy_id(t: Trophy): string {
    return t.trophy_id;
  }

  const healthChallenges = CHALLENGES.filter((c) => c.category === 'health');
  const ecoChallenges = CHALLENGES.filter((c) => c.category === 'eco');
  const completedCount = completions.filter((c) => c.completed).length;
  const todayPoints = completions.filter((c) => c.completed).reduce((sum, c) => sum + c.points_earned, 0);

  return (
    <div className="space-y-6">
      {/* Double Impact Banner */}
      <div className={`rounded-2xl p-4 flex items-center gap-3 transition-all ${
        doubleImpactUsed
          ? 'bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300'
          : 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 animate-pulse-ring'
      }`}>
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${
          doubleImpactUsed ? 'bg-amber-200' : 'bg-purple-200'
        }`}>
          <Zap className={`w-6 h-6 ${doubleImpactUsed ? 'text-amber-600' : 'text-purple-600'}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-slate-800">
          {doubleImpactUsed ? 'Double Impact Active!' : 'Activate Double Impact'}
          </h3>
          <p className="text-sm text-slate-600">
          {doubleImpactUsed ? 'All challenges earn 2x points today!' : 'Double your points on every challenge you complete today!'}
          </p>
        </div>
        {!doubleImpactUsed && (
          <button
            onClick={activateDoubleImpact}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            Activate
          </button>
        )}
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <div className="font-display text-3xl font-bold text-green-600">{completedCount}</div>
          <div className="text-sm text-slate-500 font-semibold">Completed Today</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="font-display text-3xl font-bold text-blue-600">{todayPoints}</div>
          <div className="text-sm text-slate-500 font-semibold">Points Earned Today</div>
        </div>
      </div>

      {/* Health Challenges */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-rose-500" />
          <h3 className="font-display text-lg font-bold text-slate-800">Health Challenges</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {healthChallenges.map((ch) => {
            const comp = completions.find((c) => c.challenge_id === ch.id && c.completed);
            const Icon = ICON_MAP[ch.icon] || CheckCircle2;
            const earned = comp?.points_earned || ch.points;
            return (
              <button
                key={ch.id}
                onClick={() => !loading && toggleChallenge(ch.id, ch.points)}
                className={`text-left rounded-2xl p-4 border-2 transition-all card-hover ${
                  comp
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                    : 'bg-white/70 border-slate-200 hover:border-green-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${
                    comp ? 'bg-green-200' : 'bg-rose-50'
                  }`}>
                    <Icon className={`w-5 h-5 ${comp ? 'text-green-700' : 'text-rose-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-sm">{ch.title}</h4>
                      {comp ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ch.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        +{earned} pts
                      </span>
                      {comp?.double_impact && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          2x
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Eco Challenges */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Leaf className="w-5 h-5 text-green-600" />
          <h3 className="font-display text-lg font-bold text-slate-800">Eco Challenges</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ecoChallenges.map((ch) => {
            const comp = completions.find((c) => c.challenge_id === ch.id && c.completed);
            const Icon = ICON_MAP[ch.icon] || CheckCircle2;
            const earned = comp?.points_earned || ch.points;
            return (
              <button
                key={ch.id}
                onClick={() => !loading && toggleChallenge(ch.id, ch.points)}
                className={`text-left rounded-2xl p-4 border-2 transition-all card-hover ${
                  comp
                    ? 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-300'
                    : 'bg-white/70 border-slate-200 hover:border-teal-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${
                    comp ? 'bg-teal-200' : 'bg-green-50'
                  }`}>
                    <Icon className={`w-5 h-5 ${comp ? 'text-teal-700' : 'text-green-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-sm">{ch.title}</h4>
                      {comp ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ch.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                        +{earned} pts
                      </span>
                      {comp?.double_impact && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          2x
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trophies */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrophyIcon className="w-5 h-5 text-amber-500" />
          <h3 className="font-display text-lg font-bold text-slate-800">Trophy Cabinet</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {TROPHY_DEFS.map((t) => {
            const earned = trophies.some((tr) => tr.trophy_id === t.id);
            const Icon = ICON_MAP[t.icon] || TrophyIcon;
            return (
              <div
                key={t.id}
                className={`rounded-2xl p-4 text-center border-2 transition-all ${
                  earned
                    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 animate-pop-in'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2 ${
                  earned ? 'bg-amber-200' : 'bg-slate-200'
                }`}>
                  <Icon className={`w-6 h-6 ${earned ? 'text-amber-600' : 'text-slate-400'}`} />
                </div>
                <div className={`font-bold text-sm ${earned ? 'text-slate-800' : 'text-slate-400'}`}>
                  {t.name}
                </div>
                <div className={`text-xs mt-0.5 ${earned ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t.description}
                </div>
                {earned && (
                  <div className="text-xs font-bold text-amber-600 mt-1">Earned!</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
