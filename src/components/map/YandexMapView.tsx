'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { YandexMap, YandexMapsAPI } from '@/lib/ymaps';
import type { VoyageDTO } from '@/lib/types';
import { buildSmoothedRoute, type LatLng } from '@/lib/geo';

// === Yandex Maps 2.1 loader ===
// The API key is included in the URL. Even if the key is flagged as "Invalid"
// (e.g. wrong domain binding), the map tiles and converter still work — we
// just can't rely on native Polyline rendering. So we draw routes ourselves
// via an SVG overlay positioned above the map, using map.converter.globalToPage
// to project lat/lng → container-relative pixels.
const YANDEX_API_URL =
  'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=a49f8b63-e7ea-47e5-b86a-fd86d778d4dc';

let yandexLoadPromise: Promise<YandexMapsAPI | null> | null = null;

function loadYandexAPI(): Promise<YandexMapsAPI | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.ymaps) return Promise.resolve(window.ymaps);
  if (yandexLoadPromise) return yandexLoadPromise;

  yandexLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-meridian-yandex]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(window.ymaps ?? null));
      existing.addEventListener('error', () => resolve(null));
      return;
    }
    const script = document.createElement('script');
    script.src = YANDEX_API_URL;
    script.async = true;
    script.setAttribute('data-meridian-yandex', '');
    script.onerror = () => {
      window.__meridianYandexFailed = true;
      resolve(null);
    };
    script.onload = () => resolve(window.ymaps ?? null);
    document.head.appendChild(script);
    setTimeout(() => {
      if (!window.ymaps) resolve(null);
    }, 8000);
  });

  return yandexLoadPromise;
}

interface MapViewProps {
  voyages: VoyageDTO[];
  selectedVoyageId: string | null;
  highlightedPointId?: string | null;
  onSelectPoint?: (voyageId: string, pointId: string) => void;
  onSelectVoyage?: (voyageId: string) => void;
  onHoverVoyage?: (voyageId: string | null) => void;
  resetSignal?: number;
  onReady?: () => void;
  onError?: () => void;
}

interface RouteSegment {
  points: LatLng[]; // [lat, lng] pairs
}

interface RoutePointMarker {
  id: string;
  lat: number;
  lng: number;
  idx: number;
  name: string;
  date?: string | null;
}

interface RenderedRoute {
  voyageId: string;
  color: string;
  segments: RouteSegment[];
  points: RoutePointMarker[];
}

interface SvgPath {
  voyageId: string;
  color: string;
  d: string;
}

interface SvgMarker {
  voyageId: string;
  pointId: string;
  color: string;
  idx: number;
  name: string;
  date?: string | null;
  isStart: boolean;
  x: number;
  y: number;
}

