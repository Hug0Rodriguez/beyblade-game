import type { MessageBatch } from '../messaging/defineMessage';
import { TimeScaleRequested } from '../messaging/engineMessages';
import { on, type HandlerDef } from '../messaging/handlerRegistry';

/**
 * Hit-stop and slow motion: while any request is running, simulation time runs at the
 * smallest requested scale. Requests count down in real time.
 */
export interface TimeScale {
  /** Advances the running requests by `realSeconds`; returns the scale for this frame. */
  advance(realSeconds: number): number;
  handlers(): HandlerDef[];
}

export function createTimeScale(maxRequests = 8): TimeScale {
  const scales = new Float64Array(maxRequests);
  const remaining = new Float64Array(maxRequests);
  let count = 0;

  const request = (scale: number, seconds: number) => {
    if (seconds <= 0) return;
    if (count === maxRequests) {
      // Replace the request closest to finishing.
      let shortest = 0;
      for (let i = 1; i < count; i++) if (remaining[i] < remaining[shortest]) shortest = i;
      scales[shortest] = scale;
      remaining[shortest] = seconds;
      return;
    }
    scales[count] = scale;
    remaining[count] = seconds;
    count++;
  };

  return {
    advance(realSeconds) {
      let scale = 1;
      for (let i = 0; i < count; i++) scale = Math.min(scale, scales[i]);
      for (let i = count - 1; i >= 0; i--) {
        remaining[i] -= realSeconds;
        if (remaining[i] > 0) continue;
        count--;
        scales[i] = scales[count];
        remaining[i] = remaining[count];
      }
      return Math.max(0, scale);
    },
    handlers: () => [
      on(TimeScaleRequested, 'engine.time.onTimeScaleRequested', (batch: MessageBatch<typeof TimeScaleRequested.schema>) => {
        for (let i = 0; i < batch.count; i++) request(batch.cols.scale[i], batch.cols.seconds[i]);
      }),
    ],
  };
}
