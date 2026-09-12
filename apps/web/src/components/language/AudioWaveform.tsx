/**
 * AudioWaveform Component
 * 
 * Real-time audio waveform visualization that responds to microphone input.
 * Uses an AnalyserNode from Web Audio API to render animated frequency bars.
 * 
 * Decorative only (aria-hidden) — screen readers get text status via parent.
 */

import { useRef, useEffect, useCallback } from 'react';

interface AudioWaveformProps {
  /** AnalyserNode from the useSpeechRecognition hook */
  analyserNode: AnalyserNode | null;
  /** Whether the waveform should be actively animating */
  isActive: boolean;
  /** Number of bars to display */
  barCount?: number;
  /** Height of the waveform container in px */
  height?: number;
  /** Color theme */
  color?: 'indigo' | 'green' | 'red' | 'amber';
}

const COLOR_CLASSES: Record<string, { bar: string; glow: string }> = {
  indigo: { bar: 'bg-indigo-500', glow: 'shadow-indigo-400/50' },
  green: { bar: 'bg-green-500', glow: 'shadow-green-400/50' },
  red: { bar: 'bg-red-500', glow: 'shadow-red-400/50' },
  amber: { bar: 'bg-amber-500', glow: 'shadow-amber-400/50' },
};

export default function AudioWaveform({
  analyserNode,
  isActive,
  barCount = 24,
  height = 64,
  color = 'indigo',
}: AudioWaveformProps) {
  const barsRef = useRef<HTMLDivElement[]>([]);
  const animationRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const colors = COLOR_CLASSES[color] || COLOR_CLASSES.indigo;

  const animate = useCallback(() => {
    if (!analyserNode || !isActive) {
      // Reset bars to minimal height
      barsRef.current.forEach(bar => {
        if (bar) bar.style.height = '4px';
      });
      return;
    }

    if (!dataArrayRef.current) {
      dataArrayRef.current = new Uint8Array(new ArrayBuffer(analyserNode.frequencyBinCount));
    }

    analyserNode.getByteFrequencyData(dataArrayRef.current);

    const data = dataArrayRef.current;
    const binSize = Math.floor(data.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const bar = barsRef.current[i];
      if (!bar) continue;

      // Average the frequency bins for this bar
      let sum = 0;
      const start = i * binSize;
      for (let j = start; j < start + binSize && j < data.length; j++) {
        sum += data[j];
      }
      const average = sum / binSize;

      // Map to height (min 4px, max container height - 8px)
      const barHeight = Math.max(4, (average / 255) * (height - 8));
      bar.style.height = `${barHeight}px`;
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [analyserNode, isActive, barCount, height]);

  useEffect(() => {
    if (isActive && analyserNode) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive, analyserNode, animate]);

  // When deactivated, smoothly reduce bars
  useEffect(() => {
    if (!isActive) {
      barsRef.current.forEach(bar => {
        if (bar) bar.style.height = '4px';
      });
    }
  }, [isActive]);

  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center gap-[2px] px-4"
      style={{ height: `${height}px` }}
      data-testid="audio-waveform"
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={el => {
            if (el) barsRef.current[i] = el;
          }}
          className={`
            w-[3px] rounded-full transition-all duration-75 ease-out
            ${colors.bar}
            ${isActive ? `shadow-sm ${colors.glow}` : 'opacity-40'}
          `}
          style={{
            height: '4px',
            animationDelay: `${i * 30}ms`,
          }}
        />
      ))}
    </div>
  );
}
