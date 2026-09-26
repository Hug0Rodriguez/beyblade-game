import type { Vec2 } from '@shared/math/vec2';

export interface GroundMotionTuning {
  readonly baseAccel: number;
  readonly baseDecel: number;
  readonly surplusTurnRate: number;
  readonly surplusTurnPenaltyPerSpeed: number;
  readonly surplusFadePerSecond: number;
  readonly surplusIdleFadePerSecond: number;
}

export interface AirMotionTuning {
  readonly airAccel: number;
  readonly airMaxSpeed: number;
}

/**
 * Grounded movement in two speed bands.
 * - Up to `baseSpeed` the stick has full, instant authority: velocity eases toward
 *   stick × baseSpeed at baseAccel (baseDecel when the stick is released).
 * - Above it the extra is *surplus* momentum: the stick only turns it (slower the more
 *   surplus there is) and the surplus fades exponentially back toward the base band.
 * `steer` must have length ≤ 1.
 */
export function steerGround(v: Vec2, steerX: number, steerY: number, baseSpeed: number, tuning: GroundMotionTuning, dt: number): void {
  const speed = Math.hypot(v.x, v.y);
  const stick = Math.hypot(steerX, steerY);

  if (speed <= baseSpeed + 1e-6) {
    const targetX = steerX * baseSpeed;
    const targetY = steerY * baseSpeed;
    const dx = targetX - v.x;
    const dy = targetY - v.y;
    const gap = Math.hypot(dx, dy);
    if (gap < 1e-9) return;
    const step = Math.min(gap, (stick > 0 ? tuning.baseAccel : tuning.baseDecel) * dt);
    v.x += (dx / gap) * step;
    v.y += (dy / gap) * step;
    return;
  }

  let dirX = v.x / speed;
  let dirY = v.y / speed;
  const surplus = speed - baseSpeed;
  if (stick > 0) {
    const wantX = steerX / stick;
    const wantY = steerY / stick;
    const angle = Math.atan2(dirX * wantY - dirY * wantX, dirX * wantX + dirY * wantY);
    const maxTurn = (tuning.surplusTurnRate / (1 + surplus * tuning.surplusTurnPenaltyPerSpeed)) * dt * stick;
    const turn = Math.max(-maxTurn, Math.min(maxTurn, angle));
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const nextX = dirX * cos - dirY * sin;
    dirY = dirX * sin + dirY * cos;
    dirX = nextX;
  }
  const fade = stick > 0 ? tuning.surplusFadePerSecond : tuning.surplusIdleFadePerSecond;
  const nextSpeed = baseSpeed + surplus * Math.exp(-fade * dt);
  v.x = dirX * nextSpeed;
  v.y = dirY * nextSpeed;
}

/** Airborne: a little drift from the stick, never pushing past airMaxSpeed along the stick. */
export function steerAir(v: Vec2, steerX: number, steerY: number, tuning: AirMotionTuning, dt: number): void {
  const stick = Math.hypot(steerX, steerY);
  if (stick === 0) return;
  const along = (v.x * steerX + v.y * steerY) / stick;
  if (along >= tuning.airMaxSpeed) return;
  const push = Math.min(tuning.airAccel * dt, tuning.airMaxSpeed - along);
  v.x += (steerX / stick) * push;
  v.y += (steerY / stick) * push;
}
