'use client';

import { useMemo } from 'react';
import VoyageList from './VoyageList';
import VoyageDetail from './VoyageDetail';
import { ERA_RANGES } from '@/lib/types';
import { Search, Compass, ChevronLeft, Ship, Route as RouteIcon } from 'lucide-react';
import type { VoyageDTO, ExplorerDTO } from '@/lib/types';

interface SidebarProps {
  voyages: VoyageDTO[];
  voyagesKm: Record<string, number>;
  explorers: ExplorerDTO[];
  loading: boolean;
  selectedVoyageId: string | null;
  highlightedPointId: string | null;
  eraFilter: string;
  typeFilter: string;
  search: string;
  onEraFilterChange: (v: string) => void;
  onTypeFilterChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onSelectVoyage: (id: string | null) => void;
  onSelectPoint: (voyageId: string, pointId: string) => void;
  onHoverVoyage?: (id: string | null) => void;
}

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

const TYPE_CHIPS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'sea', label: 'Морские' },
  { key: 'land', label: 'Сухопутные' },
  { key: 'mixed', label: 'Смешанные' },
  { key: 'air', label: 'Воздушные' },
];

export default function Sidebar({
  voyages,
  voyagesKm,
  explorers,
  loading,
  selectedVoyageId,
  highlightedPointId,
  eraFilter,
  typeFilter,
  search,
  onEraFilterChange,
  onTypeFilterChange,
  onSearchChange,
  onSelectVoyage,
  onSelectPoint,
  onHoverVoyage,
}: SidebarProps) {
  const filteredList = useMemo<VoyageListItem[]>(() => {
    return voyages
      .filter((v) => {
        if (search) {
          const q = search.toLowerCase();
          if (
            !v.title.toLowerCase().includes(q) &&
            !v.explorerName.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .map((v) => ({
        id: v.id,
        title: v.title,
        explorerName: v.explorerName,
        explorerWho: v.explorerWho,
        startYear: v.startYear,
        endYear: v.endYear,
        era: v.era,
        category: v.category,
        color: v.color,
        pointCount: v.routePoints.filter((p) => p.isWaypoint).length,
      }));
  }, [voyages, search]);

  const selectedVoyage = voyages.find((v) => v.id === selectedVoyageId) ?? null;

  return (
    <aside className="flex h-full w-full flex-col">
      {/* Side head with animated decoration */}
      <div
        className="relative overflow-hidden px-5 pt-5 pb-3"
        style={{
          background:
            'repeating-linear-gradient(90deg,rgba(255,255,255,.022) 0 1px,transparent 1px 46px),' +
            'repeating-linear-gradient(0deg,rgba(255,255,255,.016) 0 1px,transparent 1px 46px),' +
            'radial-gradient(600px 300px at 0% 0%,#16304C 0%,transparent 60%),' +
            'radial-gradient(500px 400px at 100% 100%,#0E2A33 0%,transparent 55%),' +
            '#0F1D2E',
        }}
      >
        {/* Decorative wavy line with animated ship */}
        <svg
          className="pointer-events-none absolute left-0 top-1.5 h-16 w-full opacity-55"
          viewBox="0 0 340 64"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className="meridian-deco-path"
            d="M-10,50 C50,8 110,58 175,30 C235,4 295,44 350,18"
          />
          <circle className="meridian-deco-path" r="3.5" fill="#D9A441" stroke="none">
            <animateMotion dur="11s" repeatCount="indefinite">
              <mpath href="#decoPath" />
            </animateMotion>
          </circle>
          <path id="decoPath" d="M-10,50 C50,8 110,58 175,30 C235,4 295,44 350,18" fill="none" stroke="none" />
        </svg>

        <div className="meridian-sonar relative">
          <h2 className="mt-11 font-[var(--font-display)] text-2xl font-bold leading-tight text-[#EDE6D6]">
            Курс на карте
          </h2>
          <p className="mt-1.5 font-[var(--font-body)] text-[12.5px] leading-relaxed text-[#8CA0B4]">
            Выберите экспедицию — маршрут отрисуется плавным курсом с ключевыми точками, расстояниями и датами.
          </p>
        </div>
      </div>

      {/* Body: list or detail */}
      {selectedVoyage ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => onSelectVoyage(null)}
            className="flex shrink-0 items-center gap-1 border-b border-white/[0.07] bg-white/[0.02] px-4 py-2 font-[var(--font-body)] text-xs font-medium text-[#8CA0B4] transition-colors hover:bg-white/[0.05] hover:text-[#EDE6D6]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Назад к списку
          </button>
          <div className="min-h-0 flex-1 bg-[#0F1D2E]">
            <VoyageDetail
              voyage={selectedVoyage}
              km={voyagesKm[selectedVoyage.id]}
              onClose={() => onSelectVoyage(null)}
              onSelectPoint={(pointId) => onSelectPoint(selectedVoyage.id, pointId)}
              highlightedPointId={highlightedPointId}
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Search + AI button */}
          <div className="flex items-center gap-2 px-4 pb-3 pt-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8CA0B4]" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Найти экспедицию или имя…"
                aria-label="Поиск"
                className="w-full rounded-md border border-white/13 bg-white/[0.05] py-2 pl-9 pr-3 font-[var(--font-body)] text-[13px] text-[#EDE6D6] outline-none transition-colors placeholder:text-[#8CA0B4]/60 focus:border-[#D9A441]"
              />
            </div>
          </div>

          {/* Era chips */}
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            <button
              type="button"
              onClick={() => onEraFilterChange('all')}
              className={`rounded-full border px-3 py-1.5 font-[var(--font-body)] text-[11.5px] font-semibold transition-all ${
                eraFilter === 'all'
                  ? 'border-[#D9A441] bg-[#D9A441] text-[#141005]'
                  : 'border-white/[0.18] text-[#8CA0B4] hover:border-[#D9A441] hover:text-[#EDE6D6]'
              }`}
            >
              Все эпохи
            </button>
            {ERA_RANGES.map((era) => {
              const active = eraFilter === era.label;
              return (
                <button
                  key={era.slug}
                  type="button"
                  onClick={() => onEraFilterChange(era.label)}
                  className={`rounded-full border px-3 py-1.5 font-[var(--font-body)] text-[11.5px] font-semibold transition-all ${
                    active
                      ? 'border-[#D9A441] bg-[#D9A441] text-[#141005]'
                      : 'border-white/[0.18] text-[#8CA0B4] hover:border-[#D9A441] hover:text-[#EDE6D6]'
                  }`}
                >
                  {era.label}
                </button>
              );
            })}
          </div>

          {/* Type chips */}
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {TYPE_CHIPS.map((c) => {
              const active = typeFilter === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onTypeFilterChange(c.key)}
                  className={`rounded-full border px-2.5 py-1 font-[var(--font-mono)] text-[10px] uppercase tracking-wider transition-all ${
                    active
                      ? 'border-[#12A5A0] bg-[#12A5A0]/20 text-[#12A5A0]'
                      : 'border-white/[0.10] text-[#8CA0B4]/80 hover:border-[#12A5A0]/50 hover:text-[#EDE6D6]'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* List header */}
          <div className="flex shrink-0 items-center justify-between border-y border-white/[0.07] bg-black/30 px-4 py-2">
            <div className="flex items-center gap-1.5 font-[var(--font-body)] text-xs font-medium text-[#8CA0B4]">
              <RouteIcon className="h-3.5 w-3.5" />
              Экспедиции ({filteredList.length})
            </div>
            <div className="flex items-center gap-1 font-[var(--font-mono)] text-[10px] text-[#8CA0B4]/70">
              <Ship className="h-3 w-3" />
              {explorers.length}
            </div>
          </div>

          {/* List */}
          <div className="meridian-scroll min-h-0 flex-1 overflow-y-auto">
            <VoyageList
              voyages={filteredList}
              loading={loading}
              selectedId={selectedVoyageId}
              onSelect={(id) => onSelectVoyage(id)}
              onHover={onHoverVoyage}
            />
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-white/[0.08] bg-black/30 px-4 py-3 font-[var(--font-body)] text-[10.5px] leading-relaxed text-[#8CA0B4]/75">
            Маршруты сглажены центрипетальным сплайном Катмулла-Рома по историческим стоянкам и корректно пересекают 180-й меридиан.
            <br />
            API: Яндекс.Карты 2.1 · <span className="font-[var(--font-mono)] text-[#D9A441]">МЕРИДИАНЫ</span>
          </div>
        </div>
      )}
    </aside>
  );
}
