import { Trophy, Flame, Star, Zap } from 'lucide-react';
import type { AppState } from '@/lib/types';

interface StatsBarProps {
  state: AppState | null;
  trophyCount: number;
}

export function StatsBar({ state, trophyCount }: StatsBarProps) {
  const streak = state?.current_streak ?? 0;
  const points = state?.total_points ?? 0;

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="glass rounded-2xl p-4 text-center card-hover">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 mb-2">
          <Flame className="w-5 h-5 text-orange-500" />
        </div>
        <div className="font-display text-2xl font-bold text-slate-800">{streak}</div>
        <div className="text-xs text-slate-500 font-semibold">Day Streak</div>
      </div>
      <div className="glass rounded-2xl p-4 text-center card-hover">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-100 mb-2">
          <Star className="w-5 h-5 text-yellow-500" />
        </div>
        <div className="font-display text-2xl font-bold text-slate-800">{points}</div>
        <div className="text-xs text-slate-500 font-semibold">Total Points</div>
      </div>
      <div className="glass rounded-2xl p-4 text-center card-hover">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 mb-2">
          <Trophy className="w-5 h-5 text-green-600" />
        </div>
        <div className="font-display text-2xl font-bold text-slate-800">{trophyCount}</div>
        <div className="text-xs text-slate-500 font-semibold">Trophies</div>
      </div>
    </div>
  );
}

export function MiniStat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="text-sm font-bold text-slate-800 ml-auto">{value}</span>
    </div>
  );
}

export { Zap };
