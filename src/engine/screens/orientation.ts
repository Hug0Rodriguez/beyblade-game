/** Which way the screen is held. Landscape when it is wider than tall. */
export type Orientation = 'portrait' | 'landscape';

export function orientationOf(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Layout data is authored for portrait, with an optional `landscape` block that overrides only
 * the fields that differ. Resolves the block that applies to `orientation`.
 */
export function withOrientation<T extends object>(base: T & { readonly landscape?: Partial<T> }, orientation: Orientation): T {
  return orientation === 'landscape' && base.landscape ? { ...base, ...base.landscape } : base;
}
