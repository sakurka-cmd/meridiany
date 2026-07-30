'use client';

import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface VoyageListItem {
  id: string;
  title: string;
  explorerName: string;
  startYear: number | null;
  endYear: number | null;
  era: string;
  type: string | null;
  color: string | null;
  pointCount: number;
}

interface VoyageListProps {
  voyages: VoyageListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function formatYears(start: number | null, end: number | null): string {
  if (start === null && end === null) return '—';
  if (start !== null && end !== null) {
    return start === end ? `${formatYear(start)}` : `${formatYear(start)} – ${formatYear(end)}`;
  }
  if (start !== null) return formatYear(start);
  return formatYear(end!);
}

function formatYear(y: number): string {
  if (y < 0) return `${Math.abs(y)} г. до н.э.`;
  return `${y} г.`;
}

export default function VoyageList({
  voyages,
  loading,
  selectedId,
  onSelect,
}: VoyageListProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-3" aria-busy="true">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (voyages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
        <Loader2 className="h-5 w-5 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Плаваний не найдено. Попробуйте изменить фильтры или сгенерировать новый маршрут через ИИ.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1 p-2" role="list">
      {voyages.map((v) => {
        const active = v.id === selectedId;
        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onSelect(v.id)}
              aria-pressed={active}
              className={`group w-full text-left rounded-lg border p-3 transition-all ${
                active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-accent/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
                  style={{ background: v.color ?? '#0891b2' }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate text-sm font-semibold leading-tight">
                      {v.title}
                    </h4>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatYears(v.startYear, v.endYear)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {v.explorerName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                      {v.era}
                    </span>
                    {v.type && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                        {v.type}
                      </span>
                    )}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {v.pointCount} точек
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
