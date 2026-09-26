import { StateEntered, StepTicked } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { clear, has, insert } from '@engine/tables/tableOps';
import type { Vec2 } from '@shared/math/vec2';
import { RigBodiesMoved } from '../../../messages/brawlMessages';
import { DishForcesComputed, RigSpilled, RimHit } from '../../../messages/dishMessages';
import { RigReady } from '../../../messages/rigMessages';
import { RoundStarted } from '../../../messages/roundMessages';
import type { DomainContext } from '../../../shared/domainContext';
import { isActive, watchFlow } from '../../../shared/flowWatch';
import { selectedDish } from '../../../shared/dataLookups';
import { bowlAccel, rimContact, rimLineAccel } from '../rules/dishGeometry';
import type { DishState } from '../state/dishState';

/** The Dish: slope forces (plus the Rim Line's push) for grounded Rigs, Rim bounces, and Spills. */
export function dishHandlers(state: DishState, ctx: DomainContext): HandlerDef[] {
  const t = state.tracked.cols;
  const accel: Vec2 = { x: 0, y: 0 };

  return [
    on(StepTicked, 'dish.computeForces', () => {
      if (!isActive(state.flow, ctx.data.flow.activity.simulation)) return;
      const dish = selectedDish(ctx.data);
      for (let row = 0; row < state.tracked.count; row++) {
        if (t.airborne[row] === 1 || has(state.spilled, state.tracked.ids[row])) continue;
        bowlAccel(accel, dish, t.x[row], t.y[row]);
        rimLineAccel(accel, dish, t.x[row], t.y[row], t.vx[row], t.vy[row]);
        ctx.publish(DishForcesComputed, { rigId: state.tracked.ids[row], ax: accel.x, ay: accel.y });
      }
    }),
    on(RigBodiesMoved, 'dish.trackBodies', (batch) => {
      const dish = selectedDish(ctx.data);
      for (let i = 0; i < batch.count; i++) {
        const rigId = batch.cols.rigId[i];
        const x = batch.cols.x[i];
        const y = batch.cols.y[i];
        const z = batch.cols.z[i];
        const row = insert(state.tracked, rigId, { x, y, z, vx: batch.cols.vx[i], vy: batch.cols.vy[i], airborne: batch.cols.airborne[i] });
        if (has(state.spilled, rigId) || batch.cols.teleported[i] === 1) continue;
        const radius = t.radius[row];
        const contact = rimContact(dish, x, y, z, radius);
        if (contact === 'spill') {
          insert(state.spilled, rigId);
          ctx.publish(RigSpilled, { rigId });
        } else if (contact === 'wall') {
          const distance = Math.hypot(x, y);
          ctx.publish(RimHit, {
            rigId,
            nx: -x / distance,
            ny: -y / distance,
            depth: distance + radius - dish.radius,
            restitution: dish.wallRestitution,
          });
        }
      }
    }),
    on(RigReady, 'dish.onRigReady', (batch) => {
      for (let i = 0; i < batch.count; i++) insert(state.tracked, batch.cols.rigId[i], { radius: batch.cols.radius[i] });
    }),
    on(RoundStarted, 'dish.onRoundStarted', () => clear(state.spilled)),
    on(StateEntered, 'dish.onFlowState', (batch) => void watchFlow(state.flow, batch)),
  ];
}
