import { useEffect, useState, useRef } from 'react';
import { Wind, Play, Pause, RotateCcw, Heart } from 'lucide-react';

const TECHNIQUES = [
  { id: '478', label: 'Calm (4-7-8)', phases: [
    { name: 'Breathe In', duration: 4, action: 'inhale' },
    { name: 'Hold', duration: 7, action: 'hold' },
    { name: 'Breathe Out', duration: 8, action: 'exhale' },
  ]},
  { id: 'box', label: 'Focus (Box)', phases: [
    { name: 'Breathe In', duration: 4, action: 'inhale' },
    { name: 'Hold', duration: 4, action: 'hold' },
    { name: 'Breathe Out', duration: 4, action: 'exhale' },
    { name: 'Hold', duration: 4, action: 'hold' },
  ]},
  { id: 'deep', label: 'Deep Breath', phases: [
    { name: 'Breathe In', duration: 5, action: 'inhale' },
    { name: 'Breathe Out', duration: 5, action: 'exhale' },
  ]},
];

export function BreathingView() {
  const [technique, setTechnique] = useState(TECHNIQUES[0]);
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [cycles, setCycles] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPhase = technique.phases[phaseIdx];

  useEffect(() => {
    if (!running) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    setCountdown(currentPhase.duration);

    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setPhaseIdx((prev) => {
            const next = (prev + 1) % technique.phases.length;
            if (next === 0) setCycles((cy) => cy + 1);
            return next;
          });
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, phaseIdx, technique]);

  function start() {
    setPhaseIdx(0);
    setCycles(0);
    setRunning(true);
  }

  function stop() {
    setRunning(false);
    setPhaseIdx(0);
    setCountdown(0);
    setCycles(0);
  }

  // Circle scale based on phase
  const circleScale = running
    ? currentPhase.action === 'inhale'
      ? 1 + (1 - countdown / currentPhase.duration) * 0.8
      : currentPhase.action === 'exhale'
      ? 1.8 - (1 - countdown / currentPhase.duration) * 0.8
      : currentPhase.action === 'hold' && phaseIdx === 1
      ? 1.8
      : 1
    : 1;

  const circleColor = currentPhase.action === 'inhale' ? 'from-teal-300 to-cyan-400'
    : currentPhase.action === 'exhale' ? 'from-blue-300 to-indigo-400'
    : 'from-violet-300 to-purple-400';

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-3xl p-5 bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-400 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative flex items-center gap-3">
          <Wind className="w-10 h-10 shrink-0" />
          <div>
            <h3 className="font-display text-lg font-bold">Breathing Bubble</h3>
            <p className="text-sm text-white/90">Follow the bubble to breathe deeply and calm your mind</p>
          </div>
        </div>
      </div>

      {/* Technique selector */}
      <div className="glass rounded-2xl p-2 flex">
        {TECHNIQUES.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTechnique(t); stop(); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              technique.id === t.id
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Breathing circle */}
      <div className="glass rounded-3xl p-8 flex flex-col items-center">
        <div className="relative w-64 h-64 flex items-center justify-center mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
          {/* Animated bubble */}
          <div
            className={`absolute rounded-full bg-gradient-to-br ${circleColor} shadow-2xl transition-all duration-1000 ease-in-out`}
            style={{
              width: '120px',
              height: '120px',
              transform: `scale(${circleScale})`,
            }}
          >
            <div className="w-full h-full rounded-full flex items-center justify-center">
              {running && (
                <span className="font-display text-5xl font-bold text-white drop-shadow-lg tabular-nums">
                  {countdown}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Phase label */}
        <div className="text-center mb-4 h-8">
          {running ? (
            <p className="font-display text-xl font-bold text-slate-700">{currentPhase.name}</p>
          ) : (
            <p className="text-sm text-slate-400">Press start to begin breathing</p>
          )}
        </div>

        {/* Cycles */}
        {running && (
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-semibold text-slate-500">{cycles} cycles completed</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!running ? (
            <button
              onClick={start}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Breathing
            </button>
          ) : (
            <button
              onClick={() => setRunning(false)}
              className="px-6 py-3 rounded-2xl bg-orange-500 text-white font-bold shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              <Pause className="w-5 h-5" />
              Pause
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

      {/* Tip */}
      <div className="glass rounded-2xl p-4">
        <p className="text-sm text-slate-500 text-center">
          <Wind className="w-4 h-4 inline mr-1 text-teal-400" />
          Sit comfortably, relax your shoulders, and follow the bubble. Breathe in as it grows, out as it shrinks. Even 2 minutes can reduce stress!
        </p>
      </div>
    </div>
  );
}
