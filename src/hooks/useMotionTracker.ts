import { useEffect, useRef, useState, useCallback } from 'react';

// Sliding window size for baseline calculation (number of sensor readings)
const WINDOW_SIZE = 50;
// Minimum time between steps in ms — human cadence maxes around ~240 spm
const STEP_COOLDOWN_MS = 200;
// Sensitivity: how many standard deviations above the mean counts as a peak
const SENSITIVITY = 1.5;
// Minimum variance required to count motion (filters out stillness/noise)
const MIN_VARIANCE = 0.5;
// Gravity constant (m/s^2) to subtract from acceleration
const GRAVITY = 9.81;

export type MotionState = {
  active: boolean;
  stepCount: number;
  intensity: number; // current motion magnitude 0-1
  error: string | null;
};

export function useMotionTracker() {
  const [active, setActive] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for the detection algorithm (avoid re-renders on every sensor tick)
  const lastStepRef = useRef(0);
  const bufferRef = useRef<number[]>([]);
  // State machine: 'below' = waiting for signal to rise, 'above' = waiting for signal to fall back
  const phaseRef = useRef<'below' | 'above'>('below');
  // Peak value tracker for intensity display
  const recentPeakRef = useRef(0);
  const lastIntensityUpdateRef = useRef(0);

  // Compute mean and standard deviation of the sliding window
  function computeStats(buffer: number[]): { mean: number; stdDev: number } {
    if (buffer.length === 0) return { mean: 0, stdDev: 0 };
    let sum = 0;
    for (const v of buffer) sum += v;
    const mean = sum / buffer.length;
    let sqSum = 0;
    for (const v of buffer) {
      const d = v - mean;
      sqSum += d * d;
    }
    const stdDev = Math.sqrt(sqSum / buffer.length);
    return { mean, stdDev };
  }

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

    // Compute linear acceleration magnitude (remove gravity)
    // On most devices, accelerationIncludingGravity includes ~9.8 m/s^2 on one axis.
    // We compute total magnitude then subtract gravity to get motion-only acceleration.
    const rawMag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const linearMag = Math.abs(rawMag - GRAVITY);

    // Add to sliding window buffer
    const buffer = bufferRef.current;
    buffer.push(linearMag);
    if (buffer.length > WINDOW_SIZE) buffer.shift();

    // Need enough samples before we can detect steps
    if (buffer.length < 10) return;

    const { mean, stdDev } = computeStats(buffer);

    // Dynamic threshold: rises with movement intensity, stays low at rest
    const threshold = mean + stdDev * SENSITIVITY;

    // If variance is too low, the device is essentially still — don't count
    const variance = stdDev * stdDev;
    if (variance < MIN_VARIANCE) {
      // Decay intensity when still
      const now = Date.now();
      if (now - lastIntensityUpdateRef.current > 200) {
        setIntensity((i) => Math.max(0, i * 0.5));
        lastIntensityUpdateRef.current = now;
      }
      return;
    }

    // Peak-detection state machine:
    // 1. Signal must rise ABOVE the threshold (start of a step)
    // 2. Signal must fall back BELOW the mean (completing the step cycle)
    // This ensures we count one step per real motion cycle, not random noise spikes.
    const now = Date.now();

    if (phaseRef.current === 'below' && linearMag > threshold) {
      // Signal crossed above threshold — potential step start
      phaseRef.current = 'above';
      recentPeakRef.current = linearMag;
    } else if (phaseRef.current === 'above') {
      if (linearMag > recentPeakRef.current) {
        recentPeakRef.current = linearMag;
      }
      // Signal dropped back below the mean — step cycle complete
      if (linearMag < mean) {
        if (now - lastStepRef.current > STEP_COOLDOWN_MS) {
          lastStepRef.current = now;
          setStepCount((c) => c + 1);
        }
        phaseRef.current = 'below';
      }
    }

    // Update intensity display (throttled to every 100ms to avoid excessive re-renders)
    if (now - lastIntensityUpdateRef.current > 100) {
      const normIntensity = Math.min(1, recentPeakRef.current / 12);
      setIntensity(normIntensity);
      recentPeakRef.current *= 0.7; // decay the peak
      lastIntensityUpdateRef.current = now;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    // Reset detection state
    bufferRef.current = [];
    phaseRef.current = 'below';
    recentPeakRef.current = 0;
    lastStepRef.current = 0;

    // iOS 13+ requires explicit permission for DeviceMotion
    const anyEvent = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof anyEvent.requestPermission === 'function') {
      try {
        const result = await anyEvent.requestPermission();
        if (result !== 'granted') {
          setError('Motion permission was denied. Please allow motion access to track movements.');
          return;
        }
      } catch {
        setError('Could not request motion permission. Try again.');
        return;
      }
    }
    window.addEventListener('devicemotion', handleMotion);
    setActive(true);
  }, [handleMotion]);

  const stop = useCallback(() => {
    window.removeEventListener('devicemotion', handleMotion);
    setActive(false);
    setIntensity(0);
  }, [handleMotion]);

  const reset = useCallback(() => {
    setStepCount(0);
    lastStepRef.current = 0;
    bufferRef.current = [];
    phaseRef.current = 'below';
    recentPeakRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [handleMotion]);

  return { active, stepCount, intensity, error, start, stop, reset };
}

export function hasMotionSensors(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof DeviceMotionEvent !== 'undefined';
}
