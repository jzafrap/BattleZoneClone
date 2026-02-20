/**
 * enemy.js — IA de tanques y misiles enemigos
 */
import { worldToCamera, vec3RotateY, distance2D, lerpAngle } from './math3d.js';
import { drawSegment3D } from './renderer.js';
import { checkCollision } from './world.js';

// Distancias de transición de estado
const DIST_DETECT = 400;
const DIST_ATTACK = 250;
const DIST_RETREAT = 80;

// Modelo wireframe del tanque (coordenadas locales)
const TANK_SEGMENTS = (() => {
  const segs = [];
  // Cuerpo principal (caja baja)
  const bx = 10, by = 5, bz = 14;
  const body = [
    [-bx, 0, -bz], [bx, 0, -bz], [bx, 0, bz], [-bx, 0, bz],
    [-bx, by, -bz], [bx, by, -bz], [bx, by, bz], [-bx, by, bz],
  ];
  const bodyEdges = [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ];
  for (const [a, b] of bodyEdges) {
    segs.push([body[a], body[b]]);
  }
  // Torreta (caja pequeña encima)
  const tx = 6, ty = 5, tz = 6;
  const turret = [
    [-tx, by, -tz], [tx, by, -tz], [tx, by, tz], [-tx, by, tz],
    [-tx, by + ty, -tz], [tx, by + ty, -tz], [tx, by + ty, tz], [-tx, by + ty, tz],
  ];
  const turretEdges = [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ];
  for (const [a, b] of turretEdges) {
    segs.push([turret[a], turret[b]]);
  }
  // Cañón
  segs.push([[0, by + ty * 0.5, -tz], [0, by + ty * 0.5, -tz - 12]]);

  return segs.map(([a, b]) => [
    { x: a[0], y: a[1], z: a[2] },
    { x: b[0], y: b[1], z: b[2] }
  ]);
})();

// Modelo wireframe del misil (forma de cohete)
const MISSILE_SEGMENTS = (() => {
  const segs = [];
  const r = 3, h = 12;
  // Cuerpo tubular (octágono simplificado)
  for (let i = 0; i < 8; i++) {
    const a1 = (i / 8) * Math.PI * 2;
    const a2 = ((i + 1) / 8) * Math.PI * 2;
    segs.push([
      { x: Math.cos(a1) * r, y: Math.sin(a1) * r, z: 0 },
      { x: Math.cos(a2) * r, y: Math.sin(a2) * r, z: 0 }
    ]);
    segs.push([
      { x: Math.cos(a1) * r, y: Math.sin(a1) * r, z: h },
      { x: Math.cos(a2) * r, y: Math.sin(a2) * r, z: h }
    ]);
    segs.push([
      { x: Math.cos(a1) * r, y: Math.sin(a1) * r, z: 0 },
      { x: Math.cos(a1) * r, y: Math.sin(a1) * r, z: h }
    ]);
  }
  // Punta
  segs.push([{ x: 0, y: 0, z: h }, { x: 0, y: 0, z: h + 6 }]);
  return segs;
})();

let _nextId = 0;

export class Enemy {
  constructor(x, z, type = 'tank') {
    this.id = _nextId++;
    this.x = x;
    this.y = 0;
    this.z = z;
    this.type = type; // 'tank' | 'missile'
    this.angle = Math.random() * Math.PI * 2;
    this.alive = true;
    this.state = 'patrol';

    // Patrol
    this.patrolTimer = 0;
    this.patrolAngle = this.angle;

    // Attack
    this.shootTimer = 0;
    this.shootCooldown = 2.0;
  }

  get pos() {
    return { x: this.x, y: this.y, z: this.z };
  }

  update(dt, playerPos, projectileSystem) {
    if (!this.alive) return;

    const dist = distance2D(this.x, this.z, playerPos.x, playerPos.z);
    const toPlayerAngle = Math.atan2(playerPos.x - this.x, playerPos.z - this.z);

    if (this.type === 'missile') {
      this._updateMissile(dt, playerPos, toPlayerAngle);
    } else {
      this._updateTank(dt, playerPos, toPlayerAngle, dist, projectileSystem);
    }
  }

