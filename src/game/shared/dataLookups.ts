import type { GameData } from '../gameData/gameData';
import type { DishDefinition } from '../gameData/schema/dishData';
import type { RigDefinition } from '../gameData/schema/rigData';

export function selectedDish(data: GameData): DishDefinition {
  const { selected, dishes } = data.dish.dishes;
  const dish = dishes.find((entry) => entry.id === selected);
  if (!dish) throw new Error(`dishes.json: selected dish "${selected}" not found`);
  return dish;
}

export function rigDefinition(data: GameData, rigId: string): RigDefinition {
  const rig = data.rig.rigs.find((entry) => entry.id === rigId);
  if (!rig) throw new Error(`rigs.json: unknown rig "${rigId}"`);
  return rig;
}

/** Drop-in position for a Spinner slot, in Dish units. */
export function dropInPoint(data: GameData, slot: number): { x: number; y: number } {
  const slots = data.round.countdown.slots;
  const spot = slots[slot % slots.length];
  const radius = selectedDish(data).radius;
  return { x: spot.x * radius, y: spot.y * radius };
}
