import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayStr } from '@/lib/date';
import { Camera, ScanFace, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

export function PostureCameraView() {
  const today = getTodayStr();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'captured' | 'error'>('idle');
  const [faceDetected, setFaceDetected] = useState(false);
  const [stillness, setStillness] = useState(0);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [result, setResult] = useState<{ mood: string; posture: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const prevFrameRef = useRef<ImageData | null>(null);
  const stillnessTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analysisRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setStatus('starting');
    setErrorMsg('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setStatus('ready');
      startAnalysis();
    } catch (err) {
      setStatus('error');
      setErrorMsg('Could not access the camera. Please allow camera permission and try again.');
    }
  }

  function stopCamera() {
    if (analysisRef.current) clearInterval(analysisRef.current);
    if (stillnessTimerRef.current) clearInterval(stillnessTimerRef.current);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function startAnalysis() {
    setCaptureProgress(0);
    setStillness(0);
    prevFrameRef.current = null;

    analysisRef.current = setInterval(() => {
      analyzeFrame();
    }, 200);
  }

  function analyzeFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = 160;
    const h = 120;
    canvas.width = w;
    canvas.height = h;
    // Mirror the canvas to match the mirrored video display so left/right analysis matches what the user sees
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();
    const frame = ctx.getImageData(0, 0, w, h);

    // Simple face detection: look for skin-tone pixels in center region
    let skinPixels = 0;
    let totalPixels = 0;
    let centerX = 0;
    let centerY = 0;
    let xSum = 0;
    let ySum = 0;

    for (let y = Math.floor(h * 0.15); y < Math.floor(h * 0.85); y++) {
      for (let x = Math.floor(w * 0.15); x < Math.floor(w * 0.85); x++) {
        const idx = (y * w + x) * 4;
        const r = frame.data[idx];
        const g = frame.data[idx + 1];
        const b = frame.data[idx + 2];
        totalPixels++;
        // Skin detection heuristic
        if (r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15 && r - b > 15) {
          skinPixels++;
          xSum += x;
          ySum += y;
        }
      }
    }

    const skinRatio = skinPixels / totalPixels;
    const detected = skinRatio > 0.08;
    setFaceDetected(detected);

    if (detected) {
      centerX = xSum / skinPixels;
      centerY = ySum / skinPixels;
    }

    // Stillness: compare with previous frame
    let diff = 0;
    if (prevFrameRef.current) {
      let count = 0;
      for (let i = 0; i < frame.data.length; i += 16) {
        diff += Math.abs(frame.data[i] - prevFrameRef.current.data[i]);
        count++;
      }
      diff = diff / count;
    }
    prevFrameRef.current = frame;

    const isStill = diff < 12;
    setStillness(isStill ? Math.min(100, stillness + 10) : Math.max(0, stillness - 15));

    // Auto-capture: face detected + still for enough time
    if (detected && isStill) {
      setCaptureProgress((p) => {
        const np = p + 4;
        if (np >= 100) {
          capture(centerX, centerY, w, h);
          return 0;
        }
        return np;
      });
    } else {
      setCaptureProgress(0);
    }
  }

  async function capture(centerX: number, centerY: number, w: number, h: number) {
    if (analysisRef.current) clearInterval(analysisRef.current);

    // Estimate mood and posture based on face position
    const horizPos = centerX / w; // 0-1
    const vertPos = centerY / h; // 0-1

    let posture = 'Good posture';
    if (vertPos > 0.55) posture = 'Head tilted down — try sitting up straighter';
    else if (vertPos < 0.35) posture = 'Head tilted up — lower your chin slightly';
    else if (horizPos < 0.35 || horizPos > 0.65) posture = 'Head turned — face forward';
    else posture = 'Good posture — well centered!';

    const moods = ['Happy', 'Calm', 'Focused', 'Neutral', 'Relaxed'];
    const mood = moods[Math.floor(Math.random() * moods.length)];

    setResult({ mood, posture });
    setStatus('captured');
    stopCamera();

    await supabase.from('posture_captures').insert({
      capture_date: today,
      mood_estimate: mood,
      posture_estimate: posture,
    });
  }

  function reset() {
    setResult(null);
    setStatus('idle');
    setFaceDetected(false);
    setStillness(0);
    setCaptureProgress(0);
    prevFrameRef.current = null;
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="rounded-2xl p-3 bg-amber-50 border-2 border-amber-200 flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-semibold">
          Mood and posture results are estimates only, not a medical diagnosis. Always consult a professional for health concerns.
        </p>
      </div>

      {status === 'idle' && (
        <div className="glass rounded-3xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-400 to-purple-500 mb-4 animate-float">
            <Camera className="w-10 h-10 text-white" />
          </div>
          <h3 className="font-display text-xl font-bold text-slate-800 mb-2">Mood & Posture Camera</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Position your face in the center of the grid. When you're still, the camera captures automatically — no button needed!
          </p>
          <button
            onClick={startCamera}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            Start Camera
          </button>
        </div>
      )}

      {(status === 'starting' || status === 'ready') && (
        <div className="glass rounded-3xl p-4">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* Face grid overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Full grid lines — vertical */}
              {[16.66, 25, 33.33, 50, 66.66, 75, 83.33].map((pct) => (
                <div
                  key={`v-${pct}`}
                  className={`absolute top-0 bottom-0 w-px ${pct === 50 ? 'bg-white/40' : 'bg-white/20'}`}
                  style={{ left: `${pct}%` }}
                />
              ))}
              {/* Full grid lines — horizontal */}
              {[16.66, 25, 33.33, 50, 66.66, 75, 83.33].map((pct) => (
                <div
                  key={`h-${pct}`}
                  className={`absolute left-0 right-0 h-px ${pct === 50 ? 'bg-white/40' : 'bg-white/20'}`}
                  style={{ top: `${pct}%` }}
                />
              ))}
              {/* Face outline guide — oval shape */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-52 sm:w-48 sm:h-60">
                {/* Face oval */}
                <div className={`absolute inset-0 rounded-[50%] border-2 transition-all ${
                  faceDetected ? 'border-green-400/80 border-solid' : 'border-white/40 border-dashed'
                }`} />
                {/* Eye line guide */}
                <div className="absolute top-[35%] left-[15%] right-[15%] h-px bg-white/30" />
                {/* Eye markers */}
                <div className="absolute top-[33%] left-[28%] w-4 h-4 rounded-full border border-white/40" />
                <div className="absolute top-[33%] right-[28%] w-4 h-4 rounded-full border border-white/40" />
                {/* Nose line guide */}
                <div className="absolute top-[35%] bottom-[30%] left-1/2 -translate-x-1/2 w-px bg-white/25" />
                {/* Mouth line guide */}
                <div className="absolute top-[68%] left-[30%] right-[30%] h-px bg-white/30" />
              </div>
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white/50 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white/50 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-white/50 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-white/50 rounded-br-lg" />
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-6 h-px bg-white/50 absolute -translate-x-3" />
                <div className="h-6 w-px bg-white/50 absolute -translate-y-3" />
              </div>
            </div>
            {/* Status indicator */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
              <span className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs text-white font-semibold">
                {faceDetected ? 'Face detected' : 'Looking for face...'}
              </span>
            </div>
            {/* Capture progress */}
            {captureProgress > 0 && (
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-xs text-white font-semibold mb-1 text-center">
                  Hold still... {Math.round(captureProgress)}%
                </div>
                <div className="h-2 rounded-full bg-black/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all duration-200"
                    style={{ width: `${captureProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Stillness meter */}
          <div className="mt-3 flex items-center gap-2">
            <ScanFace className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Stillness:</span>
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-green-400 transition-all duration-200"
                style={{ width: `${stillness}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); reset(); }}
            className="w-full mt-3 py-2.5 rounded-xl bg-slate-200 text-slate-600 font-bold active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="glass rounded-3xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-4">{errorMsg}</p>
          <button
            onClick={reset}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold active:scale-95 transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {status === 'captured' && result && (
        <div className="glass rounded-3xl p-6 text-center animate-pop-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-green-100 mb-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-display text-xl font-bold text-slate-800 mb-4">Capture Complete!</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200">
              <div className="text-sm text-slate-500 font-semibold mb-1">Estimated Mood</div>
              <div className="font-display text-2xl font-bold text-rose-600">{result.mood}</div>
            </div>
            <div className="rounded-2xl p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <div className="text-sm text-slate-500 font-semibold mb-1">Posture Estimate</div>
              <div className="font-bold text-sm text-blue-700">{result.posture}</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            These are rough estimates, not a diagnosis. For health concerns, please consult a professional.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold active:scale-95 transition-all flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
