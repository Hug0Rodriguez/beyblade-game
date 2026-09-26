import { describe, expect, it } from 'vitest';
import { StateEntered, StepTicked } from '@engine/messaging/engineMessages';
import { createTestWorld } from '../../../boot/testing/createTestWorld';
import { RigBodiesMoved } from '../../../messages/brawlMessages';
import { RigReady } from '../../../messages/rigMessages';
import { selectedDish } from '../../../shared/dataLookups';
import { dishDomain } from '..';

function dishWorld() {
  const world = createTestWorld({ modules: [dishDomain] });
  world.publish(StateEntered, { fsm: world.data.screens.screens.fsm, instance: 0, state: world.data.flow.activity.simulation[1] });
  world.publish(RigReady, { rigId: 0, spinnerId: 0, slot: 0, name: 'A', color: '#fff', accentColor: '#fff', radius: 20, weight: 1, baseSpeed: 250, maxSpin: 100, blades: 3 });
  world.drain();
  world.clearSent();
  return world;
}

const move = (world: ReturnType<typeof dishWorld>, x: number, y: number, z = 0) => {
  world.publish(RigBodiesMoved, { rigId: 0, x, y, z, vx: 0, vy: 0, vz: 0, airborne: z > 0 ? 1 : 0, teleported: 0 });
  world.drain();
};

describe('the Dish', () => {
  it('bounces a grounded Rig off the Rim wall, pointing back inward', () => {
    const world = dishWorld();
    const r = selectedDish(world.data).radius;
    move(world, 0, r - 10); // straight down: no Lip gap at 90°
    const [hit] = world.rows('RimHit');
    expect(hit).toMatchObject({ rigId: 0, ny: -1 });
    expect(hit.nx as number).toBeCloseTo(0);
    expect(hit.depth as number).toBeCloseTo(10);
    expect(world.rows('RigSpilled')).toHaveLength(0);
  });

  it('spills a Rig through a Lip gap, once', () => {
    const world = dishWorld();
    const r = selectedDish(world.data).radius;
    const gap = (selectedDish(world.data).lipGaps[0].angleDegrees * Math.PI) / 180;
    move(world, Math.cos(gap) * (r + 30), Math.sin(gap) * (r + 30));
    move(world, Math.cos(gap) * (r + 40), Math.sin(gap) * (r + 40));
    expect(world.rows('RigSpilled')).toHaveLength(1);
    expect(world.rows('RimHit')).toHaveLength(0);
  });

  it('an airborne Rig above the Rim clears the wall and spills', () => {
    const world = dishWorld();
    const r = selectedDish(world.data).radius;
    const high = selectedDish(world.data).rimHeight + 10;
    move(world, 0, r + 30, high);
    expect(world.rows('RigSpilled')).toHaveLength(1);
  });

  it('pulls grounded Rigs downhill toward the centre', () => {
    const world = dishWorld();
    move(world, 150, 0);
    world.clearSent();
    world.publish(StepTicked, { dt: 1 / 120, stepIndex: 0 });
    world.drain();
    const [force] = world.rows('DishForcesComputed');
    expect(force.ax as number).toBeLessThan(0);
  });
});
