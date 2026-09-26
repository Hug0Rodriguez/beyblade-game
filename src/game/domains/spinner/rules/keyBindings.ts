import type { GameData } from '../../../gameData/gameData';
import type { HumanCommandName } from '../../../gameData/schema/spinnerData';

/** Which human-input column a command writes, and whether it is a one-shot press. */
export const commandColumns: Readonly<Record<HumanCommandName, { readonly column: string; readonly pressOnly: boolean }>> = {
  steerUp: { column: 'steerUp', pressOnly: false },
  steerDown: { column: 'steerDown', pressOnly: false },
  steerLeft: { column: 'steerLeft', pressOnly: false },
  steerRight: { column: 'steerRight', pressOnly: false },
  dash: { column: 'dashQueued', pressOnly: true },
  pop: { column: 'popQueued', pressOnly: true },
  whirl: { column: 'whirlQueued', pressOnly: true },
  hook: { column: 'hookQueued', pressOnly: true },
  confirm: { column: 'confirmQueued', pressOnly: true },
};

/** Flattens keyboard.json into parallel lists: codes[i] drives commands[i]. */
export function keyBindingTable(data: GameData): { codes: string[]; commands: HumanCommandName[] } {
  const codes: string[] = [];
  const commands: HumanCommandName[] = [];
  for (const [command, keyCodes] of Object.entries(data.spinner.keyboard.bindings)) {
    for (const code of keyCodes) {
      codes.push(code);
      commands.push(command as HumanCommandName);
    }
  }
  return { codes, commands };
}

/** The key codes the engine keyboard device should watch (same order as keyBindingTable). */
export function watchedKeyCodes(data: GameData): string[] {
  return keyBindingTable(data).codes;
}
