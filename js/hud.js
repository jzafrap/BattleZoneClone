/**
 * hud.js — Radar 2D, score, vidas, overlays
 */
import { drawGlowPoint } from './renderer.js';

const RADAR_W = 200;
const RADAR_H = 110;
const RADAR_SCALE = 0.35; // unidades mundo → píxeles radar
const RADAR_CX = RADAR_W / 2;
const RADAR_CY = RADAR_H / 2;

export function drawRadar(radarCtx, playerPos, playerAngle, enemies) {
  const ctx = radarCtx;

  // Fondo
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, RADAR_W, RADAR_H);

  // Grid sutil
  ctx.strokeStyle = '#330000';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= RADAR_W; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, RADAR_H); ctx.stroke();
  }
  for (let y = 0; y <= RADAR_H; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(RADAR_W, y); ctx.stroke();
  }

  // Círculos de distancia
  ctx.strokeStyle = '#440000';
  ctx.lineWidth = 0.5;
  for (const r of [30, 60, 90]) {
    ctx.beginPath();
    ctx.arc(RADAR_CX, RADAR_CY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Líneas de cruz
  ctx.strokeStyle = '#440000';
  ctx.beginPath();
  ctx.moveTo(RADAR_CX, 0); ctx.lineTo(RADAR_CX, RADAR_H);
  ctx.moveTo(0, RADAR_CY); ctx.lineTo(RADAR_W, RADAR_CY);
  ctx.stroke();

  // Enemies en el radar (rotados por el ángulo del jugador)
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const dx = enemy.x - playerPos.x;
    const dz = enemy.z - playerPos.z;

    // Rotar por -playerAngle para que el norte del radar apunte hacia donde miramos
    const ra = -playerAngle;
    const rx = dx * Math.cos(ra) - dz * Math.sin(ra);
    const rz = dx * Math.sin(ra) + dz * Math.cos(ra);

    const sx = RADAR_CX + rx * RADAR_SCALE;
    const sy = RADAR_CY - rz * RADAR_SCALE; // z hacia arriba en radar

    // Solo dibujar si está dentro del área del radar
    if (sx < 0 || sx > RADAR_W || sy < 0 || sy > RADAR_H) continue;

    const color = enemy.type === 'missile' ? '#ff6600' : '#ff0000';
    drawGlowPoint(ctx, sx, sy, 3, color);
  }

  // Jugador (punto verde en el centro)
  drawGlowPoint(ctx, RADAR_CX, RADAR_CY, 4, '#00ff41');

  // Flecha de dirección del jugador
  ctx.save();
  ctx.translate(RADAR_CX, RADAR_CY);
  ctx.strokeStyle = '#00ff41';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#00ff41';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(3, -2);
  ctx.lineTo(-3, -2);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function updateHUDText(score, lives, enemyCount) {
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const enemyEl = document.getElementById('enemy-count');

  if (scoreEl) scoreEl.textContent = String(score).padStart(6, '0');
  if (livesEl) livesEl.textContent = String(lives);
  if (enemyEl) enemyEl.textContent = String(enemyCount);
}

export function showOverlay(text, sub) {
  const overlay = document.getElementById('overlay');
  const textEl = document.getElementById('overlay-text');
  const subEl = document.getElementById('overlay-sub');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  if (textEl) textEl.textContent = text;
  if (subEl) subEl.textContent = sub;
}

export function hideOverlay() {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.classList.add('hidden');
}
