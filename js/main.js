/**
 * main.js — Game loop principal y orquestación
 */
import { initWorld, drawGround, drawMountains, drawObstacles, checkCollision } from './world.js';
import { drawRadar, updateHUDText, showOverlay, hideOverlay } from './hud.js';
import { Player } from './player.js';
import { createEnemy } from './enemy.js';
import { ProjectileSystem } from './projectile.js';
import { initInput, isFirePressed, isRestartPressed, consumeFrameInput } from './input.js';

// ── Configuración ────────────────────────────────────────────────────────────
const MAX_ENEMIES = 1;
const MIN_ENEMIES = 1;
const DEAD_RESPAWN_DELAY = 2.0; // segundos hasta respawn del jugador
const MISSILE_SPAWN_SCORE = 3;  // cada N kills aparece un misil

// ── Elementos DOM ────────────────────────────────────────────────────────────
const gameCanvas = document.getElementById('game-canvas');
const ctx = gameCanvas.getContext('2d');
const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas.getContext('2d');

// ── Estado global ────────────────────────────────────────────────────────────
let state = 'start';   // 'start' | 'playing' | 'dead' | 'gameover'
let deadTimer = 0;
let killCount = 0;
let lastTs = 0;

const player = new Player();
const projectiles = new ProjectileSystem();
let enemies = [];

// ── Inicialización ───────────────────────────────────────────────────────────
function init() {
  initWorld();
  initInput();
  spawnInitialEnemies();
  state = 'playing';
  hideOverlay();
}

function fullReset() {
  player.reset();
  projectiles.clear();
  enemies = [];
  killCount = 0;
  spawnInitialEnemies();
  state = 'playing';
  hideOverlay();
}

function spawnInitialEnemies() {
  enemies = [];
  for (let i = 0; i < MAX_ENEMIES; i++) {
    enemies.push(createEnemy('tank', checkCollision));
  }
}

function spawnEnemyIfNeeded() {
  const alive = enemies.filter(e => e.alive).length;
  if (alive < MIN_ENEMIES) {
    const type = (killCount > 0 && killCount % MISSILE_SPAWN_SCORE === 0) ? 'missile' : 'tank';
    enemies.push(createEnemy(type, checkCollision));
    // Limpiar muertos cuando hay demasiados
    if (enemies.length > 20) {
      enemies = enemies.filter(e => e.alive);
    }
  }
}

// ── Efectos visuales ─────────────────────────────────────────────────────────
const impacts = []; // { x, y, timer, maxTimer }

function addImpact(screenX, screenY) {
  impacts.push({ x: screenX, y: screenY, timer: 0.4, maxTimer: 0.4 });
}

function updateImpacts(dt) {
  for (const imp of impacts) imp.timer -= dt;
  // Limpiar expirados
  while (impacts.length > 0 && impacts[0].timer <= 0) impacts.shift();
}

