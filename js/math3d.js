/**
 * math3d.js — Motor matemático 3D para gráficos vectoriales
 */

export function worldToCamera(worldPt, playerPos, playerAngle) {
  const dx = worldPt.x - playerPos.x;
  const dz = worldPt.z - playerPos.z;
  const a = playerAngle;
  // cam+X = vector derecho de la cámara = (cos a, -sin a) en mundo
  // cam+Z = vector adelante de la cámara = (sin a,  cos a) en mundo
  // cam.x = proyección de (dx,dz) sobre el eje derecho
  // cam.z = proyección de (dx,dz) sobre el eje adelante
  return {
    x:  dx * Math.cos(a) - dz * Math.sin(a),
    z:  dx * Math.sin(a) + dz * Math.cos(a),
    y: worldPt.y - (playerPos.y || 0)
  };
}

export function projectPoint(camPt, focal = 550, cx = 400, cy = 250) {
  if (camPt.z <= 0) return null;
  return {
    x: (camPt.x / camPt.z) * focal + cx,
    y: -(camPt.y / camPt.z) * focal + cy
  };
}

/**
 * Clip un segmento [p1, p2] (en espacio cámara) contra el near plane z=nearZ.
 * Retorna [p1c, p2c] clipeados o null si el segmento está completamente detrás.
 */
export function clipSegmentNearPlane(p1, p2, nearZ = 0.5) {
  const in1 = p1.z >= nearZ;
  const in2 = p2.z >= nearZ;

  if (!in1 && !in2) return null; // ambos detrás
  if (in1 && in2) return [p1, p2]; // ambos delante

  // Interpolación: encontrar intersección con z=nearZ
  const t = (nearZ - p1.z) / (p2.z - p1.z);
  const intersection = {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
    z: nearZ
  };

  if (in1) return [p1, intersection];
  return [intersection, p2];
}

export function vec3RotateY(v, angle) {
  return {
    x: v.x * Math.cos(angle) - v.z * Math.sin(angle),
    y: v.y,
    z: v.x * Math.sin(angle) + v.z * Math.cos(angle)
  };
}

export function distance2D(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function lerpAngle(from, to, t) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * t;
}
