import { Container, Graphics } from 'pixi.js';
import { TAU } from '@shared/math/scalar';

export interface RigLook {
  readonly radius: number;
  readonly color: string;
  readonly accentColor: string;
  readonly blades: number;
}

/** A top seen from above: a coloured ring, swept blades in the accent colour, a dark hub. */
export function drawRig(look: RigLook): { body: Container; flash: Graphics } {
  const body = new Container();
  const r = look.radius;
  const g = new Graphics();
  g.circle(0, 0, r).fill({ color: look.color });
  for (let blade = 0; blade < look.blades; blade++) {
    const a = (blade / look.blades) * TAU;
    const sweep = TAU / look.blades / 2.2;
    g.moveTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35)
      .lineTo(Math.cos(a - sweep * 0.4) * r * 1.08, Math.sin(a - sweep * 0.4) * r * 1.08)
      .arc(0, 0, r * 1.08, a - sweep * 0.4, a + sweep * 0.6)
      .lineTo(Math.cos(a + sweep) * r * 0.5, Math.sin(a + sweep) * r * 0.5)
      .fill({ color: look.accentColor });
  }
  g.circle(0, 0, r * 0.42).fill({ color: '#0d0b18' });
  g.circle(0, 0, r * 0.18).fill({ color: look.color });
  g.circle(0, 0, r).stroke({ color: '#0d0b18', width: 2, alpha: 0.6 });
  const flash = new Graphics().circle(0, 0, r * 1.1).fill({ color: '#ffffff' });
  flash.alpha = 0;
  body.addChild(g, flash);
  return { body, flash };
}
