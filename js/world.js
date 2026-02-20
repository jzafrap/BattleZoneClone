/**
 * world.js — Mundo estático: obstáculos, suelo, horizonte
 */
import { worldToCamera } from './math3d.js';
import { drawSegment3D } from './renderer.js';

const FOCAL = 550;
const CX = 400;
const CY = 250;

// Perfil de montañas (pares [ángulo relativo, altura])
const MOUNTAIN_PROFILE = [
  [-Math.PI * 0.48, 0],
  [-Math.PI * 0.42, 30],
  [-Math.PI * 0.35, 15],
  [-Math.PI * 0.28, 50],
  [-Math.PI * 0.22, 20],
  [-Math.PI * 0.18, 80],  // pico alto
  [-Math.PI * 0.12, 35],
  [-Math.PI * 0.07, 55],
  [-Math.PI * 0.03, 25],
  [0, 40],
  [Math.PI * 0.04, 70],   // volcán
  [Math.PI * 0.06, 90],   // cima volcán
  [Math.PI * 0.08, 75],
  [Math.PI * 0.10, 20],
  [Math.PI * 0.15, 45],
  [Math.PI * 0.20, 30],
  [Math.PI * 0.26, 60],
  [Math.PI * 0.32, 15],
  [Math.PI * 0.38, 35],
  [Math.PI * 0.44, 10],
  [Math.PI * 0.48, 0],
];

let obstacles = [];

/**
 * Genera segmentos de una pirámide centrada en (cx, 0, cz)
 */
function buildPyramidSegments(cx, cz, size) {
  const h = size * 1.8;
  const s = size;
  const base = [
    { x: cx - s, y: 0, z: cz - s },
    { x: cx + s, y: 0, z: cz - s },
    { x: cx + s, y: 0, z: cz + s },
    { x: cx - s, y: 0, z: cz + s },
  ];
  const apex = { x: cx, y: h, z: cz };
  const segs = [];
  // Base
  for (let i = 0; i < 4; i++) {
    segs.push([base[i], base[(i + 1) % 4]]);
  }
  // Aristas laterales
  for (let i = 0; i < 4; i++) {
    segs.push([base[i], apex]);
  }
  return segs;
}

/**
 * Genera segmentos de un bloque/cubo
 */
function buildBlockSegments(cx, cz, w, h, d) {
  const x0 = cx - w / 2, x1 = cx + w / 2;
  const z0 = cz - d / 2, z1 = cz + d / 2;
  const y0 = 0, y1 = h;
  const corners = [
    { x: x0, y: y0, z: z0 }, { x: x1, y: y0, z: z0 },
    { x: x1, y: y0, z: z1 }, { x: x0, y: y0, z: z1 },
    { x: x0, y: y1, z: z0 }, { x: x1, y: y1, z: z0 },
    { x: x1, y: y1, z: z1 }, { x: x0, y: y1, z: z1 },
  ];
  return [
    // Base
    [corners[0], corners[1]], [corners[1], corners[2]],
    [corners[2], corners[3]], [corners[3], corners[0]],
    // Techo
    [corners[4], corners[5]], [corners[5], corners[6]],
    [corners[6], corners[7]], [corners[7], corners[4]],
    // Pilares
    [corners[0], corners[4]], [corners[1], corners[5]],
    [corners[2], corners[6]], [corners[3], corners[7]],
  ];
}

/**
 * Genera segmentos de un obelisco (torre delgada y alta)
 */
function buildObeliskSegments(cx, cz, size) {
  const s = size * 0.4;
  const h = size * 4;
  const tip = size * 0.1;
  const base = [
    { x: cx - s, y: 0, z: cz - s },
    { x: cx + s, y: 0, z: cz - s },
    { x: cx + s, y: 0, z: cz + s },
    { x: cx - s, y: 0, z: cz + s },
  ];
  const top = [
    { x: cx - tip, y: h, z: cz - tip },
    { x: cx + tip, y: h, z: cz - tip },
    { x: cx + tip, y: h, z: cz + tip },
    { x: cx - tip, y: h, z: cz + tip },
  ];
  const segs = [];
  for (let i = 0; i < 4; i++) {
    segs.push([base[i], base[(i + 1) % 4]]);
    segs.push([top[i], top[(i + 1) % 4]]);
    segs.push([base[i], top[i]]);
  }
  return segs;
}

