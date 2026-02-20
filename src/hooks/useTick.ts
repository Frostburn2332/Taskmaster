import { useState, useEffect } from 'react';

/**
 * Returns a `now` timestamp that updates on the given interval.
 * Pass `enabled = false` to pause the timer (e.g. when there are no
 * pending tasks) and save battery.
 *
 * Calls setNow immediately on mount/enable to eliminate the dead zone
 * between when the hook becomes active and the first interval tick.
 */
export function useTick(intervalMs = 5_000, enabled = true): number {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now()); // sync immediately — no dead zone on first mount
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);

  return now;
}
