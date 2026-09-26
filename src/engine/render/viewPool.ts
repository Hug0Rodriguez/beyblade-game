import type { Container } from 'pixi.js';

/** id → display object, created on first use and kept in `parent`. */
export interface ViewPool<T extends Container> {
  get(id: number): T;
  has(id: number): boolean;
  forEach(visit: (view: T, id: number) => void): void;
}

export function createViewPool<T extends Container>(parent: Container, create: (id: number) => T): ViewPool<T> {
  const views = new Map<number, T>();
  return {
    get(id) {
      let view = views.get(id);
      if (!view) {
        view = create(id);
        views.set(id, view);
        parent.addChild(view);
      }
      return view;
    },
    has: (id) => views.has(id),
    forEach: (visit) => views.forEach(visit),
  };
}
