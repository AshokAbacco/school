// client/src/shared/liveTracking/geoSmooth.js  (UPDATED: fixes stray line to 0,0)
// Turn straight polylines into smooth curves.
//   curveThrough(points)  – Catmull-Rom spline that passes THROUGH every point
//                           (used for the stop-to-stop route line when no road
//                           geometry is available)
//   chaikin(points)       – corner-cutting smoothing for recorded GPS paths
// points: [[lat, lng], ...]

const valid = (p) =>
  Array.isArray(p) &&
  Number.isFinite(p[0]) &&
  Number.isFinite(p[1]) &&
  !(p[0] === 0 && p[1] === 0) &&
  Math.abs(p[0]) <= 90 &&
  Math.abs(p[1]) <= 180;

/** Remove invalid points and consecutive duplicates (≈ same spot, < ~2 m). */
export function cleanPath(points) {
  const out = [];
  for (const p of points || []) {
    if (!valid(p)) continue;
    const last = out[out.length - 1];
    if (
      last &&
      Math.abs(last[0] - p[0]) < 2e-5 &&
      Math.abs(last[1] - p[1]) < 2e-5
    )
      continue;
    out.push([Number(p[0]), Number(p[1])]);
  }
  return out;
}

/** Keep only output points inside the input's bounding box (+ margin). */
function clampToBounds(out, input) {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const [la, ln] of input) {
    minLat = Math.min(minLat, la);
    maxLat = Math.max(maxLat, la);
    minLng = Math.min(minLng, ln);
    maxLng = Math.max(maxLng, ln);
  }
  const padLat = Math.max(0.005, (maxLat - minLat) * 0.25);
  const padLng = Math.max(0.005, (maxLng - minLng) * 0.25);
  return out.filter(
    ([la, ln]) =>
      Number.isFinite(la) &&
      Number.isFinite(ln) &&
      la >= minLat - padLat &&
      la <= maxLat + padLat &&
      ln >= minLng - padLng &&
      ln <= maxLng + padLng,
  );
}

/**
 * Centripetal Catmull-Rom spline through all points.
 * FIX: identical consecutive points (two stops at the same place) used to
 * divide by zero and produce a point at 0,0 — the "infinite line" off the
 * map. Duplicates are now removed first and every output point is kept
 * inside the stops' area.
 */
export function curveThrough(points, segments = 14) {
  const pts = cleanPath(points);
  if (pts.length < 3) return pts;

  const out = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]]; // duplicate ends
  const alpha = 0.5;
  const tj = (ti, a, b) => {
    const step = Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), alpha);
    return ti + (step > 1e-9 ? step : 1e-9);
  };
  const lerp = (a, b, ta, tb, t) => {
    const d = tb - ta;
    if (Math.abs(d) < 1e-12) return a;
    return [
      ((tb - t) / d) * a[0] + ((t - ta) / d) * b[0],
      ((tb - t) / d) * a[1] + ((t - ta) / d) * b[1],
    ];
  };

  for (let i = 0; i < P.length - 3; i++) {
    const [p0, p1, p2, p3] = [P[i], P[i + 1], P[i + 2], P[i + 3]];
    const t0 = 0;
    const t1 = tj(t0, p0, p1);
    const t2 = tj(t1, p1, p2);
    const t3 = tj(t2, p2, p3);
    for (let s = 0; s < segments; s++) {
      const t = t1 + ((t2 - t1) * s) / segments;
      const A1 = lerp(p0, p1, t0, t1, t);
      const A2 = lerp(p1, p2, t1, t2, t);
      const A3 = lerp(p2, p3, t2, t3, t);
      const B1 = lerp(A1, A2, t0, t2, t);
      const B2 = lerp(A2, A3, t1, t3, t);
      out.push(lerp(B1, B2, t1, t2, t));
    }
  }
  out.push(pts[pts.length - 1]);
  return clampToBounds(out, pts);
}

/** Chaikin corner cutting — keeps the first and last point. */
export function chaikin(points, iterations = 2) {
  let pts = cleanPath(points);
  if (pts.length < 3) return pts;
  for (let k = 0; k < iterations; k++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}
