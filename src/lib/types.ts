// Shared types for the Historical Routes project

export type Era =
  | 'Древность'
  | 'Средние века'
  | 'Век паруса'
  | 'XIX–XX века'
  | 'Современность';

// Russian human-readable era labels
export const ERAS: Era[] = [
  'Древность',
  'Средние века',
  'Век паруса',
  'XIX–XX века',
  'Современность',
];

// Era slug keys (used for timeline band ordering, filter values)
export const ERA_SLUGS: Record<Era, string> = {
  'Древность': 'ancient',
  'Средние века': 'medieval',
  'Век паруса': 'sail',
  'XIX–XX века': 'industry',
  'Современность': 'modern',
};

// Era ordering with year ranges (used by the timeline)
export const ERA_RANGES: Array<{
  slug: string;
  label: string;
  start: number;
  end: number;
}> = [
  { slug: 'ancient', label: 'Древность', start: -50000, end: 1000 },
  { slug: 'medieval', label: 'Средние века', start: 1000, end: 1400 },
  { slug: 'sail', label: 'Век паруса', start: 1400, end: 1850 },
  { slug: 'industry', label: 'XIX–XX века', start: 1850, end: 1950 },
  { slug: 'modern', label: 'Современность', start: 1950, end: 2030 },
];

export interface RoutePointDTO {
  id: string;
  order: number;
  name: string;
  isWaypoint: boolean;
  description: string | null;
  latitude: number;
  longitude: number;
  arrivalDate: string | null;
}

export interface VoyageDTO {
  id: string;
  title: string;
  description: string | null;
  startYear: number | null;
  endYear: number | null;
  era: string;
  type: string | null;
  category: string | null;
  color: string | null;
  explorerId: string;
  explorerName: string;
  explorerWho: string | null;
  routePoints: RoutePointDTO[];
}

export interface ExplorerDTO {
  id: string;
  name: string;
  who: string | null;
  birthYear: number | null;
  deathYear: number | null;
  nationality: string | null;
  bio: string | null;
  voyageCount: number;
}
