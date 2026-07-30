'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, User, X, Navigation } from 'lucide-react';
import type { VoyageDTO } from '@/lib/types';

interface VoyageDetailProps {
  voyage: VoyageDTO;
  onClose: () => void;
  onSelectPoint: (pointId: string) => void;
  highlightedPointId?: string | null;
}

function formatYear(y: number | null): string {
  if (y === null) return '—';
  if (y < 0) return `${Math.abs(y)} г. до н.э.`;
  return `${y} г.`;
}

export default function VoyageDetail({
  voyage,
  onClose,
  onSelectPoint,
  highlightedPointId,
}: VoyageDetailProps) {
  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3"
        style={{
          background: `linear-gradient(135deg, ${voyage.color ?? '#0891b2'}22, transparent)`,
          borderBottom: `2px solid ${voyage.color ?? '#0891b2'}`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium" style={{ color: voyage.color ?? '#0891b2' }}>
              <Navigation className="h-3 w-3" aria-hidden />
              <span className="uppercase tracking-wider">{voyage.explorerName}</span>
            </div>
            <h3 className="text-base font-bold leading-tight">{voyage.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть детали"
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden />
            {voyage.startYear !== null || voyage.endYear !== null
              ? `${formatYear(voyage.startYear)} — ${formatYear(voyage.endYear)}`
              : 'даты неизвестны'}
          </span>
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" aria-hidden />
            {voyage.explorerName}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {voyage.era}
          </Badge>
          {voyage.type && (
            <Badge variant="outline" className="text-[10px]">
              {voyage.type}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {voyage.routePoints.length} точек
          </Badge>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {voyage.description && (
            <p className="mb-4 text-sm leading-relaxed text-foreground/90">
              {voyage.description}
            </p>
          )}

          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Точки маршрута
          </h4>
          <ol className="space-y-1">
            {voyage.routePoints.map((p, i) => {
              const active = highlightedPointId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPoint(p.id)}
                    className={`group flex w-full items-start gap-3 rounded-lg border p-2 text-left transition-all ${
                      active
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-transparent hover:border-border hover:bg-accent/40'
                    }`}
                  >
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: voyage.color ?? '#0891b2' }}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium leading-tight">
                          {p.name}
                        </span>
                        {p.arrivalDate && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {p.arrivalDate}
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          {p.description}
                        </p>
                      )}
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                        <MapPin className="h-2.5 w-2.5" aria-hidden />
                        {p.latitude.toFixed(2)}, {p.longitude.toFixed(2)}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </ScrollArea>
    </div>
  );
}
