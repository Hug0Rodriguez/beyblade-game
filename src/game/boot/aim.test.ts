import { describe, expect, it } from 'vitest';
import { TouchAimChanged, TouchButtonChanged } from '@engine/messaging/engineMessages';
import { dummyWorld, hold } from './testing/dummyWorld';

/** A held attack button dragged during the wind-up aims the move (touch), overriding the stick. */
describe('drag-to-aim, headless', () => {
  const started = (world: ReturnType<typeof dummyWorld>, move: string) =>
    world.rows('MoveStarted').find((row) => row.rigId === 0 && row.move === move);

  it('a DASH pressed while steering right, then dragged up, dashes up', () => {
    const world = dummyWorld(() => {}, 0.6);
    hold(world, 'KeyD', 1);
    world.publish(TouchButtonChanged, { widget: 'dash', down: 1 });
    world.step(2);
    world.publish(TouchAimChanged, { widget: 'dash', x: 0, y: -1, active: 1 });
    world.step(30);
    const dash = started(world, 'dash')!;
    expect(dash).toBeDefined();
    expect(dash.dirY as number).toBeLessThan(-0.9);
    expect(Math.abs(dash.dirX as number)).toBeLessThan(0.1);
  });

  it('a HOOK keeps its press aim for the stick, but a drag during the reach re-aims it', () => {
    const world = dummyWorld(() => {}, 0.6);
    hold(world, 'KeyD', 1);
    world.publish(TouchButtonChanged, { widget: 'hook', down: 1 });
    world.step(2);
    world.publish(TouchAimChanged, { widget: 'hook', x: 0, y: 1, active: 1 });
    world.step(40);
    const hook = started(world, 'hook')!;
    expect(hook).toBeDefined();
    expect(hook.dirY as number).toBeGreaterThan(0.9);
  });

  it('releasing the drag goes back to the stick', () => {
    const world = dummyWorld(() => {}, 0.6);
    hold(world, 'KeyD', 1);
    world.publish(TouchAimChanged, { widget: 'dash', x: 0, y: -1, active: 1 });
    world.step(2);
    world.publish(TouchAimChanged, { widget: 'dash', x: 0, y: 0, active: 0 });
    world.step(2);
    world.publish(TouchButtonChanged, { widget: 'dash', down: 1 });
    world.step(30);
    const dash = started(world, 'dash')!;
    expect(dash.dirX as number).toBeGreaterThan(0.9);
  });
});