function drawImpacts() {
  for (const imp of impacts) {
    const t = imp.timer / imp.maxTimer;
    const r = (1 - t) * 30;
    ctx.save();
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.globalAlpha = t * 0.8;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffaa00';
    ctx.beginPath();
    ctx.arc(imp.x, imp.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Horizonte visual ─────────────────────────────────────────────────────────
function drawHorizonLine() {
  ctx.save();
  ctx.strokeStyle = '#003300';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 250);
  ctx.lineTo(800, 250);
  ctx.stroke();
  ctx.restore();
}

// ── Crosshair ────────────────────────────────────────────────────────────────
function drawCrosshair() {
  const cx = 400, cy = 250;
  const size = 12;
  ctx.save();
  ctx.strokeStyle = '#00ff41';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#00ff41';
  ctx.globalAlpha = 0.8;

  ctx.beginPath();
  ctx.moveTo(cx - size, cy);
  ctx.lineTo(cx + size, cy);
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx, cy + size);
  ctx.stroke();

  // Cuadrado pequeño
  const sq = 4;
  ctx.beginPath();
  ctx.rect(cx - sq, cy - sq, sq * 2, sq * 2);
  ctx.stroke();

  ctx.restore();
}

// ── Frame ─────────────────────────────────────────────────────────────────────
function gameLoop(ts) {
  const rawDt = (ts - lastTs) / 1000;
  lastTs = ts;
  const dt = Math.min(rawDt, 0.05); // clamp a 50ms máximo

  // Limpiar canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 800, 500);

  const wantsFire = isFirePressed();
  const wantsRestart = isRestartPressed();

  switch (state) {
    case 'playing':
      updatePlaying(dt, wantsFire);
      renderScene();
      break;

    case 'dead':
      deadTimer -= dt;
      renderScene();
      if (deadTimer <= 0) {
        if (player.lives <= 0) {
          state = 'gameover';
          showOverlay('GAME OVER', `SCORE FINAL: ${String(player.score).padStart(6, '0')}`);
        } else {
          player.respawn();
          projectiles.clear();
          state = 'playing';
          hideOverlay();
        }
      }
      break;

    case 'gameover':
      renderScene();
      if (wantsRestart) {
        fullReset();
      }
      break;

    case 'start':
      renderScene();
      if (wantsRestart || wantsFire) {
        state = 'playing';
        hideOverlay();
      }
      break;
  }

  // HUD siempre visible
  const aliveEnemies = enemies.filter(e => e.alive);
  drawRadar(radarCtx, player.pos, player.angle, aliveEnemies);
  updateHUDText(player.score, player.lives, aliveEnemies.length);

  consumeFrameInput();
  requestAnimationFrame(gameLoop);
}

function updatePlaying(dt, wantsFire) {
  // Actualizar jugador
  const fired = player.update(dt, wantsFire);
  if (fired) {
    projectiles.spawn(player.pos, player.angle, 'player');
  }

  // Actualizar enemigos
  for (const enemy of enemies) {
    enemy.update(dt, player.pos, projectiles);
  }

  // Actualizar proyectiles y detectar colisiones
  const aliveEnemies = enemies.filter(e => e.alive);
  const result = projectiles.update(dt, player, aliveEnemies);

  // Jugador golpeado
  if (result.playerHit && player.alive) {
    player.takeDamage();
    state = 'dead';
    deadTimer = DEAD_RESPAWN_DELAY;
    if (player.lives <= 0) {
      showOverlay('DESTRUIDO', 'Preparando game over...');
    } else {
      showOverlay('IMPACTO', `VIDAS RESTANTES: ${player.lives}`);
    }
  }

  // Enemigos destruidos
  for (const enemy of result.enemiesHit) {
    enemy.alive = false;
    killCount++;
    player.addScore(enemy.type === 'missile' ? 200 : 100);
  }

  // Colisión misil-jugador (contacto físico)
  for (const enemy of aliveEnemies) {
    if (enemy.type === 'missile') {
      const dx = enemy.x - player.x;
      const dz = enemy.z - player.z;
      if (dx * dx + dz * dz < 400) { // radio 20
        enemy.alive = false;
        if (player.alive) {
          player.takeDamage();
          state = 'dead';
          deadTimer = DEAD_RESPAWN_DELAY;
          if (player.lives <= 0) {
            showOverlay('DESTRUIDO', 'Preparando game over...');
          } else {
            showOverlay('IMPACTO', `VIDAS RESTANTES: ${player.lives}`);
          }
        }
      }
    }
  }

  // Spawn automático
  spawnEnemyIfNeeded();

  updateImpacts(dt);
}

function renderScene() {
  // Fondo gradiente sutil (cielo)
  const sky = ctx.createLinearGradient(0, 0, 0, 250);
  sky.addColorStop(0, '#000a00');
  sky.addColorStop(1, '#001a00');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 800, 250);

  // Suelo (abajo del horizonte)
  ctx.fillStyle = '#000500';
  ctx.fillRect(0, 250, 800, 250);

  drawHorizonLine();
  drawMountains(ctx, player.angle);
  drawGround(ctx, player.pos, player.angle);
  drawObstacles(ctx, player.pos, player.angle);

  // Renderizar enemigos
  for (const enemy of enemies) {
    enemy.draw(ctx, player.pos, player.angle);
  }

  // Renderizar proyectiles
  projectiles.draw(ctx, player.pos, player.angle);

  drawImpacts();
  drawCrosshair();
}

// ── Pantalla de inicio ────────────────────────────────────────────────────────
function showStartScreen() {
  showOverlay('COMBAT ZONE', 'PRESIONA ENTER O ESPACIO PARA COMENZAR');
  state = 'start';
}

// ── Arranque ──────────────────────────────────────────────────────────────────
init();
showStartScreen();
requestAnimationFrame((ts) => {
  lastTs = ts;
  requestAnimationFrame(gameLoop);
});
