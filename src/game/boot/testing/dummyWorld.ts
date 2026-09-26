import { KeyChanged } from '@engine/messaging/engineMessages';
import { SpinnerCommandIssued } from '../../messages/spinnerMessages';
import type { ButtonName } from '../../gameData/schema/spinnerData';
import { watchedKeyCodes } from '../../domains/spinner';
import type { GameData } from '../../gameData/gameData';
import { cloneGameData, loadGameData } from '../../gameData/loadGameData';
import { createTestWorld, type TestWorld } from './createTestWorld';
import { bootToMatch } from './playMatch';

export type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

/**
 * The human Spinner right next to an idle CPU dummy (every Tactic holds still, presses nothing),
 * with the countdown over and the fight on. `edit` tweaks the data first.
 */
export function dummyWorld(edit: (data: Mutable<GameData>) => void = () => {}, gap = 0.08): TestWorld {
  const data = cloneGameData(loadGameData()) as unknown as Mutable<GameData>;
  for (const command of Object.values(data.spinner.tacticCommands)) {
    command.steer = 'hold';
    command.press = [];
    delete command.combo;
  }
  data.round.countdown.slots[0] = { x: -gap, y: 0 };
  data.round.countdown.slots[1] = { x: gap, y: 0 };
  edit(data);
  const world = createTestWorld({ data: data as GameData, seed: 5 });
  bootToMatch(world);
  while (!world.rows('CountdownFinished').length) world.step();
  world.step(10);
  world.clearSent();
  return world;
}

/** Presses (and releases after one step) the given key codes together. */
export function tap(world: TestWorld, ...codes: string[]): void {
  const keys = codes.map((code) => watchedKeyCodes(world.data).indexOf(code));
  for (const key of keys) world.publish(KeyChanged, { key, down: 1 });
  world.step();
  for (const key of keys) world.publish(KeyChanged, { key, down: 0 });
}

/** Holds (1) or releases (0) a key. */
export function hold(world: TestWorld, code: string, down: 0 | 1): void {
  world.publish(KeyChanged, { key: watchedKeyCodes(world.data).indexOf(code), down });
}

/** The moveFlow states a Rig went through (since the last clearSent). */
export function movesOf(world: TestWorld, rig: number): string[] {
  return world.rows('StateEntered').filter((row) => row.fsm === 'moveFlow' && row.instance === rig).map((row) => row.state as string);
}

/** Makes the dummy rival (Spinner 1) press a button this step, as if its CPU chose to. */
export function rivalPress(world: TestWorld, button: ButtonName, steerX = 0, steerY = 0): void {
  world.publish(SpinnerCommandIssued, { spinnerId: 1, steerX, steerY, aimX: 0, aimY: 0, dash: 0, pop: 0, whirl: 0, hook: 0, [button]: 1 });
  world.step();
}

/** Steps until a HitLanded arrives (or `limit` steps pass); returns the hits so far. */
export function stepUntilHit(world: TestWorld, limit = 90): Record<string, number | string>[] {
  for (let steps = 0; steps < limit && !world.rows('HitLanded').length; steps++) world.step();
  return world.rows('HitLanded');
}
