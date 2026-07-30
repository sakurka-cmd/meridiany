'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/explorers/Sidebar';
import { Loader2, Globe2, Compass, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VoyageDTO, ExplorerDTO } from '@/lib/types';

// MapView uses Leaflet (browser-only), so it must be dynamically imported
// with SSR disabled to avoid `window is not defined` during build.
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#aadaff]">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  ),
});

export default function Home() {
  const [voyages, setVoyages] = useState<VoyageDTO[]>([]);
  const [explorers, setExplorers] = useState<ExplorerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVoyageId, setSelectedVoyageId] = useState<string | null>(null);
  const [highlightedPointId, setHighlightedPointId] = useState<string | null>(null);

  const [eraFilter, setEraFilter] = useState('all');
  const [explorerFilter, setExplorerFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Sidebar drawer toggle (mobile)
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadVoyages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (eraFilter && eraFilter !== 'all') params.set('era', eraFilter);
      if (explorerFilter && explorerFilter !== 'all') params.set('explorerId', explorerFilter);

      const res = await fetch(`/api/voyages?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Не удалось загрузить плавания');
      const data: VoyageDTO[] = await res.json();
      setVoyages(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [eraFilter, explorerFilter]);

  const loadExplorers = useCallback(async () => {
    try {
      const res = await fetch('/api/explorers', { cache: 'no-store' });
      if (!res.ok) throw new Error('Не удалось загрузить путешественников');
      const data: ExplorerDTO[] = await res.json();
      setExplorers(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadVoyages();
  }, [loadVoyages]);

  useEffect(() => {
    loadExplorers();
  }, [loadExplorers]);

  // Reset selection when filters change so we never end up showing a voyage
  // that was filtered out.
  useEffect(() => {
    setSelectedVoyageId(null);
    setHighlightedPointId(null);
  }, [eraFilter, explorerFilter]);

  const handleSelectVoyage = useCallback((id: string | null) => {
    setSelectedVoyageId(id);
    setHighlightedPointId(null);
    setDrawerOpen(false);
  }, []);

  const handleSelectPoint = useCallback((_voyageId: string, pointId: string) => {
    setHighlightedPointId(pointId);
  }, []);

  const handleRefresh = useCallback(() => {
    loadVoyages();
    loadExplorers();
  }, [loadVoyages, loadExplorers]);

  // Stats
  const totalPoints = voyages.reduce((acc, v) => acc + v.routePoints.length, 0);
  const uniqueEras = new Set(voyages.map((v) => v.era)).size;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="z-30 flex shrink-0 items-center justify-between border-b bg-background px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="Открыть меню"
          >
            <Compass className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight sm:text-base">
                Атлас исторических путешествий
              </h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Маршруты мореплавателей и исследователей — от древности до наших дней
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="hidden items-center gap-4 text-xs text-muted-foreground lg:flex">
          <Stat icon={<Compass className="h-3.5 w-3.5" />} value={explorers.length} label="путешественников" />
          <Stat icon={<Globe2 className="h-3.5 w-3.5" />} value={voyages.length} label="плаваний" />
          <Stat icon={<Sparkles className="h-3.5 w-3.5" />} value={totalPoints} label="точек" />
          <Stat icon={<Globe2 className="h-3.5 w-3.5" />} value={uniqueEras} label="эпох" />
        </div>
      </header>

      {/* Main layout: sidebar + map */}
      <div className="relative flex min-h-0 flex-1">
        {/* Sidebar (desktop) */}
        <div className="hidden w-[340px] shrink-0 border-r md:block">
          <Sidebar
            voyages={voyages}
            explorers={explorers}
            loading={loading}
            selectedVoyageId={selectedVoyageId}
            highlightedPointId={highlightedPointId}
            eraFilter={eraFilter}
            explorerFilter={explorerFilter}
            search={search}
            onEraFilterChange={setEraFilter}
            onExplorerFilterChange={setExplorerFilter}
            onSearchChange={setSearch}
            onSelectVoyage={handleSelectVoyage}
            onSelectPoint={handleSelectPoint}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Sidebar (mobile drawer) */}
        {drawerOpen && (
          <div className="absolute inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <div className="absolute left-0 top-0 h-full w-[300px] max-w-[85vw] bg-background shadow-xl">
              <Sidebar
                voyages={voyages}
                explorers={explorers}
                loading={loading}
                selectedVoyageId={selectedVoyageId}
                highlightedPointId={highlightedPointId}
                eraFilter={eraFilter}
                explorerFilter={explorerFilter}
                search={search}
                onEraFilterChange={setEraFilter}
                onExplorerFilterChange={setExplorerFilter}
                onSearchChange={setSearch}
                onSelectVoyage={handleSelectVoyage}
                onSelectPoint={handleSelectPoint}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
        )}

        {/* Map */}
        <main className="relative min-h-0 flex-1">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#aadaff] p-8 text-center">
              <p className="text-sm text-white drop-shadow">{error}</p>
              <Button onClick={handleRefresh} variant="secondary" size="sm">
                Повторить
              </Button>
            </div>
          ) : (
            <MapView
              voyages={voyages}
              selectedVoyageId={selectedVoyageId}
              onSelectPoint={handleSelectPoint}
              highlightedPointId={highlightedPointId}
            />
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur">
              <Loader2 className="h-3 w-3 animate-spin" />
              Загрузка маршрутов...
            </div>
          )}

          {/* Hint when nothing is selected */}
          {!loading && !selectedVoyageId && voyages.length > 0 && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-center text-xs text-muted-foreground shadow-md backdrop-blur">
              Выберите плавание слева, чтобы увидеть детали маршрута
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-emerald-600">{icon}</span>
      <span className="font-semibold text-foreground">{value}</span>
      <span>{label}</span>
    </div>
  );
}
