import { GameBooted, StartRequested } from '../../messages/flowMessages';
import type { SentRow, TestWorld } from './createTestWorld';

export interface MatchReport {
  readonly finishes: SentRow[];
  readonly winner: SentRow | undefined;
  readonly steps: number;
}

/** Boots the game and starts a Match from the title screen (as the RIOT! button does). */
export function bootToMatch(world: TestWorld): void {
  world.publish(GameBooted, {});
  world.step();
  world.publish(StartRequested, {});
  world.step(2);
}

/** Plays until MatchWon (or `maxSteps`). The human does nothing unless `drive` presses keys. */
export function playMatch(world: TestWorld, maxSteps: number, drive?: (step: number) => void): MatchReport {
  bootToMatch(world);
  let steps = 0;
  while (steps < maxSteps && world.rows('MatchWon').length === 0) {
    drive?.(steps);
    world.step();
    steps++;
  }
  return { finishes: world.rows('RoundFinished'), winner: world.rows('MatchWon')[0], steps };
}
