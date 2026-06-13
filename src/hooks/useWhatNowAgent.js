// src/hooks/useWhatNowAgent.js
//
// React hook for the "What now?" Claude agent.
//
// Usage:
//   const { answer, loading, error, ask, clear } = useWhatNowAgent();
//
//   // Call ask() with the current brain state — hook handles the rest
//   ask({
//     oneThing: { text: 'Finish the push notification edge function', label: 'work' },
//     todayPins: [{ text: 'Review PR', label: 'work', done: false }],
//     recentDumps: [{ text: 'need to call dentist' }],
//   });

import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useWhatNowAgent() {
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ask = useCallback(async (brainState) => {
    setLoading(true);
    setAnswer(null);
    setError(null);

    try {
      if (!supabase) {
        // Fallback for users without Supabase configured
        throw new Error('Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
      }

      const { data, error: fnError } = await supabase.functions.invoke('what-now-agent', {
        body: {
          brainState: {
            oneThing: brainState.oneThing ?? null,
            // Only send non-done pins to keep payload small
            todayPins: (brainState.todayPins ?? []).map((t) => ({
              text: t.text,
              label: t.label ?? 'default',
              done: t.done ?? false,
            })),
            // Last 5 brain dump entries — enough context without blowing token budget
            recentDumps: (brainState.recentDumps ?? []).slice(0, 5).map((d) => ({
              text: typeof d === 'string' ? d : d.text,
            })),
            lastHealthCheck: brainState.lastHealthCheck ?? null,
            healthNudges: brainState.healthNudges ?? [],
          },
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setAnswer(data?.answer ?? 'No answer returned.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
      console.error('[useWhatNowAgent]', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setAnswer(null);
    setError(null);
  }, []);

  return { answer, loading, error, ask, clear };
}
