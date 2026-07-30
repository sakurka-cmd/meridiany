// Shared types for the Historical Routes project

export type Era =
  | 'Древность'
  | 'Средневековье'
  | 'Эпоха Великих географических открытий'
  | 'Новое время'
  | 'Новейшее время';

export const ERAS: Era[] = [
  'Древность',
  'Средневековье',
  'Эпоха Великих географических открытий',
  'Новое время',
  'Новейшее время',
];

export interface RoutePointDTO {
  id: string;
  order: number;
  name: string;
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
  color: string | null;
  explorerId: string;
  explorerName: string;
  routePoints: RoutePointDTO[];
}

export interface ExplorerDTO {
  id: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  nationality: string | null;
  bio: string | null;
  voyageCount: number;
}
