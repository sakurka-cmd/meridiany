'use client';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Calendar, User, X, Compass, Ruler } from 'lucide-react';
import type { VoyageDTO } from '@/lib/types';

interface VoyageDetailProps {
  voyage: VoyageDTO;
  km?: number;
  onClose: () => void;
  onSelectPoint: (pointId: string) => void;
  highlightedPointId?: string | null;
}

function formatYear(y: number | null): string {
  if (y === null) return '—';
  if (y < 0) return `${Math.abs(y)} г. до н. э.`;
  return `${y} г.`;
}

const TYPE_LABEL: Record<string, string> = {
  sea: 'Морской',
  land: 'Сухопутный',
  mixed: 'Смешанный',
  air: 'Воздушный',
};

export default function VoyageDetail({
  voyage,
  km,
  onClose,
  onSelectPoint,
  highlightedPointId,
}: VoyageDetailProps) {
  const color = voyage.color ?? '#D9A441';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="relative shrink-0 px-4 py-4"
        style={{
          background: `linear-gradient(135deg, ${color}22, transparent 70%)`,
          borderBottom: `2px solid ${color}`,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть детали"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 text-[#8CA0B4] transition-all hover:rotate-90 hover:border-[#D9A441] hover:text-[#EDE6D6]"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="mb-2 flex items-center gap-1.5">
          <span
            className="font-[var(--font-mono)] text-[9.5px] font-semibold uppercase tracking-[0.14em]"
            style={{ color }}
          >
            {voyage.era}
          </span>
          {voyage.type && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-[var(--font-mono)] text-[9px] uppercase tracking-wider text-[#8CA0B4]">
              {TYPE_LABEL[voyage.type] ?? voyage.type}
            </span>
          )}
        </div>

        <h3
          className="font-[var(--font-display)] text-xl font-black leading-tight text-[#EDE6D6]"
          style={{ paddingRight: '26px' }}
        >
          {voyage.title}
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-[var(--font-mono)] text-[11px] text-[#D9A441]">
          <span className="inline-flex items-center gap-1">
            <Compass className="h-3 w-3" />
            {voyage.explorerWho ?? voyage.explorerName}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-[var(--font-body)] text-[11px] text-[#8CA0B4]">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {voyage.startYear !== null || voyage.endYear !== null
              ? `${formatYear(voyage.startYear)} — ${formatYear(voyage.endYear)}`
              : 'даты неизвестны'}
          </span>
          {km !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              {km.toLocaleString('ru-RU')} км
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="meridian-scroll min-h-0 flex-1">
        <div className="px-4 py-3">
          {voyage.description && (
            <p className="mb-3 font-[var(--font-body)] text-[12.5px] leading-[1.55] text-[#C9D4E0]">
              {voyage.description}
            </p>
          )}

          <h4 className="mb-2 mt-3 font-[var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8CA0B4]">
            Ключевые точки
          </h4>
          <ol className="space-y-0.5">
            {voyage.routePoints.filter((p) => p.isWaypoint).map((p, i) => {
              const active = highlightedPointId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPoint(p.id)}
                    className="group flex w-full items-start gap-2.5 border-l-2 py-1.5 pl-2.5 pr-1 text-left transition-all hover:translate-x-0.5 hover:bg-white/[0.05]"
                    style={{
                      borderColor: active ? color : 'rgba(237, 230, 214, 0.12)',
                      background: active ? 'rgba(217, 164, 65, 0.07)' : undefined,
                    }}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 font-[var(--font-mono)] text-[10px] font-semibold text-[#EDE6D6]"
                      style={{ borderColor: color }}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-[var(--font-body)] text-[12px] font-semibold leading-tight text-[#EDE6D6]">
                          {p.name}
                        </span>
                        {p.arrivalDate && (
                          <span className="shrink-0 font-[var(--font-mono)] text-[10px] text-[#8CA0B4]">
                            {p.arrivalDate}
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-0.5 font-[var(--font-body)] text-[10.5px] leading-snug text-[#8CA0B4]">
                          {p.description}
                        </p>
                      )}
                      <div className="mt-0.5 flex items-center gap-1 font-[var(--font-mono)] text-[10px] text-[#8CA0B4]/70">
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