export default function YandexMapView({
  voyages,
  selectedVoyageId,
  highlightedPointId,
  onSelectPoint,
  onSelectVoyage,
  onHoverVoyage,
  resetSignal,
  onReady,
  onError,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<YandexMap | null>(null);
  const apiRef = useRef<YandexMapsAPI | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [svgPaths, setSvgPaths] = useState<SvgPath[]>([]);
  const [svgMarkers, setSvgMarkers] = useState<SvgMarker[]>([]);

  // Pre-compute smoothed route segments from voyage data (pure, memoized).
  const routes = useMemo<RenderedRoute[]>(() => {
    return voyages.map((voyage) => ({
      voyageId: voyage.id,
      color: voyage.color ?? '#D9A441',
      segments: buildSmoothedRoute(
        voyage.routePoints.map((p) => [p.latitude, p.longitude] as LatLng)
      ).segments.map((seg) => ({ points: seg })),
      // Маркеры — только у ключевых точек; сплайн строится по всем.
      points: voyage.routePoints
        .filter((p) => p.isWaypoint)
        .map((p, i) => ({
          id: p.id,
          lat: p.latitude,
          lng: p.longitude,
          idx: i + 1,
          name: p.name,
          date: p.arrivalDate,
        })),
    }));
  }, [voyages]);

  // === Convert lat/lng → global pixels ===
  // Uses the projection directly. toGlobalPixels wraps longitudes into the
  // primary world copy [0, worldWidth); the caller re-unwraps x where
  // continuity is needed (routes) or picks the copy nearest the viewport
  // (markers), so antimeridian-crossing geometry renders correctly.
  const projectRaw = useCallback((lat: number, lng: number): [number, number] | null => {
    const map = mapRef.current as unknown as {
      options?: {
        get?: (key: string) => unknown;
      };
      getZoom?: () => number;
    } | null;
    if (!map) return null;
    try {
      const projection = map.options?.get?.('projection') as
        | { toGlobalPixels?: (c: [number, number], z: number) => [number, number] }
        | undefined;
      if (!projection?.toGlobalPixels) return null;
      const zoom = map.getZoom ? map.getZoom() : 2;
      return projection.toGlobalPixels([lat, lng], zoom);
    } catch {
      return null;
    }
  }, []);

  // map.converter.globalToPage is a pure translation from global pixel
  // space to page (document) space. Capture it bound to its converter.
  const globalToPageRef = useRef<{ fn: ((coords: [number, number]) => [number, number]) | null }>({ fn: null });

  useEffect(() => {
    const map = mapRef.current as unknown as {
      converter?: {
        globalToPage?: (coords: [number, number]) => [number, number];
      };
    } | null;
    const conv = map?.converter;
    const raw = conv?.globalToPage;
    globalToPageRef.current.fn =
      typeof raw === 'function' && conv ? (c) => raw.call(conv, c) : null;
  }, [status]);

  // === Recompute SVG overlay (routes + waypoint markers) on viewport change ===
  const refreshSvg = useCallback(() => {
    if (status !== 'ready') return;
    const sel = selectedVoyageId;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const globalToPage = globalToPageRef.current.fn;
    if (!globalToPage) return;

    // One shared global→page offset for this map state, derived from a
    // fixed probe point so routes and markers always agree.
    const probe = projectRaw(0, 0);
    if (!probe) return;
    let pageProbe: [number, number];
    try {
      pageProbe = globalToPage(probe);
    } catch {
      return;
    }
    const offsetX = pageProbe[0] - probe[0];
    const offsetY = pageProbe[1] - probe[1];
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const toContainerX = (gx: number) => gx + offsetX - rect.left - scrollX;
    const toContainerY = (gy: number) => gy + offsetY - rect.top - scrollY;

    const containerWidth = rect.width;
    const containerHeight = rect.height;
    // World width in global pixels at the current zoom.
    const worldWidth = 256 * Math.pow(2, mapRef.current?.getZoom?.() ?? 2);

    const nextPaths: SvgPath[] = [];
    const nextMarkers: SvgMarker[] = [];

    for (const r of routes) {
      // Only draw the selected voyage when one is selected.
      if (sel !== null && sel !== r.voyageId) continue;

      for (const seg of r.segments) {
        // Project every point, then re-unwrap x relative to the PREVIOUS
        // point (minimal-distance rule). toGlobalPixels wraps into the
        // primary world copy, so this reconstructs a continuous pixel
        // path even for routes that wrap around the globe
        // (circumnavigation spans ≈ worldWidth). Normalizing against a
        // fixed anchor instead would fold the tail of a 360° route back
        // and draw a horizontal line across the whole map.
        const pts: Array<[number, number]> = [];
        let prevX: number | null = null;
        for (const pt of seg.points) {
          const gp = projectRaw(pt[0], pt[1]);
          if (!gp) continue;
          let x = gp[0];
          if (prevX !== null) {
            while (x - prevX > worldWidth / 2) x -= worldWidth;
            while (prevX - x > worldWidth / 2) x += worldWidth;
          }
          pts.push([x, gp[1]]);
          prevX = x;
        }
        if (pts.length < 2) continue;
        const cont = pts.map((p) => [toContainerX(p[0]), toContainerY(p[1])] as [number, number]);

        // The viewport is a window into one periodic copy of the world,
        // so the route may be visible through a neighbouring copy.
        // Draw copies shifted by -W, 0, +W; SVG clips what's outside.
        for (const shift of [-worldWidth, 0, worldWidth]) {
          let visible = false;
          for (const p of cont) {
            const x = p[0] + shift;
            if (x >= 0 && x <= containerWidth) { visible = true; break; }
          }
          if (!visible) continue;
          const d = cont
            .map((p, idx) => (idx === 0 ? `M${p[0] + shift},${p[1]}` : `L${p[0] + shift},${p[1]}`))
            .join(' ');
          nextPaths.push({ voyageId: r.voyageId, color: r.color, d });
        }
      }

      // Waypoint markers: pick the world copy nearest the viewport
      // centre. Yandex placemarks can't do this (they always render in
      // the primary copy, so markers near the antimeridian fall off
      // screen), which is why markers are drawn here in the same SVG.
      const centerX = containerWidth / 2;
      for (const p of r.points) {
        const gp = projectRaw(p.lat, p.lng);
        if (!gp) continue;
        const x0 = toContainerX(gp[0]);
        const k = Math.round((centerX - x0) / worldWidth);
        const x = x0 + k * worldWidth;
        const y = toContainerY(gp[1]);
        if (x < -14 || x > containerWidth + 14) continue;
        if (y < -14 || y > containerHeight + 14) continue;
        nextMarkers.push({
          voyageId: r.voyageId,
          pointId: p.id,
          color: r.color,
          idx: p.idx,
          name: p.name,
          date: p.date,
          isStart: p.idx === 1,
          x,
          y,
        });
      }
    }

    setSvgPaths(nextPaths);
    setSvgMarkers(nextMarkers);
  }, [routes, status, selectedVoyageId, projectRaw]);

  // Keep a ref to refreshSvg so the init effect doesn't re-run when it changes.
  const refreshSvgRef = useRef(refreshSvg);
  useEffect(() => {
    refreshSvgRef.current = refreshSvg;
  }, [refreshSvg]);

  // === Init map once ===
  useEffect(() => {
    let cancelled = false;

    loadYandexAPI().then((ymaps) => {
      if (cancelled || !ymaps || !containerRef.current) {
        if (!cancelled) {
          setStatus('error');
          onError?.();
        }
        return;
      }
      apiRef.current = ymaps;

      ymaps.ready(() => {
        if (cancelled || !containerRef.current) return;

        try {
          const map = new ymaps.Map(
            containerRef.current,
            {
              center: [26, 12],
              zoom: 2,
              minZoom: 2,
              maxZoom: 12,
              type: 'yandex#map',
            },
            {
              suppressMapOpenBlock: true,
              yandexMapDisablePoiInteractivity: true,
            }
          );

          try {
            [
              'searchControl',
              'trafficControl',
              'geolocationControl',
              'routeEditor',
              'rulerControl',
              'typeSelector',
              'fullscreenControl',
            ].forEach((c) => map.controls.remove(c));
          } catch {
            /* ignore */
          }

          // Redraw SVG overlay whenever the map moves or zooms
          const handler = () => refreshSvgRef.current();
          map.events.add('actiontick', handler);
          map.events.add('actionend', handler);
          map.events.add('boundschange', handler);
          map.events.add('zoomchange', handler);

          mapRef.current = map;
          apiRef.current = ymaps;
          setStatus('ready');
          onReady?.();

          // Yandex Maps needs an explicit "fit to viewport" call after
          // initialization so its internal pixel coordinate cache matches
          // the actual container size. Without this, globalToPage returns
          // stale coordinates and SVG lines drift away from markers.
          setTimeout(() => {
            try {
              (map as unknown as {
                container?: { fitToViewport?: () => void };
              }).container?.fitToViewport?.();
              refreshSvgRef.current();
            } catch {
              /* noop */
            }
          }, 100);
        } catch (err) {
          console.error('Failed to init Yandex Map:', err);
          setStatus('error');
          onError?.();
        }
      });
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch {
          /* noop */
        }
        mapRef.current = null;
      }
    };
  }, []);

  // === Refresh SVG when routes or selection change ===
  useEffect(() => {
    if (routes.length === 0) return;
    const id = setTimeout(() => refreshSvg(), 0);
    return () => clearTimeout(id);
  }, [routes, refreshSvg]);

  // === Fit to selected voyage bounds ===
  useEffect(() => {
    const map = mapRef.current;
    const ymaps = apiRef.current;
    if (!map || !ymaps || status !== 'ready') return;

    if (selectedVoyageId) {
      const sel = voyages.find((v) => v.id === selectedVoyageId);
      if (sel && sel.routePoints.length > 0) {
        const pts = sel.routePoints.map(
          (p) => [p.latitude, p.longitude] as [number, number]
        );
        const bounds = ymaps.util.bounds.fromPoints(pts);
        try {
          map.setBounds(bounds, {
            checkZoomRange: true,
            zoomMargin: 48,
            duration: 650,
          });
        } catch {
          /* noop */
        }
      }
    }
  }, [selectedVoyageId, voyages, status]);

  // === Reset view ===
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    try {
      map.setBounds([[-72, -179], [78, 179]], {
        checkZoomRange: true,
        duration: 700,
      });
    } catch {
      /* noop */
    }
  }, [resetSignal, status]);

  // === Pan to highlighted waypoint ===
  useEffect(() => {
    if (!highlightedPointId || !mapRef.current) return;
    const voyage = voyages.find((v) =>
      v.routePoints.some((p) => p.id === highlightedPointId)
    );
    if (!voyage) return;
    const pt = voyage.routePoints.find((p) => p.id === highlightedPointId);
    if (!pt) return;
    try {
      mapRef.current.setCenter([pt.latitude, pt.longitude], 6, {
        duration: 450,
        checkZoomRange: true,
      });
    } catch {
      /* noop */
    }
  }, [highlightedPointId, voyages]);

  return (
    <div className="relative h-full w-full" style={{ background: '#0B1420' }}>
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label="Карта исторических маршрутов"
      />

      {/* SVG overlay for route polylines and waypoint markers, positioned
          above map tiles (z-index: 5). Markers are drawn after the paths
          so the numbered circles stay on top of the lines. */}
      {status === 'ready' && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ zIndex: 5 }}
          aria-hidden
        >
          {svgPaths.map((p, i) => (
            <path
              key={`${p.voyageId}-${i}`}
              d={p.d}
              stroke={p.color}
              strokeWidth={3.5}
              strokeOpacity={0.9}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                pointerEvents: 'stroke',
                cursor: 'pointer',
              }}
              onClick={() => onSelectVoyage?.(p.voyageId)}
              onMouseEnter={() => onHoverVoyage?.(p.voyageId)}
              onMouseLeave={() => onHoverVoyage?.(null)}
            />
          ))}

          {svgMarkers.map((m) => (
            <g
              key={`${m.voyageId}-${m.pointId}`}
              transform={`translate(${m.x},${m.y})`}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={() => onSelectPoint?.(m.voyageId, m.pointId)}
            >
              <title>{`${m.idx}. ${m.name}${m.date ? ' · ' + m.date : ''}`}</title>
              {m.isStart && (
                <circle
                  className="meridian-svg-start-ring"
                  r={15}
                  fill="none"
                  stroke={m.color}
                  strokeWidth={2}
                />
              )}
              <circle r={11} fill="#0C1826" stroke={m.color} strokeWidth={2} />
              <text
                textAnchor="middle"
                dy="0.35em"
                fill="#EDE6D6"
                fontSize={11}
                fontWeight={600}
                style={{ fontFamily: 'var(--font-mono), monospace', userSelect: 'none' }}
              >
                {m.idx}
              </text>
            </g>
          ))}
        </svg>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0B1420]">
          <svg className="h-16 w-16" viewBox="0 0 44 44" aria-hidden>
            <circle cx="22" cy="22" r="20" fill="none" stroke="#D9A441" strokeWidth="1.5" opacity="0.85" />
            <circle cx="22" cy="22" r="15" fill="none" stroke="rgba(217,164,65,0.35)" strokeWidth="1" strokeDasharray="2 4" />
            <g className="meridian-loader-spin">
              <path d="M22 5 L25.4 22 L22 39 L18.6 22 Z" fill="#D9A441" />
              <path d="M22 5 L25.4 22 L18.6 22 Z" fill="#E4572E" />
            </g>
            <circle cx="22" cy="22" r="2.4" fill="#EDE6D6" />
          </svg>
          <div className="font-[var(--font-display)] text-2xl font-black tracking-[0.22em] text-[#EDE6D6]">
            МЕРИДИАНЫ
          </div>
          <div className="font-[var(--font-mono)] text-xs tracking-wider text-[#8CA0B4]">
            прокладываем курс · загружаем карты Яндекса…
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0B1420] p-8 text-center">
          <svg className="h-10 w-10 text-[#D9A441]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="max-w-md font-[var(--font-body)] text-sm text-[#EDE6D6]">
            API Яндекс.Карт не загрузилось.
          </p>
          <p className="max-w-md font-[var(--font-mono)] text-xs text-[#8CA0B4]">
            Проверьте соединение с api-maps.yandex.ru и обновите страницу.
          </p>
        </div>
      )}
    </div>
  );
}
