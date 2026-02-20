/**
 * player.js — Estado y movimiento del jugador
 */
import { checkCollision } from './world.js';
import { isForward, isBackward, isTurnLeft, isTurnRight } from './input.js';

const TURN_SPEED = 1.8;    // rad/s
const ACCEL = 60;           // unidades/s²
const MAX_SPEED = 55;
const FRICTION = 0.88;      // factor por frame (aplicado con dt)
const SHOOT_COOLDOWN = 0.5; // segundos
const COLLISION_RADIUS = 8;

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.angle = 0;   // ángulo horizontal (yaw) en radianes
    this.speed = 0;   // velocidad actual en dirección de avance
    this.shootCooldown = 0;
    this.alive = true;
    this.score = 0;   // el score se mantiene entre respawns
    this.lives = 3;
  }

  respawn() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.angle = 0;
    this.speed = 0;
    this.alive = true;
    this.shootCooldown = 0;
  }

  get pos() {
    return { x: this.x, y: this.y, z: this.z };
  }

  /**
   * Actualiza el estado del jugador.
   * @returns {boolean} true si disparó este frame
   */
  update(dt, wantsToFire) {
    // Rotación
    if (isTurnLeft()) this.angle -= TURN_SPEED * dt;
    if (isTurnRight()) this.angle += TURN_SPEED * dt;

    // Aceleración
    if (isForward()) this.speed += ACCEL * dt;
    if (isBackward()) this.speed -= ACCEL * dt;

    // Clamp velocidad
    this.speed = Math.max(-MAX_SPEED * 0.5, Math.min(MAX_SPEED, this.speed));

    // Fricción (exponencial)
    this.speed *= Math.pow(FRICTION, dt * 60);

    // Movimiento con detección de colisiones
    const dx = Math.sin(this.angle) * this.speed * dt;
    const dz = Math.cos(this.angle) * this.speed * dt;

    // Separar ejes para deslizar contra obstáculos
    const newX = this.x + dx;
    if (!checkCollision({ x: newX, y: 0, z: this.z }, COLLISION_RADIUS)) {
      this.x = newX;
    } else {
      this.speed *= -0.3; // rebote suave
    }

    const newZ = this.z + dz;
    if (!checkCollision({ x: this.x, y: 0, z: newZ }, COLLISION_RADIUS)) {
      this.z = newZ;
    } else {
      this.speed *= -0.3;
    }

    // Cooldown de disparo
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    // Disparar
    if (wantsToFire && this.shootCooldown <= 0) {
      this.shootCooldown = SHOOT_COOLDOWN;
      return true;
    }
    return false;
  }

  takeDamage() {
    this.alive = false;
    this.lives -= 1;
  }

  addScore(points) {
    this.score += points;
  }
}
