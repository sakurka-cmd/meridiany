'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type {
  YandexMap,
  YandexMapsAPI,
  YandexPlacemark,
} from '@/lib/ymaps';
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

interface RenderedRoute {
  voyageId: string;
  color: string;
  segments: RouteSegment[];
}

interface SvgPath {
  voyageId: string;
  color: string;
  d: string;
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
  const placemarksRef = useRef<Array<{ voyageId: string; marks: YandexPlacemark[] }>>([]);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [svgPaths, setSvgPaths] = useState<SvgPath[]>([]);

  // Pre-compute smoothed route segments from voyage data (pure, memoized).
  const routes = useMemo<RenderedRoute[]>(() => {
    return voyages.map((voyage) => ({
      voyageId: voyage.id,
      color: voyage.color ?? '#D9A441',
      segments: buildSmoothedRoute(
        voyage.routePoints.map((p) => [p.latitude, p.longitude] as LatLng)
      ).segments.map((seg) => ({ points: seg })),
    }));
  }, [voyages]);

  // === Convert lat/lng → container-relative pixels ===
  // CORRECT approach:
  //   1. map.options.get('projection').toGlobalPixels([lat, lng], zoom)
  //      converts geographic coords to global pixel coords (world pixels
  //      at the given zoom level).
  //   2. map.converter.globalToPage(worldPixels) converts global pixels
  //      to page (document) pixels.
  //   3. Subtract container offset to get container-relative pixels.
  //
  // NB: passing [lat, lng] DIRECTLY to globalToPage is WRONG — it would
  // be interpreted as global pixel coords and produce wildly incorrect
  // results (lines drawn far to the north of the actual points).
  //
  // ANTIMERIDIAN HANDLING:
  // Yandex's globalToPage "wraps" longitudes outside [-180, +180] back
  // into that range, so passing lng+360 returns the same projected x as
  // lng. Therefore we can't shift longitudes to fix antimeridian issues.
  // Instead, we handle this in refreshSvg() by detecting "jumps" in
  // projected x values and splitting segments at those points.
  const project = useCallback((lat: number, lng: number): [number, number] | null => {
    const map = mapRef.current as unknown as {
      converter?: {
        globalToPage?: (coords: [number, number]) => [number, number];
      };
      options?: {
        get?: (key: string) => unknown;
      };
      getZoom?: () => number;
    } | null;
    if (!map) return null;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    try {
      const projection = map.options?.get?.('projection') as
        | { toGlobalPixels?: (c: [number, number], z: number) => [number, number] }
        | undefined;
      if (!projection?.toGlobalPixels) return null;
      const zoom = map.getZoom ? map.getZoom() : 2;
      const globalPixels = projection.toGlobalPixels([lat, lng], zoom);
      const fn = map.converter?.globalToPage;
      if (typeof fn !== 'function') return null;
      const [px, py] = fn.call(map.converter, globalPixels);
      return [px - rect.left - window.scrollX, py - rect.top - window.scrollY];
    } catch {
      return null;
    }
  }, []);

