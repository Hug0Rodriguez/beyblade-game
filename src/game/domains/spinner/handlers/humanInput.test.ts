import { describe, expect, it } from 'vitest';
import { JoystickMoved, KeyChanged, StateEntered, TouchButtonChanged } from '@engine/messaging/engineMessages';
import { createTestWorld } from '../../../boot/testing/createTestWorld';
import { GameBooted } from '../../../messages/flowMessages';
import { spinnerDomain, watchedKeyCodes } from '..';

function inFlowState(state: string) {
  const world = createTestWorld({ modules: [spinnerDomain] });
  world.publish(GameBooted, {});
  world.publish(StateEntered, { fsm: world.data.screens.screens.fsm, instance: 0, state });
  world.drain();
  world.clearSent();
  return world;
}

const humanCommands = (world: ReturnType<typeof createTestWorld>) =>
  world.rows('SpinnerCommandIssued').filter((row) => row.spinnerId === world.data.spinner.spinners.find((s) => s.controller === 'human')!.id);

describe('human Spinner input (device messages → SpinnerCommandIssued)', () => {
  it('keyboard: held keys steer, a Dash press is sent exactly once', () => {
    const world = inFlowState('brawl');
    const codes = watchedKeyCodes(world.data);
    world.publish(KeyChanged, { key: codes.indexOf('KeyD'), down: 1 });
    world.publish(KeyChanged, { key: codes.indexOf('KeyJ'), down: 1 });
    world.step(2);
    const [first, second] = humanCommands(world);
    expect(first).toMatchObject({ steerX: 1, steerY: 0, dash: 1, pop: 0 });
    expect(second).toMatchObject({ steerX: 1, dash: 0 });
  });

  it('touch: the joystick steers and the buttons press', () => {
    const world = inFlowState('brawl');
    const touch = world.data.spinner.touch;
    world.publish(JoystickMoved, { widget: touch.joystick.widget, x: 0, y: -0.5 });
    world.publish(TouchButtonChanged, { widget: touch.buttons.find((b) => b.command === 'pop')!.widget, down: 1 });
    world.step();
    expect(humanCommands(world)[0]).toMatchObject({ steerX: 0, steerY: -0.5, pop: 1 });
  });

  it('on the title screen an action key asks to start instead of fighting', () => {
    const world = inFlowState('title');
    world.publish(KeyChanged, { key: watchedKeyCodes(world.data).indexOf('KeyJ'), down: 1 });
    world.step();
    expect(humanCommands(world)).toHaveLength(0);
    expect(world.rows('StartRequested')).toHaveLength(1);
  });
});
