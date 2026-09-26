import { defineMessage } from './defineMessage';

export const StepTicked = defineMessage('StepTicked', { dt: 'f64', stepIndex: 'u32' });
export const FrameRendered = defineMessage('FrameRendered', { alpha: 'f64', frameDt: 'f64' });
export const ViewportResized = defineMessage('ViewportResized', { width: 'f64', height: 'f64' });

/** `key` is the index into the watched key-code list the keyboard device was attached with. */
export const KeyChanged = defineMessage('KeyChanged', { key: 'u16', down: 'u8' });
export const PointerKindDetected = defineMessage('PointerKindDetected', { touch: 'u8' });
export const JoystickMoved = defineMessage('JoystickMoved', { widget: 'str', x: 'f64', y: 'f64' });
export const TouchButtonChanged = defineMessage('TouchButtonChanged', { widget: 'str', down: 'u8' });
/** A held action button dragged past its aim threshold: a unit direction, or active 0 on release. */
export const TouchAimChanged = defineMessage('TouchAimChanged', { widget: 'str', x: 'f64', y: 'f64', active: 'u8' });
export const DragChanged = defineMessage('DragChanged', {
  widget: 'str',
  active: 'u8',
  startX: 'f64',
  startY: 'f64',
  x: 'f64',
  y: 'f64',
});

/** Scales simulation time (0 = freeze / hit-stop, 0.25 = slow motion) for `seconds` of real time. */
export const TimeScaleRequested = defineMessage('TimeScaleRequested', { scale: 'f64', seconds: 'f64' });

export const StateEntered = defineMessage('StateEntered', { fsm: 'str', instance: 'u16', state: 'str' });
export const StateExited = defineMessage('StateExited', { fsm: 'str', instance: 'u16', state: 'str' });

export const engineMessages = [
  StepTicked,
  FrameRendered,
  ViewportResized,
  KeyChanged,
  PointerKindDetected,
  JoystickMoved,
  TouchButtonChanged,
  TouchAimChanged,
  DragChanged,
  TimeScaleRequested,
  StateEntered,
  StateExited,
];
