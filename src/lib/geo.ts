// Geometric utilities for smooth route rendering on a world map.
//
// The three problems we solve here:
//
//   1. Direct polylines between waypoints cut across land — for sea voyages
//      this looks wrong. We use a centripetal Catmull-Rom spline that
//      passes through every waypoint and produces a smooth curve.
//
//   2. The 180° meridian problem. If point A is at longitude +179 and
//      point B is at longitude -179, the obvious "straight line" between
//      them on a [-180, +180] map wraps all the way around the world —
//      the route visually crosses Africa, the Atlantic and Europe instead
//      of going straight across the Pacific. `unwrapLng` solves this by
//      unfolding the longitudes into a continuous strip, e.g.
//      +179 → -177 (instead of -179), so the spline builds across the
//      antimeridian naturally. We then split the dense curve back into
//      [-180, +180] segments that the map can render.
//
//   3. Same approach makes the route feel "nautical" — the spline does
//      not avoid land automatically, but with enough waypoints the
//      visual result is close to a coastal sailing course.

export type LatLng = [number, number]; // [latitude, longitude]

/**
 * Unfold longitudes into a continuous strip so that the spline does not
 * jump back and forth across the ±180° boundary.
 *
 * Example: [[0, 179], [0, -178]] → [[0, 179], [0, 182]]
 * The second point becomes 182°, which is geometrically equivalent to
 * -178° but lets the spline flow smoothly across the antimeridian.
 */
export function unwrapLng(points: LatLng[]): LatLng[] {
  if (points.length === 0) return [];
  const out: LatLng[] = [[points[0][0], points[0][1]]];
  for (let i = 1; i < points.length; i++) {
    const prev = out[i - 1][1];
    let lo = points[i][1];
    while (lo - prev > 180) lo -= 360;
    while (lo - prev < -180) lo += 360;
    out.push([points[i][0], lo]);
  }
  return out;
}

/**
 * Centripetal Catmull-Rom interpolation between four control points.
 * Centripetal parameterization (alpha = 0.5) avoids cusps and overshoots
 * that plague the uniform variant, so the curve stays close to its
 * control polygon — important when waypoints are close together near
 * coastlines.
 */
export function catmullRomPoint(
  p0: LatLng,
  p1: LatLng,
  p2: LatLng,
  p3: LatLng,
  t: number
): LatLng {
  const dist = (a: LatLng, b: LatLng): number =>
    Math.hypot(a[0] - b[0], a[1] - b[1]) || 1e-6;

  const t0 = 0;
  const t1 = Math.pow(dist(p0, p1), 0.5);
  const t2 = t1 + Math.pow(dist(p1, p2), 0.5);
  const t3 = t2 + Math.pow(dist(p2, p3), 0.5);

  const tt = t1 + (t2 - t1) * t;

  const mix = (a: LatLng, b: LatLng, ta: number, tb: number): LatLng => {
    if (tb === ta) return [a[0], a[1]];
    const f = (tt - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };

  const A1 = mix(p0, p1, t0, t1);
  const A2 = mix(p1, p2, t1, t2);
  const A3 = mix(p2, p3, t2, t3);
  const B1 = mix(A1, A2, t0, t2);
  const B2 = mix(A2, A3, t1, t3);
  return mix(B1, B2, t1, t2);
}

/**
 * Build a dense polyline by sampling a centripetal Catmull-Rom spline
 * through the given waypoints. Endpoints are duplicated so the curve
 * starts and ends exactly at the first and last waypoint.
 *
 * @param per Number of samples between each pair of waypoints.
 */
export function smoothPath(points: LatLng[], per = 22): LatLng[] {
  if (points.length < 3) return points.slice();
  const P = [points[0], ...points, points[points.length - 1]];
  const out: LatLng[] = [];
  for (let i = 0; i < P.length - 3; i++) {
    for (let j = 0; j < per; j++) {
      out.push(catmullRomPoint(P[i], P[i + 1], P[i + 2], P[i + 3], j / per));
    }
  }
  out.push(points[points.length - 1].slice() as LatLng);
  return out;
}

/**
 * Split a dense curve (with potentially unfolded longitudes) into
 * segments that each lie within the [-180, +180] range. Where the curve
 * crosses the antimeridian, we add boundary points at ±180 and start a
 * new segment at ∓180. This is what lets the map render a route that
 * crosses the Pacific correctly.
 */
export function splitDense(path: LatLng[]): LatLng[][] {
  if (path.length === 0) return [];
  const segments: LatLng[][] = [[]];
  let cur = segments[0];

  for (let i = 0; i < path.length; i++) {
    const la = path[i][0];
    let lo = path[i][1];
    while (lo > 180) lo -= 360;
    while (lo < -180) lo += 360;

    if (cur.length > 0) {
      const prev = cur[cur.length - 1];
      if (Math.abs(lo - prev[1]) > 180) {
        // Curve crosses the antimeridian — compute intersection lat
        const bound = prev[1] > 0 ? 180 : -180;
        const lo2 = lo > 0 ? lo - 360 : lo + 360;
        const t = (bound - prev[1]) / (lo2 - prev[1]);
        const laC = prev[0] + t * (la - prev[0]);
        cur.push([laC, bound]);
        cur = [[laC, -bound]];
        segments.push(cur);
      }
    }
    cur.push([la, lo]);
  }
  return segments.filter((s) => s.length > 1);
}

/**
 * Wrap a single longitude into [-180, +180].
 */
export function wrapLng(p: LatLng): LatLng {
  let lo = p[1];
  while (lo > 180) lo -= 360;
  while (lo < -180) lo += 360;
  return [p[0], lo];
}

/**
 * Great-circle distance between two points in kilometers
 * (Haversine formula, mean Earth radius 6371 km).
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Total length (km) of a dense path. Wraps longitudes back into
 * [-180, +180] before measuring so distances across the antimeridian
 * are computed correctly.
 */
export function pathLengthKm(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineKm(wrapLng(path[i - 1]), wrapLng(path[i]));
  }
  return total;
}

/**
 * Convenience: from an array of route points, return the dense smoothed
 * segments ready to feed to a map renderer, plus the total length in km.
 */
export function buildSmoothedRoute(
  points: LatLng[]
): { segments: LatLng[][]; km: number } {
  if (points.length < 2) return { segments: [], km: 0 };
  const unwrapped = unwrapLng(points);
  const dense = smoothPath(unwrapped, 22);
  const segments = splitDense(dense);
  const km = Math.round(pathLengthKm(dense));
  return { segments, km };
}
