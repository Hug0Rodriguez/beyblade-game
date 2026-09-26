import type { Application } from 'pixi.js';
import type { MessageBus } from '../messaging/messageBus';
import { FrameRendered, StepTicked, ViewportResized } from '../messaging/engineMessages';
import type { TimeScale } from './timeScale';

export interface FixedStepConfig {
  readonly fixedStepHz: number;
  readonly maxStepsPerFrame: number;
  readonly maxFrameSeconds: number;
}

/**
 * Each frame: publish ViewportResized when the screen changed, then one StepTicked per fixed
 * step (draining after each), then FrameRendered with the interpolation alpha.
 * `timeScale` (hit-stop / slow motion) scales simulation time only; FrameRendered.frameDt stays real.
 */
export function startFixedStepLoop(app: Application, bus: MessageBus, config: FixedStepConfig, timeScale?: TimeScale): void {
  let accumulator = 0;
  let stepIndex = 0;
  let lastWidth = -1;
  let lastHeight = -1;

  const frame = (deltaMs: number): void => {
    const dt = 1 / config.fixedStepHz;
    if (app.screen.width !== lastWidth || app.screen.height !== lastHeight) {
      lastWidth = app.screen.width;
      lastHeight = app.screen.height;
      bus.publish(ViewportResized, { width: lastWidth, height: lastHeight });
    }
    const frameSeconds = Math.min(deltaMs / 1000, config.maxFrameSeconds);
    accumulator += frameSeconds * (timeScale ? timeScale.advance(frameSeconds) : 1);
    let steps = 0;
    while (accumulator >= dt && steps < config.maxStepsPerFrame) {
      bus.publish(StepTicked, { dt, stepIndex: stepIndex++ });
      bus.drain();
      accumulator -= dt;
      steps++;
    }
    if (steps === config.maxStepsPerFrame) accumulator = Math.min(accumulator, dt);
    bus.publish(FrameRendered, { alpha: accumulator / dt, frameDt: frameSeconds });
    bus.drain();
  };

  bus.drain();
  app.ticker.add((ticker) => frame(ticker.deltaMS));
}
