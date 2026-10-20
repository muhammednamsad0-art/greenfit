import { useEffect, useState } from 'react';
import { getFormattedDate, getDayName } from '@/lib/date';

export function DateHeader() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center text-center mb-6">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-green-100 to-cyan-100 text-green-700 font-semibold text-sm mb-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        {getDayName(now)}
      </div>
      <h2 className="font-display text-lg sm:text-xl text-slate-600 font-medium">
        {getFormattedDate(now)}
      </h2>
    </div>
  );
}
