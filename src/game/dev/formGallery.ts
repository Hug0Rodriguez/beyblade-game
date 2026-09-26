import { Container, Graphics } from 'pixi.js';
import { FrameRendered } from '@engine/messaging/engineMessages';
import { on, type HandlerDef } from '@engine/messaging/handlerRegistry';
import { copyForm, drawRigBlades, drawRigShadow, drawRigShape, resolveForm, type RigLook } from '../domains/rig/view/rigForm';
import type { ViewContext } from '../shared/domainContext';

/**
 * `?gallery=1`: one Rig per form across the dish on the title screen, no labels. The icon test
 * from The Gamer's Brain (5213-5219): can each form be named from its silhouette alone?
 */
export function formGalleryHandlers(ctx: ViewContext, formNames: readonly string[], enabled: boolean): HandlerDef[] {
  const data = ctx.data.rig.rigForms;
  const rig = ctx.data.rig.rigs[0];
  const look: RigLook = { radius: rig.radius, color: rig.color, accentColor: rig.accentColor, blades: rig.blades };
  const root = new Container();
  root.visible = enabled;
  root.scale.set(2.4);
  ctx.screens.layer('dish').addChild(root);
  const spacing = rig.radius * 3.6;
  const items = formNames.map((name, i) => {
    const holder = new Container();
    holder.position.set((i - (formNames.length - 1) / 2) * spacing, 0);
    const shadow = new Graphics();
    const shape = new Graphics();
    const blades = new Graphics();
    shadow.position.set(4, 4);
    holder.addChild(shadow, shape, blades);
    root.addChild(holder);
    const form = copyForm(resolveForm(data, name));
    const accent = data.forms[name]?.accent ?? rig.color;
    return { holder, shadow, shape, blades, form, accent, name };
  });
  let angle = 0;
  return [
    on(FrameRendered, 'dev.formGallery.render', (batch) => {
      if (!enabled) return;
      if (root.parent && root.parent.children[root.parent.children.length - 1] !== root) root.parent.addChild(root); // stay above the dish
      const dt = batch.cols.frameDt[batch.count - 1];
      angle += 12 * dt;
      for (const item of items) {
        const tilt = item.form.wobble * data.look.wobbleRadians * Math.sin(angle * 0.6);
        item.holder.rotation = tilt;
        item.holder.scale.set(item.form.wide, item.form.tall);
        const lift = item.form.shadowScale > 1.05 ? -look.radius * 1.4 : 0; // the weight hangs over its shadow
        item.shape.y = item.blades.y = lift;
        drawRigShadow(item.shadow, look, item.form, item.accent);
        drawRigShape(item.shape, look, item.form, data.look, item.accent, -Math.PI / 2, false);
        drawRigBlades(item.blades, look, item.form, data.look);
        item.blades.rotation = angle * item.form.spinBoost;
      }
    }),
  ];
}
