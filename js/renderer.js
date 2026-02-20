/**
 * renderer.js — Pipeline wireframe con efecto glow
 */
import { clipSegmentNearPlane, projectPoint } from './math3d.js';

const FOCAL = 550;
const CX = 400;
const CY = 250;
const NEAR_Z = 0.5;

/**
 * Dibuja un segmento 3D en espacio cámara con efecto glow.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} p1 - {x, y, z} en espacio cámara
 * @param {Object} p2 - {x, y, z} en espacio cámara
 * @param {string} color - color base (ej: '#00ff41')
 * @param {number} lineWidth
 */
export function drawSegment3D(ctx, p1, p2, color = '#00ff41', lineWidth = 1.5) {
  const clipped = clipSegmentNearPlane(p1, p2, NEAR_Z);
  if (!clipped) return;

  const [c1, c2] = clipped;
  const s1 = projectPoint(c1, FOCAL, CX, CY);
  const s2 = projectPoint(c2, FOCAL, CX, CY);
  if (!s1 || !s2) return;

  // Descartar segmentos completamente fuera del viewport
  const margin = 200;
  if (s1.x < -margin && s2.x < -margin) return;
  if (s1.x > 800 + margin && s2.x > 800 + margin) return;
  if (s1.y < -margin && s2.y < -margin) return;
  if (s1.y > 500 + margin && s2.y > 500 + margin) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';

  // Capa exterior — halo difuso
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = lineWidth + 4;
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.stroke();

  // Capa media — brillo intermedio
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = lineWidth + 2;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.stroke();

  // Capa interior — línea sólida
  ctx.globalAlpha = 1.0;
  ctx.lineWidth = lineWidth;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Dibuja un punto brillante en 2D (impactos, partículas HUD)
 */
export function drawGlowPoint(ctx, x, y, radius, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Dibuja texto con glow
 */
export function drawGlowText(ctx, text, x, y, size, color) {
  ctx.save();
  ctx.font = `bold ${size}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
