// Minimal type declarations for the Yandex Maps JS API 2.1.
// This is not exhaustive — only the bits we use in YandexMapView.
// API reference: https://yandex.ru/dev/maps/jsapi/doc/2.1/dg/concepts/about.html

declare global {
  interface Window {
    ymaps?: YandexMapsAPI;
    __meridianYandexFailed?: boolean;
  }
}

export interface YandexMapsAPI {
  ready: (cb: () => void) => void;
  Map: YandexMapConstructor;
  Polyline: YandexPolylineConstructor;
  Placemark: YandexPlacemarkConstructor;
  templateLayoutFactory: {
    createClass: (template: string) => unknown;
  };
  coordSystem: {
    geo: {
      getDistance: (a: [number, number], b: [number, number]) => number;
    };
  };
  util: {
    bounds: {
      fromPoints: (points: [number, number][]) => [[number, number], [number, number]];
    };
  };
}

export interface YandexMapConstructor {
  new (
    container: HTMLElement | string,
    state: YandexMapState,
    options?: YandexMapOptions
  ): YandexMap;
}

export interface YandexMapState {
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  type?: string;
}

export interface YandexMapOptions {
  suppressMapOpenBlock?: boolean;
  yandexMapDisablePoiInteractivity?: boolean;
}

export interface YandexMap {
  geoObjects: {
    add: (obj: unknown) => YandexMap;
    remove: (obj: unknown) => YandexMap;
    getIterator: () => { getNext: () => unknown | null };
  };
  controls: {
    remove: (name: string) => void;
  };
  events: {
    add: (event: string, cb: (e: YandexEvent) => void) => void;
  };
  setCenter: (
    coords: [number, number],
    zoom?: number,
    options?: { duration?: number; checkZoomRange?: boolean }
  ) => void;
  setBounds: (
    bounds: [[number, number], [number, number]],
    options?: {
      checkZoomRange?: boolean;
      zoomMargin?: number | number[];
      duration?: number;
    }
  ) => void;
  getCenter: () => [number, number];
  getZoom: () => number;
  destroy: () => void;
  options: {
    set: (key: string, value: unknown) => void;
  };
}

export interface YandexEvent {
  get: (key: string) => unknown;
  getCoords: () => [number, number] | null;
}

export interface YandexPolylineConstructor {
  new (
    coords: [number, number][],
    properties?: Record<string, unknown>,
    options?: YandexPolylineOptions
  ): YandexPolyline;
}

export interface YandexPolylineOptions {
  strokeColor?: string; // hex WITHOUT #, can have alpha e.g. "D9A44199"
  strokeWidth?: number;
  strokeOpacity?: number;
  dashArray?: string;
}

export interface YandexPolyline {
  geometry: {
    setCoordinates: (coords: [number, number][]) => void;
    getCoordinates: () => [number, number][];
  };
  options: {
    set: (key: string, value: unknown) => void;
  };
  events: {
    add: (event: string, cb: () => void) => void;
  };
}

export interface YandexPlacemarkConstructor {
  new (
    coords: [number, number],
    properties: Record<string, unknown>,
    options: {
      iconLayout?: unknown;
      iconOffset?: [number, number];
      iconShape?: { type: string; coordinates: number[]; radius?: number };
    }
  ): YandexPlacemark;
}

export interface YandexPlacemark {
  events: {
    add: (event: string, cb: () => void) => void;
  };
  options: {
    set: (key: string, value: unknown) => void;
  };
}

export {};
