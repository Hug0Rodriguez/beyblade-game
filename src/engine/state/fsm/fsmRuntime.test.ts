import { describe, expect, it } from 'vitest';
import type { RowValues, Schema } from '../../tables/columns';
import type { MessageType } from '../../messaging/defineMessage';
import { findFsmErrors, type FsmDefinition } from './fsmDefinition';
import { evaluateGuards, sendEvent, startInstance, stateOf, tickFsm, createFsm } from './fsmRuntime';

const def: FsmDefinition = {
  initial: 'idle',
  states: ['idle', 'charging', 'released', 'fleeing'],
  transitions: [
    { from: 'idle', on: 'Press', to: 'charging' },
    { from: 'charging', on: 'Press', to: 'released' },
    { from: 'charging', to: 'released', when: [['timeInState', '>=', '$max']] },
    { from: '*', to: 'fleeing', when: [['danger', '==', 1]] },
  ],
};

function setup() {
  const published: string[] = [];
  const publish = <S extends Schema>(type: MessageType<S>, values: RowValues<S>) =>
    published.push(`${type.name}:${(values as Record<string, unknown>).state}`);
  const fsm = createFsm('test', def, 2, publish);
  return { fsm, published };
}

describe('fsm runtime', () => {
  it('publishes StateExited/StateEntered and allows one transition per step', () => {
    const { fsm, published } = setup();
    startInstance(fsm, 0);
    tickFsm(fsm, 0.1);
    expect(sendEvent(fsm, 0, 'Press')).toBe('charging');
    expect(sendEvent(fsm, 0, 'Press')).toBeUndefined();
    tickFsm(fsm, 0.1);
    expect(sendEvent(fsm, 0, 'Press')).toBe('released');
    expect(published).toEqual([
      'StateEntered:idle',
      'StateExited:idle',
      'StateEntered:charging',
      'StateExited:charging',
      'StateEntered:released',
    ]);
  });

  it('fires guarded transitions from timeInState, refs and "*"', () => {
    const { fsm } = setup();
    startInstance(fsm, 1);
    tickFsm(fsm, 0);
    sendEvent(fsm, 1, 'Press');
    let danger = 0;
    const read = (column: string) => (column === 'danger' ? danger : 0);
    tickFsm(fsm, 0.5);
    expect(evaluateGuards(fsm, 1, read, { max: 1 })).toBeUndefined();
    tickFsm(fsm, 0.6);
    expect(evaluateGuards(fsm, 1, read, { max: 1 })).toBe('released');
    danger = 1;
    tickFsm(fsm, 0);
    expect(evaluateGuards(fsm, 1, read, { max: 1 })).toBe('fleeing');
    tickFsm(fsm, 0);
    expect(evaluateGuards(fsm, 1, read, { max: 1 })).toBeUndefined();
    expect(stateOf(fsm, 1)).toBe('fleeing');
  });

  it('validates structure and reachability', () => {
    const broken: FsmDefinition = { initial: 'a', states: ['a', 'b', 'island'], transitions: [{ from: 'a', to: 'b', on: 'Go' }] };
    expect(findFsmErrors('broken', broken, [])).toEqual(['broken: state "island" is unreachable']);
    expect(findFsmErrors('def', def, ['danger', 'timeInState'])).toEqual([]);
  });
});
