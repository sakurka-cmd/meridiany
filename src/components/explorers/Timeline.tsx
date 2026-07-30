'use client';

import { useMemo } from 'react';
import { ERA_RANGES } from '@/lib/types';

interface TimelineVoyage {
  id: string;
  title: string;
  color: string;
  startYear: number | null;
  era: string;
}

interface TimelineProps {
  voyages: TimelineVoyage[];
  selectedId: string | null;
  eraFilter: string; // 'all' or era label
  onSelect: (id: string) => void;
}

// Same segment mapping as the reference HTML: 5 eras each get a share of the
// 0..1 range, weighted logarithmically so the deepest antiquity is visible.
const SEGS: Array<{ start: number; end: number; from: number; to: number }> = [
  { start: -50000, end: -1000, from: 0, to: 0.16 },
  { start: -1000, end: 1400, from: 0.16, to: 0.30 },
  { start: 1400, end: 1850, from: 0.30, to: 0.56 },
  { start: 1850, end: 1950, from: 0.56, to: 0.78 },
  { start: 1950, end: 2030, from: 0.78, to: 1.0 },
];

function yearToPercent(year: number): number {
  for (const s of SEGS) {
    if (year <= s.end) {
      const clamped = Math.max(s.from, Math.min(s.to, year));
      const k = (Math.max(s.start, year) - s.start) / (s.end - s.start);
      return (s.from + k * (s.to - s.from)) * 100;
    }
  }
  return 100;
}

function formatYearLabel(year: number): string {
  if (year < 0) return `${Math.abs(year)} до н. э.`;
  return `${year}`;
}

export default function Timeline({
  voyages,
  selectedId,
  eraFilter,
  onSelect,
}: TimelineProps) {
  const bands = useMemo(() => {
    return ERA_RANGES.map((era, i) => {
      const w = yearToPercent(era.end) - yearToPercent(era.start);
      return { ...era, width: w, alt: i % 2 === 1 };
    });
  }, []);

  const dots = useMemo(() => {
    // Sort by startYear (nulls last) so alternating dot rows look ordered.
    const sorted = [...voyages].sort((a, b) => {
      const ay = a.startYear ?? 9999;
      const by = b.startYear ?? 9999;
      return ay - by;
    });
    return sorted.map((v, idx) => {
      const year = v.startYear ?? 0;
      const left = yearToPercent(year);
      const bottom = 64 + (idx % 2) * 13;
      return { v, left, bottom, alt: idx % 2 === 1 };
    });
  }, [voyages]);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[96px]"
      style={{
        background:
          'linear-gradient(180deg, rgba(8,15,25,0) 0%, rgba(8,15,25,0.94) 48%)',
      }}
      aria-label="Хронологическая шкала"
    >
      <div className="pointer-events-auto absolute inset-0 px-[18px] pb-2">
        {/* Era bands */}
        <div className="absolute inset-x-[18px] bottom-[38px] flex h-5 overflow-hidden rounded-[3px]">
          {bands.map((b) => {
            const isActive = eraFilter === 'all' || eraFilter === b.label;
            return (
              <div
                key={b.slug}
                className="flex h-full items-center justify-center border-r border-white/[0.1] transition-all"
                style={{
                  width: `${b.width}%`,
                  background: isActive
                    ? b.alt
                      ? 'rgba(255,255,255,0.065)'
                      : 'rgba(255,255,255,0.035)'
                    : 'rgba(255,255,255,0.012)',
                  opacity: isActive ? 1 : 0.4,
                }}
              >
                <span className="truncate px-1 font-[var(--font-mono)] text-[8.5px] uppercase tracking-wider text-[#EDE6D6]/55">
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Year axis */}
        <div className="absolute inset-x-[18px] bottom-[16px] h-[14px]">
          {[
            { label: '50 тыс. до н.э.', left: 0, cls: 'first' },
            { label: '1000 до н.э.', left: 16, cls: '' },
            { label: '1400', left: 30, cls: '' },
            { label: '1850', left: 56, cls: '' },
            { label: '1950', left: 78, cls: '' },
            { label: 'наши дни', left: 100, cls: 'last' },
          ].map((tick) => (
            <span
              key={tick.label}
              className={`absolute font-[var(--font-mono)] text-[9px] whitespace-nowrap text-[#8CA0B4]/65 ${
                tick.cls === 'first' ? '' : tick.cls === 'last' ? 'translate-x-[-100%]' : 'translate-x-[-50%]'
              }`}
              style={{ left: `${tick.left}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        {/* Expedition dots */}
        <div className="absolute inset-0">
          {dots.map(({ v, left, bottom }) => {
            const isOn = selectedId === v.id;
            const isDim = eraFilter !== 'all' && eraFilter !== v.era;
            return (
              <button
                key={v.id}
                type="button"
                className={`meridian-timeline-dot absolute h-3 w-3 rounded-full border-2 border-[#0B1420] ${
                  isOn ? 'meridian-timeline-dot--on' : ''
                } ${isDim ? 'meridian-timeline-dot--dim' : ''}`}
                style={{
                  background: v.color ?? '#D9A441',
                  left: `${left}%`,
                  bottom: `${bottom}px`,
                  transform: 'translateX(-50%)',
                  boxShadow: isOn
                    ? `0 0 0 2px ${v.color}, 0 0 16px ${v.color}`
                    : '0 0 0 1px rgba(255,255,255,0.28)',
                  // expose color as CSS var so the box-shadow rule sees it
                  ['--c' as string]: v.color ?? '#D9A441',
                }}
                title={`${v.title} · ${v.startYear ?? '—'}`}
                onClick={() => onSelect(v.id)}
                aria-label={v.title}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