export function initWorld() {
  obstacles = [];
  const rng = mulberry32(42);

  const types = ['pyramid', 'block', 'obelisk'];
  const count = 28;

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 60 + rng() * 350;
    const cx = Math.cos(angle) * dist;
    const cz = Math.sin(angle) * dist;
    const size = 12 + rng() * 18;
    const type = types[Math.floor(rng() * types.length)];

    let segs;
    let aabb;

    if (type === 'pyramid') {
      segs = buildPyramidSegments(cx, cz, size);
      aabb = { x: cx - size, z: cz - size, w: size * 2, d: size * 2 };
    } else if (type === 'block') {
      const w = size * 1.5;
      const h = size * 1.2;
      const d = size * 1.5;
      segs = buildBlockSegments(cx, cz, w, h, d);
      aabb = { x: cx - w / 2, z: cz - d / 2, w, d };
    } else {
      segs = buildObeliskSegments(cx, cz, size);
      const s = size * 0.5;
      aabb = { x: cx - s, z: cz - s, w: s * 2, d: s * 2 };
    }

    obstacles.push({ segs, aabb, cx, cz });
  }
}

export function getObstacles() {
  return obstacles;
}

/**
 * AABB collision check contra todos los obstáculos
 */
export function checkCollision(pos, radius) {
  for (const obs of obstacles) {
    const { aabb } = obs;
    if (
      pos.x + radius > aabb.x &&
      pos.x - radius < aabb.x + aabb.w &&
      pos.z + radius > aabb.z &&
      pos.z - radius < aabb.z + aabb.d
    ) {
      return true;
    }
  }
  return false;
}

export function checkCollisionAABB(pos, radius) {
  for (const obs of obstacles) {
    const { aabb } = obs;
    if (
      pos.x + radius > aabb.x &&
      pos.x - radius < aabb.x + aabb.w &&
      pos.z + radius > aabb.z &&
      pos.z - radius < aabb.z + aabb.d
    ) {
      return obs;
    }
  }
  return null;
}

/**
 * Dibuja la cuadrícula del suelo
 */
export function drawGround(ctx, playerPos, playerAngle) {
  const GRID_SIZE = 40;
  const RANGE = 320;
  const COLOR = '#004d1a';

  // Líneas que van de -RANGE a +RANGE en pasos de GRID_SIZE
  const lines = [];
  for (let x = -RANGE; x <= RANGE; x += GRID_SIZE) {
    lines.push([
      { x, y: 0, z: -RANGE },
      { x, y: 0, z: RANGE }
    ]);
  }
  for (let z = -RANGE; z <= RANGE; z += GRID_SIZE) {
    lines.push([
      { x: -RANGE, y: 0, z },
      { x: RANGE, y: 0, z }
    ]);
  }

  for (const [p1, p2] of lines) {
    const c1 = worldToCamera(p1, playerPos, playerAngle);
    const c2 = worldToCamera(p2, playerPos, playerAngle);
    drawSegment3D(ctx, c1, c2, COLOR, 0.7);
  }
}

/**
 * Dibuja las montañas del horizonte
 */
export function drawMountains(ctx, playerAngle) {
  const HORIZON_Y = 250; // y en pantalla del horizonte (z=infinito)
  const MOUNTAIN_COLOR = '#00aa33';
  const FOCAL = 550;

  ctx.save();
  ctx.strokeStyle = MOUNTAIN_COLOR;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 6;
  ctx.shadowColor = MOUNTAIN_COLOR;
  ctx.globalAlpha = 0.7;

  ctx.beginPath();
  let started = false;

  for (const [relAngle, height] of MOUNTAIN_PROFILE) {
    const screenX = Math.tan(relAngle) * FOCAL + CX;
    const screenY = HORIZON_Y - height;

    if (!started) {
      ctx.moveTo(screenX, HORIZON_Y);
      ctx.lineTo(screenX, screenY);
      started = true;
    } else {
      ctx.lineTo(screenX, screenY);
    }
  }

  // Cerrar al horizonte
  const lastAngle = MOUNTAIN_PROFILE[MOUNTAIN_PROFILE.length - 1][0];
  ctx.lineTo(Math.tan(lastAngle) * FOCAL + CX, HORIZON_Y);

  ctx.stroke();
  ctx.restore();
}

/**
 * Dibuja todos los obstáculos
 */
export function drawObstacles(ctx, playerPos, playerAngle) {
  for (const obs of obstacles) {
    for (const [p1, p2] of obs.segs) {
      const c1 = worldToCamera(p1, playerPos, playerAngle);
      const c2 = worldToCamera(p2, playerPos, playerAngle);
      drawSegment3D(ctx, c1, c2, '#00ff41', 1.5);
    }
  }
}

// Simple PRNG determinista para reproducibilidad
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
