import type { Vec2 } from '@shared/math/vec2';
import { normalizeInto } from '@shared/math/vec2';
import type { CpuSenses } from './senseRival';

/** Steering behaviours a Tactic can name in tacticCommands.json. */
export const steerModes: Readonly<Record<string, (out: Vec2, senses: CpuSenses) => void>> = {
  towardRival: (out, s) => void normalizeInto(out, s.rivalX - s.selfX, s.rivalY - s.selfY),
  awayFromRival: (out, s) => void normalizeInto(out, s.selfX - s.rivalX, s.selfY - s.rivalY),
  // Sideways around the rival, drifting slightly inward so the orbit tightens.
  orbitRival: (out, s) => {
    normalizeInto(out, s.rivalX - s.selfX, s.rivalY - s.selfY);
    const tangentX = -out.y;
    const tangentY = out.x;
    normalizeInto(out, tangentX + out.x * 0.35, tangentY + out.y * 0.35);
  },
  towardCenter: (out, s) => void normalizeInto(out, -s.selfX, -s.selfY),
  // Around the Dish on the Rim Line (to build Gear), correcting in or out toward its middle.
  rideRim: (out, s) => {
    normalizeInto(out, s.selfX, s.selfY);
    const outwardX = out.x;
    const outwardY = out.y;
    const correction = (s.rimLineRatio - s.edgeRatio) * 6;
    normalizeInto(out, -outwardY + outwardX * correction, outwardX + outwardY * correction);
  },
  hold: (out) => {
    out.x = 0;
    out.y = 0;
  },
};
