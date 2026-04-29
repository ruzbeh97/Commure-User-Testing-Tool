'use client';
import { useRef, useCallback, useEffect } from 'react';

interface TrackEvent {
  task_id?: string;
  type: 'click' | 'mousemove' | 'scroll';
  x: number;
  y: number;
  timestamp: number;
  metadata?: string;
}

export function useTracker(sessionId: string | null, currentTaskId: string | null) {
  const buffer = useRef<TrackEvent[]>([]);
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMove = useRef(0);

  const flush = useCallback(async () => {
    if (!sessionId || buffer.current.length === 0) return;
    const events = buffer.current.splice(0, buffer.current.length);
    try {
      await fetch(`/api/sessions/${sessionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } catch {
      // Re-queue on failure (best effort)
      buffer.current.unshift(...events.slice(0, 100));
    }
  }, [sessionId]);

  const track = useCallback((e: MouseEvent | WheelEvent) => {
    if (!sessionId) return;
    const type = e.type === 'click' ? 'click' : e.type === 'wheel' ? 'scroll' : 'mousemove';

    if (type === 'mousemove') {
      const now = Date.now();
      if (now - lastMove.current < 50) return;
      lastMove.current = now;
    }

    const event: TrackEvent = {
      task_id: currentTaskId ?? undefined,
      type,
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
      timestamp: Date.now(),
    };

    if (type === 'scroll' && e instanceof WheelEvent) {
      event.metadata = JSON.stringify({ deltaY: e.deltaY });
    }

    buffer.current.push(event);

    if (buffer.current.length >= 50) flush();
  }, [sessionId, currentTaskId, flush]);

  useEffect(() => {
    if (!sessionId) return;

    window.addEventListener('click', track);
    window.addEventListener('mousemove', track);
    window.addEventListener('wheel', track, { passive: true });

    flushTimer.current = setInterval(flush, 3000);

    return () => {
      window.removeEventListener('click', track);
      window.removeEventListener('mousemove', track);
      window.removeEventListener('wheel', track);
      if (flushTimer.current) clearInterval(flushTimer.current);
      flush();
    };
  }, [sessionId, track, flush]);

  return { flush };
}