  _updateMissile(dt, playerPos, toPlayerAngle) {
    this.angle = lerpAngle(this.angle, toPlayerAngle, 2.5 * dt);
    const speed = 70;
    this.x += Math.sin(this.angle) * speed * dt;
    this.z += Math.cos(this.angle) * speed * dt;
  }

  _updateTank(dt, playerPos, toPlayerAngle, dist, projectileSystem) {
    if (dist > DIST_DETECT) {
      this.state = 'patrol';
    } else if (dist < DIST_RETREAT) {
      this.state = 'retreat';
    } else if (dist < DIST_ATTACK) {
      this.state = 'attack';
    } else {
      this.state = 'approach';
    }

    const TANK_SPEED = 35;
    const TANK_TURN = 1.5;

    switch (this.state) {
      case 'patrol': {
        this.patrolTimer -= dt;
        if (this.patrolTimer <= 0) {
          this.patrolTimer = 2 + Math.random() * 3;
          this.patrolAngle = Math.random() * Math.PI * 2;
        }
        this.angle = lerpAngle(this.angle, this.patrolAngle, TANK_TURN * dt);
        this._moveForward(dt, TANK_SPEED * 0.5);
        break;
      }

      case 'approach': {
        this.angle = lerpAngle(this.angle, toPlayerAngle, TANK_TURN * dt);
        this._moveForward(dt, TANK_SPEED);
        break;
      }

      case 'attack': {
        this.angle = lerpAngle(this.angle, toPlayerAngle, TANK_TURN * 1.5 * dt);
        const aimDiff = Math.abs(this._angleDiff(this.angle, toPlayerAngle));
        this.shootTimer -= dt;
        if (aimDiff < 0.3 && this.shootTimer <= 0) {
          this.shootTimer = this.shootCooldown;
          projectileSystem.spawn(this.pos, this.angle, 'enemy');
        }
        this._moveForward(dt, TANK_SPEED * 0.3);
        break;
      }

      case 'retreat': {
        const fleeAngle = toPlayerAngle + Math.PI;
        this.angle = lerpAngle(this.angle, fleeAngle, TANK_TURN * dt);
        this._moveForward(dt, TANK_SPEED * 0.8);
        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
          this.shootTimer = this.shootCooldown * 1.5;
          // Disparar hacia el jugador mientras huye
          projectileSystem.spawn(this.pos, toPlayerAngle, 'enemy');
        }
        break;
      }
    }
  }

  _moveForward(dt, speed) {
    const nx = this.x + Math.sin(this.angle) * speed * dt;
    const nz = this.z + Math.cos(this.angle) * speed * dt;
    if (!checkCollision({ x: nx, y: 0, z: this.z }, 12)) this.x = nx;
    if (!checkCollision({ x: this.x, y: 0, z: nz }, 12)) this.z = nz;
  }

  _angleDiff(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  draw(ctx, playerPos, playerAngle) {
    if (!this.alive) return;

    const model = this.type === 'missile' ? MISSILE_SEGMENTS : TANK_SEGMENTS;
    const color = this.type === 'missile' ? '#ff6600' : '#00ff41';

    for (const [lp1, lp2] of model) {
      const r1 = vec3RotateY(lp1, this.angle);
      const r2 = vec3RotateY(lp2, this.angle);
      const w1 = { x: this.x + r1.x, y: this.y + r1.y, z: this.z + r1.z };
      const w2 = { x: this.x + r2.x, y: this.y + r2.y, z: this.z + r2.z };
      const c1 = worldToCamera(w1, playerPos, playerAngle);
      const c2 = worldToCamera(w2, playerPos, playerAngle);
      drawSegment3D(ctx, c1, c2, color, 1.5);
    }
  }
}

/**
 * Genera una nueva instancia de Enemy en una posición válida lejos del jugador.
 * @param {string} type - 'tank' | 'missile'
 * @param {Function} collisionCheck - función checkCollision del world
 */
export function createEnemy(type = 'tank', collisionCheck) {
  let x, z;
  let attempts = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const dist = 180 + Math.random() * 220;
    x = Math.cos(angle) * dist;
    z = Math.sin(angle) * dist;
    attempts++;
  } while (attempts < 20 && collisionCheck && collisionCheck({ x, y: 0, z }, 15));
  return new Enemy(x, z, type);
}
