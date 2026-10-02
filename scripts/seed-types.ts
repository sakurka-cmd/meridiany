// Type definitions for the seed data (lightweight, hand-written)
// Used only by scripts/seed.ts

export interface SeedRoutePoint {
  name: string;
  lat: number;
  lng: number;
  description?: string;
  arrivalDate?: string;
  /** false = вспомогательная точка без подписи (изгиб маршрута) */
  isWaypoint?: boolean;
}

export interface SeedVoyage {
  title: string;
  description: string;
  startYear?: number;
  endYear?: number;
  era: string;
  type: 'sea' | 'land' | 'mixed' | 'air';
  category: string;
  color: string;
  points: SeedRoutePoint[];
}

export interface SeedExplorer {
  name: string;
  who?: string;
  birthYear?: number;
  deathYear?: number;
  nationality?: string;
  bio?: string;
  voyages: SeedVoyage[];
}