  // === Recompute SVG paths from current map viewport ===
  const refreshSvg = useCallback(() => {
    if (status !== 'ready') return;
    const sel = selectedVoyageId;
    const next: SvgPath[] = [];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const containerWidth = rect.width;
    // Threshold for "jump" detection. Adjacent points in a smooth spline
    // should have projected x values that differ by less than half the
    // container width. Larger jumps indicate the segment is crossing the
    // antimeridian and Yandex is projecting points on opposite sides of
    // the container.
    const jumpThreshold = containerWidth * 0.5;

    for (const r of routes) {
      // Only draw the selected voyage's routes when one is selected.
      if (sel !== null && sel !== r.voyageId) continue;
      for (const seg of r.segments) {
        // Step 1: project each point with the original longitude.
        const projected: Array<[number, number] | null> = seg.points.map(
          (pt) => project(pt[0], pt[1])
        );

        // Step 2: walk through points and break the segment into
        // sub-segments wherever the projected x "jumps" by more than
        // jumpThreshold. Each sub-segment is drawn as a separate SVG
        // path, so a route crossing the antimeridian appears as two
        // disconnected lines (one going off-screen left, the other
        // coming in from off-screen right) instead of one straight line
        // cutting across the whole map.
        const subSegments: Array<Array<[number, number]>> = [];
        let current: Array<[number, number]> = [];
        let lastValidX: number | null = null;

        for (const xy of projected) {
          if (xy === null) {
            // Gap in projection — flush current sub-segment.
            if (current.length >= 2) subSegments.push(current);
            current = [];
            lastValidX = null;
            continue;
          }
          if (lastValidX !== null && Math.abs(xy[0] - lastValidX) > jumpThreshold) {
            // Jump detected — flush current sub-segment and start a new one.
            if (current.length >= 2) subSegments.push(current);
            current = [];
          }
          current.push(xy);
          lastValidX = xy[0];
        }
        if (current.length >= 2) subSegments.push(current);

        // Step 3: for each sub-segment, optionally shift it horizontally
        // to bring it into view. If the sub-segment is entirely off-screen
        // (e.g., projected x in [1000, 1300] when container is [0, 908]),
        // we shift it by ±containerWidth to "wrap" it to the other side.
        // This is approximate but produces visually correct results.
        for (const sub of subSegments) {
          const minX = Math.min(...sub.map((p) => p[0]));
          const maxX = Math.max(...sub.map((p) => p[0]));
          let shift = 0;
          if (maxX < 0) {
            // Entirely off-screen left → shift right by container width.
            shift = containerWidth;
          } else if (minX > containerWidth) {
            // Entirely off-screen right → shift left by container width.
            shift = -containerWidth;
          }
          const adjusted = shift !== 0 ? sub.map((p) => [p[0] + shift, p[1]] as [number, number]) : sub;
          const d = adjusted
            .map((p, idx) => (idx === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
            .join(' ');
          next.push({ voyageId: r.voyageId, color: r.color, d });
        }
      }
    }
    setSvgPaths(next);
  }, [routes, status, selectedVoyageId, project]);

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
          // stale coordinates and SVG lines drift away from placemarks.
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

  // === Render placemarks when voyages change ===
  useEffect(() => {
    const map = mapRef.current;
    const ymaps = apiRef.current;
    if (!map || !ymaps || status !== 'ready') return;

    // Clear previous placemarks
    placemarksRef.current.forEach((entry) => {
      entry.marks.forEach((m) => {
        try {
          map.geoObjects.remove(m);
        } catch {
          /* noop */
        }
      });
    });
    placemarksRef.current = [];

    if (voyages.length === 0) return;

    const newPlacemarks: Array<{ voyageId: string; marks: YandexPlacemark[] }> = [];

    voyages.forEach((voyage) => {
      const colorHex = voyage.color ?? '#D9A441';

      const layoutNormal = ymaps.templateLayoutFactory.createClass(
        `<div class="meridian-waypoint" style="--c:${colorHex}"><span>$[properties.idx]</span></div>`
      );
      const layoutStart = ymaps.templateLayoutFactory.createClass(
        `<div class="meridian-waypoint meridian-waypoint--start" style="--c:${colorHex}"><span>$[properties.idx]</span></div>`
      );

      const marks: YandexPlacemark[] = [];
      voyage.routePoints.forEach((p, idx) => {
        const isStart = idx === 0;
        const pm = new ymaps.Placemark(
          [p.latitude, p.longitude],
          {
            idx: String(idx + 1),
            hintContent: `${idx + 1}. ${p.name}${p.arrivalDate ? ' · ' + p.arrivalDate : ''}`,
          },
          {
            iconLayout: isStart ? layoutStart : layoutNormal,
            iconOffset: [-12, -12],
            iconShape: { type: 'Circle', coordinates: [12, 12], radius: 13 },
          }
        );
        pm.events.add('click', () => {
          onSelectPoint?.(voyage.id, p.id);
        });
        map.geoObjects.add(pm);
        marks.push(pm);
      });
      newPlacemarks.push({ voyageId: voyage.id, marks });
    });

    placemarksRef.current = newPlacemarks;
  }, [voyages, status, onSelectPoint]);

  // === Show/hide placemarks based on selection ===
  useEffect(() => {
    const isSel = (vid: string) =>
      selectedVoyageId === null || selectedVoyageId === vid;

    placemarksRef.current.forEach((entry) => {
      const visible = isSel(entry.voyageId);
      entry.marks.forEach((m) => {
        m.options.set('visible', visible);
      });
    });
  }, [selectedVoyageId, voyages]);

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

      {/* SVG overlay for route polylines.
          We draw routes ourselves because Yandex Maps in dev mode (or with
          an unverified API key) may suppress native Polyline canvas rendering.
          The overlay is positioned above map tiles but below placemarks. */}
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
