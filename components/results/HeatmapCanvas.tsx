'use client';
import { useEffect, useRef, useState } from 'react';
import type { Event } from '@/types';

interface Props {
  events: Event[];
  width?: number;
  height?: number;
  radius?: number;
  type?: 'click' | 'mousemove';
}

export function HeatmapCanvas({ events, width = 800, height = 600, radius = 40, type = 'click' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: width, h: height });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setDims({ w, h: Math.round(w * (height / width)) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !events.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    ctx.scale(dpr, dpr);

    const filtered = events.filter(e => e.type === type);
    if (!filtered.length) return;

    // Draw heat accumulation layer
    ctx.clearRect(0, 0, dims.w, dims.h);

    const offscreen = document.createElement('canvas');
    offscreen.width = dims.w;
    offscreen.height = dims.h;
    const octx = offscreen.getContext('2d')!;

    for (const evt of filtered) {
      const x = evt.x * dims.w;
      const y = evt.y * dims.h;
      const grad = octx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, 'rgba(255,0,0,0.25)');
      grad.addColorStop(1, 'rgba(255,0,0,0)');
      octx.fillStyle = grad;
      octx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // Color ramp pass: intensity → blue/green/yellow/red
    const imgData = octx.getImageData(0, 0, dims.w, dims.h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i] / 255; // red channel as intensity proxy
      if (alpha === 0) continue;
      const [r, g, b] = intensityToColor(alpha);
      data[i]     = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.min(255, Math.round(alpha * 200 + 40));
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw click dots
    if (type === 'click') {
      for (const evt of filtered) {
        const x = evt.x * dims.w;
        const y = evt.y * dims.h;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [events, dims, type, radius]);

  return (
    <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden bg-gray-900 border border-gray-700">
      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
        {events.filter(e => e.type === type).length === 0
          ? <span className="bg-gray-800 px-3 py-1.5 rounded-lg">No {type} data yet</span>
          : null}
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: dims.h }}
        className="block"
      />
      <HeatmapLegend />
    </div>
  );
}

function intensityToColor(t: number): [number, number, number] {
  // blue → cyan → green → yellow → red
  if (t < 0.25) {
    const f = t / 0.25;
    return [0, Math.round(f * 255), 255];
  } else if (t < 0.5) {
    const f = (t - 0.25) / 0.25;
    return [0, 255, Math.round((1 - f) * 255)];
  } else if (t < 0.75) {
    const f = (t - 0.5) / 0.25;
    return [Math.round(f * 255), 255, 0];
  } else {
    const f = (t - 0.75) / 0.25;
    return [255, Math.round((1 - f) * 255), 0];
  }
}

function HeatmapLegend() {
  return (
    <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/60 rounded-lg px-3 py-1.5">
      <span className="text-xs text-gray-300">Low</span>
      <div className="w-24 h-2 rounded-full" style={{
        background: 'linear-gradient(to right, #0000ff, #00ff00, #ffff00, #ff0000)'
      }} />
      <span className="text-xs text-gray-300">High</span>
    </div>
  );
}
