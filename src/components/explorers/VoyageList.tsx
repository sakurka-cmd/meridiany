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

interface ExplorerGroup {
  explorerName: string;
  explorerWho: string | null;
  voyages: VoyageListItem[];
}

function formatYear(y: number | null): string {
  if (y === null) return '';
  if (y < 0) return `${Math.abs(y)} до н. э.`;
  return `${y}`;
}

function formatYears(start: number | null, end: number | null): string {
  if (start === null && end === null) return '—';
  if (start !== null && end !== null) {
    if (start === end) return formatYear(start);
    return `${formatYear(start)} — ${formatYear(end)}`;
  }
  return formatYear(start ?? end!);
}

function groupByExplorer(voyages: VoyageListItem[]): ExplorerGroup[] {
  const map = new Map<string, ExplorerGroup>();
  for (const v of voyages) {
    const key = v.explorerName;
    if (!map.has(key)) {
      map.set(key, {
        explorerName: v.explorerName,
        explorerWho: v.explorerWho,
        voyages: [],
      });
    }
    map.get(key)!.voyages.push(v);
  }
  // Sort by first voyage's startYear (ascending).
  return Array.from(map.values()).sort((a, b) => {
    const ay = a.voyages[0]?.startYear ?? 9999;
    const by = b.voyages[0]?.startYear ?? 9999;
    return ay - by;
  });
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

  const groups = groupByExplorer(voyages);

  return (
    <div className="meridian-scroll divide-y divide-white/[0.06]">
      {groups.map((group) => {
        // Use the first voyage's color as the explorer's "brand color"
        const color = group.voyages[0]?.color ?? '#D9A441';
        const hasMultiple = group.voyages.length > 1;

        return (
          <section key={group.explorerName} className="px-2 py-2">
            {/* Explorer header */}
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-[var(--font-display)] text-[13px] font-bold leading-tight text-[#EDE6D6]">
                  {group.explorerName}
                </h4>
                {group.explorerWho && (
                  <p className="truncate font-[var(--font-body)] text-[10px] text-[#8CA0B4]/80">
                    {group.explorerWho}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-[var(--font-mono)] text-[9px] uppercase tracking-wider text-[#EDE6D6]/40">
                {group.voyages.length}{' '}
                {group.voyages.length === 1 ? 'эксп.' : 'эксп.'}
              </span>
            </div>

            {/* Voyages list */}
            <ul className="mt-0.5 space-y-0.5" role="list">
              {group.voyages.map((v) => {
                const active = v.id === selectedId;
                const vColor = v.color ?? color;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(v.id)}
                      onMouseEnter={() => onHover?.(v.id)}
                      onMouseLeave={() => onHover?.(null)}
                      aria-pressed={active}
                      className="group flex w-full items-start gap-2.5 px-3 py-2 text-left transition-all hover:bg-white/[0.04]"
                      style={{
                        borderLeft: `3px solid ${active ? vColor : 'transparent'}`,
                        background: active ? 'rgba(217, 164, 65, 0.09)' : undefined,
                        marginLeft: hasMultiple ? '8px' : '0',
                      }}
                    >
                      {/* Color swatch */}
                      <span
                        className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2"
                        style={{
                          borderColor: vColor,
                          background: `radial-gradient(circle at 35% 35%, ${vColor} 0 3px, transparent 4px)`,
                        }}
                        aria-hidden
                      />

                      <div className="min-w-0 flex-1">
                        <h5 className="font-[var(--font-display)] text-[13px] font-semibold leading-tight text-[#EDE6D6]">
                          {v.title}
                        </h5>
                        <p className="mt-0.5 font-[var(--font-body)] text-[10.5px] text-[#8CA0B4]">
                          {formatYears(v.startYear, v.endYear)}
                          {v.category ? ` · ${v.category}` : ''}
                        </p>
                      </div>

                      <span className="shrink-0 pt-0.5 font-[var(--font-mono)] text-[9px] uppercase tracking-wider text-[#EDE6D6]/40">
                        {v.pointCount} тчк
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
