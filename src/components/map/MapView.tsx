'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { VoyageDTO } from '@/lib/types';

interface MapViewProps {
  voyages: VoyageDTO[];
  selectedVoyageId: string | null;
  onSelectPoint?: (voyageId: string, pointId: string) => void;
  highlightedPointId?: string | null;
}

// OpenStreetMap tiles — free, no API key required.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Numbered teardrop marker colored per voyage.
function makeNumberedIcon(color: string, order: number, highlighted: boolean) {
  const size = highlighted ? 36 : 28;
  const fontSize = highlighted ? 16 : 13;
  const boxShadow = highlighted
    ? '0 0 0 4px rgba(255,255,255,0.9), 0 4px 8px rgba(0,0,0,0.4)'
    : '0 0 0 3px rgba(255,255,255,0.85), 0 2px 4px rgba(0,0,0,0.35)';
  return L.divIcon({
    className: 'route-marker',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:${boxShadow};
      display:flex;align-items:center;justify-content:center;
      border:2px solid #ffffff;
    "><span style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:${fontSize}px;font-family:Inter,system-ui,sans-serif;">${order}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function MapView({
  voyages,
  selectedVoyageId,
  onSelectPoint,
  highlightedPointId,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const initializedRef = useRef(false);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      noWrap: false,
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  // Render voyages when they change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    polylinesRef.current.forEach((p) => p.remove());
    markersRef.current = [];
    polylinesRef.current = [];

    if (voyages.length === 0) return;

    const allBounds: L.LatLngExpression[] = [];

    voyages.forEach((voyage) => {
      const isSelected = selectedVoyageId === null || selectedVoyageId === voyage.id;
      const color = voyage.color ?? '#0891b2';
      const opacity = isSelected ? 1 : 0.18;
      const weight = isSelected ? 3 : 1.5;

      const latlngs: L.LatLngExpression[] = voyage.routePoints.map((p) => [
        p.latitude,
        p.longitude,
      ]);
      if (latlngs.length >= 2) {
        const polyline = L.polyline(latlngs, {
          color,
          weight,
          opacity,
          dashArray: voyage.type === 'Кругосветное плавание' ? undefined : '6,8',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        polylinesRef.current.push(polyline);
      }

      voyage.routePoints.forEach((p, idx) => {
        const isHighlighted = highlightedPointId === p.id;
        const icon = makeNumberedIcon(color, idx + 1, isHighlighted);
        const marker = L.marker([p.latitude, p.longitude], { icon, opacity }).addTo(map);

        const popupHtml = `
          <div style="font-family:Inter,system-ui,sans-serif;min-width:200px;max-width:280px;">
            <div style="font-size:11px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">
              ${escapeHtml(voyage.explorerName)} · Точка ${idx + 1}
            </div>
            <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:4px;">
              ${escapeHtml(p.name)}
            </div>
            ${p.arrivalDate ? `<div style="font-size:12px;color:#555;margin-bottom:4px;">${escapeHtml(p.arrivalDate)}</div>` : ''}
            ${p.description ? `<div style="font-size:12px;color:#444;line-height:1.4;">${escapeHtml(p.description)}</div>` : ''}
          </div>
        `;
        marker.bindPopup(popupHtml, { className: 'route-popup', maxWidth: 320 });
        marker.on('click', () => {
          onSelectPoint?.(voyage.id, p.id);
        });
        markersRef.current.push(marker);
        allBounds.push([p.latitude, p.longitude]);
      });
    });

    if (selectedVoyageId) {
      const selected = voyages.find((v) => v.id === selectedVoyageId);
      if (selected && selected.routePoints.length > 0) {
        const pts = selected.routePoints.map((p) => [p.latitude, p.longitude] as [number, number]);
        const bounds = L.latLngBounds(pts).pad(0.15);
        map.fitBounds(bounds, { maxZoom: 8, animate: true });
      }
    } else if (allBounds.length > 0) {
      const bounds = L.latLngBounds(allBounds as [number, number][]).pad(0.1);
      map.fitBounds(bounds, { maxZoom: 4, animate: true });
    }
  }, [voyages, selectedVoyageId, highlightedPointId, onSelectPoint]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ background: '#aadaff' }}
      aria-label="Карта исторических маршрутов"
    />
  );
}
