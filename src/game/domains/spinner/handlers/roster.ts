import { StateEntered } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { insert } from '@engine/tables/tableOps';
import { GameBooted } from '../../../messages/flowMessages';
import { SpinnerAssigned } from '../../../messages/spinnerMessages';
import type { DomainContext } from '../../../shared/domainContext';
import { watchFlow } from '../../../shared/flowWatch';
import type { SpinnerState } from '../state/spinnerState';

/** Who is fighting, who controls them, and which Rig they bring. */
export function rosterHandlers(state: SpinnerState, ctx: DomainContext): HandlerDef[] {
  return [
    on(GameBooted, 'spinner.onGameBooted', () => {
      ctx.data.spinner.spinners.forEach((entry, slot) => {
        insert(state.spinners, entry.id, { slot, name: entry.name, controller: entry.controller, rigId: entry.rigId });
        if (entry.controller === 'human') insert(state.humans, entry.id);
        if (entry.controller === 'cpu') {
          const profileIndex = ctx.data.spinner.cpuProfiles.findIndex((profile) => profile.id === entry.profileId);
          insert(state.cpus, entry.id, { profileIndex, comboIndex: -1 });
        }
        ctx.publish(SpinnerAssigned, { spinnerId: entry.id, slot, name: entry.name, controller: entry.controller, rigId: entry.rigId });
      });
    }),
    on(StateEntered, 'spinner.onFlowState', (batch) => void watchFlow(state.flow, batch)),
  ];
}
