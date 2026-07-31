'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/explorers/Sidebar';
import Timeline from '@/components/explorers/Timeline';
import { Loader2, Globe2, Compass, Sparkles, X } from 'lucide-react';
import type { VoyageDTO, ExplorerDTO } from '@/lib/types';
import { buildSmoothedRoute } from '@/lib/geo';

// Yandex Maps API requires `window` — disable SSR.
const YandexMapView = dynamic(() => import('@/components/map/YandexMapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0B1420]">
      <Loader2 className="h-8 w-8 animate-spin text-[#D9A441]" />
    </div>
  ),
});

export default function Home() {
  const [voyages, setVoyages] = useState<VoyageDTO[]>([]);
  const [explorers, setExplorers] = useState<ExplorerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [selectedVoyageId, setSelectedVoyageId] = useState<string | null>(null);
  const [highlightedPointId, setHighlightedPointId] = useState<string | null>(null);
  const [hoverVoyageId, setHoverVoyageId] = useState<string | null>(null);

  const [eraFilter, setEraFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  // Pre-compute smoothed route length (km) for each voyage — used by the
  // detail panel. Done once when voyages load.
  const voyagesKm = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of voyages) {
      const pts = v.routePoints.map((p) => [p.latitude, p.longitude] as [number, number]);
      map[v.id] = buildSmoothedRoute(pts).km;
    }
    return map;
  }, [voyages]);

  const loadVoyages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (eraFilter && eraFilter !== 'all') params.set('era', eraFilter);
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);

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
  }, [eraFilter, typeFilter]);

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
  }, [eraFilter, typeFilter]);

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

  const handleReset = useCallback(() => {
    setSelectedVoyageId(null);
    setHighlightedPointId(null);
    setEraFilter('all');
    setTypeFilter('all');
    setResetSignal((n) => n + 1);
  }, []);

  // Stats for the header
  const totalPoints = voyages.reduce((acc, v) => acc + v.routePoints.length, 0);
  const totalKm = useMemo(() => {
    return Object.values(voyagesKm).reduce((acc, k) => acc + k, 0);
  }, [voyagesKm]);

  return (
    <div className="flex h-screen flex-col bg-[#0B1420] text-[#EDE6D6]">
      {/* === Top bar === */}
      <header
        className="z-30 flex h-[60px] shrink-0 items-center justify-between gap-4 px-5"
        style={{
          background: '#0C1826',
          borderBottom: '1px solid rgba(217, 164, 65, 0.22)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Mobile drawer toggle */}
          <button
            type="button"
            className="md:hidden"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="Открыть меню"
          >
            <Compass className="h-5 w-5 text-[#D9A441]" />
          </button>

          {/* Brand */}
          <div className="flex items-center gap-3">
            <svg className="h-9 w-9" viewBox="0 0 44 44" aria-hidden>
              <circle cx="22" cy="22" r="20" fill="none" stroke="#D9A441" strokeWidth="1.5" opacity="0.85" />
              <circle cx="22" cy="22" r="15" fill="none" stroke="rgba(217,164,65,0.35)" strokeWidth="1" strokeDasharray="2 4" />
              <g className="meridian-compass-needle">
                <path d="M22 6 L25 22 L22 38 L19 22 Z" fill="#D9A441" />
                <path d="M22 6 L25 22 L19 22 Z" fill="#E4572E" />
              </g>
              <circle cx="22" cy="22" r="2.2" fill="#EDE6D6" />
            </svg>
            <div>
              <div className="font-[var(--font-display)] text-[21px] font-black leading-none tracking-[0.14em] text-[#EDE6D6]">
                МЕРИДИАНЫ
              </div>
              <div className="mt-0.5 font-[var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em] text-[#8CA0B4]">
                атлас великих экспедиций
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden items-center gap-2 font-[var(--font-mono)] text-[11px] text-[#8CA0B4] tracking-wider lg:flex">
          <span>{explorers.length} путешественников</span>
          <span className="text-[#D9A441]">·</span>
          <span>{voyages.length} экспедиций</span>
          <span className="text-[#D9A441]">·</span>
          <span>{totalPoints} точек</span>
          <span className="text-[#D9A441]">·</span>
          <span>{(totalKm / 1000).toFixed(0)} тыс. км</span>
        </div>
      </header>

      {/* === Main === */}
      <div className="relative flex min-h-0 flex-1">
        {/* Sidebar (desktop) */}
        <div className="hidden w-[372px] shrink-0 border-r border-white/[0.08] md:block">
          <Sidebar
            voyages={voyages}
            voyagesKm={voyagesKm}
            explorers={explorers}
            loading={loading}
            selectedVoyageId={selectedVoyageId}
            highlightedPointId={highlightedPointId}
            eraFilter={eraFilter}
            typeFilter={typeFilter}
            search={search}
            onEraFilterChange={setEraFilter}
            onTypeFilterChange={setTypeFilter}
            onSearchChange={setSearch}
            onSelectVoyage={handleSelectVoyage}
            onSelectPoint={handleSelectPoint}
            onHoverVoyage={setHoverVoyageId}
          />
        </div>

        {/* Sidebar (mobile drawer) */}
        {drawerOpen && (
          <div className="absolute inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <div className="absolute left-0 top-0 h-full w-[min(372px,88vw)] border-r border-white/[0.08] bg-[#0F1D2E] shadow-2xl">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Закрыть меню"
                className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-[#8CA0B4] hover:border-[#D9A441] hover:text-[#EDE6D6]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <Sidebar
                voyages={voyages}
                voyagesKm={voyagesKm}
                explorers={explorers}
                loading={loading}
                selectedVoyageId={selectedVoyageId}
                highlightedPointId={highlightedPointId}
                eraFilter={eraFilter}
                typeFilter={typeFilter}
                search={search}
                onEraFilterChange={setEraFilter}
                onTypeFilterChange={setTypeFilter}
                onSearchChange={setSearch}
                onSelectVoyage={handleSelectVoyage}
                onSelectPoint={handleSelectPoint}
                onHoverVoyage={setHoverVoyageId}
              />
            </div>
          </div>
        )}

        {/* Map */}
        <main className="relative min-h-0 flex-1">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0B1420] p-8 text-center">
              <p className="font-[var(--font-body)] text-sm text-[#EDE6D6]">{error}</p>
              <button
                onClick={handleRefresh}
                className="rounded-md border border-[#D9A441]/40 bg-[#D9A441]/10 px-3 py-1.5 font-[var(--font-body)] text-xs text-[#D9A441] hover:bg-[#D9A441]/20"
              >
                Повторить
              </button>
            </div>
          ) : (
            <YandexMapView
              voyages={voyages}
              selectedVoyageId={selectedVoyageId}
              highlightedPointId={highlightedPointId}
              onSelectPoint={handleSelectPoint}
              onSelectVoyage={handleSelectVoyage}
              onHoverVoyage={setHoverVoyageId}
              resetSignal={resetSignal}
              onReady={() => setMapReady(true)}
            />
          )}

          {/* Loading data overlay (above the map) */}
          {loading && mapReady && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full bg-[rgba(10,19,31,0.9)] px-3 py-1.5 font-[var(--font-mono)] text-[11px] text-[#EDE6D6] shadow-md backdrop-blur">
              <Loader2 className="h-3 w-3 animate-spin text-[#D9A441]" />
              Загрузка маршрутов...
            </div>
          )}

          {/* Hint pill */}
          {!loading && !selectedVoyageId && voyages.length > 0 && (
            <div
              className="meridian-hint pointer-events-none absolute left-1/2 top-3 z-[6] rounded-full border border-[#D9A441]/22 bg-[rgba(10,19,31,0.9)] px-4 py-2 font-[var(--font-body)] text-[12px] text-[#EDE6D6] shadow-md backdrop-blur"
              style={{ transform: 'translateX(-50%)' }}
            >
              Выберите экспедицию слева — маршрут оживёт на карте
            </div>
          )}

          {/* Reset button */}
          <div className="absolute left-3 top-3 z-[6] flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-md border border-white/15 bg-[rgba(10,19,31,0.88)] px-3 py-1.5 font-[var(--font-body)] text-[12px] text-[#EDE6D6] transition-all hover:border-[#D9A441] hover:text-[#D9A441]"
            >
              <Globe2 className="h-3.5 w-3.5" />
              Весь мир
            </button>
          </div>

          {/* Hovered-voyage tooltip */}
          {hoverVoyageId && hoverVoyageId !== selectedVoyageId && (
            <div className="pointer-events-none absolute bottom-[120px] left-1/2 z-[6] -translate-x-1/2 rounded-md border border-[#D9A441]/30 bg-[rgba(10,19,31,0.95)] px-3 py-1.5 font-[var(--font-body)] text-xs text-[#EDE6D6] shadow-lg">
              {voyages.find((v) => v.id === hoverVoyageId)?.title}
            </div>
          )}

          {/* Timeline */}
          {mapReady && !error && (
            <Timeline
              voyages={voyages}
              selectedId={selectedVoyageId}
              eraFilter={eraFilter}
              onSelect={(id) => handleSelectVoyage(id)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
