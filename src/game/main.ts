import { createMessageBus } from '@engine/messaging/messageBus';
import { engineMessages } from '@engine/messaging/engineMessages';
import { loadEngineConfig } from '@engine/data/engineConfig';
import { createRuntime } from '@engine/runtime/createRuntime';
import { startFixedStepLoop } from '@engine/runtime/fixedStepLoop';
import { createTimeScale } from '@engine/runtime/timeScale';
import { createScreenHost } from '@engine/screens/screenHost';
import { createGuiHost } from '@engine/gui/guiHost';
import { createTouchReadout } from '@engine/dev/touchReadout';
import { attachKeyboardDevice } from '@engine/input/devices/keyboardDevice';
import { attachPointerDevice } from '@engine/input/devices/pointerDevice';
import { attachFullscreenOnTouch } from '@engine/runtime/fullscreen';
import { createMessageLog } from '@engine/dev/messageLog';
import { createTableInspector } from '@engine/dev/tableInspector';
import { createTuningPanel } from '@engine/dev/tuningPanel';
import { createSeededRandom, hashString } from '@shared/random/seededRandom';
import { createWorld } from './boot/createWorld';
import { domainRegistry } from './boot/domainRegistry';
import { publishBootMessages } from './boot/publishBootMessages';
import { registerHandlers } from './boot/registerHandlers';
import { watchedKeyCodes } from './domains/spinner';
import { loadGameData } from './gameData/loadGameData';
import { validateGameData } from './gameData/validateGameData';
import { gameMessages } from './messages';
import type { DomainContext, ViewContext } from './shared/domainContext';
import { selectedDish } from './shared/dataLookups';
import './gui/hud.css';
import { guiTokens } from './gui/guiTokens';
import { formGalleryHandlers } from './dev/formGallery';

/** Composition root: config → data → runtime → bus → world → routes → boot messages → loop. */
async function main(): Promise<void> {
  const engine = loadEngineConfig();
  const data = loadGameData();
  validateGameData(data);

  const parent = document.getElementById('game')!;
  const { app } = await createRuntime({
    parent,
    background: data.screens.screens.background,
    maxResolution: engine.runtime.maxResolution,
  });

  const bus = createMessageBus(engine.messaging);
  bus.register([...engineMessages, ...gameMessages], (name) => data.boot.capacities.messageQueues[name]);

  const screens = createScreenHost(app.stage, {
    ...data.screens.screens,
    worldSize: selectedDish(data).radius * 2 * data.screens.screens.worldMargin,
  });

  const gui = createGuiHost(parent, { ...data.screens.screens, cssVars: guiTokens(data) });

  const dev = engine.dev.enabled && import.meta.env.DEV;
  const inspector = dev ? createTableInspector(engine.dev.tableInspectorKey) : undefined;
  const ctx: DomainContext = {
    data,
    publish: bus.publish,
    random: (salt) => createSeededRandom(data.boot.random.seed ^ hashString(salt)),
    inspect: (owner, table) => inspector?.register(owner, table),
  };
  const view: ViewContext = { ...ctx, screens, gui, bus };

  const timeScale = createTimeScale();
  const world = createWorld(domainRegistry, ctx);
  const query = new URLSearchParams(location.search);
  const gallery = formGalleryHandlers(view, ['needleWindup', 'needle', 'shell', 'clawReach', 'clawGrab', 'weight', 'open'], query.has('gallery'));
  registerHandlers(bus, domainRegistry, world, ctx, view, [...screens.handlers(), ...gui.handlers(), ...timeScale.handlers(), ...gallery]);

  attachKeyboardDevice(bus, watchedKeyCodes(data));
  attachPointerDevice(bus, parent, app.canvas);
  if (engine.runtime.fullscreenOnTouch) attachFullscreenOnTouch(parent);
  if (query.has('debug')) createTouchReadout(parent, app);
  if (query.has('gallery')) gui.root.style.display = 'none'; // the forms alone, no words: the silhouette test
  if (dev) {
    bus.observe(createMessageLog(engine.dev.messageLogKey, engine.dev.messageLogQuiet));
    void createTuningPanel(data as unknown as Record<string, unknown>, {
      title: 'Tuning (data/game)',
      toggleKey: engine.dev.tuningPanelKey,
      hide: engine.dev.tuningPanelHide,
    });
  }

  publishBootMessages(bus, data);
  startFixedStepLoop(app, bus, engine.runtime, timeScale);
}

main().catch((error: unknown) => {
  const box = document.createElement('pre');
  box.id = 'boot-error';
  box.textContent = error instanceof Error ? error.message : String(error);
  document.body.appendChild(box);
  throw error;
});
