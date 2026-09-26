import { createJsonTree } from './loadJsonTree';

export interface EngineConfig {
  readonly runtime: {
    readonly fixedStepHz: number;
    readonly maxStepsPerFrame: number;
    readonly maxFrameSeconds: number;
    readonly maxResolution: number;
  };
  readonly messaging: { readonly maxDrainPasses: number; readonly defaultQueueCapacity: number };
  readonly dev: {
    readonly enabled: boolean;
    readonly tuningPanelKey: string;
    readonly messageLogKey: string;
    readonly tableInspectorKey: string;
    /** Top-level data folders not shown in the tuning panel (not live-editable). */
    readonly tuningPanelHide: readonly string[];
    /** Message types counted but left out of the message log's recent list. */
    readonly messageLogQuiet: readonly string[];
  };
}

const modules = import.meta.glob('/data/engine/*.json', { eager: true, import: 'default' });

export function loadEngineConfig(): EngineConfig {
  const tree = createJsonTree(modules, '/data/engine');
  return {
    runtime: tree.get('runtime.json'),
    messaging: tree.get('messaging.json'),
    dev: tree.get('dev.json'),
  };
}
