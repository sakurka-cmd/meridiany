'use client';

import { useMemo } from 'react';
import VoyageList from './VoyageList';
import AIRouteDialog from './AIRouteDialog';
import VoyageDetail from './VoyageDetail';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, Compass, ListIcon, ChevronLeft, Ship } from 'lucide-react';
import type { VoyageDTO, ExplorerDTO } from '@/lib/types';

interface SidebarProps {
  voyages: VoyageDTO[];
  explorers: ExplorerDTO[];
  loading: boolean;
  selectedVoyageId: string | null;
  highlightedPointId: string | null;
  eraFilter: string;
  explorerFilter: string;
  search: string;
  onEraFilterChange: (v: string) => void;
  onExplorerFilterChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onSelectVoyage: (id: string | null) => void;
  onSelectPoint: (voyageId: string, pointId: string) => void;
  onRefresh: () => void;
}

const ERA_COLORS: Record<string, string> = {
  'Древность': '#7c3aed',
  'Средневековье': '#b45309',
  'Эпоха Великих географических открытий': '#dc2626',
  'Новое время': '#0891b2',
  'Новейшее время': '#db2777',
};

export default function Sidebar({
  voyages,
  explorers,
  loading,
  selectedVoyageId,
  highlightedPointId,
  eraFilter,
  explorerFilter,
  search,
  onEraFilterChange,
  onExplorerFilterChange,
  onSearchChange,
  onSelectVoyage,
  onSelectPoint,
  onRefresh,
}: SidebarProps) {
  // Client-side search filter on top of the API-filtered list
  const filteredList = useMemo(() => {
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
        startYear: v.startYear,
        endYear: v.endYear,
        era: v.era,
        type: v.type,
        color: v.color,
        pointCount: v.routePoints.length,
      }));
  }, [voyages, search]);

  const selectedVoyage = voyages.find((v) => v.id === selectedVoyageId) ?? null;
  const eras = Object.keys(ERA_COLORS);

  return (
    <aside className="flex h-full w-full flex-col bg-background">
      {/* Brand / header */}
      <div className="shrink-0 border-b bg-gradient-to-br from-emerald-50 to-background px-4 py-3 dark:from-emerald-950/30">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-bold leading-tight">Атлас путешествий</h1>
            <p className="text-[10px] text-muted-foreground">
              Исторические маршруты мореплавателей
            </p>
          </div>
        </div>
      </div>

      {/* Body: either list view or detail view */}
      {selectedVoyage ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <button
            type="button"
            onClick={() => onSelectVoyage(null)}
            className="flex shrink-0 items-center gap-1 border-b bg-secondary/30 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Назад к списку
          </button>
          <div className="min-h-0 flex-1">
            <VoyageDetail
              voyage={selectedVoyage}
              onClose={() => onSelectVoyage(null)}
              onSelectPoint={(pointId) =>
                onSelectPoint(selectedVoyage.id, pointId)
              }
              highlightedPointId={highlightedPointId}
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Filters */}
          <div className="shrink-0 space-y-2 border-b p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Поиск..."
                  className="h-8 pl-8 text-xs"
                  aria-label="Поиск"
                />
              </div>
              <AIRouteDialog onCreated={onRefresh} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={eraFilter} onValueChange={onEraFilterChange}>
                <SelectTrigger className="h-8 text-xs" aria-label="Фильтр по эпохе">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Filter className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Эпоха" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все эпохи</SelectItem>
                  {eras.map((era) => (
                    <SelectItem key={era} value={era}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: ERA_COLORS[era] }}
                        />
                        {era}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={explorerFilter} onValueChange={onExplorerFilterChange}>
                <SelectTrigger className="h-8 text-xs" aria-label="Фильтр по путешественнику">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Ship className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Мореплаватель" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {explorers.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List header */}
          <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ListIcon className="h-3.5 w-3.5" />
              Плавания ({filteredList.length})
            </div>
          </div>

          {/* List */}
          <ScrollArea className="min-h-0 flex-1">
            <VoyageList
              voyages={filteredList}
              loading={loading}
              selectedId={selectedVoyageId}
              onSelect={(id) => onSelectVoyage(id)}
            />
          </ScrollArea>
        </div>
      )}
    </aside>
  );
}
