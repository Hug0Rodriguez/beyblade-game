import type { SeededRandom } from '@shared/random/seededRandom';
import type { HandlerDef } from '@engine/messaging/handlerRegistry';
import type { MessageBus } from '@engine/messaging/messageBus';
import type { Schema } from '@engine/tables/columns';
import type { Table } from '@engine/tables/defineTable';
import type { ScreenHost } from '@engine/screens/screenHost';
import type { GameData } from '../gameData/gameData';

export type Publish = MessageBus['publish'];

/** What every domain gets at boot. Domains never see each other — only this. */
export interface DomainContext {
  readonly data: GameData;
  readonly publish: Publish;
  /** Deterministic random stream, one per salt. */
  random(salt: string): SeededRandom;
  /** Exposes a private table to the dev table inspector (read-only). */
  inspect(owner: string, table: Table<Schema>): void;
}

/** Views additionally get the screen layers and the bus (engine touch widgets publish on it). */
export interface ViewContext extends DomainContext {
  readonly screens: ScreenHost;
  readonly bus: MessageBus;
}

/**
 * A domain's public surface. `createState` allocates its private tables; `createHandlers`
 * returns its model reactions; `createViewHandlers` (optional) its Pixi reactions.
 */
export interface DomainModule<State> {
  readonly name: string;
  createState(ctx: DomainContext): State;
  createHandlers(state: State, ctx: DomainContext): HandlerDef[];
  createViewHandlers?(ctx: ViewContext): HandlerDef[];
}

/** Erases the state type so modules can sit in one registry list. */
export type AnyDomainModule = DomainModule<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
