'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface VoyageListItem {
  id: string;
  title: string;
  explorerName: string;
  explorerWho: string | null;
  startYear: number | null;
  endYear: number | null;
  era: string;
  category: string | null;
  color: string | null;
  pointCount: number;
}

interface VoyageListProps {
  voyages: VoyageListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
}

function formatYears(start: number | null, end: number | null): string {
  if (start === null && end === null) return '—';
  if (start !== null && end !== null) {
    if (start === end) return formatYear(start);
    return `${formatYear(start)} — ${formatYear(end)}`;
  }
  return formatYear(start ?? end!);
}

function formatYear(y: number): string {
  if (y < 0) return `${Math.abs(y)} до н. э.`;
  return `${y}`;
}

export default function VoyageList({
  voyages,
  loading,
  selectedId,
  onSelect,
  onHover,
}: VoyageListProps) {
  if (loading) {
    return (
      <div className="space-y-1 p-2" aria-busy="true">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (voyages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="font-[var(--font-body)] text-sm text-[#8CA0B4]">
          Плаваний не найдено.
        </p>
        <p className="font-[var(--font-body)] text-xs text-[#8CA0B4]/70">
          Измените фильтры или сгенерируйте новый маршрут через ИИ-агента.
        </p>
      </div>
    );
  }

  return (
    <ul className="meridian-scroll divide-y divide-white/[0.06]" role="list">
      {voyages.map((v) => {
        const active = v.id === selectedId;
        const color = v.color ?? '#D9A441';
        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onSelect(v.id)}
              onMouseEnter={() => onHover?.(v.id)}
              onMouseLeave={() => onHover?.(null)}
              aria-pressed={active}
              className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.04]"
              style={{
                borderLeft: `3px solid ${active ? color : 'transparent'}`,
                background: active ? 'rgba(217, 164, 65, 0.09)' : undefined,
              }}
            >
              {/* Color swatch */}
              <span
                className="mt-1 h-6 w-6 shrink-0 rounded-full border-2"
                style={{
                  borderColor: color,
                  background: `radial-gradient(circle at 35% 35%, ${color} 0 4px, transparent 5px)`,
                }}
                aria-hidden
              />

              <div className="min-w-0 flex-1">
                <h4 className="font-[var(--font-display)] text-[15px] font-bold leading-tight text-[#EDE6D6]">
                  {v.title}
                </h4>
                <p className="mt-0.5 truncate font-[var(--font-body)] text-[11.5px] text-[#8CA0B4]">
                  {v.explorerWho ? `${v.explorerWho} · ` : ''}
                  {formatYears(v.startYear, v.endYear)}
                </p>
              </div>

              <span className="shrink-0 pt-1 font-[var(--font-mono)] text-[9px] uppercase tracking-wider text-[#EDE6D6]/40">
                {v.pointCount} точек
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
