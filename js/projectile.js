/**
 * projectile.js — Sistema de proyectiles
 */
import { worldToCamera } from './math3d.js';
import { drawSegment3D } from './renderer.js';
import { checkCollisionAABB } from './world.js';

const PROJECTILE_SPEED = 200;
const PROJECTILE_LIFETIME = 3.0;
const HIT_RADIUS_SQ = 64; // 8² — distancia al cuadrado para colisión jugador/enemigo

export class ProjectileSystem {
  constructor() {
    this.projectiles = [];
  }

  clear() {
    this.projectiles = [];
  }

  /**
   * Añade un proyectil
   * @param {Object} pos - {x, y, z}
   * @param {number} angle - ángulo de disparo
   * @param {string} owner - 'player' | 'enemy'
   */
  spawn(pos, angle, owner) {
    this.projectiles.push({
      x: pos.x,
      y: pos.y || 3,
      z: pos.z,
      angle,
      owner,
      life: PROJECTILE_LIFETIME,
      active: true,
    });
  }

  /**
   * Actualiza todos los proyectiles y detecta colisiones.
   * @param {number} dt
   * @param {Object} player - Player instance
   * @param {Array} enemies - lista de Enemy instances
   * @returns {{ playerHit: boolean, enemiesHit: Enemy[] }}
   */
  update(dt, player, enemies) {
    const result = { playerHit: false, enemiesHit: [] };

    for (const p of this.projectiles) {
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      const dx = Math.sin(p.angle) * PROJECTILE_SPEED * dt;
      const dz = Math.cos(p.angle) * PROJECTILE_SPEED * dt;
      p.x += dx;
      p.z += dz;

      // Colisión con obstáculos del mundo
      if (checkCollisionAABB({ x: p.x, y: 0, z: p.z }, 3)) {
        p.active = false;
        continue;
      }

      // Colisión con jugador (solo proyectiles enemigos)
      if (p.owner === 'enemy' && player.alive) {
        const ddx = p.x - player.x;
        const ddz = p.z - player.z;
        if (ddx * ddx + ddz * ddz < HIT_RADIUS_SQ) {
          result.playerHit = true;
          p.active = false;
          continue;
        }
      }

      // Colisión con enemigos (solo proyectiles del jugador)
      if (p.owner === 'player') {
        let hit = false;
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          const ddx = p.x - enemy.x;
          const ddz = p.z - enemy.z;
          if (ddx * ddx + ddz * ddz < HIT_RADIUS_SQ * 2) {
            result.enemiesHit.push(enemy);
            p.active = false;
            hit = true;
            break;
          }
        }
        if (hit) continue;
      }
    }

    // Limpiar inactivos periódicamente
    if (this.projectiles.length > 100) {
      this.projectiles = this.projectiles.filter(p => p.active);
    }

    return result;
  }

  draw(ctx, playerPos, playerAngle) {
    for (const p of this.projectiles) {
      if (!p.active) continue;

      // Representación visual: segmento (cabeza + rastro)
      const headY = p.y;
      const trailLen = 8;

      const head = { x: p.x, y: headY, z: p.z };
      const tail = {
        x: p.x - Math.sin(p.angle) * trailLen,
        y: headY,
        z: p.z - Math.cos(p.angle) * trailLen
      };

      const c1 = worldToCamera(head, playerPos, playerAngle);
      const c2 = worldToCamera(tail, playerPos, playerAngle);

      const color = p.owner === 'player' ? '#ffffff' : '#ff4400';
      drawSegment3D(ctx, c1, c2, color, 2);
    }
  }
}
